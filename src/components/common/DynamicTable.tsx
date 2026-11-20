import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter, useDndContext, useDroppable, type DragStartEvent, type DragOverEvent, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Triangle } from 'lucide-react';
import { DynamicTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import { normalizeRect, buildTsv, parseTsvGrid, applyGrid, fillRows, clearCells, type CellRect } from '../../utils/tableOps';
import { flushSync } from 'react-dom';
import DynamicInput from './DynamicInput';

/** 外部共享 DndContext 模式的配置（多容器场景：如装备区跨背包拖物品） */
export interface SharedDndConfig {
  /** 行 sortable id 前缀——多容器下所有行的 id 必须全局唯一 */
  idPrefix?: string;
  /** 合入每行 useSortable data 的业务字段（如 bagId），供共享 DndContext 的 onDragEnd 判定 */
  rowData?: Record<string, any>;
  /** 容器级 droppable id（空背包/行间隙的投放目标） */
  containerId?: string;
  /** 容器级 droppable data */
  containerData?: Record<string, any>;
}

/** 容器级投放区（空背包或整表范围） */
function DroppableArea({ id, data, className, children }: { id: string; data?: Record<string, any>; className?: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id, data });
  return <div ref={setNodeRef} className={className}>{children}</div>;
}

/** 跨背包拖拽的插入指示线（纯视觉，不参与 SortableContext） */
function InsertIndicatorRow({ colSpan }: { colSpan: number }) {
  return (
    <tr className="pointer-events-none select-none">
      <td colSpan={colSpan} className="p-0">
        <div className="h-[3px] my-[1px] rounded-full bg-primary/80 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" />
      </td>
    </tr>
  );
}

const DynamicTableRow = memo(({
  index: i, columns, data, originalData, path, readOnly, readonlyColumns, rowDraggable, rowActionMode, sortableEnabled, rowSortableId, rowDndData, disableDisplacement, updateData, removeRow, fixedRows, isDescriptionCol, enableSQShow, hasColumnActions, onInsertAbove, noFirstRowInsert,
  excelEnabled, excelView, editingCell, onCellMouseDown, onFillStart, fillTip
}: any) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rowSortableId ?? `row-${i}`, data: { index: i, ...(rowDndData || {}) }, disabled: !sortableEnabled });
  const getCellPath = (basePath: string, index: number, key: string) => {
    if (!basePath) return undefined;
    return `${basePath}.${key}[${index}]`;
  };

  const isRowDirty = () => {
    if (!originalData) return false;
    return columns.some((c: any) => {
      const val = data?.[c.key]?.[i];
      const origVal = originalData?.[c.key]?.[i];
      return val !== origVal && String(val ?? '') !== String(origVal ?? '');
    });
  };

  const row: Record<string, any> = {};
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.keys(data).forEach((k) => { row[k] = data[k]?.[i]; });
  }
  columns.forEach((c: any) => { if (row[c.key] === undefined) row[c.key] = data?.[c.key]?.[i]; });

  return (
    <tr
      ref={setNodeRef}
      // 指针真值命中测试所需的行元数据（共享 DndContext 模式下宿主 dragend 使用；dataset 键转全小写）
      data-dnd-index={rowDndData ? i : undefined}
      data-dnd-bag-id={rowDndData?.bagId}
      data-dnd-bag-index={rowDndData?.bagIndex}
      // dnd-kit 原生样式：transform 让位预览；共享 DndContext（多容器）模式下不用原生位移——
      // 位移会让"视觉位置"偏离"布局位置"造成落点错行，多容器预览由宿主的插入指示线承担。
      // transition 已移除（用户要求：无过渡动画，落位即最终位置）
      style={{ transform: disableDisplacement ? undefined : CSS.Translate.toString(transform) }}
      className={`relative group ${isRowDirty() ? 'bg-amber-100/30' : 'hover:bg-stone-50'} ${sortableEnabled ? 'cursor-grab' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      {columns.map((c: any, ci: number) => {
        const cellPath = getCellPath(path || '', i, c.key);
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        // 渲染语义以列配置类型优先：c.type:'name'（名称式短文本）不换行且居中；
        // 描述列（text/markdown/描述类 key）多行换行，作为表的弹性列
        const effUi = c.type || cellHandler?.ui || '';
        const isDesc = effUi !== 'name' && isDescriptionCol(c.key, { ui: effUi });
        const isNameType = effUi === 'name';
        const isEditingThisCell = editingCell && editingCell.row === i && editingCell.col === ci;
        const isFillHandleCell = excelEnabled && excelView && i === excelView.rect?.row1 && ci === excelView.rect?.col1;
        return (
          <td
            key={c.key}
            data-xr={excelEnabled ? i : undefined}
            data-xc={excelEnabled ? ci : undefined}
            onMouseDown={(e) => onCellMouseDown?.(i, ci, e)}
            style={{ width: c.width, minWidth: c.minWidth }}
            className={`p-0 align-top whitespace-nowrap overflow-visible border-stone-300 ${excelEnabled && excelView ? excelView.cls(i, ci) : ''} ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}
          >
            {/* 行间悬停插入区：仅渲染在首列 td 内（ci === 0），以 tr（relative）为定位基准横跨整行；
                pointer-events 跟随行悬停激活——否则透明条会常驻拦截单元格顶部的正常点击。
                mousedown stopPropagation：excel 模式下阻止冒泡进单元格选区逻辑；
                hover 延迟 150ms：拖拽选区快速划过行间隙时不闪现"添加行"气泡 */}
            {ci === 0 && !noFirstRowInsert && onInsertAbove && (
              <div
                onClick={onInsertAbove}
                onMouseDown={(e) => e.stopPropagation()}
                title="在此处添加行"
                className="absolute inset-x-0 top-0 h-[4px] z-20 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-150 hover:delay-150"
              >
                <div className="absolute top-0 inset-x-2 border-t border-dashed border-primary/70 flex justify-center">
                  <span className="absolute -top-[9px] bg-white text-primary border border-primary/50 rounded-full px-1.5 leading-[16px] flex items-center gap-0.5 text-[10px] font-medium shadow-sm">
                    <Plus size={9} /> 添加行
                  </span>
                </div>
              </div>
            )}
            {excelEnabled ? (
              /* excel 模式包一层 relative：填充柄以单元格为定位基准（td 不能相对化——
                 行间插入区以 tr 为基准横跨整行，td 相对化会劫持其定位） */
              <div className="relative h-full">
                <DynamicInput
                  value={row[c.key] ?? ''}
                  originalValue={originalData?.[c.key]?.[i]}
                  onChange={(val) => updateData(i, c.key, val)}
                  path={cellPath}
                  readOnly={readOnly || readonlyColumns?.includes(c.key)}
                  columnKey={c.key}
                  type={cellHandler?.ui || c.type}
                  optionIndices={cellHandler?.optionIndices || c.optionIndices}
                  displayFormatter={c.displayFormatter}
                  align={c.align || (isNameType || !isDesc ? 'center' : 'left')}
                  singleLine={c.singleLine ?? (isNameType || !isDesc)}
                  row={row}
                  interactive={false}
                  editRequest={isEditingThisCell ? editingCell.token : 0}
                  editSeed={isEditingThisCell ? editingCell.seed : null}
                  editCancelRequest={excelView?.cancelToken ?? 0}
                  className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100"} ${c.className || ''}`}
                />
                {isFillHandleCell && (
                  <div
                    onMouseDown={onFillStart}
                    title={fillTip}
                    className="absolute bottom-0 right-0 w-2 h-2 bg-primary border border-white rounded-[1px] cursor-crosshair z-30"
                  />
                )}
              </div>
            ) : (
              <DynamicInput
                value={row[c.key] ?? ''}
                originalValue={originalData?.[c.key]?.[i]}
                onChange={(val) => updateData(i, c.key, val)}
                path={cellPath}
                readOnly={readOnly || readonlyColumns?.includes(c.key)}
                columnKey={c.key}
                type={cellHandler?.ui || c.type}
                optionIndices={cellHandler?.optionIndices || c.optionIndices}
                displayFormatter={c.displayFormatter}
                align={c.align || (isNameType || !isDesc ? 'center' : 'left')}
                singleLine={c.singleLine ?? (isNameType || !isDesc)}
                row={row}
                className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
              />
            )}
          </td>
        );
      })}
      {hasColumnActions && (
        <td className="p-0 border-r border-stone-300 bg-stone-50/20" />
      )}
      {enableSQShow && (
        <td className="p-0 text-center align-middle w-5 border-stone-300 border-r relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
          <div className="flex items-center justify-center w-full h-[32px]">
            <input
              type="checkbox"
              checked={data?.SQshow?.[i] !== false}
              disabled={readOnly}
              onChange={(e) => updateData(i, 'SQshow', e.target.checked)}
              className="rounded border-stone-300 text-stone-700 focus:ring-stone-500 w-4 h-4 cursor-pointer"
              title="在GM数据卡特殊能力(SQ)中显示"
            />
          </div>
        </td>
      )}
      {!fixedRows && (
        <td className="p-0 text-center align-middle w-5 border-stone-300 relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
          <div
            ref={sortableEnabled ? setActivatorNodeRef : undefined}
            {...(sortableEnabled ? { ...attributes, ...listeners } : {})}
            data-dnd-activator={sortableEnabled ? '' : undefined}
            className={`flex items-center justify-center w-full h-[32px] ${sortableEnabled ? 'cursor-grab touch-none' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          >
            {rowDraggable && rowActionMode === 'drag' ? (
              <GripVertical size={16} className={sortableEnabled ? 'text-stone-400' : 'text-stone-300 cursor-grab hover:text-stone-500'} />
            ) : (
              <button type="button" onClick={() => removeRow(i)} className="text-stone-300 hover:text-red-500 rounded p-0.5" title="删除行"><Trash2 size={16} /></button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
});

export default function DynamicTable(props: DynamicTableProps & { minWidth?: string; fixedLayout?: boolean; bordered?: boolean; noFirstRowInsert?: boolean; sharedDnd?: SharedDndConfig; insertPreviewIndex?: number | null; excel?: boolean; cutRect?: CellRect | null; onCut?: (rect: CellRect) => void; onConsumeCut?: () => void }) {
  const {
    path,
    columns: propsColumns,
    data,
    originalData,
    onChange,
    onColumnsChange,
    newItemGenerator,
    fixedRows: propsFixedRows,
    readonlyColumns,
    rowDraggable,
    rowActionMode = 'drag',
    onRowActionModeToggle,
    onRowReorder,
    readOnly = false,
    bordered = true,
    fixedLayout = false,
    noFirstRowInsert = false,
    minWidth,
    enableSQShow = false,
    sharedDnd,
    insertPreviewIndex = null,
    excel = false,
    cutRect = null,
    onCut,
    onConsumeCut
  } = props;
  const { t } = useTranslation();
  // 共享 DndContext 模式下监听本表行的拖拽，渲染浮动克隆（行不再 transform 跟随指针，滚动区不会被撑爆）
  const dndContext = useDndContext();
  const overlayRow = sharedDnd && dndContext.active
    ? (dndContext.active.data.current as { bagId?: string; index?: number } | undefined)
    : undefined;
  const overlayIndex = overlayRow && overlayRow.bagId === sharedDnd?.rowData?.bagId && typeof overlayRow.index === 'number'
    ? overlayRow.index
    : null;

  // dnd-kit 传感器（行拖拽；distance 5 避免与单元格输入冲突）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  // 共享 DndContext 模式下传感器由外层宿主提供，本表只需启用行 sortable
  const dndEnabled = !readOnly && (Boolean(onRowReorder) || Boolean(sharedDnd));

  // sortKey 和 sortOrder 现在仅作为 UI 状态（控制三角图标）
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const tableHandler = path ? getHandlerByPath(path) : null;
  const columns = propsColumns || tableHandler?.columns || [];
  const fixedRows = propsFixedRows !== undefined ? propsFixedRows : tableHandler?.fixedRows;
  const sortableColumns = tableHandler?.sortableColumns || [];

  const rowCount = useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 0;
    const firstKey = columns[0]?.key;
    if (!firstKey) return 0;
    const colData = (data as Record<string, any>)[firstKey];
    return Array.isArray(colData) ? colData.length : 0;
  }, [data, columns]);

  const currentIndices = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  const hasColumnActions = Boolean(onColumnsChange && !readOnly);

  const handleRenameColumn = useCallback((colIdx: number, newLabel: string) => {
    if (!onColumnsChange) return;
    const newCols = columns.map((c: any, i: number) => i === colIdx ? { ...c, label: newLabel } : c);
    onColumnsChange(newCols);
  }, [columns, onColumnsChange]);

  const handleAddColumn = useCallback(() => {
    if (!onColumnsChange) return;
    const newKey = `col_${Date.now()}`;
    const newLabel = `列${columns.length + 1}`;
    const newCols = [...columns, { key: newKey, label: newLabel }];
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    safeData[newKey] = new Array(rowCount).fill('');
    onColumnsChange(newCols);
    onChange(safeData);
  }, [columns, data, rowCount, onColumnsChange, onChange]);

  const handleDeleteColumn = useCallback((colIdx: number) => {
    if (!onColumnsChange || columns.length <= 1) return;
    const targetCol = columns[colIdx];
    const newCols = columns.filter((_: any, i: number) => i !== colIdx);
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    if (targetCol?.key) {
      delete safeData[targetCol.key];
    }
    onColumnsChange(newCols);
    onChange(safeData);
  }, [columns, data, onColumnsChange, onChange]);

  const handleSort = (key: string) => {
    if (!sortableColumns.includes(key)) return;
    if (excelEnabled) clearSelection(); // 排序物理重排行索引，选区语义失效直接清空

    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    
    // 1. 计算排序后的物理索引
    const indices = Array.from({ length: rowCount }, (_, i) => i);
    indices.sort((a, b) => {
      let valA = (data as any)[key]?.[a];
      let valB = (data as any)[key]?.[b];
      if (typeof valA === 'number' && typeof valB === 'number') return newOrder === 'asc' ? valA - valB : valB - valA;
      const strA = String(valA ?? ''); const strB = String(valB ?? '');
      return newOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // 2. 物理重排数据
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    const newData = { ...safeData };
    Object.keys(newData).forEach(k => {
      if (Array.isArray(newData[k])) {
        newData[k] = indices.map(i => newData[k][i]);
      }
    });

    // 3. 提交物理变更并更新 UI 状态
    onChange(newData);
    setSortKey(key);
    setSortOrder(newOrder);
  };

  const updateData = useCallback((index: number, key: string, value: any) => {
    if (readOnly) return;
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    const newData = { ...safeData };
    const cellPath = `${path || ''}.${key}[${index}]`;
    const cellHandler = getHandlerByPath(cellPath);
    const finalValue = cellHandler?.update ? cellHandler.update(value) : value;
    const defaultFill = key === 'SQshow' ? true : '';
    if (!newData[key] || !Array.isArray(newData[key])) newData[key] = new Array(rowCount).fill(defaultFill);
    const newColArray = [...newData[key]];
    while (newColArray.length < rowCount) {
      newColArray.push(defaultFill);
    }
    newColArray[index] = finalValue;
    newData[key] = newColArray;
    onChange(newData);
  }, [data, path, rowCount, readOnly, onChange]);

  /** 在指定位置插入一行（at 缺省追加到末尾）；行间悬停间隙与外部分析共用 */
  const addRowAtIndex = (at?: number) => {
    if (readOnly || fixedRows) return;
    const insertAt = Math.max(0, Math.min(at ?? rowCount, rowCount));
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    const newData = { ...safeData };
    const additions: Record<string, any> = {};
    if (newItemGenerator) {
      const newItem = newItemGenerator();
      Object.keys(newItem).forEach(key => {
        additions[key] = newItem[key];
        if (!newData[key] || !Array.isArray(newData[key])) newData[key] = new Array(rowCount).fill('');
      });
    } else {
      columns.forEach((c: any) => {
        const cellPath = `${path || ''}.${c.key}[0]`;
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        additions[c.key] = cellHandler?.getDefaultValue ? cellHandler.getDefaultValue() : '';
        if (!newData[c.key] || !Array.isArray(newData[c.key])) newData[c.key] = new Array(rowCount).fill('');
      });
    }
    Object.keys(additions).forEach(key => {
      const arr = [...newData[key]];
      arr.splice(insertAt, 0, additions[key]);
      newData[key] = arr;
    });
    if (enableSQShow) {
      const sq = Array.isArray(newData.SQshow) ? [...newData.SQshow] : new Array(rowCount).fill(true);
      while (sq.length < rowCount) sq.push(true);
      sq.splice(insertAt, 0, true);
      newData.SQshow = sq;
    }
    onChange(newData);
    setSortKey(null); // 添加行后清除排序标记
  };

  const removeRow = useCallback((index: number) => {
    if (readOnly || fixedRows) return;
    const safeData = (data && typeof data === 'object' && !Array.isArray(data)) ? { ...data } : {};
    const newData = { ...safeData };
    Object.keys(newData).forEach(key => {
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].filter((_: any, i: number) => i !== index);
      }
    });
    onChange(newData);
  }, [data, readOnly, fixedRows, onChange]);

  const isDescriptionCol = (key: string, handler: any) => {
    if (key === 'link' || handler?.ui === 'link') return false;
    return (handler?.ui === 'text' || handler?.ui === 'markdown' || ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => key.toLowerCase().includes(word)));
  };

  // ================= Excel 式表格操作（仅装备物品表启用，见 EquipmentBagItem） =================
  // 单击=选中（拖拽矩形/Shift 扩展）、双击或 Enter/F2=编辑、打字=覆盖输入、Delete=清空选区、
  // Ctrl+D=选区内首行向下填充、选区右下角填充柄下拉循环复制行；Ctrl+C/X/V 经 document 级
  // 剪贴板事件与 Excel 互通（TSV）。写入统一走 onChange，与逐格编辑同管线（updateByPath→Immer）。
  const excelEnabled = Boolean(excel) && !readOnly;
  const containerRef = useRef<HTMLDivElement>(null);
  const editTokenRef = useRef(0);
  const [selAnchor, setSelAnchor] = useState<{ row: number; col: number } | null>(null);
  const [selFocus, setSelFocus] = useState<{ row: number; col: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  // 焦点是否在容器内（含编辑态 input）：失焦时隐藏活动格 outline，选区高亮保留（Excel 行为）
  const [tableFocused, setTableFocused] = useState(false);
  const [editing, setEditing] = useState<{ row: number; col: number; key: string; token: number; seed: string | null; snapshot: any } | null>(null);
  const [editCancel, setEditCancel] = useState(0);
  const [isFillDrag, setIsFillDrag] = useState(false);
  const [fillPreviewRows, setFillPreviewRows] = useState<number[]>([]);
  const fillPreviewRef = useRef<number[]>([]);
  const fillSourceRef = useRef<CellRect | null>(null);

  const selection: CellRect | null = useMemo(
    () => (selAnchor && selFocus ? normalizeRect(selAnchor, selFocus) : null),
    [selAnchor, selFocus]
  );
  const activeCell = selFocus ?? selAnchor;

  const setFillPreview = useCallback((rows: number[]) => {
    fillPreviewRef.current = rows;
    setFillPreviewRows(rows);
  }, []);

  const clearSelection = useCallback(() => { setSelAnchor(null); setSelFocus(null); }, []);

  const exitEdit = useCallback((revert: boolean) => {
    // revert 走 updateData 幂等写回（snapshot 为编辑前存储值），StrictMode 双调无害
    setEditing(ed => {
      if (ed && revert) updateData(ed.row, ed.key, ed.snapshot);
      return null;
    });
    setEditCancel(c => c + 1);
  }, [updateData]);

  const requestEdit = useCallback((row: number, col: number, seed: string | null) => {
    const colKey = columns[col]?.key;
    if (!colKey) return;
    editTokenRef.current += 1;
    setEditing({ row, col, key: colKey, token: editTokenRef.current, seed, snapshot: data?.[colKey]?.[row] });
  }, [columns, data]);

  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (!excelEnabled) return;
    if (e.button !== 0 && e.button !== 2) return;
    // 编辑格内的左键交给原生行为（光标定位/文本选择）
    if (e.button === 0 && editing && editing.row === row && editing.col === col) return;
    e.preventDefault();
    if (e.button === 0 && !e.shiftKey) {
      // 左键=直接编辑（保留单击编辑习惯），同时把活动格收敛到本格（剪贴板/删除锚点随行）
      if (editing) exitEdit(false);
      requestEdit(row, col, null);
      setSelAnchor({ row, col });
      setSelFocus({ row, col });
      return;
    }
    // Shift+左键=扩展选区；右键=建立/拖拽矩形选区（菜单由容器 onContextMenu 屏蔽）
    if (editing) exitEdit(false);
    containerRef.current?.focus();
    if (e.shiftKey && selAnchor) {
      setSelFocus({ row, col });
    } else {
      setSelAnchor({ row, col });
      setSelFocus({ row, col });
    }
    setIsSelecting(true);
  }, [excelEnabled, editing, selAnchor, exitEdit, requestEdit]);

  const handleFillStart = useCallback((e: React.MouseEvent) => {
    if (!excelEnabled || !selection) return;
    e.preventDefault();
    e.stopPropagation();
    fillSourceRef.current = selection;
    setIsFillDrag(true);
  }, [excelEnabled, selection]);

  // 指针真值命中：拖拽期间 tbody 整体 pointer-events: none（hover 反馈全灭，见 index.css
  // 的 .excel-dragging），elementFromPoint 失效 → 改用 tr/td 布局矩形几何判定
  // （与 EquipmentSection 跨背包拖拽的指针真值判定同款思路）。位移已关闭，矩形即布局位置。
  const hitCell = useCallback((x: number, y: number): { row: number; col: number } | null => {
    const tbody = containerRef.current?.querySelector('tbody');
    if (!tbody) return null;
    for (const tr of Array.from(tbody.querySelectorAll('tr'))) {
      const firstTd = tr.querySelector('td[data-xr]');
      if (!firstTd) continue;
      const row = Number(firstTd.getAttribute('data-xr'));
      const r = (tr as HTMLElement).getBoundingClientRect();
      if (y < r.top || y > r.bottom) continue;
      for (const td of tr.querySelectorAll('td[data-xr]')) {
        const c = (td as HTMLElement).getBoundingClientRect();
        if (x >= c.left && x <= c.right) {
          return { row, col: Number(td.getAttribute('data-xc')) };
        }
      }
      return { row, col: columns.length - 1 }; // 横向落在把手列等非数据区 → 收在最后一列
    }
    return null;
  }, [columns]);

  // 选区拖拽与填充拖拽统一走 window pointermove + hitCell 几何命中（快速拖动不跳格）。
  // 不用 td onMouseEnter：快速划过时中间格会被跳过，命中测试逐 move 事件全量判定。
  useEffect(() => {
    if (!excelEnabled || !isSelecting) return;
    const onMove = (e: PointerEvent) => {
      const hit = hitCell(e.clientX, e.clientY);
      if (!hit) return;
      setSelFocus({ row: hit.row, col: hit.col });
    };
    const onUp = () => setIsSelecting(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [excelEnabled, isSelecting, hitCell]);

  useEffect(() => {
    if (!excelEnabled || !isFillDrag) return;
    const onMove = (e: PointerEvent) => {
      const src = fillSourceRef.current;
      if (!src) return;
      const hit = hitCell(e.clientX, e.clientY);
      const rows: number[] = [];
      if (hit) {
        const hitRow = hit.row;
        // 双向填充：向下补 src.row1+1..hitRow，向上补 hitRow..src.row0-1（值取模循环复制）
        if (hitRow > src.row1) for (let r = src.row1 + 1; r <= hitRow; r++) rows.push(r);
        else if (hitRow < src.row0) for (let r = hitRow; r < src.row0; r++) rows.push(r);
      }
      const prev = fillPreviewRef.current;
      if (prev.length !== rows.length || (rows.length > 0 && prev[0] !== rows[0])) setFillPreview(rows);
    };
    const onUp = () => {
      const src = fillSourceRef.current;
      const rows = fillPreviewRef.current;
      if (src && rows.length > 0) {
        onChange(fillRows(data, columns, path || '', src, rows));
        // 填充后选区覆盖源+目标区（Excel 行为）
        const top = Math.min(src.row0, rows[0]);
        const bottom = Math.max(src.row1, rows[rows.length - 1]);
        setSelAnchor({ row: top, col: src.col0 });
        setSelFocus({ row: bottom, col: src.col1 });
      }
      fillSourceRef.current = null;
      setFillPreview([]);
      setIsFillDrag(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [excelEnabled, isFillDrag, data, columns, path, onChange, setFillPreview, hitCell]);

  // 剪贴板走 document 级事件：仅当焦点在表格容器内且非编辑态时接管（编辑态由输入框原生行为接管）；
  // document 级而非容器级，规避"点击容器外后焦点在 body，容器 onPaste 收不到"的问题
  useEffect(() => {
    if (!excelEnabled) return;
    const tableHasFocus = () => Boolean(containerRef.current?.contains(document.activeElement));
    const onCopy = (e: ClipboardEvent) => {
      if (editing || !selection || !tableHasFocus()) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', buildTsv(data, columns, selection));
    };
    const onCutEvt = (e: ClipboardEvent) => {
      if (editing || !selection || !tableHasFocus()) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', buildTsv(data, columns, selection));
      onCut?.(selection);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (editing || fixedRows || !selection || !tableHasFocus()) return;
      // 锚点取选区矩形左上角（Excel 语义），而非活动格 selFocus（鼠标抬起位置）
      const anchor = { row: selection.row0, col: selection.col0 };
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      const grid = parseTsvGrid(text);
      if (grid.length === 0) return;
      const result = applyGrid(data, columns, path || '', anchor.row, anchor.col, grid);
      onChange(result.data);
      // 粘贴后选区覆盖目标区（Excel 行为）
      setSelAnchor({ row: result.rect.row0, col: result.rect.col0 });
      setSelFocus({ row: result.rect.row1, col: result.rect.col1 });
      // 任意粘贴都执行"移动"的最后一步：清除活动剪切源（Excel 语义）
      onConsumeCut?.();
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCutEvt);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCutEvt);
      document.removeEventListener('paste', onPaste);
    };
  }, [excelEnabled, editing, selection, data, columns, path, fixedRows, onCut, onConsumeCut, onChange]);

  const scrollCellIntoView = useCallback((row: number, col: number) => {
    containerRef.current?.querySelector(`td[data-xr="${row}"][data-xc="${col}"]`)?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (excelEnabled && activeCell) scrollCellIntoView(activeCell.row, activeCell.col);
  }, [excelEnabled, activeCell, scrollCellIntoView]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!excelEnabled) return;
    // 编辑态只接管 Escape（回退到编辑前值并退出，焦点回容器以便继续键盘导航），其余按键归单元格输入框
    if (editing) {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        exitEdit(true);
        containerRef.current?.focus();
      }
      return;
    }
    if (!selAnchor || !selFocus) return;
    const clampRow = (r: number) => Math.max(0, Math.min(rowCount - 1, r));
    const clampCol = (c: number) => Math.max(0, Math.min(columns.length - 1, c));
    const move = (dr: number, dc: number, extend: boolean) => {
      const from = extend ? selFocus : selAnchor;
      const r = clampRow(from.row + dr);
      const c = clampCol(from.col + dc);
      if (!extend) setSelAnchor({ row: r, col: c });
      setSelFocus({ row: r, col: c });
    };
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0, e.shiftKey); return;
      case 'ArrowDown': e.preventDefault(); move(1, 0, e.shiftKey); return;
      case 'ArrowLeft': e.preventDefault(); move(0, -1, e.shiftKey); return;
      case 'ArrowRight': e.preventDefault(); move(0, 1, e.shiftKey); return;
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1, false); return;
      case 'Enter': case 'F2': e.preventDefault(); requestEdit(selFocus.row, selFocus.col, null); return;
      case 'Delete': case 'Backspace':
        e.preventDefault();
        if (selection) onChange(clearCells(data, columns, path || '', selection));
        return;
      case 'Escape': e.preventDefault(); clearSelection(); return;
      case 'd': case 'D':
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        e.preventDefault();
        if (selection && selection.row1 > selection.row0) {
          const target: number[] = [];
          for (let r = selection.row0 + 1; r <= selection.row1; r++) target.push(r);
          onChange(fillRows(data, columns, path || '', selection, target));
        }
        return;
      default:
        // Excel 打字覆盖语义：可打印字符直接以该字符为种子进入编辑态
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          requestEdit(selFocus.row, selFocus.col, e.key);
        }
    }
  }, [excelEnabled, editing, selAnchor, selFocus, selection, rowCount, columns, data, path, exitEdit, requestEdit, clearSelection, onChange]);

  // 焦点整块离开表格：提交并退出编辑，隐藏活动格 outline（选区保留——与 Excel 一致）
  const handleContainerBlur = useCallback((e: React.FocusEvent) => {
    if (!excelEnabled) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsSelecting(false);
      setTableFocused(false);
      if (editing) exitEdit(false);
    }
  }, [excelEnabled, editing, exitEdit]);

  // 焦点从容器外进入容器（onFocus 即 focusin，容器内元素间转移由 relatedTarget 判断滤除）
  const handleContainerFocus = useCallback((e: React.FocusEvent) => {
    if (!excelEnabled) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTableFocused(true);
  }, [excelEnabled]);

  const getCellClass = useCallback((row: number, col: number): string => {
    let cls = '';
    if (selection && row >= selection.row0 && row <= selection.row1 && col >= selection.col0 && col <= selection.col1) {
      cls += ' bg-primary/10';
    }
    if (tableFocused && activeCell && activeCell.row === row && activeCell.col === col) {
      cls += ' outline outline-1 -outline-offset-1 outline-primary';
    }
    if (cutRect && row >= cutRect.row0 && row <= cutRect.row1 && col >= cutRect.col0 && col <= cutRect.col1) {
      cls += ' bg-rose-50/70 outline-dashed outline-1 -outline-offset-1 outline-rose-400';
    }
    if (fillPreviewRows.length > 0 && fillPreviewRows.includes(row) && selection && col >= selection.col0 && col <= selection.col1) {
      cls += ' bg-primary/20';
    }
    return cls;
  }, [selection, activeCell, tableFocused, cutRect, fillPreviewRows]);

  // 传给行的 excel 视图状态打包（单对象引用 = 行 memo 依赖最小化：仅选区/剪切/填充预览/编辑取消变化时重渲染）
  const excelView = useMemo(() => (excelEnabled ? {
    rect: selection,
    cls: getCellClass,
    cancelToken: editCancel
  } : null), [excelEnabled, selection, getCellClass, editCancel]);

  const isTableDirty = useMemo(() => {
    if (!originalData) return false;
    const normData = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    const normOrig = (originalData && typeof originalData === 'object' && !Array.isArray(originalData)) ? originalData : {};
    return JSON.stringify(normData) !== JSON.stringify(normOrig);
  }, [data, originalData]);

  const handleDragStart = (e: DragStartEvent) => {
    // 拖拽开始即清除排序 UI 状态
    if (sortKey) setSortKey(null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (!onRowReorder || !e.over) return;
    // 活动行/目标行的物理索引（useSortable 的 data 里携带）
    const from = e.active.data.current?.index;
    const to = e.over.data.current?.index;
    if (typeof from !== 'number' || typeof to !== 'number' || from === to) return;
    // flushSync：DOM 重排与松手同帧绘制，避免 dnd-kit 清理变换时出现“闪回再交换”帧
    flushSync(() => onRowReorder(from, to));
  };

  // 外层容器：独立模式包 DndContext；共享模式（可选）包容器级 droppable
  const content = (
    <div
      className={`relative w-full outline-none ${(isSelecting || isFillDrag) ? 'excel-dragging' : ''} ${isFillDrag ? 'cursor-crosshair' : isSelecting ? 'cursor-default' : ''}`}
      ref={excelEnabled ? containerRef : undefined}
      tabIndex={excelEnabled ? 0 : undefined}
      onKeyDown={excelEnabled ? handleKeyDown : undefined}
      onFocus={excelEnabled ? handleContainerFocus : undefined}
      onBlur={excelEnabled ? handleContainerBlur : undefined}
      onContextMenu={excelEnabled ? (e) => e.preventDefault() : undefined}
    >
    {/* fixedLayout 表格百分比列对剩余宽度解析、数学上精确适配容器——横向滚动是多余能力，
        且 border-collapse 半像素边框会计入 scrollWidth（经典滚动条下 1px 溢出也拉出滚动条），
        clip 让亚像素噪声永远无法成为滚动条；auto 布局表仍需 overflow-x-auto 承载 min-content 超宽 */}
    <div className={`w-full transition-all ${bordered ? 'rounded border' : ''} ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'} ${fixedLayout ? 'overflow-x-clip' : 'overflow-x-auto'}`}>
      {/* 表格最小宽 = 各列最小宽之和（表头/单元格文字宽 + c.minWidth 弹性列防收缩声明），
          列宽随显示文字撑定，经 min-content 向上传播决定分栏最小宽与缩放时机 */}
      {/* fixedLayout：列宽由配置百分比硬定（近战/远程两表需逐列一致时使用）；auto 布局列宽随内容 */}
      <table className={`w-full border-collapse text-sm ${fixedLayout ? "table-fixed" : "table-auto"}`} style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any, colIdx: number) => {
              const isSortable = sortableColumns.includes(c.key);
              return (
                <th
                  key={c.key}
                  style={{ width: c.width, minWidth: c.minWidth }}
                  className={`border-stone-300 px-2 py-1.5 text-center font-semibold relative whitespace-nowrap group/col ${c.hideRightBorder ? '' : 'border-r last:border-r-0'} ${isSortable ? 'cursor-pointer hover:bg-stone-300 select-none' : ''}`}
                  onClick={() => isSortable && handleSort(c.key)}
                >
                  <div className="flex items-center justify-center gap-1">
                    {onColumnsChange && !readOnly ? (
                      <input
                        value={c.label}
                        onChange={(e) => handleRenameColumn(colIdx, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-stone-400 focus:border-stone-700 focus:bg-white text-center font-semibold outline-none w-full px-1 text-stone-800 transition-colors"
                        placeholder="列名"
                        title="点击编辑列名"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span>{t(c.label)}</span>
                    )}
                    {isSortable && sortKey === c.key && (
                      <Triangle size={8} className={`fill-current transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                    {onColumnsChange && !readOnly && columns.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn(colIdx);
                        }}
                        className="opacity-0 group-hover/col:opacity-100 p-0.5 text-stone-400 hover:text-red-500 rounded transition-opacity ml-0.5"
                        title="删除此列"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
            {hasColumnActions && (
              <th className="w-8 p-0 text-center align-middle border-stone-300 border-r bg-stone-200/80 hover:bg-stone-300/80 transition-colors" title="添加新列">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="w-full h-[32px] flex items-center justify-center text-stone-500 hover:text-stone-800"
                >
                  <Plus size={14} />
                </button>
              </th>
            )}
            {enableSQShow && (
              <th className="w-8 p-0 text-center align-middle border-stone-300 border-r" title="在GM数据卡特殊能力(SQ)中显示">
                <div className="flex items-center justify-center w-full h-[32px] text-stone-500 font-semibold text-xs select-none">
                  SQ
                </div>
              </th>
            )}
            {!fixedRows && (
              <th className="w-5 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle && (
                  <button type="button" onClick={onRowActionModeToggle} className="p-0.5 w-full flex justify-center text-stone-400 hover:text-stone-900 transition-colors pointer-events-auto">
                    {rowActionMode === 'drag' ? <GripVertical size={16} className="shrink-0" /> : <Trash2 size={16} className="shrink-0 text-red-400 hover:text-red-500" />}
                  </button>
                )}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {/* 空表格：无行则无行间间隙，保留一条精简的添加入口 */}
          {rowCount === 0 && !readOnly && (
            <tr>
              <td
                colSpan={columns.length + 1 + (enableSQShow ? 1 : 0) + (hasColumnActions ? 1 : 0)}
                className="p-0 bg-stone-50/60 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <button
                  type="button"
                  onClick={() => addRowAtIndex(0)}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 px-3 py-1.5 w-full justify-center"
                >
                  <Plus size={12} /> 添加行
                </button>
              </td>
            </tr>
          )}
          <SortableContext items={currentIndices.map(idx => `${sharedDnd?.idPrefix ?? ''}row-${idx}`)} strategy={verticalListSortingStrategy}>
          {currentIndices.map((idx) => (
            <React.Fragment key={`row-${idx}`}>
            {/* 跨背包拖拽的插入指示线：insertPreviewIndex = 物品将插入到该行之前（与宿主 dragend 指针真值判定同源） */}
            {insertPreviewIndex === idx && <InsertIndicatorRow colSpan={columns.length + 1 + (enableSQShow ? 1 : 0) + (hasColumnActions ? 1 : 0) + (fixedRows ? 0 : 1)} />}
            <DynamicTableRow
              key={`row-${idx}`}
              index={idx}
              sortableEnabled={dndEnabled}
              rowSortableId={`${sharedDnd?.idPrefix ?? ''}row-${idx}`}
              rowDndData={sharedDnd?.rowData}
              disableDisplacement={Boolean(sharedDnd)}
              columns={columns}
              data={data}
              originalData={originalData}
              path={path}
              readOnly={readOnly}
              readonlyColumns={readonlyColumns}
              rowDraggable={rowDraggable}
              rowActionMode={rowActionMode}
              updateData={updateData}
              removeRow={removeRow}
              fixedRows={fixedRows}
              isDescriptionCol={isDescriptionCol}
              enableSQShow={enableSQShow}
              hasColumnActions={hasColumnActions}
              noFirstRowInsert={noFirstRowInsert}
              onInsertAbove={readOnly || fixedRows ? undefined : () => addRowAtIndex(idx)}
              excelEnabled={excelEnabled}
              excelView={excelView}
              editingCell={editing}
              onCellMouseDown={handleCellMouseDown}
              onFillStart={handleFillStart}
              fillTip={t('editor.items.fill_down')}
            />
            </React.Fragment>
          ))}
          {insertPreviewIndex !== null && insertPreviewIndex >= rowCount && <InsertIndicatorRow colSpan={columns.length + 1 + (enableSQShow ? 1 : 0) + (hasColumnActions ? 1 : 0) + (fixedRows ? 0 : 1)} />}
          </SortableContext>
        </tbody>
      </table>
    </div>
      {/* 末行下缘插入区：挂在滚动容器外的定位层——气泡可悬浮于横线中央（跨线一半在外），
          不被 overflow 裁剪、不给滚动容器撑出竖向滚动条；需横向滚动的宽表行为一致 */}
      {!readOnly && !fixedRows && rowCount > 0 && (
        <div
          onClick={() => addRowAtIndex(rowCount)}
          title="在此处添加行"
          className="row-insert-zone absolute inset-x-0 bottom-0 h-[4px] z-20 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-150 hover:delay-150"
        >
          <div className="absolute bottom-0 inset-x-2 border-b border-dashed border-primary/70 flex justify-center">
            <span className="absolute -top-[9px] bg-white text-primary border border-primary/50 rounded-full px-1.5 leading-[16px] flex items-center gap-0.5 text-[10px] font-medium shadow-sm">
              <Plus size={9} /> 添加行
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (sharedDnd) {
    // 共享 DndContext 模式：宿主（如 EquipmentSection）持有 DndContext，本表只挂 SortableContext。
    // 容器级 droppable 仅在空表时渲染：非空表行 droppable 与整表容器 droppable 在 closestCenter
    // 下会相互竞争（指针判定漂移），空表没有行可竞争，容器投放语义才唯一确定。
    const isEmpty = currentIndices.length === 0;
    const wrapped = sharedDnd.containerId && isEmpty ? (
      <DroppableArea id={sharedDnd.containerId} data={sharedDnd.containerData} className="relative w-full">
        {content}
      </DroppableArea>
    ) : content;
    return (
      <>
        {wrapped}
        {/* 本表行被拖拽时渲染浮动克隆（DragOverlay 需在宿主 DndContext 内） */}
        <DragOverlay dropAnimation={null} modifiers={[restrictToVerticalAxis]}>
          {overlayIndex !== null ? (
            <div className="w-fit max-w-[280px] bg-white border border-stone-300 rounded shadow-lg px-2.5 py-1 text-sm text-ink whitespace-nowrap overflow-hidden text-ellipsis">
              {String(data?.[columns[0]?.key]?.[overlayIndex] ?? '')}
            </div>
          ) : null}
        </DragOverlay>
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
    </DndContext>
  );
}

import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragStartEvent, type DragOverEvent, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Triangle } from 'lucide-react';
import { DynamicTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import { flushSync } from 'react-dom';
import DynamicInput from './DynamicInput';

const DynamicTableRow = memo(({
  index: i, columns, data, originalData, path, readOnly, readonlyColumns, rowDraggable, rowActionMode, onRowDragStart, onRowDragOver, onRowDrop, onRowReorder, sortableEnabled, updateData, removeRow, fixedRows, isDescriptionCol, enableSQShow, hasColumnActions, onInsertAbove, onInsertBelow
}: any) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `row-${i}`, data: { index: i }, disabled: !sortableEnabled });
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
      // dnd-kit 原生样式：transform 让位预览；transition 已移除（用户要求：无过渡动画，落位即最终位置）
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`relative group ${isRowDirty() ? 'bg-amber-100/30' : 'hover:bg-stone-50'} ${sortableEnabled ? 'cursor-grab' : ''}`}
    >
      {columns.map((c: any, ci: number) => {
        const cellPath = getCellPath(path || '', i, c.key);
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        // 渲染语义以列配置类型优先：c.type:'name'（名称式短文本）不换行且居中；
        // 描述列（text/markdown/描述类 key）多行换行，作为表的弹性列
        const effUi = c.type || cellHandler?.ui || '';
        const isDesc = effUi !== 'name' && isDescriptionCol(c.key, { ui: effUi });
        const isNameType = effUi === 'name';
        return (
          <td key={c.key} style={{ width: c.width, minWidth: c.minWidth }} className={`p-0 align-top whitespace-nowrap overflow-visible ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
            {/* 行间悬停插入区：仅渲染在首列 td 内（ci === 0），以 tr（relative）为定位基准横跨整行；
                pointer-events 跟随行悬停激活——否则透明条会常驻拦截单元格顶部的正常点击 */}
            {ci === 0 && onInsertAbove && (
              <div
                onClick={onInsertAbove}
                title="在此处添加行"
                className="absolute inset-x-0 -top-[5px] h-[10px] z-20 cursor-pointer opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto flex items-center justify-center"
              >
                <div className="w-11/12 border-t border-dashed border-primary/70 relative flex justify-center">
                  <span className="absolute -top-[10px] bg-white text-primary border border-primary/50 rounded-full px-1.5 leading-[16px] flex items-center gap-0.5 text-[10px] font-medium shadow-sm">
                    <Plus size={9} /> 添加行
                  </span>
                </div>
              </div>
            )}
            {ci === 0 && onInsertBelow && (
              <div
                onClick={onInsertBelow}
                title="在此处添加行"
                className="absolute inset-x-0 -bottom-[5px] h-[10px] z-20 cursor-pointer opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto flex items-center justify-center"
              >
                <div className="w-11/12 border-t border-dashed border-primary/70 relative flex justify-center">
                  <span className="absolute -top-[10px] bg-white text-primary border border-primary/50 rounded-full px-1.5 leading-[16px] flex items-center gap-0.5 text-[10px] font-medium shadow-sm">
                    <Plus size={9} /> 添加行
                  </span>
                </div>
              </div>
            )}
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
          </td>
        );
      })}
      {hasColumnActions && (
        <td className="p-0 border-r border-stone-300 bg-stone-50/20" />
      )}
      {enableSQShow && (
        <td className="p-0 text-center align-middle w-8 border-stone-300 border-r relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
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
        <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
          <div
            ref={sortableEnabled ? setActivatorNodeRef : undefined}
            {...(sortableEnabled ? { ...attributes, ...listeners } : {})}
            className={`flex items-center justify-center w-full h-[32px] ${sortableEnabled ? 'cursor-grab touch-none' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          >
            {rowDraggable && rowActionMode === 'drag' ? (
              <GripVertical size={16} className={sortableEnabled ? 'text-stone-400' : 'text-stone-300 cursor-grab hover:text-stone-500'} />
            ) : (
              <button type="button" onClick={() => removeRow(i)} className="text-stone-300 hover:text-red-500 rounded p-1" title="删除行"><Trash2 size={16} /></button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
});

export default function DynamicTable(props: DynamicTableProps & { minWidth?: string; sizerRows?: string[][] }) {
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
    onRowDragStart: propsDragStart,
    onRowDragOver,
    onRowDrop: propsDrop,
    readOnly = false,
    minWidth,
    sizerRows,
    enableSQShow = false
  } = props;
  const { t } = useTranslation();

  // dnd-kit 传感器（行拖拽；distance 5 避免与单元格输入冲突）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dndEnabled = Boolean(onRowReorder) && !readOnly;

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

  const onDragStart = (idx: number, e: React.DragEvent) => {
    // 只要触发拖拽，就清除排序 UI 状态
    if (sortKey) setSortKey(null);
    propsDragStart?.(idx, e);
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className={`w-full rounded border transition-all ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'} overflow-x-auto`}>
      {/* 表格最小宽 = 各列最小宽之和（表头/单元格文字宽 + c.minWidth 弹性列防收缩声明），
          列宽随显示文字撑定，经 min-content 向上传播决定分栏最小宽与缩放时机 */}
      <table className="w-full border-collapse text-sm table-auto" style={minWidth ? { minWidth } : undefined}>
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
              <th className="w-8 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle && (
                  <button type="button" onClick={onRowActionModeToggle} className="p-1.5 w-full flex justify-center text-stone-400 hover:text-stone-900 transition-colors pointer-events-auto">
                    {rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}
                  </button>
                )}
              </th>
            )}
          </tr>
        </thead>
        {/* 联合定宽行：多张同构表格（如近战/远程攻击）传入相同 sizerRows 时，
            各列按两组内容的并集取宽，实现跨表列对齐；高度 0 隐藏不占位。
            独立 tbody 承载（tr 不能直接挂在 table 下）。
            每列 white-space 跟随列语义：不换行列（name/数值）用 nowrap 使 min-content = 整行文字宽，
            多行弹性列（desc/notes）用 pre-wrap（min-content 极小，由 max-content 参与剩余分配）。
            内层 div 的 minWidth:min-content 是传播关键（T3 实验：显式 min-width 才会被表格布局采纳） */}
        {sizerRows?.length ? (
          <tbody aria-hidden="true">
            {sizerRows.map((row, r) => {
              // sizer 行列数必须与真实行一致（数据列 + 操作/拖拽等固定列），否则 auto 布局列错位
              const extraCols = (hasColumnActions ? 1 : 0) + (enableSQShow ? 1 : 0) + (!fixedRows ? 1 : 0);
              return (
                <tr key={`sizer-${r}`} style={{ height: 0 }}>
                  {row.map((txt, ci) => {
                    const col = columns[ci] as any;
                    const cellHandler = path ? getHandlerByPath(`${path}.${col?.key}[0]`) : null;
                    const effUi = col?.type || cellHandler?.ui || '';
                    const isDescCol = effUi !== 'name' && isDescriptionCol(col?.key || '', { ui: effUi });
                    return (
                      <td key={ci} style={{ height: 0, padding: '0 8px', border: 'none' }}>
                        <div style={{ height: 0, overflow: 'hidden', whiteSpace: isDescCol ? 'pre-wrap' : 'nowrap', minWidth: 'min-content' }}>{txt}</div>
                      </td>
                    );
                  })}
                  {Array.from({ length: extraCols }).map((_, k) => (
                    <td key={`x-${k}`} style={{ height: 0, padding: 0, border: 'none' }} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        ) : null}
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
          <SortableContext items={currentIndices.map(idx => `row-${idx}`)} strategy={verticalListSortingStrategy}>
          {currentIndices.map((idx) => (
            <DynamicTableRow
              key={`row-${idx}`}
              index={idx}
              sortableEnabled={dndEnabled}
              columns={columns}
              data={data}
              originalData={originalData}
              path={path}
              readOnly={readOnly}
              readonlyColumns={readonlyColumns}
              rowDraggable={rowDraggable}
              rowActionMode={rowActionMode}
              onRowDragStart={onDragStart}
              onRowDragOver={onRowDragOver}
              onRowDrop={propsDrop}
              updateData={updateData}
              removeRow={removeRow}
              fixedRows={fixedRows}
              isDescriptionCol={isDescriptionCol}
              enableSQShow={enableSQShow}
              hasColumnActions={hasColumnActions}
              onInsertAbove={readOnly || fixedRows ? undefined : () => addRowAtIndex(idx)}
              onInsertBelow={readOnly || fixedRows || idx !== rowCount - 1 ? undefined : () => addRowAtIndex(rowCount)}
            />
          ))}
          </SortableContext>
        </tbody>
      </table>
    </div>
    </DndContext>
  );
}

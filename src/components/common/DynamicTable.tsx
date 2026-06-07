import React, { memo, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Triangle } from 'lucide-react';
import { DynamicTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import DynamicInput from './DynamicInput';

const DynamicTableRow = memo(({ 
  index: i, columns, data, originalData, path, readOnly, readonlyColumns, rowDraggable, rowActionMode, onRowDragStart, onRowDragOver, onRowDrop, updateData, removeRow, fixedRows, isDescriptionCol 
}: any) => {
  const getCellPath = (basePath: string, index: number, key: string) => {
    if (!basePath) return undefined;
    return `${basePath}.${key}[${index}]`;
  };

  const isRowDirty = () => {
    if (!originalData) return false;
    return columns.some((c: any) => {
      const val = data[c.key]?.[i];
      const origVal = originalData[c.key]?.[i];
      return val !== origVal && String(val ?? '') !== String(origVal ?? '');
    });
  };

  const row: Record<string, any> = {};
  columns.forEach((c: any) => { row[c.key] = data[c.key]?.[i]; });

  return (
    <tr
      className={`transition-colors group ${isRowDirty() ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
      draggable={rowDraggable && rowActionMode === 'drag'}
      onDragStart={(e) => onRowDragStart?.(i, e)}
      onDragOver={(e) => onRowDragOver?.(i, e)}
      onDrop={(e) => onRowDrop?.(i, e)}
    >
      {columns.map((c: any) => {
        const cellPath = getCellPath(path || '', i, c.key);
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        const isDesc = isDescriptionCol(c.key, cellHandler);
        return (
          <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
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
              align={c.align || (isDesc ? 'left' : 'center')}
              singleLine={!isDesc}
              row={row}
              className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
            />
          </td>
        );
      })}
      {!fixedRows && (
        <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
          <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
            {rowDraggable && rowActionMode === 'drag' ? (
              <GripVertical size={16} className="text-stone-300 cursor-grab hover:text-stone-500" />
            ) : (
              <button type="button" onClick={() => removeRow(i)} className="text-stone-300 hover:text-red-500 rounded p-1" title="删除行"><Trash2 size={16} /></button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
});

export default function DynamicTable(props: DynamicTableProps & { minWidth?: string }) {
  const { path, columns: propsColumns, data, originalData, onChange, newItemGenerator, fixedRows: propsFixedRows, readonlyColumns, rowDraggable, rowActionMode = 'drag', onRowActionModeToggle, onRowDragStart: propsDragStart, onRowDragOver, onRowDrop: propsDrop, readOnly = false, minWidth = '600px' } = props;
  const { t } = useTranslation();

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

  // 渲染时总是使用原始物理索引
  const currentIndices = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  const handleSort = (key: string) => {
    if (!sortableColumns.includes(key)) return;

    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    
    // 1. 计算排序后的物理索引
    const indices = Array.from({ length: rowCount }, (_, i) => i);
    indices.sort((a, b) => {
      let valA = (data as any)[key][a];
      let valB = (data as any)[key][b];
      if (typeof valA === 'number' && typeof valB === 'number') return newOrder === 'asc' ? valA - valB : valB - valA;
      const strA = String(valA ?? ''); const strB = String(valB ?? '');
      return newOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // 2. 物理重排数据
    const newData = { ...data };
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
    const newData = { ...data };
    const cellPath = `${path || ''}.${key}[${index}]`;
    const cellHandler = getHandlerByPath(cellPath);
    const finalValue = cellHandler?.update ? cellHandler.update(value) : value;
    if (!newData[key]) newData[key] = new Array(rowCount).fill('');
    const newColArray = [...newData[key]];
    newColArray[index] = finalValue;
    newData[key] = newColArray;
    onChange(newData);
  }, [data, path, rowCount, readOnly, onChange]);

  const addRow = () => {
    if (readOnly || fixedRows) return;
    const newData = { ...data };
    if (newItemGenerator) {
      const newItem = newItemGenerator();
      Object.keys(newItem).forEach(key => {
        if (!newData[key]) newData[key] = new Array(rowCount).fill('');
        newData[key] = [...newData[key], newItem[key]];
      });
    } else {
      columns.forEach((c: any) => {
        const cellPath = `${path || ''}.${c.key}[0]`;
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        const defaultValue = cellHandler?.getDefaultValue ? cellHandler.getDefaultValue() : '';
        if (!newData[c.key]) newData[c.key] = new Array(rowCount).fill(defaultValue);
        newData[c.key] = [...newData[c.key], defaultValue];
      });
    }
    onChange(newData);
    setSortKey(null); // 添加行后清除排序标记
  };

  const removeRow = useCallback((index: number) => {
    if (readOnly || fixedRows) return;
    const newData = { ...data };
    Object.keys(newData).forEach(key => { if (Array.isArray(newData[key])) newData[key] = newData[key].filter((_: any, i: number) => i !== index); });
    onChange(newData);
  }, [data, readOnly, fixedRows, onChange]);

  const isDescriptionCol = (key: string, handler: any) => (handler?.ui === 'text' || handler?.ui === 'markdown' || ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => key.toLowerCase().includes(word)));
  const isTableDirty = useMemo(() => (originalData ? JSON.stringify(data) !== JSON.stringify(originalData) : false), [data, originalData]);

  return (
    <div className={`w-full rounded border transition-all ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'} overflow-x-auto`}>
      <table className="w-full border-collapse text-sm table-auto" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any) => {
              const isSortable = sortableColumns.includes(c.key);
              return (
                <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'} ${isSortable ? 'cursor-pointer hover:bg-stone-300 select-none' : ''}`} onClick={() => isSortable && handleSort(c.key)}>
                  <div className="flex items-center justify-center gap-1">{t(c.label)}{sortKey === c.key && <Triangle size={8} className={`fill-current transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}</div>
                </th>
              );
            })}
            {!fixedRows && (
              <th className="w-8 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle && (<button type="button" onClick={onRowActionModeToggle} className="p-1.5 w-full flex justify-center text-stone-400 hover:text-stone-900 transition-colors pointer-events-auto">{rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}</button>)}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {currentIndices.map((idx) => (
            <DynamicTableRow key={idx} index={idx} columns={columns} data={data} originalData={originalData} path={path} readOnly={readOnly} readonlyColumns={readonlyColumns} rowDraggable={rowDraggable} rowActionMode={rowActionMode} onRowDragStart={onDragStart} onRowDragOver={onRowDragOver} onRowDrop={propsDrop} updateData={updateData} removeRow={removeRow} fixedRows={fixedRows} isDescriptionCol={isDescriptionCol} />
          ))}
          {!fixedRows && (
            <tr><td colSpan={columns.length + 1} className="p-0 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"><button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-3 py-2 w-full justify-center font-medium uppercase tracking-wider"><Plus size={14} /> {t('common.add_row')}</button></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

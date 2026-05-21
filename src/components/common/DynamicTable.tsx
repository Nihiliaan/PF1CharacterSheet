import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DynamicTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import DynamicInput from './DynamicInput';

export default function DynamicTable(props: DynamicTableProps & { minWidth?: string }) {
  const {
    path,
    columns: propsColumns,
    data,
    originalData,
    onChange,
    newItemGenerator,
    fixedRows: propsFixedRows,
    readonlyColumns,
    rowDraggable,
    rowActionMode = 'drag',
    onRowActionModeToggle,
    onRowDragStart,
    onRowDragOver,
    onRowDrop,
    readOnly = false,
    minWidth = '600px'
  } = props;

  const { t } = useTranslation();

  // 从 Schema 获取 Handler
  const tableHandler = path ? getHandlerByPath(path) : null;

  // 优先级：传入的 columns > Schema 定义的列
  const columns = propsColumns || tableHandler?.columns || [];
  const fixedRows = propsFixedRows !== undefined ? propsFixedRows : tableHandler?.fixedRows;

  // SoA 模式下的行数计算
  const rowCount = React.useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 0;
    const firstKey = columns[0]?.key;
    if (!firstKey) return 0;
    const colData = (data as Record<string, any>)[firstKey];
    return Array.isArray(colData) ? colData.length : 0;
  }, [data, columns]);

  const updateData = (index: number, key: string, value: any) => {
    if (readOnly) return;
    const newData = { ...data };

    const cellPath = getCellPath(path || '', index, key);
    const cellHandler = getHandlerByPath(cellPath);
    const finalValue = cellHandler?.update ? cellHandler.update(value) : value;

    if (!newData[key]) {
      // 初始化数组，确保长度一致
      newData[key] = new Array(rowCount).fill('');
    }
    const newColArray = [...newData[key]];
    newColArray[index] = finalValue;
    newData[key] = newColArray;

    onChange(newData);
  };

  const addRow = () => {
    if (readOnly || fixedRows) return;
    const newData = { ...data };

    // 优先使用传入的生成器，如果没有则从 Schema 获取默认值
    if (newItemGenerator) {
      const newItem = newItemGenerator();
      Object.keys(newItem).forEach(key => {
        if (!newData[key]) newData[key] = new Array(rowCount).fill('');
        newData[key] = [...newData[key], newItem[key]];
      });
    } else {
      columns.forEach((c: any) => {
        const cellPath = getCellPath(path || '', 0, c.key); // 获取列路径（不考虑索引）
        const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
        const defaultValue = cellHandler?.getDefaultValue ? cellHandler.getDefaultValue() : '';
        
        if (!newData[c.key]) newData[c.key] = new Array(rowCount).fill(defaultValue);
        newData[c.key] = [...newData[c.key], defaultValue];
      });
    }
    onChange(newData);
  };

  const removeRow = (index: number) => {
    if (readOnly || fixedRows) return;
    const newData = { ...data };
    Object.keys(newData).forEach(key => {
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].filter((_: any, i: number) => i !== index);
      }
    });
    onChange(newData);
  };

  const getCellPath = (basePath: string, index: number, key: string) => {
    if (!basePath) return undefined;
    return `${basePath}.${key}[${index}]`;
  };

  const isRowDirty = (index: number) => {
    if (!originalData) return true;
    return columns.some(c => {
      const val = data[c.key]?.[index];
      const origVal = originalData[c.key]?.[index];
      if (val === origVal) return false;

      // 获取该列的处理器
      const cellPath = getCellPath(path || '', index, c.key);
      const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;

      const v1 = cellHandler?.update ? cellHandler.update(String(val ?? '')) : val;
      const v2 = cellHandler?.update ? cellHandler.update(String(origVal ?? '')) : origVal;

      if (typeof v1 === 'object' || typeof v2 === 'object') {
        return JSON.stringify(v1) !== JSON.stringify(v2);
      }

      return v1 !== v2;
    });
  };

  const isDescriptionCol = (key: string, handler: any) => {
    if (handler?.ui === 'text' || handler?.ui === 'markdown') return true;
    const k = key.toLowerCase();
    return ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => k.includes(word));
  };

  const getRowData = (index: number) => {
    const row: Record<string, any> = {};
    columns.forEach(c => {
      row[c.key] = data[c.key]?.[index];
    });
    return row;
  };

  return (
    <div className={`w-full rounded border transition-all ${JSON.stringify(data) !== JSON.stringify(originalData) ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'} overflow-x-auto`}>
      <table className="w-full border-collapse text-sm table-auto" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {t(c.label)}
              </th>
            ))}
            {!fixedRows && (
              <th className="w-8 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle ? (
                  <button
                    type="button"
                    onClick={onRowActionModeToggle}
                    className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    {rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}
                  </button>
                ) : null}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {Array.from({ length: rowCount }).map((_, i) => {
            const row = getRowData(i);
            return (
              <tr
                key={i}
                className={`transition-colors group ${isRowDirty(i) ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
                draggable={rowDraggable && rowActionMode === 'drag'}
                onDragStart={(e) => onRowDragStart?.(i, e)}
                onDragOver={(e) => onRowDragOver?.(i, e)}
                onDrop={(e) => onRowDrop?.(i, e)}
              >
                {columns.map((c: any) => {
                  const cellPath = getCellPath(path || '', i, c.key);
                  const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;

                  return (
                    <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                      <DynamicInput
                        value={String(row[c.key] ?? '')}
                        originalValue={originalData?.[c.key]?.[i]}
                        onChange={(val) => updateData(i, c.key, val)}
                        path={cellPath}
                        readOnly={readOnly || readonlyColumns?.includes(c.key)}
                        columnKey={c.key}
                        type={cellHandler?.ui || c.type}
                        options={cellHandler?.options || c.options}
                        displayFormatter={c.displayFormatter}
                        align={c.align || (isDescriptionCol(c.key, cellHandler) ? 'left' : 'center')}
                        row={row}
                        className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
                      />
                    </td>
                  );
                })}
                {!fixedRows && (
                  <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors">
                    <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {rowDraggable && rowActionMode === 'drag' ? (
                        <GripVertical size={16} className="text-stone-300 cursor-grab hover:text-stone-500" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-stone-300 hover:text-red-500 rounded p-1"
                          title="删除行"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {!fixedRows && (
            <tr>
              <td colSpan={columns.length + 1} className="p-0 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-3 py-2 w-full justify-center font-medium uppercase tracking-wider"
                >
                  <Plus size={14} /> {t('common.add_row')}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

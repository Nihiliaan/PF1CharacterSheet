import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DynamicTableProps, ATTRIBUTE_NAMES } from '../../types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { validateInput, normalizeValue } from '../../utils/validation';
import { useNumericStepper } from '../../hooks/useNumericStepper';

import DynamicInput from './DynamicInput';

export default function DynamicTable(props: DynamicTableProps & { minWidth?: string }) {
  const { columns, data, originalData, onChange, newItemGenerator, fixedRows, readonlyColumns, footerRow, onFooterChange, footerReadonlyColumns, onColumnLabelChange, onRemoveColumn, onAddColumn, rowDraggable, rowActionMode = 'drag', onRowActionModeToggle, onRowDragStart, onRowDragOver, onRowDrop, readOnly = false, minWidth = '600px' } = props;
  const updateData = (index: number, key: string, value: string) => {
    if (readOnly) return;
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };
  const addRow = () => {
    if (readOnly) return;
    if (newItemGenerator && !fixedRows) {
      onChange([...data, newItemGenerator()]);
    }
  };
  const removeRow = (index: number) => {
    if (readOnly) return;
    if (!fixedRows) {
      onChange(data.filter((_, i) => i !== index));
    }
  };

  const isTableDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c, index) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold group/th relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {onColumnLabelChange ? (
                  <input
                    value={c.label}
                    onChange={(e) => onColumnLabelChange(index, e.target.value)}
                    className="bg-transparent outline-none w-full font-semibold focus:bg-white focus:text-stone-900 border-b border-transparent focus:border-stone-400 transition-colors"
                  />
                ) : (
                  c.label
                )}
                {onRemoveColumn && columns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveColumn(index)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-red-500 rounded opacity-0 group-hover/th:opacity-100 transition-opacity bg-stone-200"
                    title="删除列"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </th>
            ))}
            {!fixedRows && (
              <th className="w-8 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle ? (
                  <button
                    type="button"
                    onClick={onRowActionModeToggle}
                    className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                    title={rowActionMode === 'drag' ? "切换到删除模式" : "切换到拖拽模式"}
                  >
                    {rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}
                  </button>
                ) : onAddColumn && (
                  <button
                    type="button"
                    onClick={onAddColumn}
                    className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                    title="添加列"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {data.map((row, i) => (
            <tr
              key={i}
              className={`transition-colors group ${JSON.stringify(row) !== JSON.stringify(originalData?.[i]) ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
              draggable={rowDraggable && rowActionMode === 'drag'}
              onDragStart={(e) => onRowDragStart?.(i, e)}
              onDragOver={(e) => onRowDragOver?.(i, e)}
              onDrop={(e) => onRowDrop?.(i, e)}
            >
              {columns.map((c) => (
                <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                  <DynamicInput
                    value={row[c.key] || ''}
                    originalValue={originalData?.[i]?.[c.key]}
                    onChange={(val) => updateData(i, c.key, val)}
                    readOnly={readOnly || readonlyColumns?.includes(c.key)}
                    columnKey={c.key}
                    type={c.type as any}
                    options={c.options}
                    displayFormatter={c.displayFormatter}
                    className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
                  />
                </td>
              ))}
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
          ))}
          {!fixedRows && (
            <tr>
              <td colSpan={columns.length + 1} className="p-0 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-3 py-2 w-full justify-center font-medium uppercase tracking-wider"
                >
                  <Plus size={14} /> 添加行 Add Row
                </button>
              </td>
            </tr>
          )}
          {footerRow && onFooterChange && (
            <tr className="bg-stone-100 text-stone-800 border-t-2 border-stone-300">
              {columns.map((c) => (
                <td key={`footer-${c.key}`} className="p-0 relative border-r border-stone-300 last:border-r-0 align-top">
                  <DynamicInput
                    value={footerRow[c.key] || ''}
                    onChange={(val) => onFooterChange({ ...footerRow, [c.key]: val })}
                    readOnly={readOnly || footerReadonlyColumns?.includes(c.key)}
                    columnKey={c.key}
                    type={c.type as any}
                    className={(readOnly || footerReadonlyColumns?.includes(c.key)) ? "font-bold bg-stone-200/50 text-stone-800" : "font-bold hover:bg-stone-50 focus:bg-white"}
                  />
                </td>
              ))}
              {!fixedRows && <td className="p-0 border-t-2 border-stone-300"></td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

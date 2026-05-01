import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DynamicTableProps } from '../../types';
import MarkdownInlineEditor from './MarkdownInlineEditor';

const DynamicCellInput = ({
  value,
  originalValue,
  onChange,
  className = '',
  readOnly = false,
  type = 'text',
  options,
  displayFormatter
}: {
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  className?: string;
  readOnly?: boolean;
  type?: 'text' | 'float' | 'quantity' | 'select' | 'int' | 'posInt' | 'checkbox' | 'bonus';
  options?: string[];
  displayFormatter?: (v: string, isFocused: boolean) => string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isChanged = !readOnly && originalValue !== undefined && value !== originalValue;

  const displayValue = () => {
    if (displayFormatter) return displayFormatter(value, isFocused);
    if (type === 'checkbox') return value === 'true' ? '+3' : '';
    if (type === 'quantity' && !isFocused) {
      if (!value || value === '1') return '';
      return `×${value}`;
    }
    if (type === 'bonus' && !isFocused && value !== '') {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 0) return `+${num}`;
    }
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (type === 'float') {
      if (val !== '' && !/^-?\d*\.?\d{0,2}$/.test(val)) return;
    }
    if (type === 'int') {
      if (val !== '' && !/^-?\d*$/.test(val)) return;
    }
    if (type === 'posInt' || type === 'quantity') {
      if (val !== '' && !/^\d*$/.test(val)) return;
    }
    onChange(val);
  };

  const toggleCheckbox = () => {
    if (readOnly) return;
    onChange(value === 'true' ? '' : 'true');
  };

  // Base classes used by EVERY cell to ensure pixel-perfect consistency
  const BASE_CLASSES = `px-2 py-1 min-h-[32px] font-medium transition-colors ${className}`;

  if (readOnly) {
    return (
      <div className={`${BASE_CLASSES} whitespace-pre-wrap break-words flex items-center h-full`}>
        <MarkdownInlineEditor 
          value={value} 
          readOnly={true} 
          onChange={() => {}} 
          className="!bg-transparent !p-0"
        />
      </div>
    );
  }

  return (
    <div className={`grid h-full w-full relative group transition-colors min-h-[32px] ${isChanged ? 'bg-amber-100/40' : ''}`}>
      {type === 'select' && options ? (
        <div className="relative w-full h-full">
          <select
            value={value}
            onChange={handleChange as any}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt || '—'}</option>
            ))}
          </select>
          <div className={`${BASE_CLASSES} w-full h-full flex items-center ${isChanged ? 'text-amber-700' : 'text-ink'}`}>
            {displayValue() || <span className="text-stone-300">—</span>}
          </div>
        </div>
      ) : type === 'checkbox' ? (
        <div 
          onClick={toggleCheckbox}
          className={`${BASE_CLASSES} w-full h-full flex items-center cursor-pointer hover:bg-stone-100/50 ${isChanged ? 'text-amber-900' : 'text-ink'}`}
        >
          {displayValue()}
        </div>
      ) : type === 'text' ? (
          <div className={`${BASE_CLASSES} flex items-center w-full h-full`}>
            <MarkdownInlineEditor
                value={value}
                originalValue={originalValue}
                onChange={onChange}
                className="!bg-transparent !p-0"
            />
          </div>
      ) : (
        <>
          <div className={`col-start-1 row-start-1 invisible whitespace-pre-wrap break-words ${BASE_CLASSES} pointer-events-none`}>
            {displayValue() + '\n'}
          </div>
          <textarea
            value={isFocused && (type === 'quantity' || type === 'bonus' || type === 'int' || type === 'posInt') ? value : displayValue()}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden outline-none bg-transparent ${BASE_CLASSES} ${type === 'quantity' ? 'text-stone-500' : ''} ${isChanged ? 'text-amber-900' : ''}`}
            rows={1}
          />
        </>
      )}
      {isChanged && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
};

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
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-left font-semibold group/th relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
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
                  <DynamicCellInput
                    value={row[c.key] || ''}
                    originalValue={originalData?.[i]?.[c.key]}
                    onChange={(val) => updateData(i, c.key, val)}
                    readOnly={readOnly || readonlyColumns?.includes(c.key)}
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
                  <DynamicCellInput
                    value={footerRow[c.key] || ''}
                    onChange={(val) => onFooterChange({ ...footerRow, [c.key]: val })}
                    readOnly={readOnly || footerReadonlyColumns?.includes(c.key)}
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

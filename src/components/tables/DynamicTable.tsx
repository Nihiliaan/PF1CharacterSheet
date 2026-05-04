import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DynamicInput from '../../controls/DynamicInput';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import { getHandlerByPath } from '../../schema/fieldRegistry';

export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  hideRightBorder?: boolean;
}

export interface DynamicTableProps {
  path?: string; // 必须由 SchemaRenderer 传入
  data?: any[];
  originalData?: any[];
  onChange?: (data: any[]) => void;
  newItemGenerator?: () => any;
  readOnly?: boolean;
  rowDraggable?: boolean;
  minWidth?: string;
}

export default function DynamicTable(props: DynamicTableProps) {
  const { t } = useTranslation();
  const {
    path,
    data: overrideData,
    originalData: overrideOriginal,
    onChange: overrideOnChange,
    newItemGenerator,
    readOnly,
    rowDraggable,
    minWidth
  } = props;

  // 1. 从路径解析 Handler 及其携带的配置
  const tableHandler = path ? getHandlerByPath(path) : null;
  const columns: ColumnConfig[] = tableHandler?.columns || [];
  const fixedRows = tableHandler?.fixedRows || false;

  const data = useCharacterStore(s => (path ? get(s.data, path) : overrideData) || []);
  const updateField = useCharacterStore(s => s.updateField);

  const handleChange = (newData: any[]) => {
    if (overrideOnChange) {
      overrideOnChange(newData);
    } else if (path) {
      updateField(path, newData);
    }
  };

  const addRow = () => {
    const newItem = newItemGenerator ? newItemGenerator() : {};
    handleChange([...data, newItem]);
  };

  const removeRow = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    handleChange(newData);
  };

  /**
   * 自动探测单元格的 Handler 类型
   */
  const getCellHandlerType = (columnKey: string, index: number) => {
    if (!path) return 'text';
    const cellPath = `${path}[${index}].${columnKey}`;
    const handler = getHandlerByPath(cellPath);
    return handler?.ui || 'text';
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-collapse text-sm" style={{ minWidth: minWidth || '600px' }}>
        <thead>
          <tr className="border-b-2 border-stone-300">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={`py-2 px-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider ${
                  c.hideRightBorder ? '' : 'border-r border-stone-200'
                } last:border-r-0`}
              >
                {c.label}
              </th>
            ))}
            {!readOnly && !fixedRows && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {data.map((row: any, i: number) => (
            <tr key={i} className="group hover:bg-stone-50/50 transition-colors">
              {columns.map((c) => (
                <td
                  key={`${i}-${c.key}`}
                  className={`p-0 relative ${c.hideRightBorder ? '' : 'border-r border-stone-100'} last:border-r-0 align-top`}
                >
                  <DynamicInput
                    path={path ? `${path}[${i}].${c.key}` : undefined}
                    value={path ? undefined : row[c.key]}
                    originalValue={undefined}
                    onChange={path ? undefined : (val) => {
                      const newData = [...data];
                      newData[i] = { ...row, [c.key]: val };
                      handleChange(newData);
                    }}
                    // 核心变更：不再依赖列配置中的 type，而是实时查询对应的 Handler 类型
                    type={getCellHandlerType(c.key, i) as any}
                    readOnly={readOnly}
                    className="hover:bg-primary/5 focus:bg-white"
                  />
                </td>
              ))}
              {!readOnly && !fixedRows && (
                <td className="w-10 px-2 py-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    {rowDraggable && (
                      <div className="cursor-grab text-stone-300 hover:text-stone-500 p-1">
                        <GripVertical size={14} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-stone-300 hover:text-red-500 rounded p-1"
                      title="删除行"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {!fixedRows && !readOnly && (
            <tr>
              <td colSpan={columns.length + (fixedRows ? 0 : 1)} className="p-0 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
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
        </tbody>
      </table>
    </div>
  );
}

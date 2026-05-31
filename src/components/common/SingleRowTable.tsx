import React from 'react';
import { useTranslation } from 'react-i18next';
import { SingleRowTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import DynamicInput from './DynamicInput';

export default function SingleRowTable(props: SingleRowTableProps) {
  const {
    path,
    columns: propsColumns,
    data,
    originalData,
    onChange,
    readonlyColumns,
    readOnly = false,
    minWidth = '100%'
  } = props;

  const { t } = useTranslation();

  // 从 Schema 获取 Handler (主要为了获取 columns 定义)
  const tableHandler = path ? getHandlerByPath(path) : null;
  const columns = propsColumns || tableHandler?.columns || [];

  const updateData = (key: string, value: any) => {
    if (readOnly) return;
    const newData = { ...data };

    const cellPath = path ? `${path}.${key}` : undefined;
    const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;
    const finalValue = cellHandler?.update ? cellHandler.update(value) : value;

    newData[key] = finalValue;
    onChange(newData);
  };

  const isTableDirty = JSON.stringify(data) !== JSON.stringify(originalData);

  return (
    <div className={`w-full rounded border transition-all ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={`border-stone-300 px-2 py-1.5 text-center font-semibold relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}
              >
                {t(c.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c: any) => {
              const cellPath = path ? `${path}.${c.key}` : undefined;
              const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;

              return (
                <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                  <DynamicInput
                    value={String(data[c.key] ?? '')}
                    originalValue={originalData?.[c.key]}
                    onChange={(val) => updateData(c.key, val)}
                    path={cellPath}
                    readOnly={readOnly || readonlyColumns?.includes(c.key)}
                    columnKey={c.key}
                    type={cellHandler?.ui || c.type}
                    optionIndices={cellHandler?.optionIndices || c.optionIndices}
                    displayFormatter={c.displayFormatter}
                    align={c.align || 'center'}
                    row={data}
                    className={`${(readOnly || readonlyColumns?.includes(c.key)) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
                  />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

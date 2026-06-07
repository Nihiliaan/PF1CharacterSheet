import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Column } from '../../schema/types';
import DynamicInput from './DynamicInput';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import handlers from '../../schema/handlers';

interface SpellTableProps {
  spellType: number;
  data: Record<string, any>;
  originalData?: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  readOnly?: boolean;
  path?: string;
}

export default function SpellTable({
  spellType,
  data,
  originalData,
  onChange,
  readOnly = false,
  path
}: SpellTableProps) {
  const { t } = useTranslation();

  // 根据 spellType 过滤列
  const columns = React.useMemo(() => {
    const cols: Column[] = [];
    if (spellType !== 5) {
      cols.push({ key: 'level', label: 'editor.spells.level', width: '10%' });
    }
    if (spellType !== 0 && spellType !== 1 && spellType !== 4) {
      cols.push({ key: 'uses', label: 'editor.spells.uses', width: '20%' });
    }
    cols.push({ key: 'spells', label: 'editor.spells.spell_name', width: 'auto' });
    return cols;
  }, [spellType]);

  // SoA 模式下的行数计算
  const rowCount = React.useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 0;
    // 优先使用 spells 数组作为行数来源，因为它是最核心且始终存在的列
    const spellsArr = (data as Record<string, any>)['spells'];
    if (Array.isArray(spellsArr)) return spellsArr.length;

    // 兜底：寻找任意一个数组
    const firstKey = Object.keys(data).find(k => Array.isArray(data[k]));
    return firstKey ? data[firstKey].length : 0;
  }, [data]);

  const getCellPath = (basePath: string, index: number, key: string) => {
    if (!basePath) return undefined;
    return `${basePath}.${key}[${index}]`;
  };

  const updateData = (index: number, key: string, value: any) => {
    if (readOnly) return;
    const newData = { ...data };
    if (!newData[key]) newData[key] = [];
    const newColArray = [...newData[key]];

    const cellPath = getCellPath(path || '', index, key);
    const finalValue = getHandlerByPath(cellPath)?.update?.(value) ?? value;

    newColArray[index] = finalValue;
    newData[key] = newColArray;
    onChange(newData);
  };

  const canAdd = React.useMemo(() => {
    if (spellType === 5) return true; // 类法术无限制
    if (spellType === 0 || spellType === 2) return rowCount < 10;
    if (spellType === 1 || spellType === 3) return rowCount < 4;
    if (spellType === 4) return rowCount < 6;
    return false;
  }, [rowCount, spellType]);

  const addRowTop = () => {
    if (readOnly) return;
    if (!canAdd) return;

    const newData = { ...data };
    columns.forEach(c => {
      if (c.key === 'level') return;

      const cellPath = getCellPath(path || '', 0, c.key);
      const defaultValue = getHandlerByPath(cellPath)?.getDefaultValue?.() ?? '';

      if (!newData[c.key]) newData[c.key] = new Array(rowCount).fill(defaultValue);
      newData[c.key] = [defaultValue, ...newData[c.key]];
    });
    onChange(newData);
  };

  const removeRow = (index: number) => {
    if (readOnly) return;
    const newData = { ...data };
    Object.keys(newData).forEach(key => {
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].filter((_, i) => i !== index);
      }
    });
    onChange(newData);
  };

  const isRowDirty = (index: number) => {
    if (!originalData) return true;
    return columns.some(c => {
      if (c.key === 'level') return false;
      const val = data[c.key]?.[index];
      const origVal = originalData[c.key]?.[index];
      return JSON.stringify(val) !== JSON.stringify(origVal);
    });
  };

  // 生成行视图的辅助函数
  const getRowData = (index: number) => {
    const row: Record<string, any> = {};
    columns.forEach(c => {
      if (c.key !== 'level') {
        row[c.key] = data[c.key]?.[index];
      }
    });
    return row;
  };

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${JSON.stringify(data) !== JSON.stringify(originalData) ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {t(c.label)}
              </th>
            ))}
            <th className="w-8 p-0 align-middle border-stone-300">
              {canAdd && (
                <button
                  type="button"
                  onClick={addRowTop}
                  className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer bg-stone-100 border-l border-stone-300 hover:bg-stone-50"
                  title={t('common.add_row')}
                >
                  <Plus size={16} />
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {Array.from({ length: rowCount }).map((_, i) => {
            const row = getRowData(i);
            const lowestLevel = handlers.SpellTypeHandler.lowestLevel[spellType];
            const computedLevelNumber = rowCount - 1 - i + lowestLevel;

            return (
              <tr
                key={i}
                className={`transition-colors group ${isRowDirty(i) ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
              >
                {columns.map((c) => {
                  const cellPath = getCellPath(path || '', i, c.key);
                  const cellHandler = cellPath ? getHandlerByPath(cellPath) : null;

                  return (
                    <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                      {c.key === 'level' ? (
                        <div className="w-full h-full flex items-center justify-center font-bold px-2 text-stone-700 bg-stone-100/50 min-h-[32px]">
                          {t('editor.spells.computed_level', { n: computedLevelNumber })}
                        </div>
                      ) : (
                        <DynamicInput
                          value={row[c.key] || ''}
                          originalValue={originalData?.[c.key]?.[i]}
                          onChange={(val) => updateData(i, c.key, val)}
                          path={cellPath}
                          readOnly={readOnly}
                          columnKey={c.key}
                          type={cellHandler?.ui || (c.key === 'uses' ? 'dailyUses' : 'text')}
                          displayFormatter={c.displayFormatter}
                          align={c.key === 'spells' ? 'left' : 'center'}
                          singleLine={c.key !== 'notes' && c.key !== 'desc'}
                          className={readOnly ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors">
                  <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {(spellType === 5 || i === 0) && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-stone-300 hover:text-red-500 rounded p-1"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

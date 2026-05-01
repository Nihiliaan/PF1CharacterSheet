import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Column } from '../../types';
import DynamicInput from './DynamicInput';
interface SpellTableProps {
  columns: Column[];
  data: Record<string, string>[];
  originalData?: Record<string, string>[];
  baseLevel: 0 | 1;
  onChange: (data: Record<string, string>[]) => void;
  onBaseLevelChange: (level: 0 | 1) => void;
  readOnly?: boolean;
}

export default function SpellTable({
  columns,
  data,
  originalData,
  baseLevel,
  onChange,
  onBaseLevelChange,
  readOnly = false
}: SpellTableProps) {
  const { t } = useTranslation();

  const updateData = (index: number, key: string, value: string) => {
    if (readOnly) return;
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };

  const addRowTop = () => {
    if (readOnly) return;
    const maxAllowedRows = 10 - baseLevel; // If baseLevel=0, 9-0+0 = 9 max index -> 10 rows. If baseLevel=1, 9-1+1 = 9 max level... Wait.
    // user said: "最高到9环". If the max level would exceed 9, do not allow adding.
    // Current max level is: data.length - 1 + baseLevel
    // If we add a row, it becomes data.length + baseLevel.
    // So if data.length + baseLevel > 9, we shouldn't add.
    if (data.length + baseLevel > 9) return;

    const newObj: Record<string, string> = {};
    columns.forEach(c => { newObj[c.key] = ''; });
    onChange([newObj, ...data]);
  };

  const removeRow = (index: number) => {
    if (readOnly) return;
    onChange(data.filter((_, i) => i !== index));
  };

  const isTableDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  const canAdd = data.length + baseLevel <= 9;

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {c.label}
              </th>
            ))}
            <th className="w-8 p-0 align-middle border-stone-300">
              {canAdd && (
                <button
                  type="button"
                  onClick={addRowTop}
                  className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer bg-stone-100 border-l border-stone-300 hover:bg-stone-50"
                  title="在上方添加行"
                >
                  <Plus size={16} />
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {data.map((row, i) => {
            const isLastRow = i === data.length - 1;
            const computedLevelNumber = data.length - 1 - i + baseLevel;
            const computedLevelDisplay = isLastRow ? '' : t('editor.spells.computed_level', { n: computedLevelNumber });
            const isRowDirty = JSON.stringify(row) !== JSON.stringify(originalData?.[i]);

            return (
              <tr
                key={i}
                className={`transition-colors group ${isRowDirty ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                    {c.key === 'level' ? (
                      <div className="w-full h-full flex items-center justify-center font-bold px-2 text-stone-700 bg-stone-100/50 min-h-[32px]">
                        {isLastRow ? (
                          <select
                            value={baseLevel}
                            onChange={(e) => onBaseLevelChange(Number(e.target.value) as 0 | 1)}
                            className="bg-transparent font-bold outline-none border-b border-transparent focus:border-stone-400 cursor-pointer text-center text-stone-700 hover:bg-stone-200"
                            disabled={readOnly}
                          >
                            <option value={0}>{t('editor.spells.base_level_0')}</option>
                            <option value={1}>{t('editor.spells.base_level_1')}</option>
                          </select>
                        ) : (
                          computedLevelDisplay
                        )}
                      </div>
                    ) : (
                      <DynamicInput
                        value={row[c.key] || ''}
                        originalValue={originalData?.[i]?.[c.key]}
                        onChange={(val) => updateData(i, c.key, val)}
                        readOnly={readOnly}
                        columnKey={c.key}
                        type={c.type as any}
                        options={c.options}
                        displayFormatter={c.displayFormatter}
                        className={readOnly ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"}
                      />
                    )}
                  </td>
                ))}
                <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors">
                  <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isLastRow && (
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

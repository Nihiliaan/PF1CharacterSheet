import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import DynamicInput from '../../controls/DynamicInput';

export default function SpellTable(props: any) {
  const {
    path,
    columns: propColumns,
    data: propData,
    originalData: propOriginalData,
    baseLevel,
    onChange: propOnChange,
    onBaseLevelChange: propOnBaseLevelChange,
    readOnly = false
  } = props;

  const { t } = useTranslation();

  // 1. Store 链接
  const storeData = useCharacterStore(s => path ? get(s.data, path) : undefined);
  const storeOriginalData = useCharacterStore(s => path ? get(s.originalData, path) : undefined);
  const updateField = useCharacterStore(s => s.updateField);

  /**
   * SoA 适配层：将对象数组结构转换为组件熟悉的行数组结构
   * 如果 path 存在，说明数据是 { level: [], spells: [] } 格式
   */
  const { data, originalData } = React.useMemo(() => {
    const raw = path ? (storeData || {}) : (propData || []);
    const rawOrig = path ? (storeOriginalData || {}) : (propOriginalData || []);

    if (!path && Array.isArray(raw)) return { data: raw, originalData: rawOrig };

    // 执行 SoA 转行转换
    const keys = Object.keys(raw).filter(k => Array.isArray(raw[k]));
    const rowCount = keys.length > 0 ? raw[keys[0]].length : 0;
    
    const rows = Array.from({ length: rowCount }, (_, i) => {
      const row: any = {};
      keys.forEach(k => { row[k] = raw[k][i]; });
      return row;
    });

    const origRows = Array.from({ length: rowCount }, (_, i) => {
      const row: any = {};
      keys.forEach(k => { row[k] = rawOrig[k]?.[i]; });
      return row;
    });

    return { data: rows, originalData: origRows };
  }, [path, storeData, propData, storeOriginalData, propOriginalData]);

  const columns = propColumns || [];

  const onChange = (newData: any[]) => {
    if (path) {
        // 行转 SoA
        const soaData: any = {};
        columns.forEach(c => { soaData[c.key] = newData.map(r => r[c.key]); });
        updateField(path, soaData);
    } else if (propOnChange) {
        propOnChange(newData);
    }
  };

  const onBaseLevelChange = (newLevel: 0 | 1) => {
    if (path) {
        if (propOnBaseLevelChange) propOnBaseLevelChange(newLevel);
    } else if (propOnBaseLevelChange) {
        propOnBaseLevelChange(newLevel);
    }
  };

  const updateData = (index: number, key: string, value: string) => {
    if (readOnly) return;
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };

  const addRowTop = () => {
    if (readOnly) return;
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

  const isDescriptionCol = (key?: string) => {
    if (!key) return false;
    const k = key.toLowerCase();
    return ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => k.includes(word));
  };

  const canAdd = data.length + baseLevel <= 9;

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {c.label}
              </th>
            ))}
            <th className="w-8 p-0 align-middle border-stone-300">
              {canAdd && !readOnly && (
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
          {data.map((row: any, i: number) => {
            const isLastRow = i === data.length - 1;
            const computedLevelNumber = data.length - 1 - i + baseLevel;
            const computedLevelDisplay = isLastRow ? '' : t('editor.spells.computed_level', { n: computedLevelNumber });
            const isRowDirty = JSON.stringify(row) !== JSON.stringify(originalData?.[i]);

            return (
              <tr
                key={i}
                className={`transition-colors group ${isRowDirty ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
              >
                {columns.map((c: any) => (
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
                        path={path ? `${path}.${c.key}[${i}]` : undefined}
                        value={path ? undefined : (row[c.key] || '')}
                        originalValue={path ? undefined : originalData?.[i]?.[c.key]}
                        onChange={path ? undefined : (val) => updateData(i, c.key, val)}
                        readOnly={readOnly}
                        type={c.type as any}
                        options={c.options}
                        align={c.align || (isDescriptionCol(c.key) ? 'left' : 'center')}
                        className={readOnly ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"}
                      />
                    )}
                  </td>
                ))}
                <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors">
                  <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isLastRow && !readOnly && (
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

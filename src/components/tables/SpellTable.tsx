import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import DynamicInput from '../../controls/DynamicInput';

export default function SpellTable(props: any) {
  const {
    path,
    typePath, // Path to 'spellTemplate' in store
    readOnly = false
  } = props;

  const { t } = useTranslation();

  // 1. Store 链接
  const storeData = useCharacterStore(s => path ? get(s.data, path) : undefined);
  const storeOriginalData = useCharacterStore(s => path ? get(s.originalData, path) : undefined);
  const spellTemplate = useCharacterStore(s => typePath ? get(s.data, typePath) : 'prepared_0');
  const updateField = useCharacterStore(s => s.updateField);

  const isSla = spellTemplate === 'sla';
  const baseLevel = (spellTemplate === 'spontaneous_1' || spellTemplate === 'prepared_1') ? 1 : 0;

  // 2. 字段定义与过滤逻辑
  const allColumns = [
    { key: 'level', label: t('editor.spells.headers.level'), width: '15%' },
    { key: 'uses', label: t('editor.spells.headers.uses'), width: '15%' },
    { key: 'spells', label: t('editor.spells.headers.spells'), width: '70%' }
  ];

  const columns = React.useMemo(() => {
    if (spellTemplate === 'prepared_0' || spellTemplate === 'prepared_1') {
      return allColumns.filter(c => c.key !== 'uses').map(c => c.key === 'spells' ? { ...c, width: '85%' } : c);
    }
    if (isSla) {
      return allColumns.filter(c => c.key !== 'level').map(c => c.key === 'spells' ? { ...c, width: '85%' } : c);
    }
    return allColumns;
  }, [spellTemplate, t, isSla]);

  /**
   * SoA 适配层
   */
  const { data, originalData } = React.useMemo(() => {
    const raw = storeData || {};
    const rawOrig = storeOriginalData || {};

    const keys = ['uses', 'spells'];
    const rowCount = Math.max(...keys.map(k => (Array.isArray(raw[k]) ? raw[k].length : 0)), 0);
    
    const rows = Array.from({ length: rowCount }, (_, i) => {
      const row: any = {};
      keys.forEach(k => { row[k] = raw[k]?.[i] || ''; });
      return row;
    });

    const origRows = Array.from({ length: rowCount }, (_, i) => {
      const row: any = {};
      keys.forEach(k => { row[k] = rawOrig[k]?.[i] || ''; });
      return row;
    });

    return { data: rows, originalData: origRows };
  }, [storeData, storeOriginalData]);

  const onChange = (newData: any[]) => {
    if (path) {
        const soaData: any = {};
        ['uses', 'spells'].forEach(k => { 
          soaData[k] = newData.map(r => r[k]); 
        });
        updateField(path, soaData);
    }
  };

  const addRow = () => {
    if (readOnly) return;
    if (!isSla && data.length + baseLevel >= 10) return; // 0-9 环，最多 10 行
    const newObj = { uses: '', spells: '' };
    onChange([newObj, ...data]);
  };

  const removeRow = (index: number) => {
    if (readOnly) return;
    onChange(data.filter((_, i) => i !== index));
  };

  const isTableDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'border-amber-400 bg-amber-50/10' : 'border-stone-200 bg-white shadow-sm'}`}>
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="bg-stone-50 text-stone-500 uppercase tracking-widest text-[10px]">
            {columns.map((c: any) => (
              <th key={c.key} style={{ width: c.width }} className="px-2 py-2 text-center font-bold border-b border-stone-100 border-r last:border-r-0">
                {c.label}
              </th>
            ))}
            <th className="w-28 border-b border-stone-100 bg-stone-100/50 px-1">
              <div className="flex items-center gap-1 justify-end pr-1">
                {!readOnly && (
                  <select
                    value={spellTemplate}
                    onChange={(e) => typePath && updateField(typePath, e.target.value)}
                    className="text-[9px] bg-white border border-stone-200 rounded px-1 py-0.5 font-bold text-stone-400 hover:text-stone-600 outline-none cursor-pointer w-16"
                  >
                    <option value="prepared_0">0-環准</option>
                    <option value="prepared_1">無0環准</option>
                    <option value="spontaneous_0">0-環自</option>
                    <option value="spontaneous_1">無0環自</option>
                    <option value="sla">类法</option>
                  </select>
                )}
                {!readOnly && (
                  <button onClick={addRow} className="shrink-0 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors" title={t('common.add_row')}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((row: any, i: number) => {
            const isRowDirty = JSON.stringify(row) !== JSON.stringify(originalData?.[i]);
            return (
              <tr key={i} className={`transition-colors group ${isRowDirty ? 'bg-amber-50/20' : 'hover:bg-stone-50/50'}`}>
                {columns.map((c: any) => (
                  <td key={c.key} className="p-0 relative border-r border-stone-100 last:border-r-0">
                    {c.key === 'level' && !isSla ? (
                      <div className="w-full h-full flex items-center justify-center font-bold px-2 text-stone-400 bg-stone-50/30 min-h-[34px]">
                        {(data.length - 1 - i) + baseLevel}
                      </div>
                    ) : (
                      <DynamicInput
                        path={`${path}.${c.key}[${i}]`}
                        readOnly={readOnly}
                        align={c.key === 'spells' ? 'left' : 'center'}
                        className={readOnly ? "bg-transparent" : "hover:bg-stone-50 focus:bg-white transition-colors py-2"}
                      />
                    )}
                  </td>
                ))}
                <td className="p-0 text-center align-middle w-10 relative">
                  {!readOnly && (
                    <button onClick={() => removeRow(i)} className="w-full h-full flex items-center justify-center text-stone-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

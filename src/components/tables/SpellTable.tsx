import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import DynamicInput from '../../controls/DynamicInput';

export default function SpellTable(props: any) {
  const {
    path,
    spellTemplate, // 'spontaneous_0' | 'spontaneous_1' | 'prepared_0' | 'prepared_1' | 'sla'
    onTemplateChange,
    readOnly = false
  } = props;

  const { t } = useTranslation();

  // 1. Store 链接
  const storeData = useCharacterStore(s => path ? get(s.data, path) : undefined);
  const storeOriginalData = useCharacterStore(s => path ? get(s.originalData, path) : undefined);
  const updateField = useCharacterStore(s => s.updateField);

  const isSla = spellTemplate === 'sla';
  const baseLevel = (spellTemplate === 'spontaneous_1' || spellTemplate === 'prepared_1') ? 1 : 0;

  // 2. 字段定义与过滤逻辑
  const allColumns = [
    { key: 'level', label: t('editor.spells.headers.level'), width: '10%' },
    { key: 'uses', label: t('editor.spells.headers.uses'), width: '20%' },
    { key: 'spells', label: t('editor.spells.headers.spells'), width: '70%' }
  ];

  const columns = React.useMemo(() => {
    if (spellTemplate === 'prepared_0' || spellTemplate === 'prepared_1') {
      return allColumns.filter(c => c.key !== 'uses').map(c => c.key === 'spells' ? { ...c, width: '90%' } : c);
    }
    if (isSla) {
      return allColumns.filter(c => c.key !== 'level').map(c => c.key === 'spells' ? { ...c, width: '80%' } : c);
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
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <div className="flex items-center justify-between px-2 py-1 bg-stone-100/50 border-b border-stone-300">
        <select
          value={spellTemplate}
          onChange={(e) => onTemplateChange?.(e.target.value)}
          className="text-[10px] bg-transparent border-none font-bold text-stone-500 uppercase tracking-widest outline-none cursor-pointer hover:text-stone-800 transition-colors"
          disabled={readOnly}
        >
          <option value="prepared_0">0-環准备</option>
          <option value="prepared_1">無0環准备</option>
          <option value="spontaneous_0">0-環自发</option>
          <option value="spontaneous_1">無0環自发</option>
          <option value="sla">类法术</option>
        </select>
        {isTableDirty && <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Unsaved</span>}
      </div>
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c: any) => (
              <th key={c.key} style={{ width: c.width }} className="border-stone-300 px-2 py-1.5 text-center font-semibold border-r last:border-r-0">
                {c.label}
              </th>
            ))}
            {!readOnly && <th className="w-8 border-stone-300"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {data.map((row: any, i: number) => {
            const isRowDirty = JSON.stringify(row) !== JSON.stringify(originalData?.[i]);
            return (
              <tr key={i} className={`transition-colors group ${isRowDirty ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}>
                {columns.map((c: any) => (
                  <td key={c.key} className="p-0 relative border-stone-300 border-r last:border-r-0">
                    {c.key === 'level' && !isSla ? (
                      <div className="w-full h-full flex items-center justify-center font-bold px-2 text-stone-700 bg-stone-100/50 min-h-[32px]">
                        {(data.length - 1 - i) + baseLevel} 环
                      </div>
                    ) : (
                      <DynamicInput
                        path={`${path}.${c.key}[${i}]`}
                        readOnly={readOnly}
                        align={c.key === 'spells' ? 'left' : 'center'}
                        className={readOnly ? "bg-stone-100/50" : "hover:bg-stone-100 focus:bg-white"}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="p-0 text-center align-middle w-8 border-stone-300 group-hover:bg-stone-100 transition-colors">
                    <button onClick={() => removeRow(i)} className="text-stone-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {!readOnly && (
            <tr>
              <td colSpan={columns.length + 1} className="p-0">
                <button onClick={addRow} className="w-full py-1 text-[10px] font-bold text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1 uppercase tracking-widest bg-stone-50/50">
                  <Plus size={12} /> {t('common.add_row')}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

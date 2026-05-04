import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import SchemaRenderer from '../../controls/SchemaRenderer';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';

export default function EquipmentBags({ path }: { path: string }) {
  const { t } = useTranslation();
  const bags = useCharacterStore(s => get(s.data, path) || []);
  const data = useCharacterStore(s => s.data);
  const updateField = useCharacterStore(s => s.updateField);

  const addBag = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBag = { id, name: t('editor.items.new_container'), items: [], ignoreWeight: false };
    updateField(path, [...bags, newBag]);
  };

  const removeBag = (id: string) => {
    updateField(path, bags.filter((b: any) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      {bags.map((bag: any, index: number) => (
        <div key={bag.id} className="border rounded p-4 bg-stone-50/50 border-stone-200">
           <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-4 flex-1">
                <div className="cursor-grab text-stone-300 hover:text-stone-600 p-1"><GripVertical size={18} /></div>
                <SchemaRenderer path={`${path}[${index}].name`} className="text-lg font-bold font-serif bg-transparent outline-none max-w-sm w-full" />
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-2">
                  <SchemaRenderer path={`${path}[${index}].ignoreWeight`} />
                  {t('editor.items.ignore_weight')}
                </label>
              </div>
              <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors">
                <Trash2 size={14} /> {t('common.delete_container')}
              </button>
           </div>
           
           <SchemaRenderer path={`${path}[${index}].items`} />
        </div>
      ))}
      
      <button onClick={addBag} className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors">
        <Plus size={16} /> {t('editor.items.add_container')}
      </button>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <SchemaRenderer path="currency.pp" label={t('editor.items.pp')} type="posInt" placeholder="0" />
        <SchemaRenderer path="currency.gp" label={t('editor.items.gp')} type="posInt" placeholder="0" />
        <SchemaRenderer path="currency.sp" label={t('editor.items.sp')} type="posInt" placeholder="0" />
        <SchemaRenderer path="currency.cp" label={t('editor.items.cp')} type="posInt" placeholder="0" />
        <SchemaRenderer path="currency.coinWeight" label={t('editor.items.coin_weight')} type="float" placeholder="0" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch">
        <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_assets')}</label>
          <div className="text-sm font-medium text-ink px-0.5">{calculateTotalCost(data)}<span className="text-xs font-normal text-stone-500 ml-1">gp</span></div>
        </div>
        
        <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-3 py-2 min-h-[50px] justify-center overflow-visible">
          {(() => {
            const encumbrance = getComputedEncumbrance(data);
            const maxWeight = encumbrance.heavy;
            const currentWeight = calculateTotalWeightNum(data);
            const MathMax = Math.max;
            const percentage = Math.min((currentWeight / MathMax(maxWeight, 1)) * 100, 100);
            const isOverloaded = currentWeight > maxWeight;
            const isHeavy = currentWeight > encumbrance.medium && currentWeight <= maxWeight;
            const isMedium = currentWeight > encumbrance.light && currentWeight <= encumbrance.medium;
            const isLight = currentWeight <= encumbrance.light;

            let barColor = 'bg-stone-300';
            if (isOverloaded) barColor = 'bg-red-500';
            else if (isHeavy) barColor = 'bg-orange-500';
            else if (isMedium) barColor = 'bg-yellow-400';
            else if (isLight) barColor = 'bg-green-400';

            const lightPct = (encumbrance.light / MathMax(maxWeight, 1)) * 100;
            const medPct = (encumbrance.medium / MathMax(maxWeight, 1)) * 100;
            const heavyPct = 100;

            return (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                <div className="flex flex-col sm:items-center shrink-0 w-20">
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_weight')}</span>
                  <span className="text-lg font-bold font-serif text-ink leading-tight">{currentWeight.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-stone-500">lbs</span></span>
                </div>

                <div className="flex-1 relative flex flex-col justify-center min-h-[20px] mt-1 mb-1 w-full mx-2">
                  <div className="absolute -top-3.5 left-0 right-0 h-3">
                    <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${lightPct}%` }}>{encumbrance.light} lbs</span>
                    <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${medPct}%` }}>{encumbrance.medium} lbs</span>
                    <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${heavyPct}%` }}>{encumbrance.heavy} lbs</span>
                  </div>
                  <div className="h-2 w-full bg-stone-200 rounded-full relative overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

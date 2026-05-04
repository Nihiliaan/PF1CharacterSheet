import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';

export default function WeightSummary() {
  const { t } = useTranslation();
  const data = useCharacterStore(s => s.data);
  const originalData = useCharacterStore(s => s.originalData);

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
    <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch">
      <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
        <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_assets')}</label>
        <div className="text-sm font-medium text-ink px-0.5">{calculateTotalCost(data)}<span className="text-xs font-normal text-stone-500 ml-1">gp</span></div>
      </div>
      
      <div className={`flex flex-col gap-0 border rounded p-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-transparent transition-colors w-24 shrink-0 justify-center ${data.encumbranceMultiplier !== originalData.encumbranceMultiplier ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
        <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none flex justify-between items-center text-nowrap">
          {t('editor.items.encumbrance_multiplier')}
          {data.encumbranceMultiplier !== originalData.encumbranceMultiplier && <span className="text-amber-600 animate-pulse text-[8px]">●</span>}
        </label>
        <input className="text-sm font-medium text-ink bg-transparent outline-none px-0.5 w-full"
          value={data.encumbranceMultiplier || '1'} onChange={e => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              useCharacterStore.getState().updateField('encumbranceMultiplier', val);
            }
          }}
        />
      </div>

      <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-3 py-2 min-h-[50px] justify-center overflow-visible">
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
              <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{ left: `${lightPct}%` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{ left: `${medPct}%` }} />
            </div>
            <div className="absolute -bottom-3.5 left-0 right-0 h-3">
              <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${lightPct / 2}%` }}>
                <span>{t('editor.items.light')}</span>
              </span>
              <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${(lightPct + medPct) / 2}%` }}>
                <span>{t('editor.items.medium')}</span>
              </span>
              <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${(medPct + heavyPct) / 2}%` }}>
                <span>{t('editor.items.heavy')}</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 w-10 flex items-center justify-center">
            {isOverloaded && <span className="text-[10px] font-bold text-white bg-red-600 px-1 py-0.5 rounded shadow-inner rotate-[-5deg]">{t('editor.items.overload')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

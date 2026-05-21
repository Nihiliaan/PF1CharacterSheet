import React from 'react';
import { useTranslation } from 'react-i18next';
import { getComputedEncumbrance, calculateTotalWeightNum } from '../../../utils/calculations';
import { CharacterData } from '../../../schema/types';

interface EncumbranceBarProps {
  data: CharacterData;
}

const EncumbranceBar: React.FC<EncumbranceBarProps> = ({ data }) => {
  const { t } = useTranslation();
  const enc = getComputedEncumbrance(data);
  const curWeight = calculateTotalWeightNum(data);
  const percentage = Math.min((curWeight / Math.max(enc.heavy, 1)) * 100, 100);
  const isOver = curWeight > enc.heavy;
  const color = isOver ? 'bg-red-500' : curWeight > enc.medium ? 'bg-orange-500' : curWeight > enc.light ? 'bg-yellow-400' : 'bg-green-400';
  const lPct = (enc.light / Math.max(enc.heavy, 1)) * 100;
  const mPct = (enc.medium / Math.max(enc.heavy, 1)) * 100;

  return (
    <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-3 py-2 min-h-[50px] justify-center overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="flex flex-col sm:items-center shrink-0 w-20">
          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_weight')}</span>
          <span className="text-lg font-bold font-serif text-ink leading-tight">
            {curWeight.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-stone-500">lbs</span>
          </span>
        </div>
        <div className="flex-1 relative flex flex-col justify-center min-h-[20px] w-full mx-2">
          <div className="absolute -top-3.5 left-0 right-0 h-3 text-[9px] font-bold text-stone-500">
            <span className="absolute -translate-x-1/2" style={{ left: `${lPct}%` }}>{enc.light}</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${mPct}%` }}>{enc.medium}</span>
            <span className="absolute -translate-x-1/2" style={{ left: `100%` }}>{enc.heavy}</span>
          </div>
          <div className="h-2 w-full bg-stone-200 rounded-full relative overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
          </div>
        </div>
        {isOver && <span className="text-[10px] font-bold text-white bg-red-600 px-1 py-0.5 rounded rotate-[-5deg]">{t('editor.items.overload')}</span>}
      </div>
    </div>
  );
};

export default EncumbranceBar;

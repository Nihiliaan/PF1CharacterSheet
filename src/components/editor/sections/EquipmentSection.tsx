import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import EncumbranceBar from './EncumbranceBar';
import EquipmentBagItem from './EquipmentBagItem';
import { useCharacter } from '../../../contexts/CharacterContext';
import { calculateTotalCost } from '../../../utils/calculations';

const EquipmentSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    lastSavedData,
    update,
    tableActionMode,
    toggleTableActionMode,
    addBag,
    handleBagDragStart,
    handleBagDragOver,
    handleBagDrop,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDrop
  } = useCharacter();

  return (
    <Section id="equipment" title={t('editor.sections.equipment')}>
      <div className="flex flex-col gap-8">
        {data.equipmentBags.map((bag, bagIndex) => (
          <EquipmentBagItem
            key={bag.id}
            bag={bag}
            bagIndex={bagIndex}
            originalBag={lastSavedData.equipmentBags?.[bagIndex]}
            tableActionMode={tableActionMode}
            onToggleTableActionMode={toggleTableActionMode}
            update={update}
            onBagDragStart={handleBagDragStart}
            onBagDragOver={handleBagDragOver}
            onBagDrop={handleBagDrop}
            onItemDragStart={handleItemDragStart}
            onItemDragOver={handleItemDragOver}
            onItemDrop={handleItemDrop}
          />
        ))}
        <button
          onClick={addBag}
          className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors"
        >
          <Plus size={16} /> {t('editor.items.add_container')}
        </button>


        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <InlineInput
            label={t('editor.items.pp')}
            path="currency.pp"
            value={String(data.currency.pp)}
            originalValue={String(lastSavedData.currency?.pp)}
            onChange={v => update('currency.pp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.gp')}
            path="currency.gp"
            value={String(data.currency.gp)}
            originalValue={String(lastSavedData.currency?.gp)}
            onChange={v => update('currency.gp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.sp')}
            path="currency.sp"
            value={String(data.currency.sp)}
            originalValue={String(lastSavedData.currency?.sp)}
            onChange={v => update('currency.sp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.cp')}
            path="currency.cp"
            value={String(data.currency.cp)}
            originalValue={String(lastSavedData.currency?.cp)}
            onChange={v => update('currency.cp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.coin_weight')}
            path="currency.coinWeight"
            value={String(data.currency.coinWeight)}
            originalValue={String(lastSavedData.currency?.coinWeight)}
            onChange={v => update('currency.coinWeight', v)}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch">
          <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">
              {t('editor.items.total_assets')}
            </label>
            <div className="text-sm font-medium text-ink px-0.5">
              {calculateTotalCost(data)}
              <span className="text-xs font-normal text-stone-500 ml-1">gp</span>
            </div>
          </div>
          <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">
              {t('editor.items.encumbrance_multiplier')}
            </label>
            <input
              className="text-sm font-medium text-ink bg-transparent outline-none px-0.5 w-full"
              value={data.encumbranceMultiplier}
              onChange={e => update('encumbranceMultiplier', e.target.value)}
            />
          </div>

          <EncumbranceBar data={data} />
        </div>
      </div>
    </Section>
  );
};

export default EquipmentSection;

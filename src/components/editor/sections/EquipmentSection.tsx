import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
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
        {data.equipment.container.map((bag, bagIndex) => (
          <EquipmentBagItem
            key={bag.id}
            bag={bag}
            bagIndex={bagIndex}
            originalBag={lastSavedData.equipment?.container?.[bagIndex]}
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
            path="equipment.currency.pp"
            value={String(data.equipment.currency.pp)}
            originalValue={String(lastSavedData.equipment?.currency?.pp)}
            onChange={v => update('equipment.currency.pp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.gp')}
            path="equipment.currency.gp"
            value={String(data.equipment.currency.gp)}
            originalValue={String(lastSavedData.equipment?.currency?.gp)}
            onChange={v => update('equipment.currency.gp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.sp')}
            path="equipment.currency.sp"
            value={String(data.equipment.currency.sp)}
            originalValue={String(lastSavedData.equipment?.currency?.sp)}
            onChange={v => update('equipment.currency.sp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.cp')}
            path="equipment.currency.cp"
            value={String(data.equipment.currency.cp)}
            originalValue={String(lastSavedData.equipment?.currency?.cp)}
            onChange={v => update('equipment.currency.cp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.coin_weight')}
            path="equipment.currency.coinWeight"
            value={String(data.equipment.currency.coinWeight)}
            originalValue={String(lastSavedData.equipment?.currency?.coinWeight)}
            onChange={v => update('equipment.currency.coinWeight', v)}
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
              value={data.equipment.encumbranceMultiplier}
              onChange={e => update('equipment.encumbranceMultiplier', e.target.value)}
            />
          </div>

          <EncumbranceBar data={data} />
        </div>

        <div className="mt-4">
          <MultilineInput
            label="备注 NOTES"
            path="equipment.notes"
            value={data.equipment.notes || ''}
            originalValue={lastSavedData.equipment?.notes}
            onChange={v => update('equipment.notes', v)}
            placeholder="关于装备、资产或其他物品的备注..."
            isAutoHeight={true}
          />
        </div>
      </div>
    </Section>
  );
};

export default EquipmentSection;

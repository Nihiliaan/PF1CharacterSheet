import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const AttacksSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    setData,
    lastSavedData,
    tableActionMode,
    toggleTableActionMode,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="attacks" title={t('editor.sections.attacks')}>
      <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
        <div className="border-b border-stone-200">
          <DynamicTable
            minWidth="0"
            path="attacks.meleeAttacks"
            data={data.attacks.meleeAttacks}
            originalData={lastSavedData.attacks.meleeAttacks}
            onChange={v => setData(prev => ({ ...prev, attacks: { ...prev.attacks, meleeAttacks: v as any } }))}
            newItemGenerator={() => ({ weapon: '', hit: 0, damage: '', critRange: 20, critMultiplier: 2, range: 5, damageType: '', special: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.meleeAttacks', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.meleeAttacks', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('attacks.meleeAttacks', idx, e)}
          />
        </div>
        <DynamicTable
          minWidth="0"
          path="attacks.rangedAttacks"
          data={data.attacks.rangedAttacks}
          originalData={lastSavedData.attacks.rangedAttacks}
          onChange={v => setData(prev => ({ ...prev, attacks: { ...prev.attacks, rangedAttacks: v as any } }))}
          newItemGenerator={() => ({ weapon: '', hit: 0, damage: '', critRange: 20, critMultiplier: 2, range: 20, damageType: '', special: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.rangedAttacks', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.rangedAttacks', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('attacks.rangedAttacks', idx, e)}
        />
      </div>
      <MultilineInput
        className="mt-6"
        label={t('editor.attacks.special_attacks')}
        path="attacks.specialAttacks"
        value={data.attacks.specialAttacks || ''}
        originalValue={lastSavedData.attacks.specialAttacks || ''}
        onChange={v => setData(prev => ({ ...prev, attacks: { ...prev.attacks, specialAttacks: v } }))}
        isAutoHeight={true}
      />
    </Section>
  );
};

export default AttacksSection;

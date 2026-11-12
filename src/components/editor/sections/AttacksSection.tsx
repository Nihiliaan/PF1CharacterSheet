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
    lastSavedData,
    update,
    tableActionMode,
    reorderRows,
    toggleTableActionMode,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="attacks" title={t('editor.sections.attacks')}>
      <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
        <div className="border-b border-stone-200">
          <DynamicTable
            minWidth="0"
            path="attacks.melee"
            data={data.attacks.melee}
            originalData={lastSavedData.attacks?.melee}
            onChange={v => update('attacks.melee', v)}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowReorder={(from, to) => reorderRows('attacks.melee', from, to)}
                                  />
        </div>
        <DynamicTable
          minWidth="0"
          path="attacks.ranged"
          data={data.attacks.ranged}
          originalData={lastSavedData.attacks?.ranged}
          onChange={v => update('attacks.ranged', v)}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowReorder={(from, to) => reorderRows('attacks.ranged', from, to)}
                            />
      </div>
      <MultilineInput
        className="mt-6"
        label={t('editor.attacks.special_attacks')}
        path="attacks.specialAttacks"
        value={data.attacks.specialAttacks || ''}
        originalValue={lastSavedData.attacks.specialAttacks || ''}
        onChange={v => update('attacks.specialAttacks', v)}
        isAutoHeight={true}
      />
    </Section>
  );
};

export default AttacksSection;

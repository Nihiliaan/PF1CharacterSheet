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
            path="attacks.melee"
            data={data.attacks.melee}
            originalData={lastSavedData.attacks?.melee}
            onChange={v => update('attacks.melee', v)}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.melee', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.melee', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('attacks.melee', idx, e)}
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
          onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.ranged', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.ranged', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('attacks.ranged', idx, e)}
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

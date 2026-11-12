import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import { useCharacter } from '../../../contexts/CharacterContext';

const RacialTraitsSection: React.FC = () => {
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
    <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
      <DynamicTable
        path="racialTraits"
        data={data.racialTraits}
        originalData={lastSavedData.racialTraits}
        onChange={v => update('racialTraits', v)}
        enableSQShow={true}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={toggleTableActionMode}
        onRowReorder={(from, to) => reorderRows('racialTraits', from, to)}
                      />
    </Section>
  );
};

export default RacialTraitsSection;

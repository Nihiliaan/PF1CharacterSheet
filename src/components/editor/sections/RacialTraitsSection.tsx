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
    toggleTableActionMode,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
      <DynamicTable
        path="racialTraits"
        data={data.racialTraits}
        originalData={lastSavedData.racialTraits}
        onChange={v => update('racialTraits', v)}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={toggleTableActionMode}
        onRowDragStart={(idx, e) => handleTableItemDragStart('racialTraits', idx, e)}
        onRowDragOver={(idx, e) => handleTableItemDragOver('racialTraits', idx, e)}
        onRowDrop={(idx, e) => handleTableItemDrop('racialTraits', idx, e)}
      />
    </Section>
  );
};

export default RacialTraitsSection;

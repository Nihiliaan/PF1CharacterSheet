import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import { useCharacter } from '../../../contexts/CharacterContext';

const ClassFeaturesSection: React.FC = () => {
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
    <Section id="class-features" title={t('editor.sections.class_features')}>
      <DynamicTable
        path="classFeatures"
        data={data.classFeatures}
        originalData={lastSavedData.classFeatures}
        onChange={v => update('classFeatures', v)}
        enableSQShow={true}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={toggleTableActionMode}
        onRowReorder={(from, to) => reorderRows('classFeatures', from, to)}
                      />
    </Section>
  );
};

export default ClassFeaturesSection;

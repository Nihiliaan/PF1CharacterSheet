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
    toggleTableActionMode,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="class-features" title={t('editor.sections.class_features')}>
      <DynamicTable
        path="classFeatures"
        data={data.classFeatures}
        originalData={lastSavedData.classFeatures}
        onChange={v => update('classFeatures', v)}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={toggleTableActionMode}
        onRowDragStart={(idx, e) => handleTableItemDragStart('classFeatures', idx, e)}
        onRowDragOver={(idx, e) => handleTableItemDragOver('classFeatures', idx, e)}
        onRowDrop={(idx, e) => handleTableItemDrop('classFeatures', idx, e)}
      />
    </Section>
  );
};

export default ClassFeaturesSection;

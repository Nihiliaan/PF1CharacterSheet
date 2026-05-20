import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import { useCharacter } from '../../../contexts/CharacterContext';

const FeatsSection: React.FC = () => {
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
    <Section id="feats" title={t('editor.sections.feats')}>
      <DynamicTable
        path="feats"
        data={data.feats}
        originalData={lastSavedData.feats}
        onChange={v => update('feats', v)}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={toggleTableActionMode}
        onRowDragStart={(idx, e) => handleTableItemDragStart('feats', idx, e)}
        onRowDragOver={(idx, e) => handleTableItemDragOver('feats', idx, e)}
        onRowDrop={(idx, e) => handleTableItemDrop('feats', idx, e)}
      />
    </Section>
  );
};

export default FeatsSection;

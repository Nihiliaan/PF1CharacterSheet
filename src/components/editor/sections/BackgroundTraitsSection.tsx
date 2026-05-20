import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import InlineInput from '../../common/InlineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const BackgroundTraitsSection: React.FC = () => {
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
    <Section id="traits" title={t('editor.sections.traits')}>
      <div className="flex flex-col gap-6">
        <DynamicTable
          path="backgroundTraits"
          data={data.backgroundTraits}
          originalData={lastSavedData.backgroundTraits}
          onChange={v => update('backgroundTraits', v)}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('backgroundTraits', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('backgroundTraits', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('backgroundTraits', idx, e)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InlineInput
            label={t('editor.lists.favored_class')}
            path="favoredClass.fc"
            value={data.favoredClass.fc}
            originalValue={lastSavedData.favoredClass?.fc}
            onChange={v => update('favoredClass.fc', v)}
          />
          <InlineInput
            label={t('editor.lists.favored_class_bonus')}
            path="favoredClass.fcb"
            value={data.favoredClass.fcb}
            originalValue={lastSavedData.favoredClass?.fcb}
            onChange={v => update('favoredClass.fcb', v)}
          />
        </div>
      </div>
    </Section>
  );
};

export default BackgroundTraitsSection;

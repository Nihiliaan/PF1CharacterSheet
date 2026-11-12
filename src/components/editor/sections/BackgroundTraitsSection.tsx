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
    reorderRows,
    toggleTableActionMode,
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
          enableSQShow={true}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowReorder={(from, to) => reorderRows('backgroundTraits', from, to)}
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

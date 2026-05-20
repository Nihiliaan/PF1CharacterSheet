import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const SkillsSection: React.FC = () => {
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
    <Section id="skills" title={t('editor.sections.skills')}>
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <div className="w-full md:w-1/6">
          <InlineInput
            label={t('editor.skills.total_points')}
            path="skills.totalPoints"
            value={String(data.skills.totalPoints)}
            originalValue={String(lastSavedData.skills?.totalPoints)}
            onChange={v => update('skills.totalPoints', v)}
            placeholder="0"
          />
        </div>
        <div className="w-full md:w-1/6">
          <InlineInput
            label={t('editor.skills.acp')}
            path="skills.acp"
            value={String(data.skills.acp)}
            originalValue={String(lastSavedData.skills?.acp)}
            onChange={v => update('skills.acp', v)}
            displayFormatter={(v, isFocused) => (!v || v === '0' || isFocused) ? v : `-${v}`}
            placeholder="0"
          />
        </div>
      </div>
      <div className="mt-4">
        <DynamicTable
          path="skills"
          data={data.skills}
          originalData={lastSavedData.skills}
          onChange={v => update('skills', v)}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
        />
      </div>
      <div className="mt-4">
        <MultilineInput
          label={t('editor.skills.notes')}
          path="skills.notes"
          value={data.skills.notes || ''}
          originalValue={lastSavedData.skills?.notes}
          onChange={v => update('skills.notes', v)}
          placeholder="技能备注..."
          isAutoHeight={true}
        />
      </div>
    </Section>
  );
};

export default SkillsSection;

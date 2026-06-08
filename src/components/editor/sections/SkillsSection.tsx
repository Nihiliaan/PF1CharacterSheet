import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../../contexts/CharacterContext';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import SkillsTable from '../../common/SkillsTable';

const SkillsSection: React.FC = () => {
  const { t } = useTranslation();
  const { 
    data, lastSavedData, update,
    tableActionMode, toggleTableActionMode,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop
  } = useCharacter();
  
  const [showAll, setShowAll] = useState(false);

  const skills = data.skills;

  return (
    <Section id="skills" title={t('editor.sections.skills')}>
      <div className="flex flex-col md:flex-row gap-6 items-stretch mb-4">
        <div className="w-full md:w-1/6">
          <InlineInput
            label={t('editor.skills.total_points')}
            path="skills.totalPoints"
            value={String(skills.totalPoints)}
            originalValue={String(lastSavedData.skills?.totalPoints)}
            onChange={v => update('skills.totalPoints', v)}
            placeholder="0"
          />
        </div>
        <div className="w-full md:w-1/6">
          <InlineInput
            label={t('editor.skills.acp')}
            path="skills.acp"
            value={String(skills.acp)}
            originalValue={String(lastSavedData.skills?.acp)}
            onChange={v => update('skills.acp', v)}
            placeholder="0"
          />
        </div>
        <div className="flex items-end pb-1 ml-auto">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input 
              type="checkbox" 
              checked={showAll} 
              onChange={e => setShowAll(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
              {t('editor.skills.show_all')}
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <SkillsTable
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
          showAll={showAll}
        />
      </div>

      <div className="mt-4">
        <MultilineInput
          label={t('editor.skills.notes')}
          path="skills.notes"
          value={data.skills.notes || ''}
          originalValue={lastSavedData.skills?.notes}
          onChange={v => update('skills.notes', v)}
          placeholder={t('editor.skills.notes_placeholder')}
          isAutoHeight={true}
        />
      </div>
    </Section>
  );
};

export default SkillsSection;

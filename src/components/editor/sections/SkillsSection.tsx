import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import InlineInput from '../../common/InlineInput';
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
            path="skillsTotal"
            value={String(data.skillsTotal)}
            originalValue={String(lastSavedData.skillsTotal)}
            onChange={v => update('skillsTotal', v)}
            placeholder="0"
          />
        </div>
        <div className="w-full md:w-1/6">
          <InlineInput
            label={t('editor.skills.acp')}
            path="armorCheckPenalty"
            value={String(data.armorCheckPenalty)}
            originalValue={String(lastSavedData.armorCheckPenalty)}
            onChange={v => update('armorCheckPenalty', v)}
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
          newItemGenerator={() => ({ name: '', total: 0, rank: 0, cs: false, ability: 3, others: '', special: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
...          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
        />
      </div>
    </Section>
  );
};

export default SkillsSection;

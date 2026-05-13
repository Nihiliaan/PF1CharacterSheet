import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import DynamicInput from '../../common/DynamicInput';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const DefensesSection: React.FC = () => {
  const { t } = useTranslation();
  const { data, lastSavedData, updateDefenses } = useCharacter();

  return (
    <Section id="defenses" title={t('editor.sections.defenses')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          <div className="w-full md:w-1/2 flex flex-col">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
              {t('editor.defenses.ac_details')}
              <span className="text-stone-400 font-normal">AC / {t('editor.defenses.touch')} / {t('editor.defenses.flat_footed')}</span>
            </label>
            <div className="flex-1">
              <DynamicTable
                path="defenses.acTable"
                data={data.defenses.acTable}
                originalData={lastSavedData.defenses.acTable}
                onChange={v => updateDefenses('acTable', v)}
                isStaticObject={true}
                minWidth="0"
              />
            </div>
          </div>
          <MultilineInput
            className="w-full md:w-1/2"
            label={t('editor.defenses.ac_notes')}
            path="defenses.acNotes"
            value={data.defenses.acNotes || ''}
            originalValue={lastSavedData.defenses.acNotes}
            onChange={v => updateDefenses('acNotes', v)}
            placeholder={t('editor.defenses.ac_placeholder')}
            height="100%"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2">
            <InlineInput
              label={t('editor.defenses.hp')}
              path="defenses.hp"
              value={String(data.defenses.hp)}
              originalValue={String(lastSavedData.defenses.hp)}
              onChange={v => updateDefenses('hp', v)}
              placeholder="例如：20"
            />
          </div>
          <div className="w-full md:w-1/2">
            <InlineInput
              label={t('editor.defenses.hd')}
              path="defenses.hd"
              value={data.defenses.hd || ''}
              originalValue={lastSavedData.defenses.hd}
              onChange={v => updateDefenses('hd', v)}
              placeholder="例如：3d8+3"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          <div className="w-full md:w-1/2 flex flex-col">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
              {t('editor.defenses.saves')}
              <span className="text-stone-400 font-normal">{t('editor.defenses.fort')} / {t('editor.defenses.ref')} / {t('editor.defenses.will')}</span>
            </label>
            <div className="flex-1">
              <DynamicTable
                path="defenses.savesTable"
                data={data.defenses.savesTable}
                originalData={lastSavedData.defenses.savesTable}
                onChange={v => updateDefenses('savesTable', v)}
                isStaticObject={true}
                minWidth="0"
              />
            </div>
          </div>
          <MultilineInput
            className="w-full md:w-1/2"
            label={t('editor.defenses.saves_notes')}
            path="defenses.savesNotes"
            value={data.defenses.savesNotes || ''}
            originalValue={lastSavedData.defenses.savesNotes}
            onChange={v => updateDefenses('savesNotes', v)}
            placeholder="抗力加值、对抗恐惧/毒素的额外加值等..."
            height="100%"
          />
        </div>
        <MultilineInput
          className="mt-4"
          label={t('editor.defenses.special_defenses')}
          path="defenses.specialDefenses"
          value={data.defenses.specialDefenses || ''}
          originalValue={lastSavedData.defenses.specialDefenses || ''}
          onChange={v => updateDefenses('specialDefenses', v)}
          placeholder={t('editor.defenses.special_defenses_placeholder')}
          height="100%"
        />
      </div>
    </Section>
  );
};

export default DefensesSection;

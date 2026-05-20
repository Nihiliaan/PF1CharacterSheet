import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import SingleRowTable from '../../common/SingleRowTable';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const DefensesSection: React.FC = () => {
  const { t } = useTranslation();
  const { data, lastSavedData, update } = useCharacter();

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
              <SingleRowTable
                path="defenses.armorClass"
                data={data.defenses.armorClass}
                originalData={lastSavedData.defenses.armorClass}
                onChange={v => update('defenses.armorClass', v)}
                minWidth="0"
              />
            </div>
          </div>
          <MultilineInput
            className="w-full md:w-1/2"
            label={t('editor.defenses.ac_notes')}
            path="defenses.armorClass.notes"
            value={data.defenses.armorClass.notes || ''}
            originalValue={lastSavedData.defenses.armorClass?.notes}
            onChange={v => update('defenses.armorClass.notes', v)}
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
              onChange={v => update('defenses.hp', v)}
              placeholder="例如：20"
            />
          </div>
          <div className="w-full md:w-1/2">
            <InlineInput
              label={t('editor.defenses.hd')}
              path="defenses.hd"
              value={data.defenses.hd || ''}
              originalValue={lastSavedData.defenses.hd}
              onChange={v => update('defenses.hd', v)}
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
              <SingleRowTable
                path="defenses.saves"
                data={data.defenses.saves}
                originalData={lastSavedData.defenses.saves}
                onChange={v => update('defenses.saves', v)}
                minWidth="0"
              />
            </div>
          </div>
          <MultilineInput
            className="w-full md:w-1/2"
            label={t('editor.defenses.saves_notes')}
            path="defenses.saves.notes"
            value={data.defenses.saves.notes || ''}
            originalValue={lastSavedData.defenses.saves?.notes}
            onChange={v => update('defenses.saves.notes', v)}
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
          onChange={v => update('defenses.specialDefenses', v)}
          placeholder={t('editor.defenses.special_defenses_placeholder')}
          height="100%"
        />
      </div>
    </Section>
  );
};

export default DefensesSection;

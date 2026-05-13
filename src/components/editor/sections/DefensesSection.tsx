import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
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
              <div className="grid grid-cols-4 border border-stone-300 rounded overflow-hidden">
                <div className="flex flex-col border-r border-stone-200">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.ac')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.acTable.ac)}
                    originalValue={String(lastSavedData.defenses.acTable.ac)}
                    onChange={v => updateDefenses('acTable', { ...data.defenses.acTable, ac: parseInt(v) || 10 })}
                    path="defenses.acTable.ac"
                    type="int"
                  />
                </div>
                <div className="col-span-1 flex flex-col border-r border-stone-200">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.ac_source')}</div>
                  <DynamicInput
                    value={data.defenses.acTable.source}
                    originalValue={lastSavedData.defenses.acTable.source}
                    onChange={v => updateDefenses('acTable', { ...data.defenses.acTable, source: v })}
                    path="defenses.acTable.source"
                  />
                </div>
                <div className="flex flex-col border-r border-stone-200">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.touch')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.acTable.touch)}
                    originalValue={String(lastSavedData.defenses.acTable.touch)}
                    onChange={v => updateDefenses('acTable', { ...data.defenses.acTable, touch: parseInt(v) || 10 })}
                    path="defenses.acTable.touch"
                    type="int"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.flat_footed')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.acTable.flatFooted)}
                    originalValue={String(lastSavedData.defenses.acTable.flatFooted)}
                    onChange={v => updateDefenses('acTable', { ...data.defenses.acTable, flatFooted: parseInt(v) || 10 })}
                    path="defenses.acTable.flatFooted"
                    type="int"
                  />
                </div>
              </div>
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
              <div className="grid grid-cols-3 border border-stone-300 rounded overflow-hidden">
                <div className="flex flex-col border-r border-stone-200">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.fort')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.savesTable.fort)}
                    originalValue={String(lastSavedData.defenses.savesTable.fort)}
                    onChange={v => updateDefenses('savesTable', { ...data.defenses.savesTable, fort: parseInt(v) || 0 })}
                    path="defenses.savesTable.fort"
                    type="bonus"
                  />
                </div>
                <div className="flex flex-col border-r border-stone-200">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.ref')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.savesTable.ref)}
                    originalValue={String(lastSavedData.defenses.savesTable.ref)}
                    onChange={v => updateDefenses('savesTable', { ...data.defenses.savesTable, ref: parseInt(v) || 0 })}
                    path="defenses.savesTable.ref"
                    type="bonus"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="bg-stone-200 text-stone-700 text-[10px] font-bold py-1 text-center border-b border-stone-300 uppercase">{t('editor.defenses.will')}</div>
                  <DynamicInput
                    align="center"
                    className="font-bold"
                    value={String(data.defenses.savesTable.will)}
                    originalValue={String(lastSavedData.defenses.savesTable.will)}
                    onChange={v => updateDefenses('savesTable', { ...data.defenses.savesTable, will: parseInt(v) || 0 })}
                    path="defenses.savesTable.will"
                    type="bonus"
                  />
                </div>
              </div>
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

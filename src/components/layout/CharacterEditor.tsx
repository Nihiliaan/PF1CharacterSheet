import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import Section from '../common/Section';
import SchemaRenderer from '../../controls/SchemaRenderer';

export default function CharacterEditor() {
  const { t } = useTranslation();
  const data = useCharacterStore(s => s.data);

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto pb-24"
    >
      <header className="mb-12 text-center relative px-4">
        <div className="flex flex-col items-center gap-4">
          <SchemaRenderer path="basic.name" className="text-4xl font-black font-serif text-ink tracking-tight bg-transparent text-center border-none focus:ring-0 w-full" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-stone-500 font-medium tracking-wide border-t border-stone-200 pt-4 w-full max-w-2xl px-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">{t('editor.basic.alignment')}</span>
              <SchemaRenderer path="basic.alignment" className="bg-transparent border-none text-ink w-24" />
            </div>
            <div className="flex items-center gap-2 border-l border-stone-200 pl-6">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">{t('editor.basic.deity')}</span>
              <SchemaRenderer path="basic.deity" className="bg-transparent border-none text-ink w-32" />
            </div>
            <div className="flex items-center gap-2 border-l border-stone-200 pl-6">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">{t('editor.basic.homeland')}</span>
              <SchemaRenderer path="basic.homeland" className="bg-transparent border-none text-ink w-32" />
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-12 px-4 sm:px-6">
        <Section id="basic-info" title={t('editor.sections.basic')}>
          <SchemaRenderer path="basic" />
        </Section>

        <Section id="attributes" title={t('editor.sections.attributes')}>
          <SchemaRenderer path="attributes" />
        </Section>

        <Section id="combat" title={t('editor.sections.combat')}>
          <SchemaRenderer path="combatTable" />
          <div className="mt-8">
            <SchemaRenderer path="attacks" />
          </div>
        </Section>

        <Section id="defenses" title={t('editor.sections.defenses')}>
          <SchemaRenderer path="defenses" />
        </Section>

        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
          <SchemaRenderer path="racialTraits" />
        </Section>

        <Section id="traits" title={t('editor.sections.traits')}>
          <div className="flex flex-col gap-6">
            <SchemaRenderer path="backgroundTraits" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SchemaRenderer path="favoredClass" label={t('editor.lists.favored_class')} />
              <SchemaRenderer path="favoredClassBonus" label={t('editor.lists.favored_class_bonus')} />
            </div>
          </div>
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
          <SchemaRenderer path="classFeatures" />
        </Section>

        <Section id="feats" title={t('editor.sections.feats')}>
          <SchemaRenderer path="feats" />
        </Section>

        <Section id="spells" title={t('editor.sections.spells')}>
          <SchemaRenderer path="magicBlocks" />
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <div className="w-full md:w-1/6">
              <SchemaRenderer path="skillsTotal" label={t('editor.skills.total_points')} />
            </div>
            <div className="w-full md:w-1/6">
              <SchemaRenderer path="armorCheckPenalty" label={t('editor.skills.acp')} />
            </div>
          </div>
          <div className="mt-4">
            <SchemaRenderer path="skills" />
          </div>
        </Section>

        <Section id="equipment" title={t('editor.sections.equipment')}>
          <SchemaRenderer path="equipmentBags" />
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
          <SchemaRenderer path="additionalData" />
        </Section>
      </main>
    </motion.div>
  );
}

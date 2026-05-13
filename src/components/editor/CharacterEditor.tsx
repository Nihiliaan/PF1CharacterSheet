import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import TableOfContents from '../character/TableOfContents';

import { useCharacter } from '../../contexts/CharacterContext';

// Section Components
import BasicInfoSection from './sections/BasicInfoSection';
import StorySection from './sections/StorySection';
import AttributesSection from './sections/AttributesSection';
import AttacksSection from './sections/AttacksSection';
import DefensesSection from './sections/DefensesSection';
import RacialTraitsSection from './sections/RacialTraitsSection';
import BackgroundTraitsSection from './sections/BackgroundTraitsSection';
import ClassFeaturesSection from './sections/ClassFeaturesSection';
import FeatsSection from './sections/FeatsSection';
import SpellsSection from './sections/SpellsSection';
import SkillsSection from './sections/SkillsSection';
import EquipmentSection from './sections/EquipmentSection';
import AdditionalDataSection from './sections/AdditionalDataSection';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({
  user
}: CharacterEditorProps) {
  const { t } = useTranslation();
  const {
    isReadOnly,
    data,
    saveCharacter
  } = useCharacter();

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto"
    >
      {/* Read-Only Notice */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-amber-800 text-sm font-medium sticky top-0 z-[55]">
          <ShieldCheck size={18} />
          <span>{t('editor.read_only_notice_text')}</span>
          {user && (
            <button
              onClick={async () => {
                const id = await saveCharacter(data, null);
                if (id) {
                  window.location.href = `?id=${id}`;
                }
              }}
              className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs transition-colors"
            >
              {t('editor.read_only_notice_copy')}
            </button>
          )}
        </div>
      )}

      <TableOfContents />
      <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90 grayscale-[0.2]' : ''}`}>
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl font-serif font-bold mb-2">{t('editor.title')}</h1>
        </header>

        <BasicInfoSection />
        <StorySection />
        <AttributesSection />
        <AttacksSection />
        <DefensesSection />
        <RacialTraitsSection />
        <BackgroundTraitsSection />
        <ClassFeaturesSection />
        <FeatsSection />
        <SpellsSection />
        <SkillsSection />
        <EquipmentSection />
        <AdditionalDataSection />
      </main>
    </motion.div>
  );
}

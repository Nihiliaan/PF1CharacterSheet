import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import TableOfContents from './TableOfContents';

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
      <TableOfContents />
      <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90 grayscale-[0.2]' : ''}`}>
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

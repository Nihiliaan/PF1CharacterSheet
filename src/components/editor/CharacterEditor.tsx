import React, { useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import TableOfContents from './TableOfContents';

import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';

const GMStatBlockView = React.lazy(() => import('../gm/GMStatBlockView'));

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
import PFSSection from './sections/PFSSection';

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
  const { gmCompactMode } = useUI();

  // GM 紧凑数据卡模式：编辑器内的显示模式（ChromeBar 工具条保持原位，⚔ 按钮开关切换）
  if (gmCompactMode) {
    return (
      <React.Suspense fallback={
        <div className="h-full flex items-center justify-center bg-stone-100">
          <div className="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GMStatBlockView />
      </React.Suspense>
    );
  }

  // 滚动容器引用：目录滑条按此容器定位与查找区块（多分栏各自独立，避免全局 id 冲突）
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full">
      <TableOfContents scrollRef={scrollRef} />
      {/* md+ 隐藏原生滚动条：概览标尺（TableOfContents）即滚动条；小屏无标尺，保留原生 */}
      <div ref={scrollRef} className="h-full overflow-y-auto md:scrollbar-hidden">
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
          <PFSSection />
        </main>
      </div>
    </div>
  );
}

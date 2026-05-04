import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';

import Section from '../common/Section';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';
import SchemaRenderer from '../../controls/SchemaRenderer';

import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({ user }: CharacterEditorProps) {
  const { t } = useTranslation();
  
  // 从新 Store 获取核心状态
  const data = useCharacterStore(s => s.data);
  const isReadOnly = useCharacterStore(s => s.isReadOnly);
  const updateField = useCharacterStore(s => s.updateField);

  // 模拟旧版的 saveCharacter 行为（如果需要）
  const saveCharacter = async (data: any, name: string | null) => {
    // 这里调用你实际的同步逻辑
    console.log("Saving character...", name);
    return null; 
  };

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto"
    >
      {/* 1. 只读提示 */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-amber-800 text-sm font-medium sticky top-0 z-[55]">
          <ShieldCheck size={18} />
          <span>{t('editor.read_only_notice_text')}</span>
          {user && (
            <button
              onClick={async () => {
                const id = await saveCharacter(data, null);
                if (id) window.location.href = `?id=${id}`;
              }}
              className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs transition-colors"
            >
              {t('editor.read_only_notice_copy')}
            </button>
          )}
        </div>
      )}

      {/* 2. 恢复左侧导航条 */}
      <TableOfContents />

      <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90 grayscale-[0.2]' : ''}`}>
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight text-stone-800">
            {t('editor.title')}
          </h1>
          <div className="w-24 h-1 bg-primary/20 rounded-full mt-2"></div>
        </header>

        {/* 3. 基础信息板块 - 恢复头像框与栅格 */}
        <Section id="basic-info" title={t('editor.sections.basic')}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
               <SchemaRenderer path="basic.name" label={t('editor.basic.name')} className="col-span-full sm:col-span-2" />
               <SchemaRenderer path="basic.classes" label={t('editor.basic.classes')} className="col-span-full sm:col-span-1" />
               <SchemaRenderer path="basic.alignment" label={t('editor.basic.alignment')} />
               <SchemaRenderer path="basic.deity" label={t('editor.basic.deity')} />
               <SchemaRenderer path="basic.race" label={t('editor.basic.race')} />
               <SchemaRenderer path="basic.size" label={t('editor.basic.size')} />
               <SchemaRenderer path="basic.gender" label={t('editor.basic.gender')} />
               <SchemaRenderer path="basic.age" label={t('editor.basic.age')} />
               <SchemaRenderer path="basic.height" label={t('editor.basic.height')} />
               <SchemaRenderer path="basic.weight" label={t('editor.basic.weight')} />
               <SchemaRenderer path="basic.initiative" label={t('editor.basic.initiative')} />
               <SchemaRenderer path="basic.perception" label={t('editor.basic.perception')} />
               <SchemaRenderer path="basic.senses" label={t('editor.basic.senses')} className="col-span-full" />
               <SchemaRenderer path="basic.languages" label={t('editor.basic.languages')} className="col-span-full" />
            </div>
            {/* 头像框组件 */}
            <div className="w-full md:w-64 shrink-0">
               <AvatarGallery
                  avatars={data.basic.avatars || []}
                  onUpdate={(newAvatars) => updateField('basic.avatars', newAvatars)}
               />
            </div>
          </div>
        </Section>

        {/* 4. 故事板块 */}
        <Section id="story" title={t('editor.sections.story')}>
           <SchemaRenderer path="story" />
        </Section>

        {/* 5. 属性板块 - 恢复 BAB/CMB/CMD 的左右布局 */}
        <Section id="attributes" title={t('editor.sections.attributes')}>
           <div className="flex flex-col gap-6">
              <SchemaRenderer path="attributes" />
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-full md:w-1/2">
                    <SchemaRenderer path="combatTable" label={t('editor.attributes.combat_stats')} />
                 </div>
                 <div className="w-full md:w-1/2 h-full flex flex-col">
                    <SchemaRenderer path="combatTable.combatManeuverNotes" label={t('editor.attributes.maneuver_notes')} />
                 </div>
              </div>
           </div>
        </Section>

        {/* 6. 其它核心板块 */}
        <Section id="attacks" title={t('editor.sections.attacks')}>
           <SchemaRenderer path="attacks" />
        </Section>

        <Section id="defenses" title={t('editor.sections.defenses')}>
           <SchemaRenderer path="defenses" />
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
           <SchemaRenderer path="skills" />
        </Section>

        <Section id="feats" title={t('editor.sections.feats')}>
           <SchemaRenderer path="feats" />
        </Section>

        <Section id="traits" title={t('editor.sections.traits')}>
           <SchemaRenderer path="backgroundTraits" />
        </Section>

        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
           <SchemaRenderer path="racialTraits" />
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
           <SchemaRenderer path="classFeatures" />
        </Section>

        <Section id="spells" title={t('editor.sections.spells')}>
           <SchemaRenderer path="magicBlocks" />
        </Section>

        <Section id="equipment" title={t('editor.sections.equipment')}>
           <SchemaRenderer path="equipmentBags" />
           <div className="mt-8">
              <SchemaRenderer path="currency" />
           </div>
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
           <SchemaRenderer path="additionalData" />
        </Section>

      </main>
    </motion.div>
  );
}

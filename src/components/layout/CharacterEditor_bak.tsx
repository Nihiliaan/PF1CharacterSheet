import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';

import Section from '../common/Section';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';
import MagicBlocks from '../character/MagicBlocks';
import EquipmentBags from '../character/EquipmentBags';
import AdditionalData from '../character/AdditionalData';
import DynamicInput from '../../controls/DynamicInput';
import DynamicTable from '../tables/DynamicTable';

import { useCharacterStore } from '../../store/characterStore';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({ user }: CharacterEditorProps) {
  const { t } = useTranslation();
  const data = useCharacterStore(s => s.data);
  const isReadOnly = useCharacterStore(s => s.isReadOnly);
  const updateField = useCharacterStore(s => s.updateField);

  const f = (path: string, label?: string, className?: string, props?: any) => (
    <DynamicInput path={path} label={label} className={className} {...props} />
  );

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto"
    >
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-amber-800 text-sm font-medium sticky top-0 z-[55]">
          <ShieldCheck size={18} />
          <span>{t('editor.read_only_notice_text')}</span>
        </div>
      )}

      <TableOfContents />

      <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90' : ''}`}>
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight text-stone-800">
            {t('editor.title')}
          </h1>
          <div className="w-24 h-1 bg-primary/20 rounded-full mt-2"></div>
        </header>

        <Section id="basic-info" title={t('editor.sections.basic')}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 grid grid-cols-12 gap-y-4 gap-x-4">
              {f('basic.name', t('editor.basic.name'), "col-span-12 sm:col-span-6 text-lg")}
              {f('basic.classes', t('editor.basic.classes'), "col-span-12 sm:col-span-6 text-lg")}
              {f('basic.alignment', t('editor.basic.alignment'), "col-span-12 sm:col-span-6")}
              {f('basic.deity', t('editor.basic.deity'), "col-span-12 sm:col-span-6")}
              {f('basic.size', t('editor.basic.size'), "col-span-4")}
              {f('basic.gender', t('editor.basic.gender'), "col-span-4")}
              {f('basic.race', t('editor.basic.race'), "col-span-4")}
              {f('basic.age', t('editor.basic.age'), "col-span-4")}
              {f('basic.height', t('editor.basic.height'), "col-span-4")}
              {f('basic.weight', t('editor.basic.weight'), "col-span-4")}
              {f('basic.speed', t('editor.basic.speed'), "col-span-12 sm:col-span-6")}
              {f('basic.senses', t('editor.basic.senses'), "col-span-12 sm:col-span-6")}
              {f('basic.initiative', t('editor.basic.initiative'), "col-span-12 sm:col-span-6")}
              {f('basic.perception', t('editor.basic.perception'), "col-span-12 sm:col-span-6")}
              {f('basic.languages', t('editor.basic.languages'), "col-span-12 mt-2", { singleLine: false })}
            </div>
            <div className="w-full md:w-64 shrink-0">
              <AvatarGallery
                avatars={data.basic.avatars || []}
                onUpdate={(newAvatars) => updateField('basic.avatars', newAvatars)}
              />
            </div>
          </div>
        </Section>

        <Section id="story" title={t('editor.sections.story')}>
           {f('basic.story', t('editor.sections.story'), "italic font-serif", { singleLine: false })}
        </Section>

        <Section id="attributes" title={t('editor.sections.attributes')}>
           <div className="flex flex-col gap-8">
              <DynamicTable
                path="attributes"
                columns={[
                  { key: 'name', label: t('editor.attributes.headers.attr'), width: '10%' },
                  { key: 'final', label: t('editor.attributes.headers.final'), width: '10%' },
                  { key: 'modifier', label: t('editor.attributes.headers.mod'), width: '10%' },
                  { key: 'source', label: t('editor.attributes.headers.source'), width: '40%' },
                  { key: 'status', label: t('editor.attributes.headers.status'), width: '30%' }
                ]}
                readonlyColumns={['name']}
              />
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-full md:w-1/2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex justify-between">
                      {t('editor.attributes.combat_stats')}
                      <span className="text-stone-400 font-normal">BAB / CMB / CMD</span>
                    </label>
                    <DynamicTable
                      path="combatTable"
                      columns={[
                        { key: 'bab', label: 'BAB', width: '33.33%' },
                        { key: 'cmb', label: 'CMB', width: '33.33%' },
                        { key: 'cmd', label: 'CMD', width: '33.34%' }
                      ]}
                    />
                 </div>
                 {f('combatTable.combatManeuverNotes', t('editor.attributes.maneuver_notes'), "w-full md:w-1/2", { singleLine: false })}
              </div>
           </div>
        </Section>

        <Section id="attacks" title={t('editor.sections.attacks')}>
           <div className="flex flex-col gap-0 border border-stone-200 rounded-lg overflow-hidden shadow-sm">
              <DynamicTable
                path="attacks.meleeAttacks"
                columns={[
                  { key: 'weapon', label: t('editor.attacks.melee'), width: '20%' },
                  { key: 'hit', label: t('editor.attacks.hit'), width: '12%' },
                  { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                  { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%' },
                  { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%' },
                  { key: 'reach', label: t('editor.attacks.reach'), width: '8%' },
                  { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                  { key: 'special', label: t('editor.attacks.special'), width: '22%' }
                ]}
              />
              <div className="border-t border-stone-100">
                <DynamicTable
                  path="attacks.rangedAttacks"
                  columns={[
                    { key: 'weapon', label: t('editor.attacks.ranged'), width: '20%' },
                    { key: 'hit', label: t('editor.attacks.hit'), width: '12%' },
                    { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                    { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%' },
                    { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%' },
                    { key: 'range', label: t('editor.attacks.range'), width: '8%' },
                    { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                    { key: 'special', label: t('editor.attacks.special'), width: '22%' }
                  ]}
                />
              </div>
           </div>
           {f('attacks.specialAttacks', t('editor.attacks.special_attacks'), "mt-6", { singleLine: false })}
        </Section>

        <Section id="defenses" title={t('editor.sections.defenses')}>
           <div className="flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-full md:w-1/2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex justify-between">
                      {t('editor.defenses.ac_details')}
                      <span className="text-stone-400 font-normal">AC / {t('editor.defenses.touch')} / {t('editor.defenses.flat_footed')}</span>
                    </label>
                    <DynamicTable
                      path="defenses.acTable"
                      columns={[
                        { key: 'ac', label: 'AC', width: '20%' },
                        { key: 'source', label: t('editor.attributes.headers.source'), width: '50%' },
                        { key: 'touch', label: t('editor.defenses.touch'), width: '15%' },
                        { key: 'flatFooted', label: t('editor.defenses.flat_footed'), width: '15%' }
                      ]}
                    />
                 </div>
                 {f('defenses.acNotes', t('editor.defenses.ac_notes'), "w-full md:w-1/2", { singleLine: false })}
              </div>
              <div className="grid grid-cols-2 gap-8">
                 {f('defenses.hp', t('editor.defenses.hp'))}
                 {f('defenses.hd', t('editor.defenses.hd'))}
              </div>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="w-full md:w-1/2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex justify-between">
                      {t('editor.defenses.saves')}
                      <span className="text-stone-400 font-normal">{t('editor.defenses.fort')} / {t('editor.defenses.ref')} / {t('editor.defenses.will')}</span>
                    </label>
                    <DynamicTable
                      path="defenses.savesTable"
                      columns={[
                        { key: 'fort', label: t('editor.defenses.fort'), width: '33.33%' },
                        { key: 'ref', label: t('editor.defenses.ref'), width: '33.33%' },
                        { key: 'will', label: t('editor.defenses.will'), width: '33.34%' }
                      ]}
                    />
                 </div>
                 {f('defenses.savesNotes', t('editor.defenses.saves_notes'), "w-full md:w-1/2", { singleLine: false })}
              </div>
              {f('defenses.specialDefenses', t('editor.defenses.special_defenses'), "mt-2", { singleLine: false })}
           </div>
        </Section>

        {/* 顺序修正：背景特性 -> 种族特性 -> 职业能力 -> 专长 -> 技能 */}
        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
           <DynamicTable
             path="racialTraits"
             columns={[
               { key: 'name', label: t('editor.lists.trait'), width: '15%' },
               { key: 'desc', label: t('editor.lists.description'), width: '85%' }
             ]}
           />
        </Section>

        <Section id="traits" title={t('editor.sections.traits')}>
           <div className="flex flex-col gap-6">
              <DynamicTable
                path="backgroundTraits"
                columns={[
                  { key: 'name', label: t('editor.lists.trait_name'), width: '25%' },
                  { key: 'type', label: t('editor.lists.category'), width: '10%' },
                  { key: 'desc', label: t('editor.lists.description'), width: '65%' }
                ]}
              />
              <div className="grid grid-cols-2 gap-8">
                 {f('favoredClass', t('editor.lists.favored_class'))}
                 {f('favoredClassBonus', t('editor.lists.favored_class_bonus'))}
              </div>
           </div>
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
           <DynamicTable
             path="classFeatures"
             columns={[
               { key: 'level', label: t('editor.lists.level'), width: '8%' },
               { key: 'name', label: t('editor.sections.class_features'), width: '22%' },
               { key: 'type', label: t('editor.lists.ability_type'), width: '8%' },
               { key: 'desc', label: t('editor.lists.description'), width: '62%' }
             ]}
           />
        </Section>

        <Section id="feats" title={t('editor.sections.feats')}>
           <DynamicTable
             path="feats"
             columns={[
               { key: 'level', label: t('editor.lists.level'), width: '8%' },
               { key: 'source', label: t('editor.lists.source'), width: '15%' },
               { key: 'name', label: t('editor.lists.feat_name'), width: '20%' },
               { key: 'type', label: t('editor.lists.feat_type'), width: '10%' },
               { key: 'desc', label: t('editor.lists.description'), width: '47%' }
             ]}
           />
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
           <div className="flex gap-8 mb-6">
              {f('skillsTotal', t('editor.skills.total_points'), "w-24")}
              {f('armorCheckPenalty', t('editor.skills.acp'), "w-24")}
           </div>
           <DynamicTable
             path="skills"
             columns={[
               { key: 'name', label: t('editor.skills.headers.skill'), width: '15%' },
               { key: 'total', label: t('editor.skills.headers.total'), width: '8%' },
               { key: 'rank', label: t('editor.skills.headers.rank'), width: '8%' },
               { key: 'cs', label: t('editor.skills.headers.cs'), width: '8%' },
               { key: 'ability', label: t('editor.skills.headers.ability'), width: '12%' },
               { key: 'others', label: t('editor.skills.headers.others'), width: '15%' },
               { key: 'special', label: t('editor.skills.headers.special'), width: '34%' }
             ]}
           />
        </Section>

        <Section id="spells" title={t('editor.sections.spells')}>
           <MagicBlocks path="magicBlocks" />
        </Section>

        <Section id="equipment" title={t('editor.sections.equipment')}>
           <EquipmentBags path="equipmentBags" />
           <div className="mt-8 pt-8 border-t border-stone-200">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                 {f('currency.pp', 'PP')}
                 {f('currency.gp', 'GP')}
                 {f('currency.sp', 'SP')}
                 {f('currency.cp', 'CP')}
                 {f('currency.coinWeight', t('editor.items.coin_weight'))}
              </div>
           </div>
           <div className="flex flex-col md:flex-row gap-6 mt-8 items-center bg-stone-50 p-6 rounded-xl">
              <div className="flex gap-8 flex-1">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2">{t('editor.items.total_assets')}</span>
                    <span className="text-2xl font-serif font-bold text-stone-800">{calculateTotalCost(data)} <span className="text-sm font-normal text-stone-400 italic">gp</span></span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2">{t('editor.items.total_weight')}</span>
                    <span className="text-2xl font-serif font-bold text-stone-800">{calculateTotalWeightNum(data).toFixed(1)} <span className="text-sm font-normal text-stone-400 italic">lbs</span></span>
                 </div>
              </div>
              <div className="w-full md:w-32">
                 {f('encumbranceMultiplier', t('editor.items.encumbrance_multiplier'))}
              </div>
           </div>
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
           <AdditionalData path="additionalData" />
        </Section>
      </main>
    </motion.div>
  );
}

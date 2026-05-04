import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, GripVertical, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';

import Section from '../common/Section';
import DynamicInput from '../../controls/DynamicInput';
import DynamicTable from '../tables/DynamicTable';
import SpellTable from '../tables/SpellTable';
import MagicBlocks from '../character/MagicBlocks';
import AdditionalData from '../character/AdditionalData';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';

import { useCharacterStore } from '../../store/characterStore';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';
import { get } from 'lodash-es';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({ user }: CharacterEditorProps) {
  const { t } = useTranslation();
  
  // 1. 获取核心状态与操作
  const data = useCharacterStore(s => s.data);
  const isReadOnly = useCharacterStore(s => s.isReadOnly);
  const updateField = useCharacterStore(s => s.updateField);
  const setData = useCharacterStore(s => s.setData); // 注意：这里需要确保存储层支持全量覆盖

  // 2. 模拟旧版的业务辅助函数
  const updateBasic = (field: string, val: any) => updateField(`basic.${field}`, val);
  const updateDefenses = (field: string, val: any) => updateField(`defenses.${field}`, val);

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto bg-stone-100/30"
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
          <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight text-stone-800">{t('editor.title')}</h1>
          <div className="w-24 h-1 bg-amber-500/20 rounded-full mt-2"></div>
        </header>

        {/* 基础信息 */}
        <Section id="basic-info" title={t('editor.sections.basic')}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 grid grid-cols-12 gap-y-5 gap-x-6">
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.name')} path="basic.name" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.classes')} path="basic.classes" />
              <DynamicInput className="col-span-4" label={t('editor.basic.alignment')} path="basic.alignment" />
              <DynamicInput className="col-span-4" label={t('editor.basic.gender')} path="basic.gender" />
              <DynamicInput className="col-span-4" label={t('editor.basic.race')} path="basic.race" />
              <DynamicInput className="col-span-4" label={t('editor.basic.age')} path="basic.age" />
              <DynamicInput className="col-span-4" label={t('editor.basic.height')} path="basic.height" />
              <DynamicInput className="col-span-4" label={t('editor.basic.weight')} path="basic.weight" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.speed')} path="basic.speed.base" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.senses')} path="basic.senses" />
              <DynamicInput className="col-span-6 sm:col-span-3" label={t('editor.basic.initiative')} path="basic.initiative" />
              <DynamicInput className="col-span-6 sm:col-span-3" label={t('editor.basic.perception')} path="basic.perception" />
              <DynamicInput className="col-span-12" label={t('editor.basic.languages')} path="basic.languages" />
            </div>
            <div className="w-full md:w-64 shrink-0">
              <AvatarGallery
                avatars={data.basic.avatars || []}
                onUpdate={(newAvatars) => updateBasic('avatars', newAvatars)}
              />
            </div>
          </div>
        </Section>

        {/* 故事 */}
        <Section id="story" title={t('editor.sections.story')}>
           <DynamicInput path="story" />
        </Section>

        {/* 属性与战斗 */}
        <Section id="attributes" title={t('editor.sections.attributes')}>
           <div className="mb-8">
             <DynamicTable
                path="attributes"
                minWidth="0"
                columns={[
                  { key: 'name', label: t('editor.attributes.headers.attr'), width: '15%' },
                  { key: 'final', label: t('editor.attributes.headers.final'), width: '10%' },
                  { key: 'modifier', label: t('editor.attributes.headers.mod'), width: '10%' },
                  { key: 'source', label: t('editor.attributes.headers.source'), width: '35%' },
                  { key: 'status', label: t('editor.attributes.headers.status'), width: '30%' }
                ]}
             />
           </div>
           
           <div className="flex flex-col md:flex-row gap-8 items-stretch pt-4 border-t border-stone-200">
              <div className="w-full md:w-1/2 flex flex-col">
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
              <div className="w-full md:w-1/2 flex flex-col">
                <DynamicInput 
                   label={t('editor.attributes.maneuver_notes')} 
                   path="combatTable.combatManeuverNotes" 
                   wrapperClassName="h-full"
                />
              </div>
           </div>
        </Section>

        {/* 攻击 */}
        <Section id="attacks" title={t('editor.sections.attacks')}>
          <div className="flex flex-col gap-8">
             <DynamicTable 
                path="attacks.meleeAttacks" 
                columns={[
                   { key: 'weapon', label: t('editor.attacks.melee'), width: '25%' },
                   { key: 'hit', label: '命中', width: '10%' },
                   { key: 'damage', label: '伤害', width: '15%' },
                   { key: 'critRange', label: '暴击阈值', width: '10%' },
                   { key: 'critMultiplier', label: '倍率', width: '10%' },
                   { key: 'touch', label: '触及', width: '10%' },
                   { key: 'damageType', label: '类型', width: '20%' }
                ]}
             />
             <DynamicTable 
                path="attacks.rangedAttacks" 
                columns={[
                   { key: 'weapon', label: t('editor.attacks.ranged'), width: '25%' },
                   { key: 'hit', label: '命中', width: '10%' },
                   { key: 'damage', label: '伤害', width: '15%' },
                   { key: 'critRange', label: '暴击阈值', width: '10%' },
                   { key: 'critMultiplier', label: '倍率', width: '10%' },
                   { key: 'range', label: '射程', width: '10%' },
                   { key: 'damageType', label: '类型', width: '20%' }
                ]}
             />
             <DynamicInput path="attacks.specialAttacks" label={t('editor.attacks.special_attacks')} />
          </div>
        </Section>

        {/* 防御 */}
        <Section id="defenses" title={t('editor.sections.defenses')}>
           <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                 <div className="w-full md:w-1/2">
                   <DynamicTable 
                      path="defenses.acTable"
                      columns={[
                        { key: 'ac', label: 'AC', width: '20%' },
                        { key: 'source', label: '来源', width: '50%' },
                        { key: 'touch', label: '接触', width: '15%' },
                        { key: 'flatFooted', label: '措手不及', width: '15%' }
                      ]}
                   />
                 </div>
                 <DynamicInput label="AC 笔记" path="defenses.acTable.acNotes" className="flex-1" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                 <DynamicInput label="HP" path="defenses.hp" />
                 <DynamicInput label="HD" path="defenses.hd" />
              </div>
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                 <div className="w-full md:w-1/2">
                   <DynamicTable 
                      path="defenses.savesTable"
                      columns={[
                        { key: 'fort', label: '强韧', width: '33.33%' },
                        { key: 'ref', label: '反射', width: '33.33%' },
                        { key: 'will', label: '意志', width: '33.34%' }
                      ]}
                   />
                 </div>
                 <DynamicInput label="豁免笔记" path="defenses.savesTable.savesNotes" className="flex-1" />
              </div>
              <DynamicInput label="特殊防御" path="defenses.specialDefenses" />
           </div>
        </Section>

        {/* 技能 */}
        <Section id="skills" title={t('editor.sections.skills')}>
           <div className="flex gap-8 mb-4">
              <DynamicInput label="技能点总计" path="skillsTotal" className="w-24" />
              <DynamicInput label="ACP" path="armorCheckPenalty" className="w-24" />
           </div>
           <DynamicTable 
              path="skills"
              columns={[
                 { key: 'name', label: '技能', width: '20%' },
                 { key: 'total', label: '总值', width: '8%' },
                 { key: 'rank', label: '等级', width: '8%' },
                 { key: 'cs', label: '本职', width: '8%' },
                 { key: 'ability', label: '关键属性', width: '12%' },
                 { key: 'others', label: '其它修正', width: '12%' },
                 { key: 'special', label: '特定备注', width: '32%' }
              ]}
           />
        </Section>

        {/* 施法系统 */}
        <Section id="spells" title={t('editor.sections.spells')}>
           <MagicBlocks path="magicBlocks" />
        </Section>

        {/* 装备 & 负重 */}
        <Section id="equipment" title={t('editor.sections.equipment')}>
           <div className="flex flex-col gap-10">
              <div className="p-1">
                 {data.equipmentBags.map((bag, bagIdx) => (
                    <div key={bag.id} className="mb-8 border border-stone-200 rounded-lg overflow-hidden bg-white shadow-sm">
                       <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                          <input 
                             className="font-bold text-stone-700 bg-transparent outline-none focus:border-b focus:border-primary" 
                             value={bag.name} 
                             onChange={e => updateField(`equipmentBags[${bagIdx}].name`, e.target.value)}
                          />
                          <label className="flex items-center gap-2 text-[11px] font-medium text-stone-400">
                             <input type="checkbox" checked={bag.ignoreWeight} onChange={e => updateField(`equipmentBags[${bagIdx}].ignoreWeight`, e.target.checked)} />
                             {t('editor.items.ignore_weight')}
                          </label>
                       </div>
                       <DynamicTable 
                          path={`equipmentBags[${bagIdx}].items`}
                          columns={[
                             { key: 'item', label: '物品', width: '40%' },
                             { key: 'quantity', label: '数量', width: '10%' },
                             { key: 'cost', label: '单价', width: '15%' },
                             { key: 'weight', label: '重量', width: '15%' },
                             { key: 'notes', label: '备注', width: '20%' }
                          ]}
                       />
                    </div>
                 ))}
                 <button onClick={() => updateField('equipmentBags', [...data.equipmentBags, { id: Date.now().toString(), name: '新容器', items: { item: [], quantity: [], cost: [], weight: [], notes: [] }, ignoreWeight: false }])} className="w-full py-4 border-2 border-dashed border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-400 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Plus size={18} /> {t('editor.items.add_container')}
                 </button>
              </div>

              {/* 钱币与负重预览 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-stone-300">
                 <div className="flex flex-col gap-4">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">{t('editor.items.currency')}</label>
                    <div className="grid grid-cols-5 gap-3">
                       <DynamicInput path="currency.pp" label="PP" />
                       <DynamicInput path="currency.gp" label="GP" />
                       <DynamicInput path="currency.sp" label="SP" />
                       <DynamicInput path="currency.cp" label="CP" />
                       <DynamicInput path="currency.coinWeight" label="钱币总重" />
                    </div>
                 </div>
                 <div className="bg-stone-50 p-4 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-stone-500 uppercase">{t('editor.items.total_assets')}</span>
                       <span className="font-serif font-bold text-xl">{calculateTotalCost(data)} gp</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-stone-500 uppercase">{t('editor.items.total_weight')}</span>
                       <span className="font-serif font-bold text-xl">{calculateTotalWeightNum(data).toFixed(1)} lbs</span>
                    </div>
                 </div>
              </div>
           </div>
        </Section>

        {/* 更多资料 */}
        <Section id="additional-data" title={t('editor.sections.additional')}>
           <AdditionalData path="additionalData" />
        </Section>

      </main>
    </motion.div>
  );
}

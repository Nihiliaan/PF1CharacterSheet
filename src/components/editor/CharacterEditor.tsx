import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, GripVertical, Trash2, Plus } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { CharacterData } from '../../types';
import Section from '../common/Section';
import InlineInput from '../common/InlineInput';
import AutoResizeTextarea from '../common/AutoResizeTextarea';
import DynamicTable from '../common/DynamicTable';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';

import { useCharacter } from '../../contexts/CharacterContext';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({
  user
}: CharacterEditorProps) {
  const {
    isReadOnly,
    data,
    setData,
    lastSavedData,
    updateBasic,
    updateDefenses,
    tableActionMode,
    toggleTableActionMode,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop,
    addBag,
    removeBag,
    updateBagName,
    updateBagItems,
    handleBagDragStart,
    handleBagDragOver,
    handleBagDrop,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDrop,
    calculateTotalCost,
    calculateTotalWeightNum,
    encumbrance,
    dragEnabledFor,
    setDragEnabledFor,
    handleDragStart,
    handleDragOver,
    handleDrop,
    addMagicBlock,
    updateMagicBlock,
    removeMagicBlock,
    addAdditionalBlock,
    updateAdditionalBlock,
    removeAdditionalBlock,
    handleSave: saveCharacter // Mapping handleSave to saveCharacter name used in component
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
          <span>您正在查看的内容为只读版本。</span>
          {user && (
            <button
              onClick={async () => {
                const id = await saveCharacter(data);
                if (id) {
                  window.location.href = `?id=${id}`;
                }
              }}
              className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs transition-colors"
            >
              复制到我的收藏
            </button>
          )}
        </div>
      )}

      <TableOfContents />
      <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90 grayscale-[0.2]' : ''}`}>
        <header className="mb-8 text-center flex flex-col items-center">
          <h1 className="text-4xl font-serif font-bold text-ink mb-2">角色卡 (Character Sheet)</h1>
        </header>

        <Section id="basic-info" title="基本信息 (Basic Info)" className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 grid grid-cols-12 gap-y-4 gap-x-4">
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label="角色名 (Name)" value={data.basic.name} originalValue={lastSavedData.basic.name} onChange={v => updateBasic('name', v)} />
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label="职业与等级 (Classes & Levels)" value={data.basic.classes} originalValue={lastSavedData.basic.classes} onChange={v => updateBasic('classes', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="阵营 (Alignment)" value={data.basic.alignment} originalValue={lastSavedData.basic.alignment} onChange={v => updateBasic('alignment', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="信仰 (Deity)" value={data.basic.deity || ''} originalValue={lastSavedData.basic.deity || ''} onChange={v => updateBasic('deity', v)} />
              <InlineInput className="col-span-4" label="体型 (Size)" value={data.basic.size} originalValue={lastSavedData.basic.size} onChange={v => updateBasic('size', v)} />
              <InlineInput className="col-span-4" label="性别 (Gender)" value={data.basic.gender} originalValue={lastSavedData.basic.gender} onChange={v => updateBasic('gender', v)} />
              <InlineInput className="col-span-4" label="种族 (Race)" value={data.basic.race} originalValue={lastSavedData.basic.race} onChange={v => updateBasic('race', v)} />
              <InlineInput className="col-span-4" label="年龄 (Age)" value={data.basic.age} originalValue={lastSavedData.basic.age} onChange={v => updateBasic('age', v)} />
              <InlineInput className="col-span-4" label="身高 (Height)" value={data.basic.height} originalValue={lastSavedData.basic.height} onChange={v => updateBasic('height', v)} />
              <InlineInput className="col-span-4" label="体重 (Weight)" value={data.basic.weight} originalValue={lastSavedData.basic.weight} onChange={v => updateBasic('weight', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="移动速度 (Speed)" value={data.basic.speed} originalValue={lastSavedData.basic.speed} onChange={v => updateBasic('speed', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="感官 (Senses)" value={data.basic.senses} originalValue={lastSavedData.basic.senses} onChange={v => updateBasic('senses', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="先攻 (Initiative)" value={data.basic.initiative} originalValue={lastSavedData.basic.initiative} onChange={v => updateBasic('initiative', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label="察觉 (Perception)" value={data.basic.perception} originalValue={lastSavedData.basic.perception} onChange={v => updateBasic('perception', v)} />
              <div className={`col-span-12 flex flex-col gap-0.5 focus-within:ring-1 focus-within:ring-primary rounded p-1 bg-white/50 border transition-colors mt-2 ${JSON.stringify(data.basic.languages) !== JSON.stringify(lastSavedData.basic.languages) ? 'bg-amber-100/50 border-amber-300' : 'border-transparent hover:border-stone-200'}`}>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
                  语言 (Languages)
                  {(data.basic.languages !== lastSavedData.basic.languages) && <span className="text-amber-600 animate-pulse">●</span>}
                </label>
                <AutoResizeTextarea
                  className="!bg-transparent !border-b !border-stone-300 focus:!border-stone-800 transition-colors outline-none !pb-0.5 w-full text-sm font-medium text-ink !px-0 !pt-0 !rounded-none !border-x-0 !border-t-0 shadow-none"
                  value={data.basic.languages}
                  originalValue={lastSavedData.basic.languages}
                  onChange={v => updateBasic('languages', v)}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <AvatarGallery
                avatars={data.basic.avatars}
                onUpdate={(newAvatars) => updateBasic('avatars', newAvatars)}
              />
            </div>
          </div>
        </Section>

        <Section id="story" title="背景故事 (Background Story)">
          <div className={`relative ${data.basic.story !== lastSavedData.basic.story ? 'ring-2 ring-amber-300 rounded-lg' : ''}`}>
            <textarea
              className={`w-full min-h-[160px] p-6 text-stone-700 font-serif leading-relaxed italic bg-white border border-stone-200 rounded-lg outline-none focus:border-primary transition-all shadow-inner ${data.basic.story !== lastSavedData.basic.story ? 'bg-amber-50/30' : ''}`}
              placeholder="在此书写角色的过往与传说..."
              value={data.basic.story}
              onChange={e => updateBasic('story', e.target.value)}
            />
            {data.basic.story !== lastSavedData.basic.story && (
              <div className="absolute right-4 top-4 w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="未保存更改" />
            )}
          </div>
        </Section>

        <Section id="attributes" title="属性(Attributes)">
          <div className="mb-4">
            <DynamicTable
              columns={[
                { key: 'name', label: '属性 (Attr)', width: '10%' },
                { key: 'final', label: '最终值 (Final)', width: '10%', type: 'posInt' },
                { key: 'modifier', label: '调整值 (Mod)', width: '10%', type: 'bonus' },
                { key: 'source', label: '来源 (Source)', width: '40%' },
                { key: 'status', label: '状态 (Status)', width: '30%' }
              ]}
              data={data.attributes}
              originalData={lastSavedData.attributes}
              onChange={v => setData({ ...data, attributes: v })}
              fixedRows={true}
              readonlyColumns={['name']}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-6 mt-4 items-stretch">
            <div className="w-full md:w-1/2 flex flex-col">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                战斗数值 (Combat Stats)
                <span className="text-stone-400 font-normal">BAB / CMB / CMD</span>
              </label>
              <div className="flex-1">
                <DynamicTable
                  minWidth="0"
                  columns={[
                    { key: 'bab', label: 'BAB', width: '33.33%' },
                    { key: 'cmb', label: 'CMB', width: '33.33%' },
                    { key: 'cmd', label: 'CMD', width: '33.34%' }
                  ]}
                  data={data.babTable || [{ bab: '', cmb: '', cmd: '' }]}
                  originalData={lastSavedData.babTable || [{ bab: '', cmb: '', cmd: '' }]}
                  onChange={v => setData({ ...data, babTable: v })}
                  fixedRows={true}
                />
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                战技备注 (Combat Maneuver Notes)
                {(data.combatManeuverNotes !== lastSavedData.combatManeuverNotes) && <span className="text-amber-600 animate-pulse">●</span>}
              </label>
              <div className={`flex-1 rounded border transition-colors overflow-hidden flex ${data.combatManeuverNotes !== lastSavedData.combatManeuverNotes ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
                <textarea
                  value={data.combatManeuverNotes || ''}
                  onChange={e => setData({ ...data, combatManeuverNotes: e.target.value })}
                  className="w-full h-full bg-transparent outline-none px-3 py-2 text-sm font-medium text-ink resize-none placeholder:text-stone-300 leading-relaxed"
                  placeholder="在此输入战技相关的特殊加值或备注..."
                />
              </div>
            </div>
          </div>
        </Section>

        <Section id="attacks" title="攻击 (Attacks)">
          <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
            <div className="border-b border-stone-200">
              <DynamicTable
                minWidth="0"
                columns={[
                  { key: 'weapon', label: '近战武器', width: '25%' },
                  { key: 'hit', label: '命中 (Hit)', width: '15%' },
                  { key: 'damage', label: '伤害 (Dmg)', width: '15%' },
                  { key: 'crit', label: '重击范围和倍率 (Crit)', width: '10%' },
                  { key: 'range', label: '触及 (Touch)', width: '5%' },
                  { key: 'type', label: '类型 (Type)', width: '5%' },
                  { key: 'special', label: '特性 (Special)', width: '25%' }
                ]}
                data={data.meleeAttacks || []}
                originalData={lastSavedData.meleeAttacks || []}
                onChange={v => setData({ ...data, meleeAttacks: v })}
                newItemGenerator={() => ({ weapon: '', hit: '', damage: '', crit: '', range: '', type: '', special: '' })}
                rowDraggable={true}
                rowActionMode={tableActionMode}
                onRowActionModeToggle={toggleTableActionMode}
                onRowDragStart={(idx, e) => handleTableItemDragStart('meleeAttacks', idx, e)}
                onRowDragOver={(idx, e) => handleTableItemDragOver('meleeAttacks', idx, e)}
                onRowDrop={(idx, e) => handleTableItemDrop('meleeAttacks', idx, e)}
              />
            </div>
            <DynamicTable
              minWidth="0"
              columns={[
                { key: 'weapon', label: '远程武器', width: '25%' },
                { key: 'hit', label: '命中 (Hit)', width: '15%' },
                { key: 'damage', label: '伤害 (Dmg)', width: '15%' },
                { key: 'crit', label: '重击范围和倍率 (Crit)', width: '10%' },
                { key: 'range', label: '射程 (Range)', width: '5%' },
                { key: 'type', label: '类型 (Type)', width: '5%' },
                { key: 'special', label: '特性 (Special)', width: '25%' }
              ]}
              data={data.rangedAttacks || []}
              originalData={lastSavedData.rangedAttacks || []}
              onChange={v => setData({ ...data, rangedAttacks: v })}
              newItemGenerator={() => ({ weapon: '', hit: '', damage: '', crit: '', range: '', type: '', special: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('rangedAttacks', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('rangedAttacks', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('rangedAttacks', idx, e)}
            />
          </div>
          <div className="mt-8">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
              特殊攻击 (Special Attacks)
              {data.specialAttacks !== lastSavedData.specialAttacks && <span className="text-amber-600 animate-pulse">●</span>}
            </label>
            <AutoResizeTextarea
              value={data.specialAttacks || ''}
              originalValue={lastSavedData.specialAttacks || ''}
              onChange={v => setData({ ...data, specialAttacks: v })}
            />
          </div>
        </Section>

        <Section id="defenses" title="防御 (Defenses)">
          <div className="flex flex-col gap-6">
            {/* AC Row */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  防护等级 (AC Details)
                  <span className="text-stone-400 font-normal">AC / 措手不及 / 接触</span>
                </label>
                <div className="flex-1">
                  <DynamicTable
                    minWidth="0"
                    columns={[
                      { key: 'ac', label: 'AC', width: '33.33%' },
                      { key: 'flatFooted', label: '措手不及', width: '33.33%' },
                      { key: 'touch', label: '接触', width: '33.34%' }
                    ]}
                    data={data.defenses.acTable || [{ ac: '', flatFooted: '', touch: '' }]}
                    originalData={lastSavedData.defenses.acTable || [{ ac: '', flatFooted: '', touch: '' }]}
                    onChange={v => updateDefenses('acTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  防护备注 (AC Notes)
                  {(data.defenses.acNotes !== lastSavedData.defenses.acNotes) && <span className="text-amber-600 animate-pulse">●</span>}
                </label>
                <div className={`flex-1 rounded border transition-colors overflow-hidden flex ${data.defenses.acNotes !== lastSavedData.defenses.acNotes ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
                  <textarea
                    value={data.defenses.acNotes || ''}
                    onChange={e => updateDefenses('acNotes', e.target.value)}
                    className="w-full h-full bg-transparent outline-none px-3 py-2 text-sm font-medium text-ink resize-none placeholder:text-stone-300 leading-relaxed"
                    placeholder="护甲加值来源、闪避、天生护甲等..."
                  />
                </div>
              </div>
            </div>

            {/* HP & HD Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <InlineInput
                  label="生命值 (HP)"
                  value={data.defenses.hp}
                  originalValue={lastSavedData.defenses.hp}
                  onChange={v => updateDefenses('hp', v)}
                  placeholder="例如：20"
                />
              </div>
              <div className="w-full md:w-1/2">
                <InlineInput
                  label="生命骰 (Hit Die)"
                  value={data.defenses.hd || ''}
                  originalValue={lastSavedData.defenses.hd}
                  onChange={v => updateDefenses('hd', v)}
                  placeholder="例如：3d8+3"
                />
              </div>
            </div>

            {/* Saves Row */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  豁免 (Saving Throws)
                  <span className="text-stone-400 font-normal">强韧 / 反射 / 意志</span>
                </label>
                <div className="flex-1">
                  <DynamicTable
                    minWidth="0"
                    columns={[
                      { key: 'fort', label: '强韧', width: '33.33%' },
                      { key: 'ref', label: '反射', width: '33.33%' },
                      { key: 'will', label: '意志', width: '33.34%' }
                    ]}
                    data={data.defenses.savesTable || [{ fort: '', ref: '', will: '' }]}
                    originalData={lastSavedData.defenses.savesTable || [{ fort: '', ref: '', will: '' }]}
                    onChange={v => updateDefenses('savesTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  豁免备注 (Saves Notes)
                  {(data.defenses.savesNotes !== lastSavedData.defenses.savesNotes) && <span className="text-amber-600 animate-pulse">●</span>}
                </label>
                <div className={`flex-1 rounded border transition-colors overflow-hidden flex ${data.defenses.savesNotes !== lastSavedData.defenses.savesNotes ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
                  <textarea
                    value={data.defenses.savesNotes || ''}
                    onChange={e => updateDefenses('savesNotes', e.target.value)}
                    className="w-full h-full bg-transparent outline-none px-3 py-2 text-sm font-medium text-ink resize-none placeholder:text-stone-300 leading-relaxed"
                    placeholder="抗力加值、对抗恐惧/毒素的额外加值等..."
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="racial-traits" title="种族特性 (Racial Traits)">
          <DynamicTable
            columns={[
              { key: 'name', label: '特性 (Trait)', width: '25%' },
              { key: 'type', label: '类型 (Type)', width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
              { key: 'desc', label: '描述 (Description)', width: '70%' }
            ]}
            data={data.racialTraits}
            originalData={lastSavedData.racialTraits}
            onChange={v => setData({ ...data, racialTraits: v })}
            newItemGenerator={() => ({ name: '', type: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('racialTraits', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('racialTraits', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('racialTraits', idx, e)}
          />
        </Section>

        <Section id="traits" title="背景特性与天赋职业 (Background Traits & Favored Class)">
          <div className="flex flex-col gap-6">
            <DynamicTable
              columns={[
                { key: 'name', label: '特性名称 (Trait Name)', width: '25%' },
                { key: 'type', label: '类型 (Type)', width: '5%' },
                { key: 'desc', label: '说明 (Description)', width: '70%' }
              ]}
              data={data.backgroundTraits}
              originalData={lastSavedData.backgroundTraits}
              onChange={v => setData({ ...data, backgroundTraits: v })}
              newItemGenerator={() => ({ name: '', type: '', desc: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('backgroundTraits', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('backgroundTraits', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('backgroundTraits', idx, e)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InlineInput label="天赋职业 (Favored Class)" value={data.favoredClass} onChange={v => setData(p => ({ ...p, favoredClass: v }))} />
              <InlineInput label="天赋职业奖励 (Favored Class Bonus)" value={data.favoredClassBonus} onChange={v => setData(p => ({ ...p, favoredClassBonus: v }))} />
            </div>
          </div>
        </Section>

        <Section id="class-features" title="职业特性 (Class Features)">
          <DynamicTable
            columns={[
              { key: 'level', label: '等级 (Level)', width: '5%' },
              { key: 'name', label: '特性 (Features)', width: '25%' },
              { key: 'type', label: '类型 (Type)', width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
              { key: 'desc', label: '说明 (Description)', width: '65%' }
            ]}
            data={data.classFeatures}
            originalData={lastSavedData.classFeatures}
            onChange={v => setData({ ...data, classFeatures: v })}
            newItemGenerator={() => ({ level: '', name: '', type: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('classFeatures', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('classFeatures', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('classFeatures', idx, e)}
          />
        </Section>

        <Section id="feats" title="专长 (Feats)">
          <DynamicTable
            columns={[
              { key: 'level', label: '等级 (Level)', width: '5%' },
              { key: 'type', label: '类型 (Type)', width: '5%' },
              { key: 'name', label: '专长名称 (Feat Name)', width: '20%' },
              { key: 'source', label: '来源 (Source)', width: '15%' },
              { key: 'desc', label: '说明 (Description)', width: '55%' }
            ]}
            data={data.feats}
            originalData={lastSavedData.feats}
            onChange={v => setData({ ...data, feats: v })}
            newItemGenerator={() => ({ level: '', name: '', type: '', source: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('feats', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('feats', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('feats', idx, e)}
          />
        </Section>

        <Section id="spells" title="法术与类法术能力 (Spells & Sp)">
          <div className="flex flex-col gap-6 w-full">
            {data.magicBlocks.map(block => (
              <div
                key={block.id}
                className="relative group/magic flex flex-col gap-1 -mx-2 px-2 py-1 rounded transition-colors hover:bg-stone-50"
                draggable={dragEnabledFor === block.id}
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragOver={(e) => handleDragOver(e, block.id, 'magicBlocks')}
                onDrop={(e) => handleDrop(e, block.id, 'magicBlocks')}
              >
                <div className="flex items-center gap-2 mb-1 group/title relative">
                  <div onMouseEnter={() => setDragEnabledFor(block.id)} onMouseLeave={() => setDragEnabledFor(null)} className="cursor-move text-stone-300 hover:text-stone-500 transition-colors opacity-0 group-hover/magic:opacity-100 absolute -left-6">
                    <GripVertical size={16} />
                  </div>
                  <input className="text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-transparent border-b border-transparent focus:border-stone-400 outline-none transition-colors max-w-sm" value={block.title} onChange={e => updateMagicBlock(block.id, { title: e.target.value })} placeholder="小字标题" />
                  <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded">
                    <Trash2 size={12} />
                  </button>
                </div>
                {block.type === 'text' ? (
                  <AutoResizeTextarea value={block.content || ''} onChange={v => updateMagicBlock(block.id, { content: v })} />
                ) : (
                  <DynamicTable
                    columns={block.columns || []}
                    data={block.tableData || []}
                    onChange={v => updateMagicBlock(block.id, { tableData: v })}
                    newItemGenerator={() => {
                      const obj: any = {};
                      (block.columns || []).forEach((c: any) => obj[c.key] = '');
                      return obj;
                    }}
                    onColumnLabelChange={(index, val) => {
                      const newCols = [...(block.columns || [])];
                      newCols[index] = { ...newCols[index], label: val };
                      updateMagicBlock(block.id, { columns: newCols });
                    }}
                    onRemoveColumn={(index) => {
                      const newCols = [...(block.columns || [])];
                      newCols.splice(index, 1);
                      updateMagicBlock(block.id, { columns: newCols });
                    }}
                    onAddColumn={() => {
                      updateMagicBlock(block.id, { columns: [...(block.columns || []), { key: 'col' + Math.random(), label: '新列' }] });
                    }}
                  />
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => addMagicBlock('text')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"><Plus size={14} /> 添加段落</button>
              <button onClick={() => addMagicBlock('table')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"><Plus size={14} /> 添加列表</button>
            </div>
          </div>
        </Section>

        <Section id="skills" title="技能加点 (Skills)">
          <DynamicTable
            columns={[
              { key: 'name', label: '技能 (Skill)', width: '15%' },
              { key: 'total', label: '总加值 (Total)', width: '8%', type: 'bonus' },
              { key: 'rank', label: '等级 (Rank)', width: '8%', type: 'posInt' },
              { key: 'cs', label: '本职 (CS)', width: '8%', type: 'checkbox' },
              {
                key: 'ability',
                label: '属性 (Ability)',
                width: '10%',
                type: 'select',
                options: ['', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
                displayFormatter: (val) => {
                  if (!val) return '';
                  const attr = data.attributes.find(a => a.name.toLocaleUpperCase().includes(val.toLocaleUpperCase()));
                  if (!attr) return val;
                  const mod = parseInt(attr.modifier);
                  if (isNaN(mod)) return attr.modifier || '0';
                  return mod >= 0 ? `+${mod}` : mod.toString();
                }
              },
              { key: 'others', label: '其它 (Others)', width: '10%' },
              { key: 'special', label: '特殊说明 (Special/Conditional)', width: '31%' }
            ]}
            data={data.skills}
            originalData={lastSavedData.skills}
            onChange={v => setData({ ...data, skills: v })}
            newItemGenerator={() => ({ name: '', total: '', source: '', special: '' })}
            footerRow={(data as any).skillsTotal}
            onFooterChange={v => setData({ ...data, skillsTotal: v } as any)}
            footerReadonlyColumns={['name']}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
          />
        </Section>

        <Section id="equipment" title="装备与物品 (Equipment)">
          <div className="flex flex-col gap-8">
            {data.equipmentBags.map((bag, bagIndex) => (
              <div key={bag.id} className="border rounded p-4 bg-stone-50/50 border-stone-200" onDragOver={(e) => handleBagDragOver(e, bagIndex)} onDrop={(e) => handleBagDrop(e, bagIndex)}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="cursor-grab text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1" draggable onDragStart={(e) => handleBagDragStart(e, bagIndex)}><GripVertical size={18} /></div>
                    <input className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 max-w-sm w-full" value={bag.name} onChange={e => updateBagName(bag.id, e.target.value)} />
                  </div>
                  <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors"><Trash2 size={14} /> 删除容器</button>
                </div>
                <DynamicTable
                  columns={[
                    { key: 'item', label: '物品 (Item)', width: '35%', hideRightBorder: true },
                    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
                    { key: 'cost', label: '价格 (Cost)(gp)', width: '15%', type: 'float' },
                    { key: 'weight', label: '重量 (Weight)(lbs)', width: '15%', type: 'float' },
                    { key: 'notes', label: '备注 (Notes)', width: '30%' },
                  ]}
                  data={bag.items}
                  originalData={lastSavedData.equipmentBags?.find((b: any) => b.id === bag.id)?.items || []}
                  onChange={v => updateBagItems(bag.id, v)}
                  newItemGenerator={() => ({ item: '', quantity: '1', cost: '', weight: '', notes: '' })}
                  rowDraggable={true}
                  rowActionMode={tableActionMode}
                  onRowActionModeToggle={toggleTableActionMode}
                  onRowDragStart={(idx, e) => handleItemDragStart(bag.id, idx, e)}
                  onRowDragOver={(idx, e) => handleItemDragOver(bag.id, idx, e)}
                  onRowDrop={(idx, e) => handleItemDrop(bag.id, idx, e)}
                />
              </div>
            ))}
            <button onClick={addBag} className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 rounded p-3 justify-center"><Plus size={16} /> 添加物品容器</button>
            <div className="flex flex-col md:flex-row gap-4 mt-6 items-stretch">
              <div className="flex flex-col gap-0.5 border border-stone-200 bg-stone-50 rounded p-2 min-w-[120px] justify-center">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">总资产 (Total Cost)</label>
                <div className="text-sm font-medium text-ink px-1 py-1">{calculateTotalCost()} gp</div>
              </div>
              <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-4 py-6 min-h-[80px] justify-center">
                <div className="flex items-center gap-6">
                  <span className="text-xl font-bold font-serif text-ink">{calculateTotalWeightNum().toLocaleString()} <span className="text-sm font-normal text-stone-500">lbs</span></span>
                  <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all bg-green-400`} style={{ width: `${Math.min((calculateTotalWeightNum() / encumbrance.heavy) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="additional-data" title="附加数据 (Additional Data)">
          <div className="flex flex-col gap-8">
            {data.additionalData.map(block => (
              <div key={block.id} draggable={dragEnabledFor === block.id} onDragStart={(e) => handleDragStart(e, block.id)} onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')} onDrop={(e) => handleDrop(e, block.id, 'additionalData')} className="border border-stone-200 rounded p-4 bg-stone-50/50">
                <div className="flex items-center gap-4 mb-3">
                  <div onMouseEnter={() => setDragEnabledFor(block.id)} onMouseLeave={() => setDragEnabledFor(null)} className="cursor-move text-stone-400 px-1"><GripVertical size={20} /></div>
                  <input className="text-lg font-bold font-serif text-primary bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 flex-1" value={block.title} onChange={e => updateAdditionalBlock(block.id, { title: e.target.value })} placeholder="区块标题" />
                  <button onClick={() => removeAdditionalBlock(block.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1"><Trash2 size={14} /> 删除</button>
                </div>
                {block.type === 'text' ? (
                  <AutoResizeTextarea value={block.content || ''} onChange={v => updateAdditionalBlock(block.id, { content: v })} />
                ) : block.type === 'image' ? (
                  <input className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-sm outline-none" value={block.url || ''} onChange={e => updateAdditionalBlock(block.id, { url: e.target.value })} placeholder="图片链接" />
                ) : (
                  <DynamicTable columns={block.columns || []} data={block.tableData || []} onChange={v => updateAdditionalBlock(block.id, { tableData: v })} />
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => addAdditionalBlock('text')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> 添加文本框</button>
              <button onClick={() => addAdditionalBlock('table')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> 添加表格</button>
              <button onClick={() => addAdditionalBlock('image')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> 添加图片</button>
            </div>
          </div>
        </Section>
      </main>
    </motion.div>
  );
}

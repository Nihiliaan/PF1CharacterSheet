import React from 'react';
import { produce } from 'immer';
import { motion } from 'motion/react';
import { ShieldCheck, GripVertical, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import { CharacterData, ATTRIBUTE_NAMES } from '../../types';
import Section from '../common/Section';
import InlineInput from '../common/InlineInput';
import MultilineInput from '../common/MultilineInput';
import DynamicTable from '../common/DynamicTable';
import SpellTable from '../common/SpellTable';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';

import { useCharacter } from '../../contexts/CharacterContext';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';
import { getDisplayValue } from '../../utils/formatters';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({
  user
}: CharacterEditorProps) {
  const { t, i18n } = useTranslation();
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
    toggleBagWeight,
    updateBagItems,
    handleBagDragStart,
    handleBagDragOver,
    handleBagDrop,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDrop,
    dragEnabledFor,
    setDragEnabledFor,
    handleDragStart,
    handleDragOver,
    handleDrop,
    addMagicBlock,
    updateMagicBlock,
    removeMagicBlock,
    updateAdditionalBlock,
    removeAdditionalBlock,
    addAdditionalBlock,
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

        <Section id="basic-info" title={t('editor.sections.basic')} className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 grid grid-cols-12 gap-y-4 gap-x-4">
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.name')} value={data.basic.name} path="basic.name" originalValue={lastSavedData.basic.name} onChange={v => updateBasic('name', v)} />
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.classes')} value={data.basic.classes} path="basic.classes" originalValue={lastSavedData.basic.classes} onChange={v => updateBasic('classes', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.alignment')} value={data.basic.alignment} path="basic.alignment" originalValue={lastSavedData.basic.alignment} onChange={v => updateBasic('alignment', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.deity')} value={data.basic.deity || ''} path="basic.deity" originalValue={lastSavedData.basic.deity || ''} onChange={v => updateBasic('deity', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.size')} value={data.basic.size} path="basic.size" originalValue={lastSavedData.basic.size} onChange={v => updateBasic('size', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.gender')} value={data.basic.gender} path="basic.gender" originalValue={lastSavedData.basic.gender} onChange={v => updateBasic('gender', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.race')} value={data.basic.race} path="basic.race" originalValue={lastSavedData.basic.race} onChange={v => updateBasic('race', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.age')} value={data.basic.age} path="basic.age" originalValue={lastSavedData.basic.age} onChange={v => updateBasic('age', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.height')} value={data.basic.height} path="basic.height" originalValue={lastSavedData.basic.height} onChange={v => updateBasic('height', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.weight')} value={data.basic.weight} path="basic.weight" originalValue={lastSavedData.basic.weight} onChange={v => updateBasic('weight', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.speed')} value={data.basic.speed.land} path="basic.speed.land" originalValue={lastSavedData.basic.speed.land} onChange={v => updateBasic('speed', { ...data.basic.speed, land: v })} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.senses')} value={data.basic.senses} path="basic.senses" originalValue={lastSavedData.basic.senses} onChange={v => updateBasic('senses', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.initiative')} value={data.basic.initiative} path="basic.initiative" originalValue={lastSavedData.basic.initiative} onChange={v => updateBasic('initiative', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.perception')} value={data.basic.perception} path="basic.perception" originalValue={lastSavedData.basic.perception} onChange={v => updateBasic('perception', v)} />
              <MultilineInput
                className="col-span-12 mt-2"
                label={t('editor.basic.languages')}
                path="basic.languages"
                value={data.basic.languages}
                originalValue={lastSavedData.basic.languages}
                onChange={v => updateBasic('languages', v)}
                isAutoHeight={true}
              />
            </div>
            <div className="w-full md:w-64">
              <AvatarGallery
                avatars={data.basic.avatars}
                onUpdate={(newAvatars) => updateBasic('avatars', newAvatars)}
              />
            </div>
          </div>
        </Section>

        <Section id="story" title={t('editor.sections.story')}>
          <MultilineInput
            label={t('editor.sections.story')}
            placeholder={t('editor.basic.story_placeholder')}
            path="story"
            value={data.story}
            originalValue={lastSavedData.story}
            onChange={v => setData({ ...data, story: v })}
            isAutoHeight={true}
            className="font-serif italic"
          />
        </Section>

        <Section id="attributes" title={t('editor.sections.attributes')}>
          <div className="mb-4">
            <DynamicTable
              path="attributes"
              columns={[
                { key: 'name', label: t('editor.attributes.headers.attr'), width: '20%' },
                { key: 'final', label: t('editor.attributes.headers.final'), width: '20%', type: 'int' },
                { key: 'modifier', label: t('editor.attributes.headers.mod'), width: '20%', type: 'bonus' },
                { key: 'source', label: t('editor.attributes.headers.source'), width: '20%' },
                { key: 'status', label: t('editor.attributes.headers.status'), width: '20%' }
              ]}
              data={{
                ...data.attributes,
                name: ATTRIBUTE_NAMES.map(attr => t('editor.attributes.' + attr))
              }}
              originalData={{
                ...lastSavedData.attributes,
                name: ATTRIBUTE_NAMES.map(attr => t('editor.attributes.' + attr))
              }}
              onChange={newAttrs => {
                const { name, ...rest } = newAttrs as any;
                setData({ ...data, attributes: rest });
              }}
              readonlyColumns={['name']}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-6 mt-4 items-stretch">
            <div className="w-full md:w-1/2 flex flex-col">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                {t('editor.attributes.combat_stats')}
                <span className="text-stone-400 font-normal">BAB / CMB / CMD</span>
              </label>
              <div className="flex-1">
                <DynamicTable
                  minWidth="0"
                  path="combatTable"
                  columns={[
                    { key: 'bab', label: 'BAB', width: '33.33%', type: 'bonus' },
                    { key: 'cmb', label: 'CMB', width: '33.33%', type: 'bonus' },
                    { key: 'cmd', label: 'CMD', width: '33.34%', type: 'int' }
                  ]}
                  data={data.combatTable}
                  originalData={lastSavedData.combatTable}
                  onChange={v => setData({ ...data, combatTable: v as any })}
                  fixedRows={true}
                />
              </div>
            </div>
            <MultilineInput
              className="w-full md:w-1/2"
              label={t('editor.attributes.maneuver_notes')}
              path="combatManeuverNotes"
              value={data.combatManeuverNotes || ''}
              originalValue={lastSavedData.combatManeuverNotes}
              onChange={v => setData({ ...data, combatManeuverNotes: v })}
              placeholder={t('editor.attributes.maneuver_placeholder')}
              height="100%"
            />
          </div>
        </Section>

        <Section id="attacks" title={t('editor.sections.attacks')}>
          <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
            <div className="border-b border-stone-200">
              <DynamicTable
                minWidth="0"
                path="attacks.meleeAttacks"
                columns={[
                  { key: 'weapon', label: t('editor.attacks.melee'), width: '20%' },
                  { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
                  { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                  { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%' },
                  { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%' },
                  { key: 'range', label: t('editor.attacks.reach'), width: '8%', type: 'distance' },
                  { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                  { key: 'special', label: t('editor.attacks.special'), width: '22%' }
                ]}
                data={data.attacks.meleeAttacks}
                originalData={lastSavedData.attacks.meleeAttacks}
                onChange={v => setData({ ...data, attacks: { ...data.attacks, meleeAttacks: v as any } })}
                newItemGenerator={() => ({ weapon: '', hit: 0, damage: '', critRange: 20, critMultiplier: 2, range: 5, damageType: '', special: '' })}
                rowDraggable={true}
                rowActionMode={tableActionMode}
                onRowActionModeToggle={toggleTableActionMode}
                onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.meleeAttacks', idx, e)}
                onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.meleeAttacks', idx, e)}
                onRowDrop={(idx, e) => handleTableItemDrop('attacks.meleeAttacks', idx, e)}
              />
            </div>
            <DynamicTable
              minWidth="0"
              path="attacks.rangedAttacks"
              columns={[
                { key: 'weapon', label: t('editor.attacks.ranged'), width: '20%' },
                { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
                { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%' },
                { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%' },
                { key: 'range', label: t('editor.attacks.range'), width: '8%', type: 'distance' },
                { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                { key: 'special', label: t('editor.attacks.special'), width: '22%' }
              ]}
              data={data.attacks.rangedAttacks}
              originalData={lastSavedData.attacks.rangedAttacks}
              onChange={v => setData({ ...data, attacks: { ...data.attacks, rangedAttacks: v as any } })}
              newItemGenerator={() => ({ weapon: '', hit: 0, damage: '', critRange: 20, critMultiplier: 2, range: 20, damageType: '', special: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('attacks.rangedAttacks', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('attacks.rangedAttacks', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('attacks.rangedAttacks', idx, e)}
            />
          </div>
          <MultilineInput
            className="mt-6"
            label={t('editor.attacks.special_attacks')}
            path="attacks.specialAttacks"
            value={data.attacks.specialAttacks || ''}
            originalValue={lastSavedData.attacks.specialAttacks || ''}
            onChange={v => setData({ ...data, attacks: { ...data.attacks, specialAttacks: v } })}
            isAutoHeight={true}
          />
        </Section>

        <Section id="defenses" title={t('editor.sections.defenses')}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {t('editor.defenses.ac_details')}
                  <span className="text-stone-400 font-normal">AC / {t('editor.defenses.touch')} / {t('editor.defenses.flat_footed')}</span>
                </label>
                <div className="flex-1">
                  <DynamicTable
                    minWidth="0"
                    path="defenses.acTable"
                    columns={[
                      { key: 'ac', label: t('editor.defenses.ac'), width: '15%', type: 'int' },
                      { key: 'source', label: t('editor.attributes.headers.source'), width: '55%' },
                      { key: 'touch', label: t('editor.defenses.touch'), width: '15%', type: 'int' },
                      { key: 'flatFooted', label: t('editor.defenses.flat_footed'), width: '15%', type: 'int' }
                    ]}
                    data={data.defenses.acTable}
                    originalData={lastSavedData.defenses.acTable}
                    onChange={v => updateDefenses('acTable', v)}
                    fixedRows={true}
                  />
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
                  <DynamicTable
                    minWidth="0"
                    path="defenses.savesTable"
                    columns={[
                      { key: 'fort', label: t('editor.defenses.fort'), width: '33.33%', type: 'bonus' },
                      { key: 'ref', label: t('editor.defenses.ref'), width: '33.33%', type: 'bonus' },
                      { key: 'will', label: t('editor.defenses.will'), width: '33.34%', type: 'bonus' }
                    ]}
                    data={data.defenses.savesTable}
                    originalData={lastSavedData.defenses.savesTable}
                    onChange={v => updateDefenses('savesTable', v)}
                    fixedRows={true}
                  />
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

        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
          <DynamicTable
            path="racialTraits"
            columns={[
              { key: 'name', label: t('editor.lists.trait_name'), width: '25%' },
              { key: 'desc', label: t('editor.lists.description'), width: '75%' }
            ]}
            data={data.racialTraits}
            originalData={lastSavedData.racialTraits}
            onChange={v => setData({ ...data, racialTraits: v as any })}
            newItemGenerator={() => ({ name: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('racialTraits', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('racialTraits', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('racialTraits', idx, e)}
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
              data={data.backgroundTraits}
              originalData={lastSavedData.backgroundTraits}
              onChange={v => setData({ ...data, backgroundTraits: v as any })}
              newItemGenerator={() => ({ name: '', type: '', desc: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('backgroundTraits', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('backgroundTraits', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('backgroundTraits', idx, e)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InlineInput label={t('editor.lists.favored_class')} path="favoredClass" value={data.favoredClass} originalValue={lastSavedData.favoredClass} onChange={v => setData(p => ({ ...p, favoredClass: v }))} />
              <InlineInput label={t('editor.lists.favored_class_bonus')} path="favoredClassBonus" value={data.favoredClassBonus} originalValue={lastSavedData.favoredClassBonus} onChange={v => setData(p => ({ ...p, favoredClassBonus: v }))} />
            </div>
          </div>
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
          <DynamicTable
            path="classFeatures"
            columns={[
              { key: 'level', label: t('editor.lists.level'), width: '8%', type: 'level' },
              { key: 'name', label: t('editor.sections.class_features'), width: '22%' },
              { key: 'type', label: t('editor.lists.ability_type'), width: '8%' },
              { key: 'desc', label: t('editor.lists.description'), width: '62%' }
            ]}
            data={data.classFeatures}
            originalData={lastSavedData.classFeatures}
            onChange={v => setData({ ...data, classFeatures: v as any })}
            newItemGenerator={() => ({ level: 1, name: '', type: 0, desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('classFeatures', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('classFeatures', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('classFeatures', idx, e)}
          />
        </Section>

        <Section id="feats" title={t('editor.sections.feats')}>
          <DynamicTable
            path="feats"
            columns={[
              { key: 'level', label: t('editor.lists.level'), width: '8%', type: 'level' },
              { key: 'source', label: t('editor.lists.source'), width: '12%' },
              { key: 'name', label: t('editor.lists.feat_name'), width: '20%' },
              { key: 'type', label: t('editor.lists.feat_type'), width: '10%' },
              { key: 'desc', label: t('editor.lists.description'), width: '50%' }
            ]}
            data={data.feats}
            originalData={lastSavedData.feats}
            onChange={v => setData({ ...data, feats: v as any })}
            newItemGenerator={() => ({ level: 1, name: '', type: '', source: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('feats', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('feats', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('feats', idx, e)}
          />
        </Section>

        <Section id="spells" title={t('editor.sections.spells')}>
          <div className="flex flex-col gap-6 w-full">
            {data.magicBlocks.map((block, blockIndex) => {
              const originalBlock = lastSavedData.magicBlocks?.[blockIndex];
              return (
                <div key={block.id} className="relative group/magic flex flex-col gap-1 -mx-2 px-2 py-1 rounded transition-colors hover:bg-stone-50" draggable={dragEnabledFor === block.id} onDragStart={(e) => handleDragStart(e, block.id)} onDragOver={(e) => handleDragOver(e, block.id, 'magicBlocks')} onDrop={(e) => handleDrop(e, block.id, 'magicBlocks')}>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-2 mt-1 group/title relative">
                    <div onMouseEnter={() => setDragEnabledFor(block.id)} onMouseLeave={() => setDragEnabledFor(null)} className="cursor-move text-stone-300 hover:text-stone-500 transition-colors opacity-0 group-hover/magic:opacity-100 absolute -left-6 top-1">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <input
                        className={`text-sm font-bold uppercase tracking-wider bg-transparent border-b outline-none transition-colors w-full ${block.title !== originalBlock?.title ? 'text-amber-600 border-amber-300' : 'text-stone-700 border-transparent focus:border-stone-400'}`}
                        value={block.title}
                        onChange={e => updateMagicBlock(block.id, { title: e.target.value })}
                        placeholder={t('editor.lists.block_title')}
                      />
                      <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {block.type === 'spell' && (
                      <div className="flex-1 flex flex-wrap items-center gap-3">
                        <div className="w-24">
                          <InlineInput
                            label={t('editor.spells.caster_level')}
                            path={`magicBlocks[${blockIndex}].casterLevel`}
                            value={block.casterLevel || ''}
                            originalValue={originalBlock?.casterLevel}
                            onChange={v => updateMagicBlock(block.id, { casterLevel: v })}
                          />
                        </div>
                        <div className="w-24">
                          <InlineInput
                            label={t('editor.spells.concentration')}
                            path={`magicBlocks[${blockIndex}].concentration`}
                            value={block.concentration || ''}
                            originalValue={originalBlock?.concentration}
                            onChange={v => updateMagicBlock(block.id, { concentration: v })}
                          />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 h-[42px] justify-center">
                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none mb-1">类型 TYPE</label>
                            <select
                              value={block.spellType ?? 2}
                              onChange={e => {
                                const newType = parseInt(e.target.value, 10);
                                const is0LevelBase = (newType === 0 || newType === 2);
                                const baseLevel = is0LevelBase ? 0 : 1;
                                let newTableData = { ...(block.tableData || {}) };
                                // Handle SoA truncation if necessary
                                const firstKey = Object.keys(newTableData)[0];
                                if (firstKey && Array.isArray(newTableData[firstKey])) {
                                  const currentLen = newTableData[firstKey].length;
                                  let targetLen = currentLen;
                                  if (newType === 0 || newType === 2) {
                                    if (currentLen > 10) targetLen = 10;
                                  } else if (newType === 1 || newType === 3) {
                                    if (currentLen > 6) targetLen = 6;
                                  }
                                  if (targetLen !== currentLen) {
                                    Object.keys(newTableData).forEach(k => {
                                      newTableData[k] = newTableData[k].slice(currentLen - targetLen);
                                    });
                                  }
                                }
                                updateMagicBlock(block.id, { spellType: newType, baseLevel, tableData: newTableData });
                              }}
                              className="text-xs font-medium bg-transparent outline-none border-none text-stone-700 cursor-pointer w-full h-5 p-0"
                            >
                              {['准备(0环)', '准备(1环)', '自发(0环)', '自发(1环)', '类法术'].map((label, idx) => (
                                <option key={idx} value={idx}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {block.type === 'text' ? (
                    <MultilineInput
                      label={t('editor.lists.content')}
                      path={`magicBlocks[${blockIndex}].content`}
                      value={block.content || ''}
                      originalValue={originalBlock?.content}
                      onChange={v => updateMagicBlock(block.id, { content: v })}
                      height="120px"
                    />
                  ) : block.type === 'spell' ? (
                    <SpellTable
                      spellType={block.spellType ?? 2}
                      data={block.tableData || { uses: [0], spells: [''] }}
                      originalData={originalBlock?.tableData}
                      baseLevel={block.baseLevel ?? ((block.spellType === 0 || block.spellType === 2) ? 0 : 1)}
                      onChange={v => updateMagicBlock(block.id, { tableData: v })}
                      path={`magicBlocks[${blockIndex}].tableData`}
                    />
                  ) : (
                    <DynamicTable
                      path={`magicBlocks[${blockIndex}].tableData`}
                      columns={block.columns || []}
                      data={block.tableData || {}}
                      originalData={originalBlock?.tableData}
                      onChange={v => updateMagicBlock(block.id, { tableData: v })}
                      rowDraggable={true}
                      onRowDragStart={(idx, e) => handleTableItemDragStart(`magicBlocks[${blockIndex}].tableData`, idx, e)}
                      onRowDragOver={(idx, e) => handleTableItemDragOver(`magicBlocks[${blockIndex}].tableData`, idx, e)}
                      onRowDrop={(idx, e) => handleTableItemDrop(`magicBlocks[${blockIndex}].tableData`, idx, e)}
                    />
                  )}
                  {block.type === 'spell' && (
                    <div className="mt-2">
                      <MultilineInput
                        label={t('editor.spells.notes')}
                        path={`magicBlocks[${blockIndex}].notes`}
                        value={block.notes || ''}
                        originalValue={originalBlock?.notes}
                        onChange={v => updateMagicBlock(block.id, { notes: v })}
                        placeholder={t('editor.spells.notes_placeholder')}
                        isAutoHeight={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => addMagicBlock('spell', 2)} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"><Plus size={14} /> 添加施法块 Add Spell Block</button>
            </div>
          </div>
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <div className="w-full md:w-1/6">
              <InlineInput
                label={t('editor.skills.total_points')}
                path="skillsTotal"
                value={String(data.skillsTotal)}
                originalValue={String(lastSavedData.skillsTotal)}
                onChange={v => setData({ ...data, skillsTotal: parseInt(v) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="w-full md:w-1/6">
              <InlineInput
                label={t('editor.skills.acp')}
                path="armorCheckPenalty"
                value={String(data.armorCheckPenalty)}
                originalValue={String(lastSavedData.armorCheckPenalty)}
                onChange={v => setData({ ...data, armorCheckPenalty: parseInt(v) || 0 })}
                displayFormatter={(v, isFocused) => (!v || v === '0' || isFocused) ? v : `-${v}`}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-4">
            <DynamicTable
              path="skills"
              columns={[
                { key: 'name', label: t('editor.skills.headers.skill'), width: '15%' },
                { key: 'total', label: t('editor.skills.headers.total'), width: '5%', type: 'bonus' },
                { key: 'rank', label: t('editor.skills.headers.rank'), width: '5%', type: 'level' },
                {
                  key: 'cs', label: t('editor.skills.headers.cs'), width: '5%', type: 'checkbox',
                  displayFormatter: (val) => val === 'true' || val === true ? '+3' : ''
                },
                {
                  key: 'ability',
                  label: t('editor.skills.headers.ability'),
                  width: '10%',
                  type: 'attributeIndex'
                },
                { key: 'others', label: t('editor.skills.headers.others'), width: '20%' },
                { key: 'special', label: t('editor.skills.headers.special'), width: '35%' }
              ]}
              data={data.skills}
              originalData={lastSavedData.skills}
              onChange={v => setData({ ...data, skills: v as any })}
              newItemGenerator={() => ({ name: '', total: 0, rank: 0, cs: false, ability: 0, others: '', special: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
            />
          </div>
        </Section>

        <Section id="equipment" title={t('editor.sections.equipment')}>
          <div className="flex flex-col gap-8">
            {data.equipmentBags.map((bag, bagIndex) => (
              <div key={bag.id} className="border rounded p-4 bg-stone-50/50 border-stone-200" onDragOver={(e) => handleBagDragOver(e, bagIndex)} onDrop={(e) => handleBagDrop(e, bagIndex)}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="cursor-grab text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1" draggable onDragStart={(e) => handleBagDragStart(e, bagIndex)}><GripVertical size={18} /></div>
                    <input className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 max-w-sm w-full" value={bag.name} onChange={e => updateBagName(bag.id, e.target.value)} />
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-2">
                      <input
                        type="checkbox"
                        checked={bag.ignoreWeight}
                        onChange={e => toggleBagWeight(bag.id, e.target.checked)}
                        className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3"
                      />
                      {t('editor.items.ignore_weight')}
                    </label>
                  </div>
                  <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors"><Trash2 size={14} /> {t('common.delete_container')}</button>
                </div>
                <DynamicTable
                  path={`equipmentBags[${bagIndex}].items`}
                  columns={[
                    { key: 'item', label: t('editor.items.headers.item'), width: '35%', hideRightBorder: true },
                    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
                    { key: 'cost', label: t('editor.items.headers.cost'), width: '15%', type: 'cost' },
                    { key: 'weight', label: t('editor.items.headers.weight'), width: '15%', type: 'weight' },
                    { key: 'notes', label: t('editor.items.headers.notes'), width: '30%' },
                  ]}
                  data={bag.items}
                  originalData={lastSavedData.equipmentBags?.[bagIndex]?.items}
                  onChange={v => updateBagItems(bag.id, v)}
                  newItemGenerator={() => ({ item: '', quantity: 1, cost: 0, weight: 0, notes: '' })}
                  rowDraggable={true}
                  rowActionMode={tableActionMode}
                  onRowActionModeToggle={toggleTableActionMode}
                  onRowDragStart={(idx, e) => handleItemDragStart(bag.id, idx, e)}
                  onRowDragOver={(idx, e) => handleItemDragOver(bag.id, idx, e)}
                  onRowDrop={(idx, e) => handleItemDrop(bag.id, idx, e)}
                />
              </div>
            ))}
            <button onClick={addBag} className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors">
              <Plus size={16} /> {t('editor.items.add_container')}
            </button>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <InlineInput label={t('editor.items.pp')} path="currency.pp" value={String(data.currency.pp)} originalValue={String(lastSavedData.currency?.pp)} onChange={v => setData(p => ({ ...p, currency: { ...p.currency, pp: parseInt(v) || 0 } }))} placeholder="0" />
              <InlineInput label={t('editor.items.gp')} path="currency.gp" value={String(data.currency.gp)} originalValue={String(lastSavedData.currency?.gp)} onChange={v => setData(p => ({ ...p, currency: { ...p.currency, gp: parseInt(v) || 0 } }))} placeholder="0" />
              <InlineInput label={t('editor.items.sp')} path="currency.sp" value={String(data.currency.sp)} originalValue={String(lastSavedData.currency?.sp)} onChange={v => setData(p => ({ ...p, currency: { ...p.currency, sp: parseInt(v) || 0 } }))} placeholder="0" />
              <InlineInput label={t('editor.items.cp')} path="currency.cp" value={String(data.currency.cp)} originalValue={String(lastSavedData.currency?.cp)} onChange={v => setData(p => ({ ...p, currency: { ...p.currency, cp: parseInt(v) || 0 } }))} placeholder="0" />
              <InlineInput label={t('editor.items.coin_weight')} path="currency.coinWeight" value={String(data.currency.coinWeight)} originalValue={String(lastSavedData.currency?.coinWeight)} onChange={v => setData(p => ({ ...p, currency: { ...p.currency, coinWeight: parseFloat(v) || 0 } }))} placeholder="0" />
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch">
              <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_assets')}</label>
                <div className="text-sm font-medium text-ink px-0.5">{calculateTotalCost(data)}<span className="text-xs font-normal text-stone-500 ml-1">gp</span></div>
              </div>
              <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.encumbrance_multiplier')}</label>
                <input className="text-sm font-medium text-ink bg-transparent outline-none px-0.5 w-full"
                  value={data.encumbranceMultiplier} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) setData(p => ({ ...p, encumbranceMultiplier: parseFloat(val) || 1 }));
                  }}
                />
              </div>

              <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-3 py-2 min-h-[50px] justify-center overflow-visible">
                {(() => {
                  const enc = getComputedEncumbrance(data);
                  const curWeight = calculateTotalWeightNum(data);
                  const percentage = Math.min((curWeight / Math.max(enc.heavy, 1)) * 100, 100);
                  const isOver = curWeight > enc.heavy;
                  const color = isOver ? 'bg-red-500' : curWeight > enc.medium ? 'bg-orange-500' : curWeight > enc.light ? 'bg-yellow-400' : 'bg-green-400';
                  const lPct = (enc.light / Math.max(enc.heavy, 1)) * 100;
                  const mPct = (enc.medium / Math.max(enc.heavy, 1)) * 100;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                      <div className="flex flex-col sm:items-center shrink-0 w-20">
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_weight')}</span>
                        <span className="text-lg font-bold font-serif text-ink leading-tight">{curWeight.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-stone-500">lbs</span></span>
                      </div>
                      <div className="flex-1 relative flex flex-col justify-center min-h-[20px] w-full mx-2">
                        <div className="absolute -top-3.5 left-0 right-0 h-3 text-[9px] font-bold text-stone-500">
                          <span className="absolute -translate-x-1/2" style={{ left: `${lPct}%` }}>{enc.light}</span>
                          <span className="absolute -translate-x-1/2" style={{ left: `${mPct}%` }}>{enc.medium}</span>
                          <span className="absolute -translate-x-1/2" style={{ left: `100%` }}>{enc.heavy}</span>
                        </div>
                        <div className="h-2 w-full bg-stone-200 rounded-full relative overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                      {isOver && <span className="text-[10px] font-bold text-white bg-red-600 px-1 py-0.5 rounded rotate-[-5deg]">{t('editor.items.overload')}</span>}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
          <div className="flex flex-col gap-8">
            {data.additionalData.map((block, i) => (
              <div key={block.id} className="border border-stone-200 rounded p-4 bg-stone-50/50" draggable={dragEnabledFor === block.id} onDragStart={(e) => handleDragStart(e, block.id)} onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')} onDrop={(e) => handleDrop(e, block.id, 'additionalData')}>
                <div className="flex items-center gap-4 mb-3">
                  <div onMouseEnter={() => setDragEnabledFor(block.id)} onMouseLeave={() => setDragEnabledFor(null)} className="cursor-move text-stone-400 px-1"><GripVertical size={20} /></div>
                  <input
                    className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 flex-1"
                    value={block.title}
                    onChange={e => updateAdditionalBlock(block.id, { title: e.target.value })}
                  />
                  <button onClick={() => removeAdditionalBlock(block.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1"><Trash2 size={14} /> {t('common.delete')}</button>
                </div>
                {block.type === 'text' ? (
                  <MultilineInput
                    label={t('editor.lists.content')}
                    path={`additionalData[${i}].content`}
                    value={block.content || ''}
                    originalValue={lastSavedData.additionalData?.[i]?.content}
                    onChange={v => updateAdditionalBlock(block.id, { content: v })}
                    height="120px"
                  />
                ) : block.type === 'image' ? (
                  <input
                    className="w-full border rounded px-3 py-2 text-sm outline-none bg-white border-stone-200 focus:border-stone-400"
                    value={block.url || ''}
                    onChange={e => updateAdditionalBlock(block.id, { url: e.target.value })}
                    placeholder={t('editor.lists.image_url')}
                  />
                ) : (
                  <DynamicTable
                    path={`additionalData[${i}].tableData`}
                    columns={block.columns || []}
                    data={block.tableData || {}}
                    originalData={lastSavedData.additionalData?.[i]?.tableData}
                    onChange={v => updateAdditionalBlock(block.id, { tableData: v as any })}
                    rowDraggable={true}
                    onRowDragStart={(idx, e) => handleTableItemDragStart(`additionalData[${i}].tableData`, idx, e)}
                    onRowDragOver={(idx, e) => handleTableItemDragOver(`additionalData[${i}].tableData`, idx, e)}
                    onRowDrop={(idx, e) => handleTableItemDrop(`additionalData[${i}].tableData`, idx, e)}
                  />
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => addAdditionalBlock('text')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> {t('common.add_text')}</button>
              <button onClick={() => addAdditionalBlock('table')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> {t('common.add_table')}</button>
              <button onClick={() => addAdditionalBlock('image')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"><Plus size={16} /> {t('common.add_image')}</button>
            </div>
          </div>
        </Section>
      </main>
    </motion.div>
  );
}

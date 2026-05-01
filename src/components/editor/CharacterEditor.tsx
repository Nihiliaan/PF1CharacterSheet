import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, GripVertical, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import { CharacterData, ATTRIBUTE_NAMES } from '../../types';
import Section from '../common/Section';
import InlineInput from '../common/InlineInput';
import MultilineInput from '../common/MultilineInput';
import DynamicTable from '../common/DynamicTable';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';

import { useCharacter } from '../../contexts/CharacterContext';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../../utils/calculations';

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
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.name')} value={data.basic.name} originalValue={lastSavedData.basic.name} onChange={v => updateBasic('name', v)} />
              <InlineInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.classes')} value={data.basic.classes} originalValue={lastSavedData.basic.classes} onChange={v => updateBasic('classes', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.alignment')} value={data.basic.alignment} originalValue={lastSavedData.basic.alignment} onChange={v => updateBasic('alignment', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.deity')} value={data.basic.deity || ''} originalValue={lastSavedData.basic.deity || ''} onChange={v => updateBasic('deity', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.size')} value={data.basic.size} originalValue={lastSavedData.basic.size} onChange={v => updateBasic('size', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.gender')} value={data.basic.gender} originalValue={lastSavedData.basic.gender} onChange={v => updateBasic('gender', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.race')} value={data.basic.race} originalValue={lastSavedData.basic.race} onChange={v => updateBasic('race', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.age')} value={data.basic.age} originalValue={lastSavedData.basic.age} onChange={v => updateBasic('age', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.height')} value={data.basic.height} originalValue={lastSavedData.basic.height} onChange={v => updateBasic('height', v)} />
              <InlineInput className="col-span-4" label={t('editor.basic.weight')} value={data.basic.weight} originalValue={lastSavedData.basic.weight} onChange={v => updateBasic('weight', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.speed')} value={data.basic.speed} originalValue={lastSavedData.basic.speed} onChange={v => updateBasic('speed', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.senses')} value={data.basic.senses} originalValue={lastSavedData.basic.senses} onChange={v => updateBasic('senses', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.initiative')} value={data.basic.initiative} originalValue={lastSavedData.basic.initiative} onChange={v => updateBasic('initiative', v)} />
              <InlineInput className="col-span-12 sm:col-span-6" label={t('editor.basic.perception')} value={data.basic.perception} originalValue={lastSavedData.basic.perception} onChange={v => updateBasic('perception', v)} />
              <MultilineInput
                className="col-span-12 mt-2"
                label={t('editor.basic.languages')}
                value={data.basic.languages}
                originalValue={lastSavedData.basic.languages}
                onChange={v => updateBasic('languages', v)}
                height="60px"
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
            value={data.basic.story}
            originalValue={lastSavedData.basic.story}
            onChange={v => updateBasic('story', v)}
            isAutoHeight={true}
            className="font-serif italic"
          />
        </Section>

        <Section id="attributes" title={t('editor.sections.attributes')}>
          <div className="mb-4">
            <DynamicTable
              columns={[
                { key: 'name', label: t('editor.attributes.headers.attr'), width: '10%' },
                { key: 'final', label: t('editor.attributes.headers.final'), width: '10%', type: 'posInt' },
                { key: 'modifier', label: t('editor.attributes.headers.mod'), width: '10%', type: 'bonus' },
                { key: 'source', label: t('editor.attributes.headers.source'), width: '40%' },
                { key: 'status', label: t('editor.attributes.headers.status'), width: '30%' }
              ]}
              data={data.attributes.map((a, i) => ({ ...a, name: t('editor.attributes.' + ATTRIBUTE_NAMES[i]) }))}
              originalData={lastSavedData.attributes.map((a, i) => ({ ...a, name: t('editor.attributes.' + ATTRIBUTE_NAMES[i]) }))}
              onChange={newAttrs => setData({
                ...data,
                attributes: newAttrs.map(({ name, ...rest }: any) => rest)
              })}
              fixedRows={true}
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
            <MultilineInput
              className="w-full md:w-1/2"
              label={t('editor.attributes.maneuver_notes')}
              value={data.combatManeuverNotes || ''}
              originalValue={lastSavedData.combatManeuverNotes}
              onChange={v => setData({ ...data, combatManeuverNotes: v })}
              placeholder={t('editor.attributes.maneuver_placeholder')}
              height="80px"
            />
          </div>
        </Section>

        <Section id="attacks" title={t('editor.sections.attacks')}>
          <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
            <div className="border-b border-stone-200">
              <DynamicTable
                minWidth="0"
                columns={[
                  { key: 'weapon', label: t('editor.attacks.melee'), width: '25%' },
                  { key: 'hit', label: t('editor.attacks.hit'), width: '15%' },
                  { key: 'damage', label: t('editor.attacks.damage'), width: '15%' },
                  { key: 'crit', label: t('editor.attacks.crit'), width: '10%' },
                  { key: 'range', label: t('editor.attacks.reach'), width: '5%' },
                  { key: 'type', label: t('editor.attacks.type'), width: '5%' },
                  { key: 'special', label: t('editor.attacks.special'), width: '25%' }
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
                { key: 'weapon', label: t('editor.attacks.ranged'), width: '25%' },
                { key: 'hit', label: t('editor.attacks.hit'), width: '15%' },
                { key: 'damage', label: t('editor.attacks.damage'), width: '15%' },
                { key: 'crit', label: t('editor.attacks.crit'), width: '10%' },
                { key: 'range', label: t('editor.attacks.range'), width: '5%' },
                { key: 'type', label: t('editor.attacks.type'), width: '5%' },
                { key: 'special', label: t('editor.attacks.special'), width: '25%' }
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
          <MultilineInput
            className="mt-6"
            label={t('editor.attacks.special_attacks')}
            value={data.specialAttacks || ''}
            originalValue={lastSavedData.specialAttacks || ''}
            onChange={v => setData({ ...data, specialAttacks: v })}
            isAutoHeight={true}
          />
        </Section>

        <Section id="defenses" title={t('editor.sections.defenses')}>
          <div className="flex flex-col gap-6">
            {/* AC Row */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="w-full md:w-1/2 flex flex-col">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {t('editor.defenses.ac_details')}
                  <span className="text-stone-400 font-normal">AC / {t('editor.defenses.touch')} / {t('editor.defenses.flat_footed')}</span>
                </label>
                <div className="flex-1">
                  <DynamicTable
                    minWidth="0"
                    columns={[
                      { key: 'ac', label: t('editor.defenses.ac'), width: '15%' },
                      { key: 'source', label: t('editor.attributes.headers.source'), width: '55%' },
                      { key: 'touch', label: t('editor.defenses.touch'), width: '15%' },
                      { key: 'flatFooted', label: t('editor.defenses.flat_footed'), width: '15%' }
                    ]}
                    data={data.defenses.acTable || [{ ac: '', source: '', flatFooted: '', touch: '' }]}
                    originalData={lastSavedData.defenses.acTable || [{ ac: '', source: '', flatFooted: '', touch: '' }]}
                    onChange={v => updateDefenses('acTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <MultilineInput
                className="w-full md:w-1/2"
                label={t('editor.defenses.ac_notes')}
                value={data.defenses.acNotes || ''}
                originalValue={lastSavedData.defenses.acNotes}
                onChange={v => updateDefenses('acNotes', v)}
                placeholder={t('editor.defenses.ac_placeholder')}
                height="80px"
              />
            </div>

            {/* HP & HD Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <InlineInput
                  label={t('editor.defenses.hp')}
                  value={data.defenses.hp}
                  originalValue={lastSavedData.defenses.hp}
                  onChange={v => updateDefenses('hp', v)}
                  placeholder="例如：20"
                />
              </div>
              <div className="w-full md:w-1/2">
                <InlineInput
                  label={t('editor.defenses.hd')}
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
                  {t('editor.defenses.saves')}
                  <span className="text-stone-400 font-normal">{t('editor.defenses.fort')} / {t('editor.defenses.ref')} / {t('editor.defenses.will')}</span>
                </label>
                <div className="flex-1">
                  <DynamicTable
                    minWidth="0"
                    columns={[
                      { key: 'fort', label: t('editor.defenses.fort'), width: '33.33%' },
                      { key: 'ref', label: t('editor.defenses.ref'), width: '33.33%' },
                      { key: 'will', label: t('editor.defenses.will'), width: '33.34%' }
                    ]}
                    data={data.defenses.savesTable || [{ fort: '', ref: '', will: '' }]}
                    originalData={lastSavedData.defenses.savesTable || [{ fort: '', ref: '', will: '' }]}
                    onChange={v => updateDefenses('savesTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <MultilineInput
                className="w-full md:w-1/2"
                label={t('editor.defenses.saves_notes')}
                value={data.defenses.savesNotes || ''}
                originalValue={lastSavedData.defenses.savesNotes}
                onChange={v => updateDefenses('savesNotes', v)}
                placeholder="抗力加值、对抗恐惧/毒素的额外加值等..."
                height="80px"
              />
            </div>
          </div>
        </Section>

        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
          <DynamicTable
            columns={[
              { key: 'name', label: t('editor.lists.trait'), width: '10%' },
              { key: 'desc', label: t('editor.lists.description'), width: '90%' }
            ]}
            data={data.racialTraits}
            originalData={lastSavedData.racialTraits}
            onChange={v => setData({ ...data, racialTraits: v })}
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
              columns={[
                { key: 'name', label: t('editor.lists.trait_name'), width: '25%' },
                { key: 'type', label: t('editor.lists.category'), width: '5%' },
                { key: 'desc', label: t('editor.lists.description'), width: '70%' }
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
              <InlineInput label={t('editor.lists.favored_class')} value={data.favoredClass} onChange={v => setData(p => ({ ...p, favoredClass: v }))} />
              <InlineInput label={t('editor.lists.favored_class_bonus')} value={data.favoredClassBonus} onChange={v => setData(p => ({ ...p, favoredClassBonus: v }))} />
            </div>
          </div>
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
          <DynamicTable
            columns={[
              { key: 'level', label: t('editor.lists.level'), width: '5%', type: 'posInt' },
              { key: 'name', label: t('editor.sections.class_features'), width: '25%' },
              { key: 'type', label: t('editor.attacks.type'), width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
              { key: 'desc', label: t('editor.lists.description'), width: '65%' }
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

        <Section id="feats" title={t('editor.sections.feats')}>
          <DynamicTable
            columns={[
              { key: 'level', label: t('editor.lists.level'), width: '5%', type: 'posInt' },
              { key: 'source', label: t('editor.lists.source'), width: '15%' },
              { key: 'name', label: t('editor.lists.feat_name'), width: '20%' },
              { key: 'type', label: t('editor.attacks.type'), width: '5%' },
              { key: 'desc', label: t('editor.lists.description'), width: '55%' }
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

        <Section id="spells" title={t('editor.sections.spells')}>
          <div className="flex flex-col gap-6 w-full">
            {data.magicBlocks.map(block => {
              const originalBlock = lastSavedData.magicBlocks?.find(b => b.id === block.id);
              const isTitleChanged = originalBlock && block.title !== originalBlock.title;
              return (
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
                    <input
                      className={`text-[10px] font-bold uppercase tracking-wider bg-transparent border-b outline-none transition-colors max-w-sm ${isTitleChanged ? 'text-amber-600 border-amber-300' : 'text-stone-500 border-transparent focus:border-stone-400'}`}
                      value={block.title}
                      onChange={e => updateMagicBlock(block.id, { title: e.target.value })}
                      placeholder={t('editor.lists.block_title')}
                    />
                    {isTitleChanged && <span className="text-amber-500 text-[8px] animate-pulse">●</span>}
                    <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {block.type === 'text' ? (
                    <MultilineInput
                      label={t('editor.lists.content')}
                      value={block.content || ''}
                      originalValue={originalBlock?.content}
                      onChange={v => updateMagicBlock(block.id, { content: v })}
                      height="120px"
                    />
                  ) : (
                    <DynamicTable
                      columns={block.columns || []}
                      data={block.tableData || []}
                      originalData={originalBlock?.tableData || []}
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
                        updateMagicBlock(block.id, { columns: [...(block.columns || []), { key: 'col' + Math.random(), label: 'New Column' }] });
                      }}
                    />
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => addMagicBlock('text')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"><Plus size={14} /> {t('common.add_paragraph')}</button>
              <button onClick={() => addMagicBlock('table')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"><Plus size={14} /> {t('common.add_list')}</button>
            </div>
          </div>
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
          <DynamicTable
            columns={[
              { key: 'name', label: t('editor.skills.headers.skill'), width: '15%' },
              { key: 'total', label: t('editor.skills.headers.total'), width: '5%', type: 'bonus' },
              { key: 'rank', label: t('editor.skills.headers.rank'), width: '5%', type: 'posInt' },
              { key: 'cs', label: t('editor.skills.headers.cs'), width: '5%', type: 'checkbox' },
              {
                key: 'ability',
                label: t('editor.skills.headers.ability'),
                width: '5%',
                type: 'select',
                options: ['', ...ATTRIBUTE_NAMES],
                displayFormatter: (val) => {
                  if (!val) return '';
                  const idx = ATTRIBUTE_NAMES.indexOf(val);
                  if (idx === -1) return val;
                  const attr = data.attributes[idx];
                  if (!attr) return val;
                  const mod = parseInt(attr.modifier);
                  if (isNaN(mod)) return attr.modifier || '0';
                  return mod >= 0 ? `+${mod}` : mod.toString();
                }
              },
              { key: 'others', label: t('editor.skills.headers.others'), width: '20%' },
              { key: 'special', label: t('editor.skills.headers.special'), width: '35%' }
            ]}
            data={data.skills}
            originalData={lastSavedData.skills}
            onChange={v => setData({ ...data, skills: v })}
            newItemGenerator={() => ({ name: '', total: '', source: '', special: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
          />
          <div className="flex flex-col md:flex-row gap-6 mt-4 items-stretch">
            <div className="w-full md:w-1/6">
              <InlineInput
                label={t('editor.skills.total_points')}
                value={data.skillsTotal || ''}
                originalValue={lastSavedData.skillsTotal || ''}
                onChange={v => {
                  if (v === '' || /^\d+$/.test(v)) setData({ ...data, skillsTotal: v });
                }}
                transactionFilter={tr => /^\d*$/.test(tr.newDoc.toString())}
                placeholder="0"
              />
            </div>
            <div className="w-full md:w-1/6">
              <InlineInput
                label={t('editor.skills.acp')}
                value={!data.armorCheckPenalty || data.armorCheckPenalty === '0' ? '' : `-${data.armorCheckPenalty}`}
                originalValue={!lastSavedData.armorCheckPenalty || lastSavedData.armorCheckPenalty === '0' ? '' : `-${lastSavedData.armorCheckPenalty}`}
                onChange={v => {
                  const val = v.replace(/^-/, '');
                  if (val === '' || /^\d+$/.test(val)) {
                    setData({ ...data, armorCheckPenalty: val || '0' });
                  }
                }}
                transactionFilter={tr => {
                  const nextDoc = tr.newDoc.toString().replace(/^-/, '');
                  return nextDoc === '' || /^\d+$/.test(nextDoc);
                }}
                placeholder="0"
              />
            </div>
            <div className="w-full md:w-4/6">
              <InlineInput
                label={t('editor.skills.notes')}
                value={data.skillsNotes || ''}
                originalValue={lastSavedData.skillsNotes || ''}
                onChange={v => setData({ ...data, skillsNotes: v })}
                placeholder={t('editor.skills.notes_placeholder')}
              />
            </div>
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
                  </div>
                  <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors"><Trash2 size={14} /> {t('common.delete_container')}</button>
                </div>
                <DynamicTable
                  columns={[
                    { key: 'item', label: t('editor.items.headers.item'), width: '35%', hideRightBorder: true },
                    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
                    { key: 'cost', label: t('editor.items.headers.cost'), width: '15%', type: 'float' },
                    { key: 'weight', label: t('editor.items.headers.weight'), width: '15%', type: 'float' },
                    { key: 'notes', label: t('editor.items.headers.notes'), width: '30%' },
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
            <button onClick={addBag} className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors">
              <Plus size={16} /> {t('editor.items.add_container')}
            </button>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <InlineInput label={t('editor.items.pp')} value={data.currency.pp} originalValue={lastSavedData.currency?.pp} transactionFilter={tr => /^\d*$/.test(tr.newDoc.toString())} onChange={v => { if (v === '' || /^\d+$/.test(v)) setData(p => ({ ...p, currency: { ...p.currency, pp: v } })) }} placeholder="0" />
              <InlineInput label={t('editor.items.gp')} value={data.currency.gp} originalValue={lastSavedData.currency?.gp} transactionFilter={tr => /^\d*$/.test(tr.newDoc.toString())} onChange={v => { if (v === '' || /^\d+$/.test(v)) setData(p => ({ ...p, currency: { ...p.currency, gp: v } })) }} placeholder="0" />
              <InlineInput label={t('editor.items.sp')} value={data.currency.sp} originalValue={lastSavedData.currency?.sp} transactionFilter={tr => /^\d*$/.test(tr.newDoc.toString())} onChange={v => { if (v === '' || /^\d+$/.test(v)) setData(p => ({ ...p, currency: { ...p.currency, sp: v } })) }} placeholder="0" />
              <InlineInput label={t('editor.items.cp')} value={data.currency.cp} originalValue={lastSavedData.currency?.cp} transactionFilter={tr => /^\d*$/.test(tr.newDoc.toString())} onChange={v => { if (v === '' || /^\d+$/.test(v)) setData(p => ({ ...p, currency: { ...p.currency, cp: v } })) }} placeholder="0" />
              <InlineInput label={t('editor.items.coin_weight')} value={data.currency.coinWeight} originalValue={lastSavedData.currency?.coinWeight} transactionFilter={tr => /^\d*\.?\d*$/.test(tr.newDoc.toString())} onChange={v => { if (v === '' || /^\d*\.?\d*$/.test(v)) setData(p => ({ ...p, currency: { ...p.currency, coinWeight: v } })) }} placeholder="0" />
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch">
              <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 w-24 shrink-0 justify-center">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_assets')}</label>
                <div className="text-sm font-medium text-ink px-0.5">{calculateTotalCost(data)}<span className="text-xs font-normal text-stone-500 ml-1">gp</span></div>
              </div>
              <div className={`flex flex-col gap-0 border rounded p-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-transparent transition-colors w-24 shrink-0 justify-center ${data.encumbranceMultiplier !== lastSavedData.encumbranceMultiplier ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none flex justify-between items-center">
                  {t('editor.items.encumbrance_multiplier')}
                  {data.encumbranceMultiplier !== lastSavedData.encumbranceMultiplier && <span className="text-amber-600 animate-pulse text-[8px]">●</span>}
                </label>
                <input className="text-sm font-medium text-ink bg-transparent outline-none px-0.5 w-full"
                  value={data.encumbranceMultiplier} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setData(p => ({ ...p, encumbranceMultiplier: val }));
                    }
                  }}
                />
              </div>

              <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-3 py-2 min-h-[50px] justify-center overflow-visible">
                {(() => {
                  const encumbrance = getComputedEncumbrance(data);
                  const maxWeight = encumbrance.heavy;
                  const currentWeight = calculateTotalWeightNum(data);
                  const MathMax = Math.max;
                  const percentage = Math.min((currentWeight / MathMax(maxWeight, 1)) * 100, 100);
                  const isOverloaded = currentWeight > maxWeight;
                  const isHeavy = currentWeight > encumbrance.medium && currentWeight <= maxWeight;
                  const isMedium = currentWeight > encumbrance.light && currentWeight <= encumbrance.medium;
                  const isLight = currentWeight <= encumbrance.light;

                  let barColor = 'bg-stone-300';
                  if (isOverloaded) barColor = 'bg-red-500';
                  else if (isHeavy) barColor = 'bg-orange-500';
                  else if (isMedium) barColor = 'bg-yellow-400';
                  else if (isLight) barColor = 'bg-green-400';

                  const lightPct = (encumbrance.light / MathMax(maxWeight, 1)) * 100;
                  const medPct = (encumbrance.medium / MathMax(maxWeight, 1)) * 100;
                  const heavyPct = 100;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                      <div className="flex flex-col sm:items-center shrink-0 w-20">
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none">{t('editor.items.total_weight')}</span>
                        <span className="text-lg font-bold font-serif text-ink leading-tight">{currentWeight.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-stone-500">lbs</span></span>
                      </div>

                      <div className="flex-1 relative flex flex-col justify-center min-h-[20px] mt-1 mb-1 w-full mx-2">
                        {/* Top labels */}
                        <div className="absolute -top-3.5 left-0 right-0 h-3">
                          <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${lightPct}%` }}>{encumbrance.light} lbs</span>
                          <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${medPct}%` }}>{encumbrance.medium} lbs</span>
                          <span className="absolute text-[9px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap leading-none" style={{ left: `${heavyPct}%` }}>{encumbrance.heavy} lbs</span>
                        </div>
                        {/* Bar */}
                        <div className="h-2 w-full bg-stone-200 rounded-full relative overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percentage}%` }} />
                          {/* Markers */}
                          <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{ left: `${lightPct}%` }} />
                          <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{ left: `${medPct}%` }} />
                        </div>
                        {/* Bottom labels with arrows */}
                        <div className="absolute -bottom-3.5 left-0 right-0 h-3">
                          <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${lightPct / 2}%` }}>
                            <span>{t('editor.items.light')}</span>
                          </span>
                          <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${(lightPct + medPct) / 2}%` }}>
                            <span>{t('editor.items.medium')}</span>
                          </span>
                          <span className="absolute text-[9px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max leading-none" style={{ left: `${(medPct + heavyPct) / 2}%` }}>
                            <span>{t('editor.items.heavy')}</span>
                          </span>
                        </div>
                      </div>

                      {/* Overload label */}
                      <div className="shrink-0 w-10 flex items-center justify-center">
                        {isOverloaded && <span className="text-[10px] font-bold text-white bg-red-600 px-1 py-0.5 rounded shadow-inner rotate-[-5deg]">{t('editor.items.overload')}</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
          <div className="flex flex-col gap-8">
            {data.additionalData.map(block => {
              const originalBlock = lastSavedData.additionalData?.find(b => b.id === block.id);
              const isTitleChanged = originalBlock && block.title !== originalBlock.title;
              const isUrlChanged = originalBlock && block.url !== originalBlock.url;

              return (
                <div key={block.id} draggable={dragEnabledFor === block.id} onDragStart={(e) => handleDragStart(e, block.id)} onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')} onDrop={(e) => handleDrop(e, block.id, 'additionalData')} className="border border-stone-200 rounded p-4 bg-stone-50/50">
                  <div className="flex items-center gap-4 mb-3">
                    <div onMouseEnter={() => setDragEnabledFor(block.id)} onMouseLeave={() => setDragEnabledFor(null)} className="cursor-move text-stone-400 px-1"><GripVertical size={20} /></div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        className={`text-lg font-bold font-serif bg-transparent border-b outline-none px-1 py-0.5 flex-1 ${isTitleChanged ? 'text-amber-600 border-amber-300' : 'text-primary border-transparent focus:border-primary'}`}
                        value={block.title}
                        onChange={e => updateAdditionalBlock(block.id, { title: e.target.value })}
                        placeholder={t('editor.lists.block_title')}
                      />
                      {isTitleChanged && <span className="text-amber-500 animate-pulse">●</span>}
                    </div>
                    <button onClick={() => removeAdditionalBlock(block.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1"><Trash2 size={14} /> {t('common.delete')}</button>
                  </div>
                  {block.type === 'text' ? (
                    <MultilineInput
                      label={t('editor.lists.content')}
                      value={block.content || ''}
                      originalValue={originalBlock?.content}
                      onChange={v => updateAdditionalBlock(block.id, { content: v })}
                      height="120px"
                    />
                  ) : block.type === 'image' ? (
                    <div className="relative">
                      <input
                        className={`w-full border rounded px-3 py-2 text-sm outline-none transition-colors ${isUrlChanged ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-stone-200 focus:border-stone-400'}`}
                        value={block.url || ''}
                        onChange={e => updateAdditionalBlock(block.id, { url: e.target.value })}
                        placeholder={t('editor.lists.image_url')}
                      />
                      {isUrlChanged && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                    </div>
                  ) : (
                    <DynamicTable
                      columns={block.columns || []}
                      data={block.tableData || []}
                      originalData={originalBlock?.tableData || []}
                      onChange={v => updateAdditionalBlock(block.id, { tableData: v })}
                    />
                  )}
                </div>
              );
            })}
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

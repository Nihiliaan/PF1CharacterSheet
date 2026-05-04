import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import { ATTRIBUTE_NAMES } from '../../types';
import Section from '../common/Section';
import DynamicInput from '../../controls/DynamicInput';
import DynamicTable from '../common/DynamicTable';
import TableOfContents from '../character/TableOfContents';
import AvatarGallery from '../character/AvatarGallery';
import MagicBlocks from '../character/MagicBlocks';
import EquipmentBags from '../character/EquipmentBags';
import AdditionalData from '../character/AdditionalData';
import WeightSummary from '../character/WeightSummary';

import { useCharacter } from '../../contexts/CharacterContext';
import { useCharacterStore } from '../../store/characterStore';
import { getDisplayValue } from '../../utils/formatters';

interface CharacterEditorProps {
  user: FirebaseUser | null;
}

export default function CharacterEditor({
  user
}: CharacterEditorProps) {
  const { t } = useTranslation();
  const {
    isReadOnly,
    saveCharacter
  } = useCharacter();

  // 性能优化：通过 granular selectors 获取状态，避免 CharacterEditor 整体重渲染
  const attributes = useCharacterStore(s => s.data.attributes);
  const originalAttributes = useCharacterStore(s => s.originalData.attributes);
  const babTable = useCharacterStore(s => s.data.babTable);
  const originalBabTable = useCharacterStore(s => s.originalData.babTable);
  const meleeAttacks = useCharacterStore(s => s.data.meleeAttacks);
  const originalMeleeAttacks = useCharacterStore(s => s.originalData.meleeAttacks);
  const rangedAttacks = useCharacterStore(s => s.data.rangedAttacks);
  const originalRangedAttacks = useCharacterStore(s => s.originalData.rangedAttacks);
  const acTable = useCharacterStore(s => s.data.defenses.acTable);
  const originalAcTable = useCharacterStore(s => s.originalData.defenses.acTable);
  const savesTable = useCharacterStore(s => s.data.defenses.savesTable);
  const originalSavesTable = useCharacterStore(s => s.originalData.defenses.savesTable);
  const racialTraits = useCharacterStore(s => s.data.racialTraits);
  const originalRacialTraits = useCharacterStore(s => s.originalData.racialTraits);
  const backgroundTraits = useCharacterStore(s => s.data.backgroundTraits);
  const originalBackgroundTraits = useCharacterStore(s => s.originalData.backgroundTraits);
  const classFeatures = useCharacterStore(s => s.data.classFeatures);
  const originalClassFeatures = useCharacterStore(s => s.originalData.classFeatures);
  const feats = useCharacterStore(s => s.data.feats);
  const originalFeats = useCharacterStore(s => s.originalData.feats);
  const skills = useCharacterStore(s => s.data.skills);
  const originalSkills = useCharacterStore(s => s.originalData.skills);
  
  const setData = useCharacterStore(s => s.setData); 
  const updateField = useCharacterStore(s => s.updateField);
  const tableActionMode = useCharacterStore(s => s.tableActionMode);
  const toggleTableActionMode = useCharacterStore(s => s.toggleTableActionMode);
  const handleTableItemDragStart = useCharacterStore(s => s.handleTableItemDragStart);
  const handleTableItemDragOver = useCharacterStore(s => s.handleTableItemDragOver);
  const handleTableItemDrop = useCharacterStore(s => s.handleTableItemDrop);

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
                const data = useCharacterStore.getState().data;
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
              <DynamicInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.name')} path="basic.name" />
              <DynamicInput className="col-span-12 sm:col-span-6 text-lg" label={t('editor.basic.classes')} path="basic.classes" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.alignment')} path="basic.alignment" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.deity')} path="basic.deity" />
              <DynamicInput className="col-span-4" label={t('editor.basic.size')} path="basic.size" />
              <DynamicInput className="col-span-4" label={t('editor.basic.gender')} path="basic.gender" />
              <DynamicInput className="col-span-4" label={t('editor.basic.race')} path="basic.race" />
              <DynamicInput className="col-span-4" label={t('editor.basic.age')} path="basic.age" />
              <DynamicInput className="col-span-4" label={t('editor.basic.height')} path="basic.height" />
              <DynamicInput className="col-span-4" label={t('editor.basic.weight')} path="basic.weight" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.speed')} path="basic.speed" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.senses')} path="basic.senses" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.initiative')} path="basic.initiative" />
              <DynamicInput className="col-span-12 sm:col-span-6" label={t('editor.basic.perception')} path="basic.perception" />
              <DynamicInput
                className="col-span-12 mt-2"
                label={t('editor.basic.languages')}
                path="basic.languages"
              />
            </div>
            <div className="w-full md:w-64">
              <AvatarGallery
                avatars={useCharacterStore.getState().data.basic.avatars}
                onUpdate={(newAvatars) => updateField('basic.avatars', newAvatars)}
              />
            </div>
          </div>
        </Section>

        <Section id="story" title={t('editor.sections.story')}>
          <DynamicInput
            label={t('editor.sections.story')}
            placeholder={t('editor.basic.story_placeholder')}
            path="basic.story"
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
              data={attributes.map((a: any, i: number) => ({ ...a, name: t('editor.attributes.' + ATTRIBUTE_NAMES[i]) }))}
              originalData={originalAttributes.map((a: any, i: number) => ({ ...a, name: t('editor.attributes.' + ATTRIBUTE_NAMES[i]) }))}
              onChange={(newAttrs: any) => setData({
                ...useCharacterStore.getState().data,
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
                    { key: 'bab', label: 'BAB', width: '33.33%', type: 'bonus' },
                    { key: 'cmb', label: 'CMB', width: '33.33%', type: 'bonus' },
                    { key: 'cmd', label: 'CMD', width: '33.34%', type: 'int' }
                  ]}
                  data={babTable || [{ bab: '', cmb: '', cmd: '' }]}
                  originalData={originalBabTable || [{ bab: '', cmb: '', cmd: '' }]}
                  onChange={(v: any) => updateField('babTable', v)}
                  fixedRows={true}
                />
              </div>
            </div>
            <DynamicInput
              wrapperClassName="w-full md:w-1/2"
              label={t('editor.attributes.maneuver_notes')}
              path="combatManeuverNotes"
              placeholder={t('editor.attributes.maneuver_placeholder')}
            />
          </div>
        </Section>

        <Section id="attacks" title={t('editor.sections.attacks')}>
          <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
            <div className="border-b border-stone-200">
              <DynamicTable
                minWidth="0"
                columns={[
                  { key: 'weapon', label: t('editor.attacks.melee'), width: '20%' },
                  { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
                  { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                  { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%', type: 'select', options: ['20', '19', '18', '17', '16', '15', '14', '13', '12', '11'] },
                  { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%', type: 'select', options: ['×2', '×3', '×4', '×5'] },
                  { key: 'range', label: t('editor.attacks.reach'), width: '8%', type: 'distance' },
                  { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                  { key: 'special', label: t('editor.attacks.special'), width: '22%' }
                ]}
                data={meleeAttacks?.map((a: any) => ({ ...a, critRange: a.critRange || a.crit, critMultiplier: a.critMultiplier || (a.crit?.includes('x') ? a.crit.split('x')[1] : '') })) || []}
                originalData={originalMeleeAttacks || []}
                onChange={(v: any) => updateField('meleeAttacks', v)}
                newItemGenerator={() => ({ weapon: '', hit: '', damage: '', critRange: '20', critMultiplier: '×2', range: '5', damageType: '', special: '' })}
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
                { key: 'weapon', label: t('editor.attacks.ranged'), width: '20%' },
                { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
                { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
                { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%', type: 'select', options: ['20', '19', '18', '17', '16', '15', '14', '13', '12', '11'] },
                { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%', type: 'select', options: ['×2', '×3', '×4', '×5'] },
                { key: 'range', label: t('editor.attacks.range'), width: '8%', type: 'distance' },
                { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
                { key: 'special', label: t('editor.attacks.special'), width: '22%' }
              ]}
              data={rangedAttacks?.map((a: any) => ({ ...a, critRange: a.critRange || a.crit, critMultiplier: a.critMultiplier || (a.crit?.includes('x') ? a.crit.split('x')[1] : '') })) || []}
              originalData={originalRangedAttacks || []}
              onChange={(v: any) => updateField('rangedAttacks', v)}
              newItemGenerator={() => ({ weapon: '', hit: '', damage: '', critRange: '20', critMultiplier: '×2', range: '20', damageType: '', special: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('rangedAttacks', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('rangedAttacks', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('rangedAttacks', idx, e)}
            />
          </div>
          <DynamicInput
            className="mt-6"
            label={t('editor.attacks.special_attacks')}
            path="specialAttacks"
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
                    columns={[
                      { key: 'ac', label: t('editor.defenses.ac'), width: '15%', type: 'int' },
                      { key: 'source', label: t('editor.attributes.headers.source'), width: '55%' },
                      { key: 'touch', label: t('editor.defenses.touch'), width: '15%', type: 'int' },
                      { key: 'flatFooted', label: t('editor.defenses.flat_footed'), width: '15%', type: 'int' }
                    ]}
                    data={acTable || [{ ac: '', source: '', flatFooted: '', touch: '' }]}
                    originalData={originalAcTable || [{ ac: '', source: '', flatFooted: '', touch: '' }]}
                    onChange={(v: any) => updateField('defenses.acTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <DynamicInput
                wrapperClassName="w-full md:w-1/2"
                label={t('editor.defenses.ac_notes')}
                path="defenses.acNotes"
                placeholder={t('editor.defenses.ac_placeholder')}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <DynamicInput label={t('editor.defenses.hp')} path="defenses.hp" />
              </div>
              <div className="w-full md:w-1/2">
                <DynamicInput label={t('editor.defenses.hd')} path="defenses.hd" />
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
                    columns={[
                      { key: 'fort', label: t('editor.defenses.fort'), width: '33.33%', type: 'bonus' },
                      { key: 'ref', label: t('editor.defenses.ref'), width: '33.33%', type: 'bonus' },
                      { key: 'will', label: t('editor.defenses.will'), width: '33.34%', type: 'bonus' }
                    ]}
                    data={savesTable || [{ fort: '', ref: '', will: '' }]}
                    originalData={originalSavesTable || [{ fort: '', ref: '', will: '' }]}
                    onChange={(v: any) => updateField('defenses.savesTable', v)}
                    fixedRows={true}
                  />
                </div>
              </div>
              <DynamicInput
                wrapperClassName="w-full md:w-1/2"
                label={t('editor.defenses.saves_notes')}
                path="defenses.savesNotes"
              />
            </div>
            <DynamicInput
              className="mt-4"
              label={t('editor.defenses.special_defenses')}
              path="defenses.specialDefenses"
            />
          </div>
        </Section>

        <Section id="racial-traits" title={t('editor.sections.racial_traits')}>
          <DynamicTable
            columns={[
              { key: 'name', label: t('editor.lists.trait'), width: '10%' },
              { key: 'desc', label: t('editor.lists.description'), width: '90%' }
            ]}
            data={racialTraits}
            originalData={originalRacialTraits}
            onChange={(v: any) => updateField('racialTraits', v)}
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
              data={backgroundTraits}
              originalData={originalBackgroundTraits}
              onChange={(v: any) => updateField('backgroundTraits', v)}
              newItemGenerator={() => ({ name: '', type: '', desc: '' })}
              rowDraggable={true}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('backgroundTraits', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('backgroundTraits', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('backgroundTraits', idx, e)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DynamicInput label={t('editor.lists.favored_class')} path="favoredClass" />
              <DynamicInput label={t('editor.lists.favored_class_bonus')} path="favoredClassBonus" />
            </div>
          </div>
        </Section>

        <Section id="class-features" title={t('editor.sections.class_features')}>
          <DynamicTable
            columns={[
              { key: 'level', label: t('editor.lists.level'), width: '8%', type: 'level' },
              { key: 'name', label: t('editor.sections.class_features'), width: '22%' },
              { key: 'type', label: t('editor.lists.ability_type'), width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
              { key: 'desc', label: t('editor.lists.description'), width: '65%' }
            ]}
            data={classFeatures}
            originalData={originalClassFeatures}
            onChange={(v: any) => updateField('classFeatures', v)}
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
              { key: 'level', label: t('editor.lists.level'), width: '8%', type: 'level' },
              { key: 'source', label: t('editor.lists.source'), width: '12%' },
              { key: 'name', label: t('editor.lists.feat_name'), width: '20%' },
              { key: 'type', label: t('editor.lists.feat_type'), width: '5%' },
              { key: 'desc', label: t('editor.lists.description'), width: '55%' }
            ]}
            data={feats}
            originalData={originalFeats}
            onChange={(v: any) => updateField('feats', v)}
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
          <MagicBlocks path="magicBlocks" />
        </Section>

        <Section id="skills" title={t('editor.sections.skills')}>
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <div className="w-full md:w-1/6">
              <DynamicInput label={t('editor.skills.total_points')} path="skillsTotal" />
            </div>
            <div className="w-full md:w-1/6">
              <DynamicInput label={t('editor.skills.acp')} path="armorCheckPenalty" />
            </div>
          </div>
          <div className="mt-4">
            <DynamicTable
              columns={[
                { key: 'name', label: t('editor.skills.headers.skill'), width: '15%' },
                { key: 'total', label: t('editor.skills.headers.total'), width: '5%', type: 'bonus' },
                { key: 'rank', label: t('editor.skills.headers.rank'), width: '5%', type: 'level' },
                { key: 'cs', label: t('editor.skills.headers.cs'), width: '5%', type: 'checkbox', displayFormatter: (val) => val === 'true' ? '+3' : '' },
                {
                  key: 'ability',
                  label: t('editor.skills.headers.ability'),
                  width: '10%',
                  type: 'attributeIndex',
                  displayFormatter: (val) => {
                    if (!val || val === '0') return '';
                    const idx = parseInt(val, 10) - 1;
                    const localizedName = t('editor.attributes.' + ATTRIBUTE_NAMES[idx]);
                    const modStr = getDisplayValue(attributes[idx].modifier, 'bonus', t);
                    return `${modStr}${localizedName}`;
                  }
                },
                { key: 'others', label: t('editor.skills.headers.others'), width: '20%' },
                { key: 'special', label: t('editor.skills.headers.special'), width: '35%' }
              ]}
              data={skills}
              originalData={originalSkills}
              onChange={(v: any) => updateField('skills', v)}
              newItemGenerator={() => ({ name: '', total: '', source: '', special: '' })}
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
          <EquipmentBags path="equipmentBags" />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <DynamicInput label={t('editor.items.pp')} path="currency.pp" />
            <DynamicInput label={t('editor.items.gp')} path="currency.gp" />
            <DynamicInput label={t('editor.items.sp')} path="currency.sp" />
            <DynamicInput label={t('editor.items.cp')} path="currency.cp" />
            <DynamicInput label={t('editor.items.coin_weight')} path="currency.coinWeight" />
          </div>

          <WeightSummary />
        </Section>

        <Section id="additional-data" title={t('editor.sections.additional')}>
          <AdditionalData path="additionalData" />
        </Section>
      </main>
    </motion.div>
  );
}

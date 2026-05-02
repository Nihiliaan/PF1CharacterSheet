import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, FilePlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const DEFAULT_BBCODE_TEMPLATE = `[table][tr][td]
{name} {classes}
{alignment} {deity}
{size} {gender} {race}
{height} {weight} {age} {speed}
先攻 {initiative} 察觉 {perception}
语言 {languages}
[/td]
[td][img width=200 height=200]{avatarUrl}[/img][/td]
[/tr]
[/table]
[hr]
[b]属性[/b]
[hr]
{attributesTable}
[table][tr][td]BAB {bab}[/td][td]CMB {cmb}[/td][td]CMD {cmd}[/td][/tr][/table]
[hr]
[b]攻击[/b]
[hr]
[b]近战攻击[/b]
{meleeAttackTable}
[b]远程攻击[/b]
{rangedAttackTable}
[b]特殊攻击[/b]
{specialAttacks}
[hr]
[b]防御[/b]
[hr]
AC {ac}，措手不及{acFlatFooted}，接触{acTouch}；{acNotes}
hp {hp} ({hd})
强韧{saveFort}，反射{saveRef}，意志{saveWill}；{savesNotes}
防御能力
{defensiveAbilities}
[hr]
[b]种族特性和背景特性[/b]
[hr]
{racialTraits}
{backgroundTraits}
[hr]
[b]职业特性[/b]
[hr]
[b]天赋职业[/b] {favoredClass} ({favoredClassBonus})
{classFeatures}
{magicBlocks}
[hr]
[b]专长[/b]
[hr]
{featTable}
[hr]
[b]技能 总计{skillsTotal}点；防具检定减值{acp}[/b]
[hr]
{skillTable}
备注
{skillsNotes}
[hr]
[b]装备与物品[/b]
[hr]
{equipmentSection}
`;

import { useCharacter } from '../contexts/CharacterContext';

export default function BBCodeTemplateEditor() {
  const { t } = useTranslation();
  const { setToast, bbcodeTemplate, setBbcodeTemplate, saveAsTemplate, updateExistingTemplate, getItemPath, currentDocumentId } = useCharacter();

  const currentPath = getItemPath(currentDocumentId);

  const handleSaveAsNew = () => {
    const name = window.prompt(t('editor.bbcode.prompt_name'), t('editor.bbcode.default_name'));
    if (name) {
      saveAsTemplate(name, bbcodeTemplate);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('bbcode_template', bbcodeTemplate);
    if (currentDocumentId) {
      await updateExistingTemplate(currentDocumentId, bbcodeTemplate);
    } else {
      handleSaveAsNew();
    }
  };

  const handleReset = () => {
    if (window.confirm(t('editor.bbcode.confirm_reset'))) {
      setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
      localStorage.removeItem('bbcode_template');
      setToast({ message: t('editor.bbcode.reset_success'), type: 'success' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-24 pb-20">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold font-serif text-stone-800">{t('editor.bbcode.title')}</h2>
              {currentPath && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-medium ml-2">
                  {currentPath}
                </span>
              )}
            </div>
            <p className="text-stone-500 text-sm">{t('editor.bbcode.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors rounded-lg font-medium text-sm"
            >
              <RotateCcw size={16} /> {t('editor.bbcode.reset')}
            </button>
            <button
              onClick={handleSaveAsNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-lg font-medium text-sm shadow-md"
            >
              <FilePlus size={16} /> {t('editor.bbcode.save_as')}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors rounded-lg font-bold text-sm shadow-md"
            >
              <Save size={16} /> {currentDocumentId ? t('common.save') : t('editor.bbcode.save_as')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
          <div className="p-2 bg-stone-100 border-b border-stone-200">
            <p className="text-xs text-stone-500 italic pl-2">{t('editor.bbcode.content_label')}</p>
          </div>
          <textarea
            value={bbcodeTemplate}
            onChange={(e) => setBbcodeTemplate(e.target.value)}
            className="flex-1 w-full p-4 outline-none resize-none font-mono text-sm leading-relaxed text-stone-700"
            spellCheck={false}
          />
        </div>

        <div className="mt-8 bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-800 mb-6 text-base border-b pb-2">{t('editor.bbcode.var_ref')}</h3>
          <div className="space-y-8">
            {/* 1. Basic Info */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">1. {t('editor.sections.basic')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{name}'} - {t('editor.basic.name')}</span>
                <span>{'{classes}'} - {t('editor.basic.classes')}</span>
                <span>{'{alignment}'} - {t('editor.basic.alignment')}</span>
                <span>{'{deity}'} - {t('editor.basic.deity')}</span>
                <span>{'{size}'} - {t('editor.basic.size')}</span>
                <span>{'{gender}'} - {t('editor.basic.gender')}</span>
                <span>{'{race}'} - {t('editor.basic.race')}</span>
                <span>{'{age}'} - {t('editor.basic.age')}</span>
                <span>{'{height}'} - {t('editor.basic.height')}</span>
                <span>{'{weight}'} - {t('editor.basic.weight')}</span>
                <span>{'{speed}'} - {t('editor.basic.speed')}</span>
                <span>{'{senses}'} - {t('editor.basic.senses')}</span>
                <span>{'{initiative}'} - {t('editor.basic.initiative')}</span>
                <span>{'{perception}'} - {t('editor.basic.perception')}</span>
                <span>{'{languages}'} - {t('editor.basic.languages')}</span>
                <span>{'{avatarUrl}'} - 1{t('editor.lists.image_url')}</span>
              </div>
            </section>

            {/* 2. Story */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">2. {t('editor.sections.story')}</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{story}'} - {t('editor.sections.story')}</span>
              </div>
            </section>

            {/* 3. Attributes */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">3. {t('editor.sections.attributes')}</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{attributesTable}'} - {t('editor.sections.attributes')}</span>
              </div>
            </section>

            {/* 4. Combat Stats */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">4. {t('editor.attributes.combat_stats')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{bab}'} - BAB</span>
                <span>{'{cmb}'} - CMB</span>
                <span>{'{cmd}'} - CMD</span>
                <span className="col-span-full">{'{combatManeuverNotes}'} - {t('editor.attributes.maneuver_notes')}</span>
              </div>
            </section>

            {/* 5. Attacks */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">5. {t('editor.sections.attacks')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{meleeAttackTable}'} - {t('editor.attacks.melee')}</span>
                <span>{'{rangedAttackTable}'} - {t('editor.attacks.ranged')}</span>
                <span className="col-span-full">{'{specialAttacks}'} - {t('editor.attacks.special_attacks')}</span>
              </div>
            </section>

            {/* 6. Defenses */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">6. {t('editor.sections.defenses')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{hp}'} - {t('editor.defenses.hp')}</span>
                <span>{'{hd}'} - {t('editor.defenses.hd')}</span>
                <span>{'{ac}'} - {t('editor.defenses.ac')}</span>
                <span>{'{acFlatFooted}'} - {t('editor.defenses.flat_footed')}</span>
                <span>{'{acTouch}'} - {t('editor.defenses.touch')}</span>
                <span className="col-span-2">{'{acNotes}'} - {t('editor.defenses.ac_notes')}</span>
                <span>{'{saveFort}'} - {t('editor.defenses.fort')}</span>
                <span>{'{saveRef}'} - {t('editor.defenses.ref')}</span>
                <span>{'{saveWill}'} - {t('editor.defenses.will')}</span>
                <span className="col-span-2">{'{savesNotes}'} - {t('editor.defenses.saves_notes')}</span>
                <span className="col-span-full">{'{defensiveAbilities}'} - {t('editor.sections.defenses')}</span>
              </div>
            </section>

            {/* 7. Traits */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">7. {t('editor.sections.traits')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span className="col-span-full">{'{racialTraits}'} - {t('editor.sections.racial_traits')}</span>
                <span className="col-span-full">{'{backgroundTraits}'} - {t('editor.sections.traits')}</span>
                <span>{'{favoredClass}'} - {t('editor.lists.favored_class')}</span>
                <span>{'{favoredClassBonus}'} - {t('editor.lists.favored_class_bonus')}</span>
                <span className="col-span-full">{'{classFeatures}'} - {t('editor.sections.class_features')}</span>
              </div>
            </section>

            {/* 8. Feats & Skills */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">8. {t('editor.sections.feats')} & {t('editor.sections.skills')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{featTable}'} - {t('editor.sections.feats')}</span>
                <span>{'{skillTable}'} - {t('editor.sections.skills')}</span>
                <span>{'{acp}'} - {t('editor.skills.acp')}</span>
                <span>{'{skillsTotal}'} - {t('editor.skills.total_points')}</span>
                <span className="col-span-full">{'{skillsNotes}'} - {t('editor.skills.notes')}</span>
                <span className="col-span-full">{'{magicBlocks}'} - {t('editor.sections.spells')}</span>
              </div>
            </section>

            {/* 9. Equipment */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">9. {t('editor.sections.equipment')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span className="col-span-full">{'{equipmentTable}'} - {t('editor.sections.equipment')}</span>
                <span className="col-span-full">{'{currencyLine}'} - {t('editor.items.total_assets')}</span>
                <span className="col-span-full">{'{loadSummary}'} - {t('editor.items.total_weight')}</span>
                <span className="col-span-full">{'{equipmentSection}'} - {t('editor.sections.equipment')} ({t('common.all')})</span>
                <span>{'{loadStatus}'} - {t('editor.items.total_weight')} (Legacy)</span>
                <span>{'{loadLimits}'} - {t('editor.items.heavy')} (Legacy)</span>
              </div>
            </section>

            {/* 10. Additional */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">10. {t('editor.sections.additional')}</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{additionalData}'} - {t('editor.sections.additional')}</span>
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}

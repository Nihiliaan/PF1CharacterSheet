import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Save, RotateCcw, FilePlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const DEFAULT_BBCODE_TEMPLATE = `{{#with basic}}[table][tr][td]
{{name}} {{classes}}
{{alignment}} {{deity}}
{{size}} {{gender}} {{race}}
{{height}} {{weight}} {{age}}
{{speed.land}} {{senses}}
先攻 {{initiative}} 察觉 {{perception}}
语言 {{languages}}
[/td]
[td][img width=200 height=200]{{avatars.url.[0]}}[/img][/td]
[/tr]
[/table]{{/with}}
[hr]
[b]属性[/b]
[hr]
[table]
{{#each attributes}}
[tr][td]{{name}}[/td][td]{{final}}[/td][td]{{modifier}}[/td][td]{{source}}{{status}}[/td][/tr]
{{/each}}
[/table]
{{#with combatTable}}BAB {{bab}}，CMB {{cmb}}，CMD {{cmd}}{{/with}}
[hr]
[b]攻击[/b]
[hr]
近战攻击
[table]
{{#each attacks.meleeAttacks}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{range}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
远程攻击
[table]
{{#each attacks.rangedAttacks}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{range}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
{{#if attacks.specialAttacks}}
特殊攻击
{{attacks.specialAttacks}}
{{/if}}
[hr]
[b]防御[/b]
[hr]
{{#with defenses}}
{{#with acTable}}AC {{ac}}（{{source}}），措手不及 {{flatFooted}}，接触 {{touch}}{{/with}}
hp {{hp}} ({{hd}})
{{#with savesTable}}强韧 {{fort}}，反射 {{ref}}，意志 {{will}}{{/with}}
{{#if savesNotes}}备注：{{savesNotes}}{{/if}}
{{/with}}
[hr]
[b]背景特性与天赋职业[/b]
[hr]
[b]背景特性：[/b]
{{#each backgroundTraits}}{{name}}（{{type}}）: {{desc}}{{/each}}
[b]天赋职业奖励：[/b] {{favoredClass}} ({{favoredClassBonus}})
[hr]
[b]种族特性[/b]
[hr]
[table]
{{#each racialTraits}}
[tr][td]{{name}}[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]职业特性[/b]
[hr]
[table]
{{#each classFeatures}}
[tr][td]{{level}}[/td][td]{{name}}（{{type}}）[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
{{#if magicBlocks}}
[b]法术与类法术能力[/b]
[hr]
{{#each magicBlocks}}
[b]{{title}}[/b]（CL {{casterLevel}}{{#unless (eq (raw "spellType") 4)}}, 专注 {{concentration}}{{/unless}}）
[table]
{{#each tableData}}
[tr]{{#unless (eq (raw "../spellType") 5)}}[td]{{level}}[/td]{{/unless}}{{#if uses}}[td]{{uses}}[/td]{{/if}}[td]{{spells}}[/td][/tr]
{{/each}}
[/table]
{{#if notes}}备注：{{notes}}{{/if}}
{{/each}}
{{/if}}
[hr]
[b]技能[/b]
[hr]
[table]
{{#each skills}}
[tr][td]{{name}}[/td][td]{{total}} ({{rank}}{{cs}}{{ability}} {{others}})[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]专长[/b]
[hr]
[table]
{{#each feats}}
[tr][td]{{level}}[/td][td]{{name}} ({{type}})[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]物品[/b]
[hr]
{{#each equipmentBags}}
[quote author={{name}}]
[table]
{{#each items}}
[tr][td]{{item}}[/td][td]{{quantity}}[/td][td]{{cost}}[/td][td]{{weight}}[/td][td]{{notes}}[/td][/tr]
{{/each}}
[/table]
[/quote]
{{/each}}
[b]总资产 {{totalCost}}gp，总重 {{totalWeight}}lbs[/b]
`;

import { useCharacter } from '../contexts/CharacterContext';
import { BBCODE_SYNTAX_GUIDE, BBCODE_DATA_TREE, BBCodeTreeItem } from '../constants/bbcodeHelp';

const TreeItem = ({ item, level = 0, defaultOpen = false }: { item: BBCodeTreeItem; level?: number; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || level < 1); // 默认展开第一层
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-2 py-1 hover:bg-stone-100 rounded px-2 transition-colors group cursor-pointer"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="w-4 flex items-center justify-center text-stone-400">
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <div className="w-1 h-1 bg-stone-300 rounded-full" />
          )}
        </div>
        <code className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
          {item.key}
        </code>
        {item.isSoA && (
          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase tracking-tighter">SoA</span>
        )}
        <span className="text-[11px] text-stone-500 truncate">{item.desc}</span>
      </div>

      {hasChildren && (
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {item.children?.map((child) => (
            <TreeItem key={child.key} item={child} level={level + 1} />
          ))}
        </motion.div>
      )}
    </div>
  );
};
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Syntax Guide */}
            <div>
              <h4 className="text-xs font-bold text-amber-700 mb-4 uppercase tracking-widest border-l-2 border-amber-600 pl-2">
                {t('editor.bbcode.syntax_title')}
              </h4>
              <div className="space-y-4">
                {BBCODE_SYNTAX_GUIDE.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <code className="text-xs font-bold text-amber-800 bg-amber-50 self-start px-1 rounded">{item.code}</code>
                    <p className="text-[11px] text-stone-600 leading-tight">{item.desc}</p>
                    {item.example && (
                      <code className="text-[10px] text-stone-400 italic mt-0.5">{item.example}</code>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Tree */}
            <div>
              <h4 className="text-xs font-bold text-indigo-700 mb-4 uppercase tracking-widest border-l-2 border-indigo-600 pl-2">
                数据结构参考
              </h4>
              <div className="bg-stone-50 rounded-lg border border-stone-100 p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                {BBCODE_DATA_TREE.map((item) => (
                  <TreeItem key={item.key} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
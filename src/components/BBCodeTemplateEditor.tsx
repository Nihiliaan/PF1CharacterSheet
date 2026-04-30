import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

export const DEFAULT_BBCODE_TEMPLATE = `[table][tr][td]
[b]姓名[/b]: {name}  [b]职业[/b]: {classes}
[b]阵营[/b]: {alignment}  [b]信仰[/b]: {deity}
[b]体型[/b]: {size}  [b]性别[/b]: {gender}  [b]种族[/b]: {race}
[b]身高[/b]: {height}  [b]体重[/b]: {weight}  [b]年龄[/b]: {age}  [b]速度[/b]: {speed}
[b]先攻[/b]: {initiative}  [b]察觉[/b]: {perception}
[b]语言[/b]: {languages}
[/td]
[td]      [img width=200 height=200]{avatarUrl}[/img][/td]
[/tr]
[/table]
[hr]
[spoiler]
[table]
[tr][td][b]属性[/b][/td][td][b]数值[/b][/td][td][b]调整值[/b][/td][td][b]说明[/b][/td][/tr]
{attributesRows}
[/table]

[table]
[tr][td][b]BAB[/b] {bab}[/td][td][b]CMB[/b] {cmb}[/td][td][b]CMD[/b] {cmd}[/td][/tr]
[/table]
[hr]
[b]攻击[/b]
[table]
[tr][td][b]攻击方式[/b][/td][td][b]攻击加值[/b][/td][td][b]伤害/重击/类型[/td][td][b]射程/特性[/b][/td][/tr]
{attackRows}
[/table]
[hr]
[b]防御[/b]
{acLine}
{hpLine}
{saveLine}
[b]防御能力[/b]: {defensiveAbilities}
[hr]
[b]种族特性和背景特性[/b]
{racialTraits}
[i]背景特性[/i]: {backgroundTraits}
[hr]
[b]职业特性[/b]
[b]天赋职业[/b]: {favoredClass} ({favoredClassBonus})
{classFeatures}
{magicBlocks}
[hr]
[b]专长[/b]
[table]
[tr][td][b]等级[/b][/td][td][b]名称[/b][/td][td][b]描述[/b][/td][/tr]
{featRows}
[/table]
[hr]
[b]技能加点[/b]
[table]
[tr][td][b]名称[/b][/td][td][b]总计[/b][/td][td][b]计算[/b][/td][/tr]
{skillRows}
[/table]
[hr]
[/spoiler]
[b]装备[/b]
[table]
[tr][td][b]名称[/b][/td][td][b]价格[/b][/td][td][b]重量[/b][/td][td][b]说明[/b][/td][/tr]
{equipmentRows}
[tr][td][b]负重[/b][/td][td]{loadStatus}[/td][td]{loadLimits}[/td][td][/td][/tr]
[/table]
`;

import { useCharacter } from '../contexts/CharacterContext';

export default function BBCodeTemplateEditor() {
  const { setToast } = useCharacter();
  const [template, setTemplate] = useState<string>(DEFAULT_BBCODE_TEMPLATE);

  useEffect(() => {
    const saved = localStorage.getItem('bbcode_template');
    if (saved) {
      setTemplate(saved);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('bbcode_template', template);
    setToast({ message: "BBCode 模板保存成功", type: 'success' });
  };

  const handleReset = () => {
    if (window.confirm("确定要恢复默认模板吗？这将覆盖您当前的修改。")) {
      setTemplate(DEFAULT_BBCODE_TEMPLATE);
      localStorage.removeItem('bbcode_template');
      setToast({ message: "已恢复默认模板", type: 'success' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-24 pb-20">
        
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-serif text-stone-800">BBCode 导出模板设置</h2>
            <p className="text-stone-500 mt-1 text-sm">自定义生成论坛代码时使用的模板，使用 {'{'}变量名{'}'} 插入数据。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors rounded-lg font-medium text-sm"
            >
              <RotateCcw size={16} /> 恢复默认
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 transition-colors rounded-lg font-bold text-sm shadow-md"
            >
              <Save size={16} /> 保存修改
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
          <div className="p-2 bg-stone-100 border-b border-stone-200">
            <p className="text-xs text-stone-500 italic pl-2">模板内容</p>
          </div>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="flex-1 w-full p-4 outline-none resize-none font-mono text-sm leading-relaxed text-stone-700"
            spellCheck={false}
          />
        </div>

        <div className="mt-8 bg-stone-100 rounded-xl p-6 border border-stone-200">
          <h3 className="font-bold text-stone-800 mb-4 text-sm">可用变量参考</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs font-mono text-stone-600">
            {'{name}'} - 姓名<br/>
            {'{classes}'} - 职业等级<br/>
            {'{avatarUrl}'} - 头像URL<br/>
            {'{languages}'} - 语言<br/>
            {'{attributesRows}'} - 属性表格行<br/>
            {'{bab}'} / {'{cmb}'} / {'{cmd}'} - 战斗数值<br/>
            {'{attackRows}'} - 攻击列表行<br/>
            {'{acLine}'} - AC汇总行<br/>
            {'{hpLine}'} - HP汇总行<br/>
            {'{saveLine}'} - 豁免汇总行<br/>
            {'{racialTraits}'} - 种族特性列表<br/>
            {'{backgroundTraits}'} - 背景特性列表<br/>
            {'{featRows}'} - 专长表格行<br/>
            {'{skillRows}'} - 技能表格行<br/>
            {'{equipmentRows}'} - 装备表格行<br/>
            {'{magicBlocks}'} - 法术与类法术能力模块<br/>
            {'{additionalData}'} - 附加数据模块<br/>
            {'{loadLimits}'} - 负重限额<br/>
            {'{loadStatus}'} - 当前负重状态<br/>
          </div>
        </div>

      </div>
    </div>
  );
}

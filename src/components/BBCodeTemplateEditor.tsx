import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

export const DEFAULT_BBCODE_TEMPLATE = `[table][tr][td]
{name} {classes}
{alignment} {deity}
{size} {gender} {race}
{height} {weight} {age} {speed}
先攻 {initiative} 察觉 {perception}
语言：{languages}
[/td]
[td][img width=200 height=200]{avatarUrl}[/img][/td]
[/tr]
[/table]
[hr]
[spoiler]
[b]属性[/b]
{attributesTable}
[table][tr][td]BAB{bab}[/td][td]CMB{cmb}[/td][td]CMD{cmd}[/td][/tr][/table]
[hr]
[b]攻击[/b]
{meleeAttackTable}
{rangedAttackTable}
特殊攻击
{specialAttacks}
[hr]
[b]防御[/b]
AC {ac}，措手不及{acFlatFooted}，接触{acTouch}
{acNotes}
HP {hp} ({hd})
强韧{saveFort}，反射{saveRef}，意志{saveWill}
{savesNotes}
防御能力
{defensiveAbilities}
[hr]
[b]种族特性和背景特性[/b]
{racialTraits}
{backgroundTraits}
[hr]
[b]职业特性[/b]
天赋职业：{favoredClass} ({favoredClassBonus})
{classFeatures}
{magicBlocks}
[hr]
[b]专长[/b]
{featTable}
[hr]
[b]技能加点[/b]
{skillTable}
[hr]
[/spoiler]
[b]装备[/b]
{equipmentTable}
[table]
[tr][td]负重[/td]
[td]{loadStatus}[/td]
[td]{loadLimits}[/td]
[/tr]
[/table]
[hr]
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

        <div className="mt-8 bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-800 mb-6 text-base border-b pb-2">可用变量参考 (按 CharacterData 顺序排序)</h3>
          <div className="space-y-8">
            {/* 1. Basic Info */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">1. 基础信息 (Basic Info)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{name}'} - 姓名</span>
                <span>{'{classes}'} - 职业等级</span>
                <span>{'{alignment}'} - 阵营</span>
                <span>{'{deity}'} - 信仰</span>
                <span>{'{size}'} - 体型</span>
                <span>{'{gender}'} - 性别</span>
                <span>{'{race}'} - 种族</span>
                <span>{'{age}'} - 年龄</span>
                <span>{'{height}'} - 身高</span>
                <span>{'{weight}'} - 体重</span>
                <span>{'{speed}'} - 速度</span>
                <span>{'{senses}'} - 感官</span>
                <span>{'{initiative}'} - 先攻</span>
                <span>{'{perception}'} - 察觉</span>
                <span>{'{languages}'} - 语言</span>
                <span>{'{avatarUrl}'} - 1号头像URL</span>
              </div>
            </section>

            {/* 2. Story */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">2. 背景故事 (Story)</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{story}'} - 背景故事全文本</span>
              </div>
            </section>

            {/* 3. Attributes */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">3. 属性 (Attributes)</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{attributesTable}'} - 完整属性表格 (含 [table] 和表头)</span>
              </div>
            </section>

            {/* 4. Combat Stats */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">4. 战斗数值 (Combat Stats)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{bab}'} - 基础攻击加值</span>
                <span>{'{cmb}'} - 战技加值</span>
                <span>{'{cmd}'} - 战技防御</span>
                <span className="col-span-full">{'{combatManeuverNotes}'} - 战技备注</span>
              </div>
            </section>

            {/* 5. Attacks */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">5. 攻击 (Attacks)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{meleeAttackTable}'} - 完整近战攻击表</span>
                <span>{'{rangedAttackTable}'} - 完整远程攻击表</span>
                <span className="col-span-full">{'{specialAttacks}'} - 特殊攻击全文本</span>
              </div>
            </section>

            {/* 6. Defenses */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">6. 防御 (Defenses)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{hp}'} - 生命值</span>
                <span>{'{hd}'} - 生命骰</span>
                <span>{'{ac}'} - 防御等级</span>
                <span>{'{acFlatFooted}'} - 措手不及</span>
                <span>{'{acTouch}'} - 接触</span>
                <span className="col-span-2">{'{acNotes}'} - 防护备注</span>
                <span>{'{saveFort}'} - 强韧豁免</span>
                <span>{'{saveRef}'} - 反射豁免</span>
                <span>{'{saveWill}'} - 意志豁免</span>
                <span className="col-span-2">{'{savesNotes}'} - 豁免备注</span>
                <span className="col-span-full">{'{defensiveAbilities}'} - 防御能力段落</span>
                <span className="col-span-full italic text-stone-400 font-serif border-t pt-1 mt-1">快捷整合: {'{hpLine}'} / {'{acLine}'} / {'{saveLine}'}</span>
              </div>
            </section>

            {/* 7. Traits */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">7. 特性与加成 (Traits & Bonus)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span className="col-span-full">{'{racialTraits}'} - 种族特性列表</span>
                <span className="col-span-full">{'{backgroundTraits}'} - 背景特性列表</span>
                <span>{'{favoredClass}'} - 天赋职业</span>
                <span>{'{favoredClassBonus}'} - 天赋职业奖励</span>
                <span className="col-span-full">{'{classFeatures}'} - 职业特性列表</span>
              </div>
            </section>

            {/* 8. Feats & Skills */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">8. 专长与技能 (Feats & Skills)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span>{'{featTable}'} - 完整专长表格</span>
                <span>{'{skillTable}'} - 完整技能表格</span>
                <span className="col-span-full">{'{skillsTotal.total}'} - 技能总点数</span>
                <span className="col-span-full">{'{magicBlocks}'} - 法术与类法术模块</span>
              </div>
            </section>

            {/* 9. Equipment */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">9. 装备与物品 (Equipment)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-[11px] font-mono text-stone-600">
                <span className="col-span-full">{'{equipmentTable}'} - 完整装备表格</span>
                <span className="col-span-2">{'{equipmentNotes}'} - 装备备注</span>
                <span>{'{loadStatus}'} - 负重状态</span>
                <span>{'{loadLimits}'} - 负重限额</span>
              </div>
            </section>

            {/* 10. Additional */}
            <section>
              <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest border-l-2 border-primary pl-2">10. 附加数据 (Additional)</h4>
              <div className="grid grid-cols-1 gap-y-2 text-[11px] font-mono text-stone-600">
                <span>{'{additionalData}'} - 附加数据自定义区块</span>
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}

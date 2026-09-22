import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Copy, Printer, Check, Eye, EyeOff, SlidersHorizontal, Info, Shield, Swords, Sparkles, Wand2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { 
  formatStatBlockData, 
  exportStatBlockToMarkdown, 
  getEstimatedCR 
} from '../../utils/statBlockFormatter';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

/**
 * 轻量级 Markdown 超链接渲染组件，支持将 [文本](URL) 渲染为可跳转链接，并隔离点击事件
 */
export const SafeMarkdownText: React.FC<{
  text?: string | null;
  className?: string;
  linkClassName?: string;
}> = ({
  text,
  className,
  linkClassName = "text-amber-800 hover:text-amber-600 underline font-medium cursor-pointer"
}) => {
  if (!text) return null;
  const str = String(text);
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      <a
        key={`${match.index}-${label}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  if (parts.length === 0) return <span className={className}>{str}</span>;
  return <span className={className}>{parts}</span>;
};

export default function GMStatBlockView() {
  const { t } = useTranslation();
  const { data } = useCharacter();
  const { setView, setToast } = useUI();

  const defaultCR = useMemo(() => getEstimatedCR(data), [data]);
  const [customCR, setCustomCR] = useState<number | string>(defaultCR);
  const [customMR, setCustomMR] = useState<string>('');
  const [isCompactMode, setIsCompactMode] = useState(true);
  const [copied, setCopied] = useState(false);

  // 格式化后的数据
  const sb = useMemo(() => {
    const mrNum = customMR.trim() ? parseInt(customMR, 10) : undefined;
    return formatStatBlockData(data, t, customCR, mrNum);
  }, [data, t, customCR, customMR]);

  // 复制为 Markdown
  const handleCopyMarkdown = async () => {
    const mrNum = customMR.trim() ? parseInt(customMR, 10) : undefined;
    const md = exportStatBlockToMarkdown(data, t, customCR, mrNum);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setToast({ message: t('common.copied_markdown_toast', '已复制怪物数据卡Markdown'), type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  // 打印
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      key="gm-view"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="h-full overflow-y-auto bg-stone-100 p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:overflow-visible custom-scrollbar"
    >
      {/* 顶部操作工具栏（打印时隐藏） */}
      <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200 rounded-lg px-4 py-2.5 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('editor')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded transition-colors"
            title={t('common.switch_to_editor', '返回编辑')}
          >
            <ArrowLeft size={16} />
            <span>{t('common.switch_to_editor', '返回编辑')}</span>
          </button>

          <div className="h-4 w-px bg-stone-200" />

          {/* CR 微调 */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className="font-semibold">CR:</span>
            <input
              type="text"
              value={customCR}
              onChange={(e) => setCustomCR(e.target.value)}
              className="w-12 text-center text-xs font-bold border border-stone-300 rounded px-1 py-0.5 bg-stone-50 focus:bg-white focus:outline-none focus:border-amber-600"
              title="CR"
            />
          </div>

          {/* MR 微调 */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className="font-semibold">MR:</span>
            <input
              type="text"
              value={customMR}
              onChange={(e) => setCustomMR(e.target.value)}
              placeholder="—"
              className="w-10 text-center text-xs font-bold border border-stone-300 rounded px-1 py-0.5 bg-stone-50 focus:bg-white focus:outline-none focus:border-amber-600"
              title="MR"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 紧凑模式开关 */}
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${
              isCompactMode 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
            title={isCompactMode ? t('common.compact_view', '紧凑模式') : t('common.expanded_view', '完整说明')}
          >
            {isCompactMode ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{isCompactMode ? t('common.compact_view', '紧凑模式') : t('common.expanded_view', '完整说明')}</span>
          </button>

          {/* 复制 Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 text-xs font-medium bg-stone-800 text-white hover:bg-stone-700 px-3 py-1.5 rounded shadow-sm transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span>{copied ? t('common.copied', '已复制') : t('common.copy_markdown', '复制 Markdown')}</span>
          </button>

          {/* 打印 */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded border border-stone-200 transition-colors"
            title={t('common.print', '打印 / 导出PDF')}
          >
            <Printer size={14} />
            <span className="hidden sm:inline">{t('common.print', '打印')}</span>
          </button>
        </div>
      </div>

      {/* 怪物数据卡核心主体（经典 Pathfinder 怪物图鉴双栏紧凑排版） */}
      <article className="max-w-5xl mx-auto bg-[#fcfbfa] text-stone-900 border border-stone-300 rounded-lg shadow-sm p-4 sm:p-6 print:border-none print:shadow-none print:p-0 print:max-w-none text-[13px] leading-snug print:text-[11px] print:leading-tight font-sans">
        
        {/* 动态双栏主体 (窄屏单栏，宽屏/打印双栏高度自动平衡，包括顶部头部) */}
        <div className="columns-1 md:columns-2 gap-6 print:columns-2">
          
          {/* 头部信息（参与分栏流） */}
          <header className="border-b-2 border-stone-800 pb-2 mb-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-wide uppercase">
                <SafeMarkdownText text={sb.name} />
                <span className="text-base sm:text-lg font-semibold ml-2 text-stone-700">
                  （CR {sb.cr}{sb.mr ? `，MR ${sb.mr}` : ''}）
                </span>
              </h1>
              <div className="text-xs sm:text-sm font-bold text-stone-700">
                {t('editor.basic.xp', '经验值')} {sb.xp}
              </div>
            </div>

            <div className="text-stone-800 text-xs sm:text-sm mt-0.5 font-medium">
              {sb.race && <span><SafeMarkdownText text={sb.race} /> </span>}
              <span><SafeMarkdownText text={sb.classes || '—'} /></span>
            </div>

            <div className="text-stone-700 text-xs mt-0.5">
              <span>{sb.alignment} </span>
              <span>{sb.size} </span>
              <span><SafeMarkdownText text={sb.typeSubtype} /></span>
            </div>

            <div className="text-stone-800 text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              <span><strong className="font-semibold">{t('editor.basic.initiative', '先攻')}</strong> {sb.initiative}</span>
              <span>；</span>
              <span><strong className="font-semibold">{t('editor.basic.senses', '感官')}</strong> <SafeMarkdownText text={sb.senses} /></span>
              {sb.aura && (
                <>
                  <span>；</span>
                  <span><strong className="font-semibold">{t('editor.basic.aura', '灵光')}</strong> <SafeMarkdownText text={sb.aura} /></span>
                </>
              )}
            </div>
          </header>
          
          {/* 防御 (Defense) */}
          <section className="space-y-1 mb-3">
            <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
              <h2 className="font-serif font-bold tracking-wider text-xs uppercase text-stone-900">
                {t('editor.sections.defenses', '防御')}
              </h2>
            </div>

            <div>
              <strong className="font-semibold">AC</strong> {sb.ac}，
              <strong className="font-semibold">{t('editor.defenses.touch', '接触')}</strong> {sb.touch}，
              <strong className="font-semibold">{t('editor.defenses.flat_footed', '措手不及')}</strong> {sb.flatFooted}
              {sb.acSource && <span className="text-stone-600 text-xs">（<SafeMarkdownText text={sb.acSource} />）</span>}
            </div>

            <div>
              <strong className="font-semibold">hp</strong> {sb.hp}
              {sb.hd && <span className="text-stone-600">（{sb.hd}）</span>}
            </div>

            <div>
              <strong className="font-semibold">{t('editor.defenses.saves', '豁免')}</strong> 
              {' '}{t('editor.defenses.fort', '强韧')} {sb.fort}，
              {t('editor.defenses.ref', '反射')} {sb.ref}，
              {t('editor.defenses.will', '意志')} {sb.will}
              {sb.conditionalSaves && <span className="text-stone-600 text-xs">（<SafeMarkdownText text={sb.conditionalSaves} />）</span>}
            </div>

            {sb.specialDefenses && (
              <div>
                <strong className="font-semibold">{t('editor.defenses.special_defenses', '防御能力')}</strong> <SafeMarkdownText text={sb.specialDefenses} />
              </div>
            )}
          </section>

          {/* 进攻 (Offense) */}
          <section className="space-y-1 mb-3">
            <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
              <h2 className="font-serif font-bold tracking-wider text-xs uppercase text-stone-900">
                {t('editor.sections.attacks', '进攻')}
              </h2>
            </div>

            <div>
              <strong className="font-semibold">{t('editor.basic.speed_short', '速度')}</strong> {sb.speed}
            </div>

            {sb.meleeAttacks.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.attacks.melee_short', '近战')}</strong>{' '}
                {sb.meleeAttacks.map((a, i) => (
                  <span key={i}>
                    <span className="font-medium italic"><SafeMarkdownText text={a.weapon} /></span> {a.hit} 
                    <span className="text-stone-600"> ({[a.damage + '/' + a.crit, a.damageType, a.special].filter(Boolean).join(' ')})</span>
                    {i < sb.meleeAttacks.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            {sb.rangedAttacks.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.attacks.ranged_short', '远程')}</strong>{' '}
                {sb.rangedAttacks.map((a, i) => (
                  <span key={i}>
                    <span className="font-medium italic"><SafeMarkdownText text={a.weapon} /></span> {a.hit} 
                    <span className="text-stone-600"> ({[a.damage + '/' + a.crit, a.rangeOrTouch, a.damageType, a.special].filter(Boolean).join(' ')})</span>
                    {i < sb.rangedAttacks.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            <div>
              <strong className="font-semibold">{t('editor.basic.space', '占据')}</strong> {sb.space}尺；
              <strong className="font-semibold">{t('editor.basic.reach', '触及')}</strong> {sb.reach}尺
            </div>

            {sb.specialAttacks && (
              <div>
                <strong className="font-semibold">{t('editor.attacks.special_attacks', '特殊攻击')}</strong> <SafeMarkdownText text={sb.specialAttacks} />
              </div>
            )}

            {/* 法术与类法术列表（无卡片背景，标题上下分割线） */}
            {sb.magicBlocks.length > 0 && (
              <div className="space-y-2 mt-2">
                {sb.magicBlocks.map((mb, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
                      <div className="font-serif font-bold text-xs text-stone-900">
                        <SafeMarkdownText text={mb.title} />
                        {(mb.cl || (mb.type !== 4 && mb.concentration)) && (
                          <span className="font-sans font-normal text-stone-600 text-[11px] ml-1">
                            （{[mb.cl ? `施法者等级 ${mb.cl}级` : '', (mb.type !== 4 && mb.concentration) ? `专注 ${mb.concentration}` : ''].filter(Boolean).join('；')}）
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-0.5 text-xs">
                      {mb.rows.map((r, rIdx) => (
                        <div key={rIdx} className="leading-snug">
                          <span className="font-semibold text-stone-900">{r.levelText}</span>
                          <span className="text-stone-500 mx-1">——</span>
                          <span className="italic text-stone-800">
                            <SafeMarkdownText text={r.spellsText} />
                          </span>
                        </div>
                      ))}
                    </div>

                    {mb.notes && (
                      <div className="text-[11px] text-stone-500 italic mt-0.5">
                        <SafeMarkdownText text={mb.notes} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 战术 (Tactics - 如有填写则显示) */}
          {sb.tactics && (sb.tactics.beforeCombat || sb.tactics.duringCombat || sb.tactics.morale) && (
            <section className="space-y-1 mb-3">
              <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
                <h2 className="font-serif font-bold tracking-wider text-xs uppercase text-stone-900">
                  {t('editor.tactics.title', '战术')}
                </h2>
              </div>
              {sb.tactics.beforeCombat && <div><strong>{t('editor.tactics.before_combat', '战斗前')}</strong> <SafeMarkdownText text={sb.tactics.beforeCombat} /></div>}
              {sb.tactics.duringCombat && <div><strong>{t('editor.tactics.during_combat', '战斗中')}</strong> <SafeMarkdownText text={sb.tactics.duringCombat} /></div>}
              {sb.tactics.morale && <div><strong>{t('editor.tactics.morale', '士气')}</strong> <SafeMarkdownText text={sb.tactics.morale} /></div>}
            </section>
          )}

          {/* 统计 (Statistics) */}
          <section className="space-y-1 mb-3">
            <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
              <h2 className="font-serif font-bold tracking-wider text-xs uppercase text-stone-900">
                {t('editor.statistics.title', '统计')}
              </h2>
            </div>

            {/* 核心六维属性（紧凑单行显示） */}
            <div>
              <strong className="font-semibold">{t('editor.sections.attributes', '属性')}</strong>{' '}
              {sb.attributes.map((attr, i) => (
                <span key={i} className="whitespace-nowrap">
                  {attr.name} {attr.value} <span className="text-stone-500 text-xs">({attr.mod})</span>
                  {i < sb.attributes.length - 1 ? '，' : ''}
                </span>
              ))}
            </div>

            <div>
              <strong className="font-semibold">BAB</strong> {sb.bab}；
              <strong className="font-semibold">CMB</strong> {sb.cmb}；
              <strong className="font-semibold">CMD</strong> {sb.cmd}
            </div>

            {/* 专长（紧凑排列，支持超链接与 Popover 弹窗） */}
            {sb.feats.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.sections.feats', '专长')}</strong>{' '}
                {sb.feats.map((feat, i) => (
                  <span key={i}>
                    {feat.desc ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="font-medium underline decoration-dotted decoration-stone-400 hover:text-amber-800 transition-colors cursor-help text-left inline"
                          >
                            <SafeMarkdownText text={feat.name} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs p-3 shadow-lg bg-stone-900 text-stone-100 border-stone-800 z-50">
                          <div className="font-bold text-amber-400 mb-1">
                            <SafeMarkdownText text={feat.name} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                          </div>
                          <div className="text-stone-300 leading-relaxed whitespace-pre-wrap">
                            <SafeMarkdownText text={feat.desc} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span>
                        <SafeMarkdownText text={feat.name} />
                      </span>
                    )}
                    {i < sb.feats.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* 技能（仅受训技能 + 察觉） */}
            {sb.skills.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.skills.title', '技能')}</strong>{' '}
                {sb.skills.map((s, i) => (
                  <span key={i} className="whitespace-nowrap">
                    <SafeMarkdownText text={s.name} /> {s.total}
                    {i < sb.skills.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            <div>
              <strong className="font-semibold">{t('editor.basic.languages', '语言')}</strong> <SafeMarkdownText text={sb.languages} />
            </div>

            {/* SQ 特殊能力汇总（仅显示能力名称，Popover保留类型） */}
            {sb.specialQualities.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.defenses.special_qualities', '特殊能力')}</strong>{' '}
                {sb.specialQualities.map((sq, i) => (
                  <span key={i}>
                    {sq.desc ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="font-medium underline decoration-dotted decoration-stone-400 hover:text-amber-800 transition-colors cursor-help text-left inline"
                          >
                            <SafeMarkdownText text={sq.name} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs p-3 shadow-lg bg-stone-900 text-stone-100 border-stone-800 z-50">
                          <div className="font-bold text-amber-400 mb-1">
                            <SafeMarkdownText text={sq.name} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                            {sq.type ? ` (${sq.type})` : ''}
                          </div>
                          <div className="text-stone-300 leading-relaxed whitespace-pre-wrap">
                            <SafeMarkdownText text={sq.desc} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span>
                        <SafeMarkdownText text={sq.name} />
                      </span>
                    )}
                    {i < sb.specialQualities.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* 装备 */}
            {sb.combatGear.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.equipment.combat_gear', '战斗装备')}</strong>{' '}
                {sb.combatGear.map((item, i) => (
                  <span key={i}>
                    <SafeMarkdownText text={item} />
                    {i < sb.combatGear.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}

            {sb.otherGear.length > 0 && (
              <div>
                <strong className="font-semibold">{t('editor.equipment.other_gear', '其他装备')}</strong>{' '}
                {sb.otherGear.map((item, i) => (
                  <span key={i}>
                    <SafeMarkdownText text={item} />
                    {i < sb.otherGear.length - 1 ? '，' : ''}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 特殊能力详细说明 (Special Abilities) - 容器允许自然跨栏，细项各自 break-inside-avoid */}
          {sb.specialAbilities.length > 0 && (
            <section className="space-y-1.5 mb-3">
              <div className="border-y border-stone-400/80 py-0.5 my-1.5 break-after-avoid flex items-center justify-between">
                <h2 className="font-serif font-bold tracking-wider text-xs uppercase text-stone-900">
                  {t('editor.defenses.special_qualities', '特殊能力')}
                </h2>
              </div>

              {isCompactMode ? (
                // 紧凑模式：名片摘要式排列，点击弹窗查看长文本规则
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 print:grid-cols-1">
                  {sb.specialAbilities.map((sa, i) => (
                    <div key={i} className="break-inside-avoid">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-left w-full p-1.5 rounded border border-stone-200 bg-stone-50/70 hover:bg-stone-100 hover:border-stone-300 transition-colors group cursor-pointer"
                          >
                            <div className="font-semibold text-xs text-stone-900 group-hover:text-amber-900 flex items-center justify-between">
                              <span className="truncate"><SafeMarkdownText text={sa.name} /></span>
                              {sa.type && (
                                <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-200/70 px-1 rounded ml-1 shrink-0">
                                  {sa.type}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate mt-0.5">
                              <SafeMarkdownText text={sa.desc} />
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs p-3 shadow-lg bg-stone-900 text-stone-100 border-stone-800 z-50">
                          <div className="font-bold text-amber-400 mb-1">
                            <SafeMarkdownText text={sa.name} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                            {sa.type ? ` (${sa.type})` : ''}
                          </div>
                          <div className="text-stone-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                            <SafeMarkdownText text={sa.desc} linkClassName="text-amber-300 hover:text-amber-100 underline" />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>
              ) : (
                // 展开模式：平铺全部说明
                <div className="space-y-2">
                  {sb.specialAbilities.map((sa, i) => (
                    <div key={i} className="break-inside-avoid text-xs">
                      <strong className="font-semibold text-stone-900">
                        <SafeMarkdownText text={sa.name} />{sa.type ? ` (${sa.type})` : ''}
                      </strong>{' '}
                      <span className="text-stone-700 leading-relaxed">
                        <SafeMarkdownText text={sa.desc} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>

      </article>
    </motion.div>
  );
}

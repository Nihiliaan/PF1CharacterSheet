import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { produce } from 'immer';
import {
  Shield, Award, Scroll, RotateCcw,
  Check, Calculator, Sparkles, Lock, Unlock, CheckCircle2, LogIn,
  DownloadCloud, AlertTriangle, ExternalLink, RefreshCw, X, Copy
} from 'lucide-react';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import DynamicTable from '../../common/DynamicTable';
import CheckGroupInput, { decodeCheckGroup } from '../../common/CheckGroupInput';
import { useCharacter } from '../../../contexts/CharacterContext';
import { useUI } from '../../../contexts/UIContext';
import {
  PFS_FACTIONS,
  PFS_FACTION_ENUM,
  calculateCompletedGoals,
  getDefaultGoalsForFaction,
  getFactionById,
  getFactionKeyById,
  getFactionIdByKey,
  getFactionDisplayName,
  getFactionIdByName,
  getLocalizedFactionText
} from '../../../database/pfsFactions';
import { toTraditional } from '../../../i18n/config';
import { cn } from '../../../lib/utils';
import { PfsGoalItem, PfsChroniclesSoA } from '../../../schema/types';
import { hasPfsContent } from '../../../utils/pfsBbcodeHelper';

const PFSSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    data,
    lastSavedData,
    update,
    tableActionMode,
    toggleTableActionMode,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();
  const { setToast } = useUI();

  // 同步状态与冲突合并状态
  const [isSyncing, setIsSyncing] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    incoming: any[];
    local: PfsChroniclesSoA;
  } | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'incremental' | 'overwrite' | 'append'>('incremental');
  const [isChroniclesUnlocked, setIsChroniclesUnlocked] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const syncTimerRef = useRef<any>(null);

  const pfs = data.pfs || {
    playerNumber: '',
    characterNumber: '',
    faction: 1,
    xp: 0,
    fame: 0,
    prestige: 0,
    goals: [],
    boons: { uses: [], name: [], desc: [], sheetNo: [] },
    chronicles: { date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: [] }
  };

  // 获取当前势力的数字 ID 与 key
  const chronicles = pfs.chronicles || {
    date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: []
  };

  const validChroniclesCount = useMemo(() => {
    return (chronicles.scenario || []).filter(s => Boolean(s && String(s).trim())).length;
  }, [chronicles.scenario]);

  const hasChronicles = validChroniclesCount > 0;

  // 1. 势力推导：若有记录单，取最后一条有效记录单的势力；若无，取初始 pfs.faction
  const isPfsActive = hasPfsContent(data.pfs);

  // 启用 PFS 模式 (初始化填充默认结构，赋予默认角色号 1 使其具有实质内容)
  const handleEnablePFS = () => {
    const fId = effectiveFactionId || 1;
    const fKey = getFactionKeyById(fId) || 'grand_lodge';
    update('pfs', {
      playerNumber: '',
      characterNumber: '1',
      faction: fId,
      xp: 0,
      fame: 0,
      prestige: 0,
      goals: getDefaultGoalsForFaction(fKey, i18n.language),
      boons: { uses: [], name: [], desc: [], sheetNo: [] },
      chronicles: { date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: [] },
      factionBoonChecks: {}
    });
  };

  // 关闭 PFS 模式并清空 PFS 内容
  const handleDisablePFS = () => {
    if (isPfsActive) {
      if (!window.confirm(t('editor.pfs.disable_confirm', '确定要关闭 PFS 模式吗？这将清空该角色的所有 PFS 编号、势力任务卡、特惠卡与跑团记录单。'))) {
        return;
      }
    }
    update('pfs', {
      playerNumber: '',
      characterNumber: '',
      faction: 1,
      xp: 0,
      fame: 0,
      prestige: 0,
      goals: [],
      boons: { uses: [], name: [], desc: [], sheetNo: [] },
      chronicles: { date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: [] },
      factionBoonChecks: {}
    });
  };

  const effectiveFactionId = useMemo(() => {
    if (hasChronicles) {
      const scenarios = chronicles.scenario || [];
      const factions = chronicles.faction || [];
      for (let i = scenarios.length - 1; i >= 0; i--) {
        if (scenarios[i] && String(scenarios[i]).trim()) {
          const f = factions[i];
          const fNum = typeof f === 'number' ? f : parseInt(String(f), 10);
          if (fNum > 0) return fNum;
        }
      }
    }
    return typeof pfs.faction === 'number' ? pfs.faction : (getFactionIdByKey(pfs.faction) || 1);
  }, [hasChronicles, chronicles.scenario, chronicles.faction, pfs.faction]);

  const currentFactionId = effectiveFactionId;
  const currentFactionKey = getFactionKeyById(effectiveFactionId);
  const factionDef = PFS_FACTIONS[currentFactionKey] || PFS_FACTIONS['grand_lodge'];

  // 2. 动态计算 XP (有效场次数)
  const computedXP = validChroniclesCount;

  // 3. 动态计算 Fame (所有记录单 prestige 累加之和)
  const computedFame = useMemo(() => {
    const prestiges = chronicles.prestige || [];
    const scenarios = chronicles.scenario || [];
    let total = 0;
    for (let i = 0; i < scenarios.length; i++) {
      if (scenarios[i] && String(scenarios[i]).trim()) {
        total += parseFloat(String(prestiges[i] || 0)) || 0;
      }
    }
    return Math.round(total * 2) / 2;
  }, [chronicles.scenario, chronicles.prestige]);

  // 核心响应式修复：当生效势力发生变化且任务卡与当前势力不匹配时，自动同步重置任务卡，绝不依赖 UI 下拉框触发
  useEffect(() => {
    const fDef = PFS_FACTIONS[currentFactionKey];
    if (fDef && pfs.goals && pfs.goals.length > 0) {
      const isGoalsMatch = fDef.goals.some(g => g.id === pfs.goals[0]?.id);
      if (!isGoalsMatch) {
        update('pfs.goals', getDefaultGoalsForFaction(currentFactionKey, i18n.language));
      }
    }
  }, [currentFactionKey]);

  // 保证 goals 初始有数据
  const goals = useMemo(() => {
    if (pfs.goals && pfs.goals.length > 0) {
      return pfs.goals;
    }
    return getDefaultGoalsForFaction(currentFactionKey, i18n.language);
  }, [pfs.goals, currentFactionKey, i18n.language]);

  const completedGoalsCount = useMemo(() => {
    return calculateCompletedGoals(goals);
  }, [goals]);

  // 监听油猴脚本发来的事件
  useEffect(() => {
    const handleSessionsLoaded = (e: any) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      setIsSyncing(false);

      const incoming = e.detail?.sessions;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        setToast({ message: t('editor.pfs.no_chronicles', '未从官网检索到该角色的跑团记录'), type: 'info' });
        return;
      }

      // 转换为标准结构
      const formattedIncoming = incoming.map((s: any) => ({
        date: s.date || '',
        scenario: s.scenario || '',
        gm: s.gm || '',
        event: s.event || '',
        faction: typeof s.faction === 'number' ? s.faction : (getFactionIdByName(s.faction) || currentFactionId),
        prestige: typeof s.prestige === 'number' ? s.prestige : (parseInt(s.prestige, 10) || 0),
        notes: s.notes || '',
        link: s.link || ''
      }));

      const localChronicles = pfs.chronicles || {
        date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: []
      };
      const localCount = (localChronicles.scenario || []).length;

      if (localCount === 0) {
        // 本地为空，直接灌入
        const newChronicles: PfsChroniclesSoA = {
          date: formattedIncoming.map(item => item.date),
          scenario: formattedIncoming.map(item => item.scenario),
          gm: formattedIncoming.map(item => item.gm),
          event: formattedIncoming.map(item => item.event),
          faction: formattedIncoming.map(item => item.faction),
          prestige: formattedIncoming.map(item => item.prestige),
          notes: formattedIncoming.map(item => item.notes),
          link: formattedIncoming.map(item => item.link)
        };
        update('pfs.chronicles', newChronicles);
        setToast({
          message: t('editor.pfs.sync_success', { count: formattedIncoming.length }),
          type: 'success'
        });
      } else {
        // 本地已有数据，弹窗进行冲突合并选择
        setConflictData({
          incoming: formattedIncoming,
          local: localChronicles
        });
      }
    };

    const handleSessionsError = (e: any) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      setIsSyncing(false);
      const code = e.detail?.code;
      const message = e.detail?.message;
      if (code === 'NOT_LOGGED_IN') {
        setShowLoginModal(true);
      } else {
        setToast({ message: message || t('editor.pfs.sync_error', '从官网同步失败'), type: 'error' });
      }
    };

    window.addEventListener('PAIZO_SESSIONS_LOADED', handleSessionsLoaded);
    window.addEventListener('PAIZO_SESSIONS_ERROR', handleSessionsError);
    return () => {
      window.removeEventListener('PAIZO_SESSIONS_LOADED', handleSessionsLoaded);
      window.removeEventListener('PAIZO_SESSIONS_ERROR', handleSessionsError);
    };
  }, [pfs.chronicles, currentFactionId, t, update, setToast]);

  // 发起从官网同步
  const handleStartSync = () => {
    const pNo = String(pfs.playerNumber || '').trim();
    const cNo = String(pfs.characterNumber || '').trim();

    if (!pNo || !cNo) {
      setToast({
        message: t('editor.pfs.missing_pfs_number', '请先输入完整的 PFS 玩家编号与角色编号'),
        type: 'error'
      });
      return;
    }

    setIsSyncing(true);

    // 派发事件通知油猴脚本 (基于纯数字编号天然标识符，绝不依赖角色名字以规避中英差异)
    window.dispatchEvent(new CustomEvent('FETCH_PAIZO_SESSIONS', {
      detail: { playerNumber: pNo, characterNumber: cNo }
    }));

    // 设置 3.5 秒超时计时器，若无响应则引导安装油猴
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setIsSyncing(false);
      setShowHelperModal(true);
    }, 3500);
  };

  // 执行合并策略
  const handleApplyMerge = () => {
    if (!conflictData) return;
    const { incoming, local } = conflictData;

    let finalChronicles: PfsChroniclesSoA;

    if (mergeStrategy === 'overwrite') {
      // 1. 完全覆盖
      finalChronicles = {
        date: incoming.map(s => s.date),
        scenario: incoming.map(s => s.scenario),
        gm: incoming.map(s => s.gm),
        event: incoming.map(s => s.event),
        faction: incoming.map(s => s.faction),
        prestige: incoming.map(s => s.prestige),
        notes: incoming.map(s => s.notes),
        link: incoming.map(s => s.link)
      };
    } else if (mergeStrategy === 'append') {
      // 2. 纯末尾追加
      finalChronicles = {
        date: [...(local.date || []), ...incoming.map(s => s.date)],
        scenario: [...(local.scenario || []), ...incoming.map(s => s.scenario)],
        gm: [...(local.gm || []), ...incoming.map(s => s.gm)],
        event: [...(local.event || []), ...incoming.map(s => s.event)],
        faction: [...(local.faction || []), ...incoming.map(s => s.faction)],
        prestige: [...(local.prestige || []), ...incoming.map(s => s.prestige)],
        notes: [...(local.notes || []), ...incoming.map(s => s.notes)],
        link: [...(local.link || []), ...incoming.map(s => s.link)]
      };
    } else {
      // 3. 智能增量合并（推荐）：以 scenario+date 对齐，保留本地所有已有手填数据与外链
      const localLen = (local.scenario || []).length;
      const localRows: any[] = [];
      for (let i = 0; i < localLen; i++) {
        localRows.push({
          date: local.date?.[i] || '',
          scenario: local.scenario?.[i] || '',
          gm: local.gm?.[i] || '',
          event: local.event?.[i] || '',
          faction: local.faction?.[i] ?? currentFactionId,
          prestige: local.prestige?.[i] ?? 0,
          notes: local.notes?.[i] || '',
          link: local.link?.[i] || ''
        });
      }

      const makeKey = (scenario: string, date: string) =>
        `${(scenario || '').trim().toLowerCase()}|${(date || '').trim().toLowerCase()}`;

      const existingKeys = new Set(localRows.map(r => makeKey(r.scenario, r.date)));

      // 增量添加新场次，对已有场次补齐空缺字段
      const mergedRows = [...localRows];
      incoming.forEach(inc => {
        const key = makeKey(inc.scenario, inc.date);
        if (existingKeys.has(key)) {
          // 本地已有：仅补全空缺字段，不覆盖已有内容
          const idx = mergedRows.findIndex(r => makeKey(r.scenario, r.date) === key);
          if (idx !== -1) {
            if (!mergedRows[idx].gm && inc.gm) mergedRows[idx].gm = inc.gm;
            if (!mergedRows[idx].event && inc.event) mergedRows[idx].event = inc.event;
            if ((!mergedRows[idx].prestige || mergedRows[idx].prestige === 0) && inc.prestige) {
              mergedRows[idx].prestige = inc.prestige;
            }
          }
        } else {
          // 全新场次追加
          mergedRows.push(inc);
          existingKeys.add(key);
        }
      });

      finalChronicles = {
        date: mergedRows.map(r => r.date),
        scenario: mergedRows.map(r => r.scenario),
        gm: mergedRows.map(r => r.gm),
        event: mergedRows.map(r => r.event),
        faction: mergedRows.map(r => r.faction),
        prestige: mergedRows.map(r => r.prestige),
        notes: mergedRows.map(r => r.notes),
        link: mergedRows.map(r => r.link)
      };
    }

    update('pfs.chronicles', finalChronicles);
    setConflictData(null);
    setToast({
      message: t('editor.pfs.sync_success', { count: (finalChronicles.scenario || []).length }),
      type: 'success'
    });
  };

  // 切换势力
  const handleFactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFactionId = parseInt(e.target.value, 10);
    update('pfs.faction', newFactionId);
    const newFactionKey = getFactionKeyById(newFactionId);
    const newGoals = getDefaultGoalsForFaction(newFactionKey, i18n.language);
    update('pfs.goals', newGoals);
  };

  // 重置当前势力的标准目标
  const handleResetGoals = () => {
    if (window.confirm(t('editor.pfs.reset_goals_confirm'))) {
      const standardGoals = getDefaultGoalsForFaction(currentFactionKey, i18n.language);
      update('pfs.goals', standardGoals);
    }
  };

  // 切换目标复选框打勾状态（数量控制，阶梯式）
  const toggleGoalCheck = (goalIdx: number, checkIdx: number) => {
    const updated = produce(goals, draft => {
      if (!draft[goalIdx]) return;
      const currentCount = draft[goalIdx].checkedCount || 0;
      // 若点击的是当前最右侧已选中的块，则取消该块（减 1）
      // 否则，点亮到当前点击的位置（checkIdx + 1）
      if (checkIdx === currentCount - 1) {
        draft[goalIdx].checkedCount = checkIdx;
      } else {
        draft[goalIdx].checkedCount = checkIdx + 1;
      }
    });
    update('pfs.goals', updated);
  };

  // 获取目标显示文本（语言自适应）
  const getGoalDisplayText = (goal: PfsGoalItem) => {
    const stdGoal = factionDef.goals.find(g => g.id === goal.id);
    if (stdGoal) {
      return getLocalizedFactionText(stdGoal.text, i18n.language);
    }
    return '';
  };

  // 检查目标达成状态：GM 满 5 格为 2，满 3 格为 1；普通达到 maxChecks
  const getGoalCompletionStatus = (goal: PfsGoalItem) => {
    const count = goal.checkedCount || 0;
    const isGM = goal.id?.endsWith('_gm');
    if (isGM) {
      if (count >= 5) return 'completed_x2';
      if (count >= 3) return 'completed';
      return 'none';
    }
    return count >= (goal.maxChecks || 1) ? 'completed' : 'none';
  };

  // 根据记录单汇总统计
  const handleSummarizeChronicles = () => {
    const ch = pfs.chronicles;
    if (!ch || !Array.isArray(ch.scenario) || ch.scenario.length === 0) {
      setToast({ message: t('editor.pfs.no_chronicles', '暂无记录单数据'), type: 'info' });
      return;
    }

    let totalPP = 0;
    (ch.prestige || []).forEach(v => { totalPP += parseInt(v as any, 10) || 0; });

    update('pfs.prestige', totalPP);
    setToast({ message: t('editor.pfs.summarize_success'), type: 'success' });
  };

  return (
    <Section id="pfs" title={t('editor.sections.pfs')}>
      <div className="flex flex-col gap-8">
        {!isPfsActive ? (
          <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-inner">
                <Shield size={24} />
              </div>
              <div>
                <h4 className="font-bold text-stone-800 text-base">{t('editor.pfs.title')}</h4>
                <p className="text-sm text-stone-500 mt-0.5">{t('editor.pfs.enable_pfs_desc')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnablePFS}
              className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded shadow transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Award size={16} />
              {t('editor.pfs.enable_pfs')}
            </button>
          </div>
        ) : (
          <>
        {/* PFS 基础概览面板 */}
        <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-stone-200 gap-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-base">
              <Shield size={18} className="text-amber-700" />
              <span>{t('editor.pfs.title')}</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-stone-500 ml-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPfsActive}
                      onChange={e => {
                        if (!e.target.checked) handleDisablePFS();
                      }}
                      className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                    />
                    <span>{t('editor.pfs.enable_pfs')}</span>
                  </label>
                </div>
            </div>
          </div>

              <div className="grid grid-cols-12 gap-4">
                {/* 势力选择：有记录单时锁定，无记录单时允许选择初始势力 */}
                <div className="col-span-12 sm:col-span-6 md:col-span-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.faction')}</span>
                    {hasChronicles && (
                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-medium">
                        由最新记录单锁定
                      </span>
                    )}
                  </div>
                  <select
                    value={effectiveFactionId}
                    disabled={hasChronicles}
                    onChange={handleFactionChange}
                    title={hasChronicles ? "角色势力已根据最新记录单自动确定，无法手动修改" : "新角色无记录单时可自由选择初始势力"}
                    className="w-full h-[34px] px-3 bg-white disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed border border-stone-300 rounded text-sm text-stone-800 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-colors"
                  >
                    {PFS_FACTION_ENUM.filter(f => (!f.retired && f.id > 0) || f.id === effectiveFactionId).map(f => (
                      <option key={f.id} value={f.id}>
                        {getLocalizedFactionText(f.name, i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PFS 编号：拆分为 [ 玩家编号 ] — [ 角色编号 ]，均限制正整数 */}
                <div className="col-span-12 sm:col-span-6 md:col-span-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.pfs_number', 'PFS 编号')}</span>
                  <div className="flex items-center gap-1.5 h-[34px]">
                    <input
                      type="text"
                      value={pfs.playerNumber || ''}
                      onChange={e => update('pfs.playerNumber', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={t('editor.pfs.player_no_placeholder', '玩家编号')}
                      className="w-full h-full px-2.5 bg-white border border-stone-300 rounded text-sm text-stone-800 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    />
                    <span className="text-stone-400 font-bold select-none">—</span>
                    <input
                      type="text"
                      value={pfs.characterNumber || ''}
                      onChange={e => update('pfs.characterNumber', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={t('editor.pfs.char_no_placeholder', '角色')}
                      className="w-20 h-full px-2 bg-white border border-stone-300 rounded text-sm text-stone-800 text-center focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* 当前经验 (XP)：允许手动输入与滚轮步进，支持半整数 */}
                <InlineInput
                  className="col-span-4 sm:col-span-4 md:col-span-4"
                  label={t('editor.pfs.xp')}
                  value={pfs.xp ?? 0}
                  path="pfs.xp"
                  originalValue={lastSavedData.pfs?.xp ?? 0}
                  onChange={v => update('pfs.xp', v)}
                  type="halfInt"
                />

                {/* 累积声誉 (Fame)：由所有记录单获得的声望点自动汇总，禁止手动输入 */}
                <div className="col-span-4 sm:col-span-4 md:col-span-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.fame')}</span>
                  <div className="w-full h-[34px] px-3 bg-stone-100/80 border border-stone-200 rounded flex items-center justify-between" title="由所有记录单获得的声望点（Prestige）自动汇总，无需手动输入">
                    <span className="font-mono font-bold text-stone-900 text-sm">{computedFame}</span>
                    <span className="text-[10px] text-stone-400">声望总额累计</span>
                  </div>
                </div>

                {/* 可用声望 (Prestige) */}
                <InlineInput
                  className="col-span-4 sm:col-span-4 md:col-span-4"
                  label={t('editor.pfs.prestige')}
                  value={pfs.prestige ?? 0}
                  path="pfs.prestige"
                  originalValue={lastSavedData.pfs?.prestige ?? 0}
                  onChange={v => update('pfs.prestige', v)}
                  type="halfInt"
                />
              </div>
            </div>

            {/* 势力任务卡与三阶福利面板 */}
            <div className="bg-stone-50/60 border border-stone-200 rounded-lg p-5 flex flex-col gap-6">
              {/* 头部信息 */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-700" />
                    <h4 className="font-bold text-stone-800 text-base">
                      {getLocalizedFactionText(factionDef.name, i18n.language)} - {t('editor.pfs.faction_card_title')}
                    </h4>
                  </div>
                  <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-x-2">
                    <span>{t('editor.pfs.faction_leader')}：<strong className="text-stone-700">{getLocalizedFactionText(factionDef.leader, i18n.language)}</strong></span>
                    <span>•</span>
                    <span className="italic">{getLocalizedFactionText(factionDef.description, i18n.language)}</span>
                  </div>
                </div>

                {/* 达成统计勋章 */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <div className="px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>{t('editor.pfs.completed_goals_count')}：{t('editor.pfs.goal_progress', { count: completedGoalsCount })}</span>
                  </div>
                </div>
              </div>

              {/* 三档势力福利 (按行紧凑分布，类似势力任务) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={14} className="text-amber-700" />
                    <span>{t('editor.pfs.tier_1_boon')} / {t('editor.pfs.tier_2_boon')} / {t('editor.pfs.tier_3_boon')}</span>
                  </h5>
                  <span className="text-[11px] text-stone-400">
                    {t('editor.pfs.completed_goals_count')}：{t('editor.pfs.goal_progress', { count: completedGoalsCount })}
                  </span>
                </div>
                <div className="bg-white border border-stone-200 rounded-md overflow-hidden divide-y divide-stone-100 text-sm shadow-2xs">
                  {factionDef.boons.map(b => {
                    const isUnlocked = completedGoalsCount >= b.requiredGoals;
                    const boonChecks = (pfs.factionBoonChecks && b.id && pfs.factionBoonChecks[b.id]) || 0;
                    const hasLimit = typeof b.maxChecks === 'number' && b.maxChecks > 0;

                    return (
                      <div
                        key={b.id || b.tier}
                        className={`px-3 py-2 flex flex-col gap-1 transition-colors ${
                          isUnlocked
                            ? 'bg-amber-50/40 text-stone-900'
                            : 'hover:bg-stone-50/70 text-stone-700'
                        }`}
                      >
                        {/* 标题单独占一行 */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {isUnlocked ? (
                              <Sparkles size={15} className="text-amber-600 shrink-0" />
                            ) : (
                              <Lock size={14} className="text-stone-400 shrink-0" />
                            )}

                            {/* 若该 Boon 拥有限定次数且已解锁，在名称前显示紧凑复选框 */}
                            {hasLimit && isUnlocked && b.id && (
                              <CheckGroupInput
                                value={boonChecks}
                                overrideMax={b.maxChecks}
                                compact={true}
                                allowEditMax={false}
                                onChange={(newEncoded) => {
                                  const { checks } = decodeCheckGroup(newEncoded);
                                  const nextBoonChecks = { ...(pfs.factionBoonChecks || {}), [b.id!]: checks };
                                  update('pfs.factionBoonChecks', nextBoonChecks);
                                }}
                              />
                            )}

                            <span className="font-bold text-sm text-stone-800">
                              {getLocalizedFactionText(b.name, i18n.language)}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                              isUnlocked
                                ? 'bg-amber-500 text-white'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            {isUnlocked
                              ? t('editor.pfs.unlocked')
                              : t('editor.pfs.locked', { count: b.requiredGoals })}
                          </span>
                        </div>

                        {/* 福利效果描述（独立一行） */}
                        <div className="text-sm leading-relaxed text-stone-600 pl-5">
                          {getLocalizedFactionText(b.desc, i18n.language)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 势力任务目标列表 (紧凑段落清单) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Scroll size={14} className="text-stone-500" />
                    <span>{t('editor.pfs.goals_checklist_title')}</span>
                  </h5>
                  <button
                    type="button"
                    onClick={handleResetGoals}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded transition-colors cursor-pointer"
                    title={t('editor.pfs.reset_goals')}
                  >
                    <RotateCcw size={11} />
                    <span>{t('editor.pfs.reset_goals')}</span>
                  </button>
                </div>

                {/* 统一紧凑段落容器 */}
                <div className="bg-white border border-stone-200 rounded-md overflow-hidden divide-y divide-stone-100 text-sm shadow-2xs">
                  {goals.map((goal, goalIdx) => {
                    const status = getGoalCompletionStatus(goal);
                    const isCompleted = status !== 'none';
                    const maxChecks = goal.maxChecks || 1;
                    const checkedCount = goal.checkedCount || 0;
                    const isGM = goal.id?.endsWith('_gm');

                    return (
                      <div
                        key={goal.id || goalIdx}
                        className={`px-2.5 py-1.5 flex items-start gap-2.5 transition-colors ${
                          isCompleted
                            ? 'bg-amber-50/40 text-stone-900'
                            : 'hover:bg-stone-50/70 text-stone-700'
                        }`}
                      >
                        {/* 紧凑打勾控件 */}
                        <div className="shrink-0 pt-0.5">
                          <CheckGroupInput
                            value={checkedCount}
                            overrideMax={maxChecks}
                            isGM={isGM}
                            compact={true}
                            allowEditMax={false}
                            onChange={(newEncoded) => {
                              const { checks } = decodeCheckGroup(newEncoded);
                              const nextGoals = [...goals];
                              nextGoals[goalIdx] = { ...nextGoals[goalIdx], checkedCount: checks };
                              update('pfs.goals', nextGoals);
                            }}
                          />
                        </div>

                        {/* 目标文本 */}
                        <div className="flex-1 text-sm leading-relaxed pt-0.5">
                          <span className={isCompleted ? 'font-medium text-stone-900' : 'text-stone-700'}>
                            {getGoalDisplayText(goal)}
                          </span>
                        </div>

                        {/* 达成徽标 */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {status === 'completed_x2' && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 size={12} className="text-white" />
                              <span>{t('editor.pfs.goal_completed_badge_x2', '达成×2')}</span>
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-amber-700" />
                              <span>{t('editor.pfs.goal_completed_badge')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 特惠卡 (Boons) 表格 */}
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                <Award size={16} className="text-amber-700" />
                <span>{t('editor.pfs.boons_title')}</span>
              </h4>
              <DynamicTable
                path="pfs.boons"
                data={pfs.boons || { uses: [], maxUses: [], name: [], desc: [], sheetNo: [] }}
                originalData={lastSavedData.pfs?.boons}
                onChange={v => update('pfs.boons', v)}
                rowDraggable={true}
                rowActionMode={tableActionMode}
                onRowActionModeToggle={toggleTableActionMode}
                onRowDragStart={(idx, e) => handleTableItemDragStart('pfs.boons', idx, e)}
                onRowDragOver={(idx, e) => handleTableItemDragOver('pfs.boons', idx, e)}
                onRowDrop={(idx, e) => handleTableItemDrop('pfs.boons', idx, e)}
              />
            </div>

            {/* 跑团编年史记录单 (Chronicles) 表格 */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                  <Scroll size={16} className="text-amber-700" />
                  <span>{t('editor.pfs.chronicles_title')}</span>
                </h4>
                <div className="flex items-center gap-2">
                  {/* 表格只读锁定 / 解锁编辑切换按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isChroniclesUnlocked) {
                        const confirmUnlock = window.confirm(
                          t('editor.pfs.unlock_warning', '从官网同步的跑团记录单建议保持只读锁定。手动修改场次或添加新行可能会导致后续官网同步时发生冲突。是否确认解锁编辑？')
                        );
                        if (confirmUnlock) setIsChroniclesUnlocked(true);
                      } else {
                        setIsChroniclesUnlocked(false);
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer",
                      isChroniclesUnlocked
                        ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    )}
                    title={isChroniclesUnlocked ? "点击锁定表格以保护数据免受误改" : "点击解锁以手动编辑字段或添加新行"}
                  >
                    {isChroniclesUnlocked ? <Unlock size={13} className="text-amber-700" /> : <Lock size={13} className="text-stone-500" />}
                    <span>{isChroniclesUnlocked ? t('editor.pfs.lock_chronicles', '锁定保护') : t('editor.pfs.unlock_chronicles', '解锁编辑')}</span>
                  </button>
                  {/* 一键在油猴中安装/更新脚本入口 */}
                  <a
                    href="/scripts/pf1-cross-site-sync-helper.user.js"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-amber-900 bg-white hover:bg-amber-50 border border-stone-300 rounded shadow-xs transition-colors cursor-pointer"
                    title="点击一键在浏览器油猴插件中安装或更新同步助手脚本"
                  >
                    <ExternalLink size={13} className="text-amber-700" />
                    <span>{t('editor.pfs.install_userscript')}</span>
                  </a>
                  {/* 从官网同步记录单按钮 */}
                  <button
                    type="button"
                    onClick={handleStartSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded shadow-xs transition-colors cursor-pointer"
                    title="通过油猴脚本直接从 Paizo 官网抓取并导入本角色跑团记录"
                  >
                    <DownloadCloud size={14} className={isSyncing ? "animate-bounce" : ""} />
                    <span>{isSyncing ? t('editor.pfs.syncing_from_paizo') : t('editor.pfs.sync_from_paizo')}</span>
                  </button>
                </div>
              </div>

              <DynamicTable
                path="pfs.chronicles"
                data={pfs.chronicles || { date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: [] }}
                originalData={lastSavedData.pfs?.chronicles}
                onChange={v => update('pfs.chronicles', v)}
                readonlyColumns={isChroniclesUnlocked ? [] : ['date', 'scenario', 'gm', 'event', 'faction', 'prestige', 'notes']}
                fixedRows={!isChroniclesUnlocked}
                rowDraggable={isChroniclesUnlocked}
                rowActionMode={tableActionMode}
                onRowActionModeToggle={toggleTableActionMode}
                onRowDragStart={(idx, e) => handleTableItemDragStart('pfs.chronicles', idx, e)}
                onRowDragOver={(idx, e) => handleTableItemDragOver('pfs.chronicles', idx, e)}
                onRowDrop={(idx, e) => handleTableItemDrop('pfs.chronicles', idx, e)}
              />
            </div>
          </>
        )}
      </div>

      {/* 冲突合并确认模态框 */}
      {conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <span>{t('editor.pfs.conflict_modal_title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setConflictData(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t('editor.pfs.conflict_summary', {
                incoming: conflictData.incoming.length,
                local: (conflictData.local.scenario || []).length
              })}
            </p>

            <div className="flex flex-col gap-3 my-2">
              {/* 策略 1：智能增量合并 */}
              <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                mergeStrategy === 'incremental' ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' : 'border-stone-200 hover:bg-stone-50'
              }`}>
                <input
                  type="radio"
                  name="mergeStrategy"
                  checked={mergeStrategy === 'incremental'}
                  onChange={() => setMergeStrategy('incremental')}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-stone-900">{t('editor.pfs.merge_strategy_incremental')}</span>
                  <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_incremental_desc')}</span>
                </div>
              </label>

              {/* 策略 2：全量覆盖 */}
              <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                mergeStrategy === 'overwrite' ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500' : 'border-stone-200 hover:bg-stone-50'
              }`}>
                <input
                  type="radio"
                  name="mergeStrategy"
                  checked={mergeStrategy === 'overwrite'}
                  onChange={() => setMergeStrategy('overwrite')}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-red-800">{t('editor.pfs.merge_strategy_overwrite')}</span>
                  <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_overwrite_desc')}</span>
                </div>
              </label>

              {/* 策略 3：纯末尾追加 */}
              <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                mergeStrategy === 'append' ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' : 'border-stone-200 hover:bg-stone-50'
              }`}>
                <input
                  type="radio"
                  name="mergeStrategy"
                  checked={mergeStrategy === 'append'}
                  onChange={() => setMergeStrategy('append')}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-stone-900">{t('editor.pfs.merge_strategy_append')}</span>
                  <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_append_desc')}</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setConflictData(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
              >
                {t('editor.pfs.btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleApplyMerge}
                className="px-4 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors shadow-xs cursor-pointer"
              >
                {t('editor.pfs.btn_confirm_merge')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未安装油猴脚本引导模态框 */}
            {/* 需要登录 Paizo 官网引导模态框 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
                <LogIn size={18} className="text-amber-600" />
                <span>{t('editor.pfs.login_modal_title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t('editor.pfs.login_modal_desc')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded border border-stone-300"
              >
                {t('common.cancel')}
              </button>
              <a
                href="https://paizo.com/organizedPlay/myAccount"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded shadow-xs"
              >
                <span>{t('editor.pfs.go_to_login')}</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  handleStartSync();
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded shadow-xs"
              >
                {t('editor.pfs.retry_after_login')}
              </button>
            </div>
          </div>
        </div>
      )}

{showHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <span>{t('editor.pfs.tampermonkey_missing_title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t('editor.pfs.tampermonkey_missing_desc')}
            </p>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700 leading-relaxed flex flex-col gap-2">
              <p className="font-semibold text-stone-800">安装步骤：</p>
              <ol className="list-decimal pl-4 space-y-1 text-stone-600">
                <li>安装 Tampermonkey（油猴）或 Violentmonkey 浏览器扩展；</li>
                <li>新建用户脚本，粘贴项目根目录下 <code className="bg-stone-200 px-1 py-0.5 rounded text-amber-900 font-mono">scripts/pf1-cross-site-sync-helper.user.js</code> 代码；</li>
                <li>保存脚本并在当前浏览器登录 Paizo 官网，重新点击同步即可。</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
              >
                {t('editor.pfs.btn_cancel')}
              </button>
              <a
                href="/scripts/pf1-cross-site-sync-helper.user.js"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowHelperModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <DownloadCloud size={14} />
                <span>{t('editor.pfs.one_click_install')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};

export default PFSSection;

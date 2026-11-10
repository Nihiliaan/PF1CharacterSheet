import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Sparkles } from 'lucide-react';
import Section from '../../common/Section';
import { useCharacter } from '../../../contexts/CharacterContext';
import { useUI } from '../../../contexts/UIContext';
import {
  PFS_FACTIONS,
  calculateCompletedGoals,
  getDefaultGoalsForFaction,
  getFactionKeyById,
  getFactionIdByKey,
  getFactionIdByName,
  getLocalizedFactionText
} from '../../../database/pfsFactions';
import { PfsChroniclesSoA } from '../../../schema/types';
import { hasPfsContent } from '../../../utils/pfsBbcodeHelper';
import { PfsConflictData, PfsMergeStrategy } from './PFSSection/shared';
import PfsEnablePanel from './PFSSection/PfsEnablePanel';
import PfsBasicFields from './PFSSection/PfsBasicFields';
import PfsTierBoons from './PFSSection/PfsTierBoons';
import PfsGoalsList from './PFSSection/PfsGoalsList';
import PfsBoonsTable from './PFSSection/PfsBoonsTable';
import PfsChroniclesTable from './PFSSection/PfsChroniclesTable';
import PfsConflictMergeModal from './PFSSection/PfsConflictMergeModal';
import PfsLoginModal from './PFSSection/PfsLoginModal';
import PfsHelperModal from './PFSSection/PfsHelperModal';

/**
 * PFSSection（组织者/ Pathfinder Society 角色卡片区）容器组件：
 * 负责状态编排（同步、冲突合并、记录单锁定等）与整体布局，
 * 各 UI 块拆分为 PFSSection/ 子目录下的子组件（PfsEnablePanel、PfsBasicFields、
 * PfsTierBoons、PfsGoalsList、PfsBoonsTable、PfsChroniclesTable 与三个模态框）。
 */
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
  const [conflictData, setConflictData] = useState<PfsConflictData | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<PfsMergeStrategy>('incremental');
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

  // 2. 动态计算 Fame (所有记录单 prestige 累加之和)
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

  // 记录单表格只读锁定 / 解锁编辑切换（含解锁二次确认）
  const handleToggleChroniclesUnlock = () => {
    if (!isChroniclesUnlocked) {
      const confirmUnlock = window.confirm(
        t('editor.pfs.unlock_warning', '从官网同步的跑团记录单建议保持只读锁定。手动修改场次或添加新行可能会导致后续官网同步时发生冲突。是否确认解锁编辑？')
      );
      if (confirmUnlock) setIsChroniclesUnlocked(true);
    } else {
      setIsChroniclesUnlocked(false);
    }
  };

  return (
    <Section id="pfs" title={t('editor.sections.pfs')}>
      <div className="flex flex-col gap-8">
        {!isPfsActive ? (
          <PfsEnablePanel onEnable={handleEnablePFS} />
        ) : (
          <>
            {/* PFS 基础概览面板 */}
            <PfsBasicFields
              pfs={pfs}
              lastSavedData={lastSavedData}
              effectiveFactionId={effectiveFactionId}
              hasChronicles={hasChronicles}
              computedFame={computedFame}
              isPfsActive={isPfsActive}
              update={update}
              onFactionChange={handleFactionChange}
              onDisablePFS={handleDisablePFS}
            />

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
              <PfsTierBoons
                factionDef={factionDef}
                completedGoalsCount={completedGoalsCount}
                factionBoonChecks={pfs.factionBoonChecks}
                onBoonChecksChange={(nextBoonChecks) => update('pfs.factionBoonChecks', nextBoonChecks)}
              />

              {/* 势力任务目标列表 (紧凑段落清单) */}
              <PfsGoalsList
                goals={goals}
                factionDef={factionDef}
                onResetGoals={handleResetGoals}
                onGoalsChange={(nextGoals) => update('pfs.goals', nextGoals)}
              />
            </div>

            {/* 特惠卡 (Boons) 表格 */}
            <PfsBoonsTable
              data={pfs.boons || { uses: [], maxUses: [], name: [], desc: [], sheetNo: [] }}
              originalData={lastSavedData.pfs?.boons}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('pfs.boons', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('pfs.boons', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('pfs.boons', idx, e)}
              onChange={v => update('pfs.boons', v)}
            />

            {/* 跑团编年史记录单 (Chronicles) 表格 */}
            <PfsChroniclesTable
              data={pfs.chronicles || { date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: [] }}
              originalData={lastSavedData.pfs?.chronicles}
              isChroniclesUnlocked={isChroniclesUnlocked}
              onToggleUnlock={handleToggleChroniclesUnlock}
              isSyncing={isSyncing}
              onSync={handleStartSync}
              rowActionMode={tableActionMode}
              onRowActionModeToggle={toggleTableActionMode}
              onRowDragStart={(idx, e) => handleTableItemDragStart('pfs.chronicles', idx, e)}
              onRowDragOver={(idx, e) => handleTableItemDragOver('pfs.chronicles', idx, e)}
              onRowDrop={(idx, e) => handleTableItemDrop('pfs.chronicles', idx, e)}
              onChange={v => update('pfs.chronicles', v)}
            />
          </>
        )}
      </div>

      {/* 冲突合并确认模态框 */}
      {conflictData && (
        <PfsConflictMergeModal
          conflictData={conflictData}
          mergeStrategy={mergeStrategy}
          onStrategyChange={setMergeStrategy}
          onClose={() => setConflictData(null)}
          onApply={handleApplyMerge}
        />
      )}

      {/* 未安装油猴脚本引导模态框 */}
      {/* 需要登录 Paizo 官网引导模态框 */}
      {showLoginModal && (
        <PfsLoginModal
          onClose={() => setShowLoginModal(false)}
          onRetry={() => {
            setShowLoginModal(false);
            handleStartSync();
          }}
        />
      )}

      {showHelperModal && (
        <PfsHelperModal onClose={() => setShowHelperModal(false)} />
      )}
    </Section>
  );
};

export default PFSSection;

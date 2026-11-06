import i18n from '../i18n/config';
import {
  PFS_FACTIONS,
  calculateCompletedGoals,
  getDefaultGoalsForFaction,
  getFactionById,
  getFactionKeyById,
  getLocalizedFactionText
} from '../database/pfsFactions';
import { PfsGoalItem } from '../schema/types';
import { calculateCurrencyTotal } from './calculations';

/**
 * 判断 PFS 模块是否有实质内容
 */
export function hasPfsContent(rawPfs: any): boolean {
  if (!rawPfs || typeof rawPfs !== 'object') return false;

  // 1. 填有玩家编号或角色编号
  if (rawPfs.playerNumber && String(rawPfs.playerNumber).trim()) return true;
  if (rawPfs.characterNumber && String(rawPfs.characterNumber).trim()) return true;

  // 2. 有经验、累积声誉或可用威望
  if (Number(rawPfs.xp) > 0 || Number(rawPfs.fame) > 0 || Number(rawPfs.prestige) > 0) return true;

  // 3. 有有效跑团记录单
  const scenarios = rawPfs.chronicles?.scenario || [];
  if (scenarios.some((s: any) => s && String(s).trim())) return true;

  // 4. 有特殊福利 (Boons 表格填了名称或效果)
  const boonNames = rawPfs.boons?.name || [];
  const boonDescs = rawPfs.boons?.desc || [];
  if (boonNames.some((n: any) => n && String(n).trim()) || boonDescs.some((d: any) => d && String(d).trim())) return true;

  // 5. 势力目标有完成打勾
  if (Array.isArray(rawPfs.goals) && rawPfs.goals.some((g: any) => (g.checkedCount || 0) > 0)) return true;

  // 6. 势力限定福利有使用勾选
  if (rawPfs.factionBoonChecks && Object.values(rawPfs.factionBoonChecks).some((v: any) => Number(v) > 0)) return true;

  return false;
}

/**
 * 构建并注入 PFS BBCode 视图数据
 */
export function injectPfsViewObject(data: any, view: any, t: any): void {
  const rawPfs = data?.pfs;
  const isPfsActive = hasPfsContent(rawPfs);

  // 若无 PFS 实质内容，直接置空 pfs 视图，支持模板通过 {{#if pfs}} 原生语义判断
  if (!isPfsActive) {
    view.pfs = null;
    if (view.basic) {
      view.basic.pfs = null;
    }
    return;
  }
  const lang = i18n.language || 'zh';
  const isZh = lang.startsWith('zh');

  const chronicles = rawPfs?.chronicles || {
    date: [], scenario: [], gm: [], event: [], faction: [], prestige: [], notes: [], link: []
  };
  const rawScenarios = chronicles.scenario || [];
  const rawPrestiges = chronicles.prestige || [];
  const rawFactions = chronicles.faction || [];
  const rawDates = chronicles.date || [];
  const rawGms = chronicles.gm || [];
  const rawEvents = chronicles.event || [];
  const rawNotes = chronicles.notes || [];
  const rawLinks = chronicles.link || [];

  // 计算有效场次数 (有效记录单)
  const validChroniclesIndices: number[] = [];
  for (let i = 0; i < rawScenarios.length; i++) {
    if (rawScenarios[i] && String(rawScenarios[i]).trim()) {
      validChroniclesIndices.push(i);
    }
  }
  const validCount = validChroniclesIndices.length;

  // XP: 允许半整数，直接采用用户手动填写的值 (支持特许模组与半速升级)
  const xp = typeof rawPfs?.xp === 'number'
    ? rawPfs.xp
    : (parseFloat(String(rawPfs?.xp ?? 0)) || 0);

  // Fame: 所有有效记录单 prestige 累计 (支持半整数)，若无记录单则取 rawPfs.fame
  let computedFame = 0;
  for (const idx of validChroniclesIndices) {
    computedFame += parseFloat(String(rawPrestiges[idx] || 0)) || 0;
  }
  computedFame = Math.round(computedFame * 2) / 2;
  const fame = validCount > 0 ? computedFame : (parseFloat(String(rawPfs?.fame || 0)) || 0);

  // Prestige: 可用威望点 (支持半整数)
  const prestige = typeof rawPfs?.prestige === 'number'
    ? rawPfs.prestige
    : (parseFloat(String(rawPfs?.prestige ?? 0)) || 0);

  // 计算钱币区所有钱币的价值合计 (纯钱币总值，不含装备资产)
  const gold = calculateCurrencyTotal(data).toString();

  // 势力推导：若有记录单，取最后一条有效记录单的势力；若无，取初始 rawPfs.faction
  let effectiveFactionId = typeof rawPfs?.faction === 'number'
    ? rawPfs.faction
    : 1;

  if (validCount > 0) {
    for (let i = validChroniclesIndices.length - 1; i >= 0; i--) {
      const idx = validChroniclesIndices[i];
      const f = rawFactions[idx];
      const fNum = typeof f === 'number' ? f : parseInt(String(f), 10);
      if (fNum > 0) {
        effectiveFactionId = fNum;
        break;
      }
    }
  }

  const currentFactionKey = getFactionKeyById(effectiveFactionId);
  const factionDef = PFS_FACTIONS[currentFactionKey] || PFS_FACTIONS['grand_lodge'];
  const factionName = getLocalizedFactionText(factionDef.name, lang);
  const factionLeader = getLocalizedFactionText(factionDef.leader, lang);

  const rawGoals: PfsGoalItem[] = (rawPfs?.goals && rawPfs.goals.length > 0)
    ? rawPfs.goals
    : getDefaultGoalsForFaction(currentFactionKey, lang);

  const completedGoalsCount = calculateCompletedGoals(rawGoals);

  // 格式化目标清单
  const formattedGoals = rawGoals.map((g) => {
    const stdGoal = factionDef.goals.find(def => def.id === g.id);
    const text = stdGoal ? getLocalizedFactionText(stdGoal.text, lang) : '';
    const maxChecks = g.maxChecks || stdGoal?.maxChecks || 1;
    const checked = g.checkedCount || 0;
    const isGM = g.id?.endsWith('_gm');

    let boxes = '';
    if (isZh) {
      if (isGM) {
        // GM 目标：3个 + 2个，以 / 分隔
        const part1Checked = Math.min(checked, 3);
        const part1 = '☑'.repeat(part1Checked) + '☐'.repeat(3 - part1Checked);
        const part2Checked = Math.max(0, Math.min(checked - 3, 2));
        const part2 = '☑'.repeat(part2Checked) + '☐'.repeat(2 - part2Checked);
        boxes = `${part1}/${part2}`;
      } else {
        const checkedCount = Math.min(checked, maxChecks);
        boxes = '☑'.repeat(checkedCount) + '☐'.repeat(Math.max(0, maxChecks - checkedCount));
      }
    } else {
      if (isGM) {
        const part1Checked = Math.min(checked, 3);
        const part1 = '☒'.repeat(part1Checked) + '[ ]'.repeat(3 - part1Checked);
        const part2Checked = Math.max(0, Math.min(checked - 3, 2));
        const part2 = '☒'.repeat(part2Checked) + '[ ]'.repeat(2 - part2Checked);
        boxes = `${part1}/${part2}`;
      } else {
        const checkedCount = Math.min(checked, maxChecks);
        boxes = '☒'.repeat(checkedCount) + '[ ]'.repeat(Math.max(0, maxChecks - checkedCount));
      }
    }

    return {
      id: g.id,
      boxes,
      text,
      checkedCount: checked,
      maxChecks,
      isCompleted: isGM ? (checked >= 3) : (checked >= maxChecks)
    };
  });

  // 格式化三阶福利
  const formattedFactionBoons = factionDef.boons.map((b) => {
    const isUnlocked = completedGoalsCount >= b.requiredGoals;
    return {
      tier: b.tier,
      name: getLocalizedFactionText(b.name, lang),
      desc: getLocalizedFactionText(b.desc, lang),
      requiredGoals: b.requiredGoals,
      isUnlocked,
      statusText: isUnlocked
        ? (isZh ? '已解锁' : 'Unlocked')
        : (isZh ? `未解锁 (需完成 ${b.requiredGoals} 项)` : `Locked (requires ${b.requiredGoals})`)
    };
  });

  // 特殊福利 (Boons)
  const rawBoons = rawPfs?.boons || { uses: [], maxUses: [], name: [], desc: [], sheetNo: [] };
  const boonNames = rawBoons.name || [];
  const boonDescs = rawBoons.desc || [];
  const boonUses = rawBoons.uses || [];
  const boonMaxUses = rawBoons.maxUses || [];
  const boonSheetNos = rawBoons.sheetNo || [];

  const formattedBoons: any[] = [];
  const boonRowCount = Math.max(
    boonNames.length,
    boonDescs.length,
    boonUses.length,
    boonMaxUses.length,
    boonSheetNos.length
  );

  for (let i = 0; i < boonRowCount; i++) {
    const name = (boonNames[i] || '').trim();
    const desc = (boonDescs[i] || '').trim();
    const sheetNo = boonSheetNos[i] || '';
    const uses = parseInt(boonUses[i], 10) || 0;
    const maxUses = parseInt(boonMaxUses[i], 10) || 0;

    // 过滤全空或无实质内容的行 (name 与 desc 至少填一个)
    if (!name && !desc) continue;

    let boxes = '—';
    if (maxUses > 0) {
      const u = Math.min(uses, maxUses);
      if (isZh) {
        boxes = '☑'.repeat(u) + '☐'.repeat(maxUses - u);
      } else {
        boxes = '☒'.repeat(u) + '☐'.repeat(maxUses - u);
      }
    }

    formattedBoons.push({
      uses,
      maxUses,
      boxes,
      name,
      desc,
      sheetNo: sheetNo ? String(sheetNo) : ''
    });
  }

  // 跑团记录单 (Chronicles)
  const formattedChronicles: any[] = [];
  const chronicleLinks: { title: string; url: string }[] = [];

  validChroniclesIndices.forEach((idx, order) => {
    const chronicleIndex = order + 1;
    const date = rawDates[idx] || '';
    const scenario = rawScenarios[idx] || '';
    const gm = rawGms[idx] || '';
    const event = rawEvents[idx] || '';
    const fId = rawFactions[idx];
    const factionMeta = getFactionById(typeof fId === 'number' ? fId : parseInt(String(fId), 10));
    const factionText = factionMeta ? getLocalizedFactionText(factionMeta.name, lang) : '';
    const p = rawPrestiges[idx] ?? '';
    const notes = rawNotes[idx] || '';
    const link = rawLinks[idx] || '';

    if (link) {
      chronicleLinks.push({
        title: isZh ? `${chronicleIndex}号单` : `Sheet #${chronicleIndex}`,
        url: link
      });
    }

    const title = isZh ? (chronicleIndex + "号单") : ("Sheet #" + chronicleIndex);

    formattedChronicles.push({
      index: chronicleIndex,
      date,
      scenario,
      gm,
      event,
      faction: factionText,
      prestige: p,
      notes,
      link,
      title
    });
  });

  view.pfs = {
    playerNumber: rawPfs?.playerNumber || '',
    characterNumber: rawPfs?.characterNumber || '',
    pfsNumber: (rawPfs?.playerNumber && rawPfs?.characterNumber)
      ? `${rawPfs.playerNumber}-${rawPfs.characterNumber}`
      : (rawPfs?.playerNumber || ''),
    xp,
    fame,
    prestige,
    gold,
    factionName,
    factionLeader,
    completedGoalsCount,
    goals: formattedGoals,
    factionBoons: formattedFactionBoons,
    boons: formattedBoons,
    chronicles: formattedChronicles,
    chronicleLinks,
    hasChronicleLinks: chronicleLinks.length > 0
  };

  // 将 pfs 与 equipment 也直接挂在 view.basic 上，方便跨层级访问
  if (view.basic) {
    view.basic.pfs = view.pfs;
    view.basic.equipment = view.equipment;
  }
}

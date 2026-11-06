import { toTraditional } from '../i18n/config';
import { PfsGoalItem } from '../schema/types';
import pfsFactionsZh from '../i18n/locales/pfs-factions.zh.json';
import pfsFactionsEn from '../i18n/locales/pfs-factions.en.json';

export interface LocalizedString {
  zh: string;
  en: string;
}

export interface FactionBoonDef {
  id?: string;
  tier: 1 | 2 | 3;
  requiredGoals: 2 | 4 | 7;
  name: LocalizedString;
  desc: LocalizedString;
  maxChecks?: number;
}

export interface FactionGoalDef {
  id: string;
  text: LocalizedString;
  maxChecks: number;
  isGMGoal?: boolean;
}

export interface FactionDef {
  id: string;
  name: LocalizedString;
  leader: LocalizedString;
  description: LocalizedString;
  boons: FactionBoonDef[];
  goals: FactionGoalDef[];
}

export type BoonKeyItem = string | { id: string; maxChecks: number };

interface FactionSkeleton {
  id: string;
  boonKeys: BoonKeyItem[];
  goals: { id: string; maxChecks: number; isGMGoal?: boolean }[];
}

const FACTION_SKELETONS: Record<string, FactionSkeleton> = {
  grand_lodge: {
    id: 'grand_lodge',
    boonKeys: ['prepared_agent', 'guiding_compass', 'published_trailblazer'],
    goals: [
      { id: 'gl_1', maxChecks: 8 },
      { id: 'gl_2', maxChecks: 2 },
      { id: 'gl_3', maxChecks: 1 },
      { id: 'gl_4', maxChecks: 1 },
      { id: 'gl_5', maxChecks: 2 },
      { id: 'gl_6', maxChecks: 2 },
      { id: 'gl_7', maxChecks: 1 },
      { id: 'gl_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  dark_archive: {
    id: 'dark_archive',
    boonKeys: ['enduring_scholar', 'magical_tinkerer', 'pactmaker'],
    goals: [
      { id: 'da_1', maxChecks: 1 },
      { id: 'da_2', maxChecks: 2 },
      { id: 'da_3', maxChecks: 1 },
      { id: 'da_4', maxChecks: 2 },
      { id: 'da_5', maxChecks: 1 },
      { id: 'da_6', maxChecks: 2 },
      { id: 'da_7', maxChecks: 2 },
      { id: 'da_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  the_exchange: {
    id: 'the_exchange',
    boonKeys: [{ id: 'resourceful', maxChecks: 3 }, 'showmanship', 'unparalleled_supplier'],
    goals: [
      { id: 'ex_1', maxChecks: 1 },
      { id: 'ex_2', maxChecks: 1 },
      { id: 'ex_3', maxChecks: 2 },
      { id: 'ex_4', maxChecks: 2 },
      { id: 'ex_5', maxChecks: 2 },
      { id: 'ex_6', maxChecks: 1 },
      { id: 'ex_7', maxChecks: 2 },
      { id: 'ex_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  libertys_edge: {
    id: 'libertys_edge',
    boonKeys: ['orator', 'bond_breaker', 'emancipator'],
    goals: [
      { id: 'le_1', maxChecks: 3 },
      { id: 'le_2', maxChecks: 1 },
      { id: 'le_3', maxChecks: 2 },
      { id: 'le_4', maxChecks: 1 },
      { id: 'le_5', maxChecks: 1 },
      { id: 'le_6', maxChecks: 2 },
      { id: 'le_7', maxChecks: 2 },
      { id: 'le_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  silver_crusade: {
    id: 'silver_crusade',
    boonKeys: ['purifier', 'cleansing_crusader', 'celestial_blessing'],
    goals: [
      { id: 'sc_1', maxChecks: 2 },
      { id: 'sc_2', maxChecks: 2 },
      { id: 'sc_3', maxChecks: 1 },
      { id: 'sc_4', maxChecks: 2 },
      { id: 'sc_5', maxChecks: 1 },
      { id: 'sc_6', maxChecks: 1 },
      { id: 'sc_7', maxChecks: 1 },
      { id: 'sc_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  sovereign_court: {
    id: 'sovereign_court',
    boonKeys: ['practiced_diplomat', 'well_connected', 'skilled_negotiator'],
    goals: [
      { id: 'sov_1', maxChecks: 3 },
      { id: 'sov_2', maxChecks: 2 },
      { id: 'sov_3', maxChecks: 1 },
      { id: 'sov_4', maxChecks: 1 },
      { id: 'sov_5', maxChecks: 2 },
      { id: 'sov_6', maxChecks: 1 },
      { id: 'sov_7', maxChecks: 2 },
      { id: 'sov_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  concordance: {
    id: 'concordance',
    boonKeys: ['inured_to_the_elements', 'elemental_ray', 'elemental_aegis'],
    goals: [
      { id: 'con_1', maxChecks: 2 },
      { id: 'con_2', maxChecks: 2 },
      { id: 'con_3', maxChecks: 2 },
      { id: 'con_4', maxChecks: 2 },
      { id: 'con_5', maxChecks: 1 },
      { id: 'con_6', maxChecks: 1 },
      { id: 'con_7', maxChecks: 1 },
      { id: 'con_gm', maxChecks: 5, isGMGoal: true }
    ]
  },
  scarab_sages: {
    id: 'scarab_sages',
    boonKeys: ['sages_lore', 'ancestral_relic', 'scarabs_aegis'],
    goals: [
      { id: 'ss_1', maxChecks: 2 },
      { id: 'ss_2', maxChecks: 2 },
      { id: 'ss_3', maxChecks: 2 },
      { id: 'ss_4', maxChecks: 2 },
      { id: 'ss_5', maxChecks: 1 },
      { id: 'ss_6', maxChecks: 2 },
      { id: 'ss_7', maxChecks: 2 },
      { id: 'ss_gm', maxChecks: 5, isGMGoal: true }
    ]
  }
};

const BOON_TIERS: { tier: 1 | 2 | 3; requiredGoals: 2 | 4 | 7 }[] = [
  { tier: 1, requiredGoals: 2 },
  { tier: 2, requiredGoals: 4 },
  { tier: 3, requiredGoals: 7 }
];

function buildFactions(): Record<string, FactionDef> {
  const result: Record<string, FactionDef> = {};
  const zhMap = pfsFactionsZh as Record<string, any>;
  const enMap = pfsFactionsEn as Record<string, any>;

  for (const [key, skel] of Object.entries(FACTION_SKELETONS)) {
    const zhFaction = zhMap[key] || {};
    const enFaction = enMap[key] || {};

    const boons: FactionBoonDef[] = skel.boonKeys.map((item, idx) => {
      const boonKey = typeof item === 'string' ? item : item.id;
      const maxChecks = typeof item === 'object' ? item.maxChecks : undefined;
      const tierMeta = BOON_TIERS[idx] || BOON_TIERS[0];
      const zhBoon = zhFaction.boons?.[boonKey] || {};
      const enBoon = enFaction.boons?.[boonKey] || {};
      return {
        id: boonKey,
        tier: tierMeta.tier,
        requiredGoals: tierMeta.requiredGoals,
        maxChecks,
        name: {
          zh: zhBoon.name || '',
          en: enBoon.name || ''
        },
        desc: {
          zh: zhBoon.desc || '',
          en: enBoon.desc || ''
        }
      };
    });

    const goals: FactionGoalDef[] = skel.goals.map((g) => {
      return {
        id: g.id,
        maxChecks: g.maxChecks,
        isGMGoal: g.isGMGoal,
        text: {
          zh: zhFaction.goals?.[g.id] || '',
          en: enFaction.goals?.[g.id] || ''
        }
      };
    });

    result[key] = {
      id: skel.id,
      name: {
        zh: zhFaction.name || '',
        en: enFaction.name || ''
      },
      leader: {
        zh: zhFaction.leader || '',
        en: enFaction.leader || ''
      },
      description: {
        zh: zhFaction.description || '',
        en: enFaction.description || ''
      },
      boons,
      goals
    };
  }

  return result;
}

export const PFS_FACTIONS: Record<string, FactionDef> = buildFactions();

/**
 * 语言自适应辅助函数：根据当前 i18n 语言输出简、繁、英
 */
export function getLocalizedFactionText(textObj: LocalizedString, lang: string): string {
  if (!textObj) return '';
  if (lang?.startsWith('en')) {
    return textObj.en || textObj.zh;
  }
  if (lang === 'zh-TW' || lang === 'zh-HK') {
    return toTraditional(textObj.zh);
  }
  return textObj.zh;
}

export interface PfsFactionMeta {
  id: number;
  key: string;
  name: LocalizedString;
  retired?: boolean;
}

export const PFS_FACTION_ENUM: PfsFactionMeta[] = [
  { id: 0, key: 'none', name: { zh: '—', en: '—' } },
  { id: 1, key: 'grand_lodge', name: { zh: '探索者本部', en: 'Grand Lodge' } },
  { id: 2, key: 'libertys_edge', name: { zh: '自由尖兵', en: "Liberty's Edge" } },
  { id: 3, key: 'the_exchange', name: { zh: '商盟', en: 'The Exchange' } },
  { id: 4, key: 'silver_crusade', name: { zh: '银色十字军', en: 'Silver Crusade' } },
  { id: 5, key: 'sovereign_court', name: { zh: '君权王庭', en: 'Sovereign Court' } },
  { id: 6, key: 'dark_archive', name: { zh: '秘文会', en: 'Dark Archive' } },
  { id: 7, key: 'concordance', name: { zh: '均衡教派', en: 'The Concordance' } },
  { id: 8, key: 'scarab_sages', name: { zh: '圣甲虫贤哲', en: 'Scarab Sages' } },
  // 历史退役势力 (Retired Factions)
  { id: 9, key: 'andoran', name: { zh: '安多安 [退役]', en: 'Andoran (Retired)' }, retired: true },
  { id: 10, key: 'cheliax', name: { zh: '切利亚斯 [退役]', en: 'Cheliax (Retired)' }, retired: true },
  { id: 11, key: 'osirion', name: { zh: '奥斯里昂 [退役]', en: 'Osirion (Retired)' }, retired: true },
  { id: 12, key: 'qadira', name: { zh: '卡蒂亚 [退役]', en: 'Qadira (Retired)' }, retired: true },
  { id: 13, key: 'taldor', name: { zh: '塔尔多 [退役]', en: 'Taldor (Retired)' }, retired: true },
  { id: 14, key: 'sczarni', name: { zh: '斯克扎尼 [退役]', en: 'Sczarni (Retired)' }, retired: true },
  { id: 15, key: 'shadow_lodge', name: { zh: '影子会 [退役]', en: 'Shadow Lodge (Retired)' }, retired: true },
  { id: 16, key: 'lantern_lodge', name: { zh: '灯笼会 [退役]', en: 'Lantern Lodge (Retired)' }, retired: true }
];

export function getFactionById(id: number): PfsFactionMeta {
  return PFS_FACTION_ENUM.find(f => f.id === id) || PFS_FACTION_ENUM[0];
}

export function getFactionKeyById(id: number): string {
  const f = getFactionById(id);
  return f.key || 'grand_lodge';
}

export function getFactionIdByKey(key: string): number {
  if (!key) return 0;
  const f = PFS_FACTION_ENUM.find(item => item.key.toLowerCase() === key.toLowerCase());
  return f ? f.id : 0;
}

export function getFactionIdByName(name: string): number {
  if (!name) return 0;
  const clean = name.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const item of PFS_FACTION_ENUM) {
    if (item.id === 0) continue;
    const en = item.name.en.toLowerCase();
    const zh = item.name.zh.toLowerCase();
    const key = item.key.toLowerCase();
    const baseEn = en.replace(/\s*\(retired\)/i, '').trim();
    const baseZh = zh.replace(/\s*\[退役\]/i, '').trim();
    if (
      clean === en || clean === zh || clean === key ||
      clean === baseEn || clean === baseZh ||
      clean.includes(baseEn) || baseEn.includes(clean)
    ) {
      return item.id;
    }
  }
  return 0;
}

export function getFactionDisplayName(id: number, lang: string): string {
  const f = getFactionById(id);
  return getLocalizedFactionText(f.name, lang);
}

export function getFactionSelectOptions(lang: string = 'zh'): { value: number; label: string }[] {
  return PFS_FACTION_ENUM.map(f => ({
    value: f.id,
    label: getLocalizedFactionText(f.name, lang)
  }));
}

export function calculateCompletedGoals(goals: PfsGoalItem[]): number {
  if (!goals || !Array.isArray(goals)) return 0;
  let total = 0;
  for (const g of goals) {
    const checkedCount = typeof g.checkedCount === 'number'
      ? g.checkedCount
      : ((g as any).checks || []).filter(Boolean).length;

    if (g.id?.endsWith('_gm')) {
      if (checkedCount >= 5) {
        total += 2;
      } else if (checkedCount >= 3) {
        total += 1;
      }
    } else {
      if (checkedCount >= (g.maxChecks || 1)) {
        total += 1;
      }
    }
  }
  return total;
}

export function getDefaultGoalsForFaction(factionKeyOrId: string | number, lang: string = 'zh'): PfsGoalItem[] {
  let factionKey = typeof factionKeyOrId === 'number' ? getFactionKeyById(factionKeyOrId) : factionKeyOrId;
  if (!PFS_FACTIONS[factionKey]) {
    factionKey = 'grand_lodge';
  }
  const faction = PFS_FACTIONS[factionKey] || PFS_FACTIONS['grand_lodge'];
  return faction.goals.map((g) => ({
    id: g.id,
    checkedCount: 0,
    maxChecks: g.maxChecks
  }));
}


export enum SkillCategory {
  General = 0,
  Trained = 1,
  Knowledge = 2,
  Craft = 3,
  Perform = 4,
  Profession = 5
}

export interface SkillMasterDef {
  id: number;
  category: SkillCategory;
  defaultAbility: number; // 0:STR, 1:DEX, 2:CON, 3:INT, 4:WIS, 5:CHA
}

const skillDefs: SkillMasterDef[] = [];

const addBatch = (startId: number, abilities: number[], cat: SkillCategory) => {
  abilities.forEach((ability, i) => skillDefs.push({ id: startId + i, category: cat, defaultAbility: ability }));
};

// 初始化注册表
addBatch(0, [1, 3, 5, 0, 5, 5, 1, 1, 4, 5, 4, 1, 4, 1, 1, 4, 0], SkillCategory.General);
addBatch(1000, [1, 5, 3, 3, 5], SkillCategory.Trained);

export const CAT_CONFIG: Record<number, { startId: number; count: number; ability: number }> = {
  [SkillCategory.Knowledge]:  { startId: 2000, count: 10, ability: 3 },
  [SkillCategory.Craft]:      { startId: 3000, count: 21, ability: 3 },
  [SkillCategory.Perform]:    { startId: 4000, count: 9,  ability: 5 },
  [SkillCategory.Profession]: { startId: 5000, count: 30, ability: 4 },
};

Object.entries(CAT_CONFIG).forEach(([cat, cfg]) => {
  addBatch(cfg.startId, new Array(cfg.count).fill(cfg.ability), parseInt(cat));
});

export const SKILL_REGISTRY = skillDefs;
export const CATEGORY_IDS = [0, 1, 2, 3, 4, 5];

export const getSkillById = (id: number) => SKILL_REGISTRY.find(s => s.id === id);

export const getSkillsByCategory = (cat: number) => 
  SKILL_REGISTRY.filter(s => s.category === cat);

export const getCategorySkillIds = (cat: number): number[] => 
  SKILL_REGISTRY.filter(s => s.category === cat).map(s => s.id);

export const getCategoryDefaultAbility = (cat: number): number | null => 
  CAT_CONFIG[cat]?.ability ?? null;

/**
 * 获取某个分类添加新行时的初始数据
 */
export const getCategoryInitialValues = (cat: number) => {
  const skills = SKILL_REGISTRY.filter(s => s.category === cat);
  if (skills.length === 0) return { category: cat };
  return {
    category: cat,
    name: skills[0].id,
    ability: getCategoryDefaultAbility(cat) ?? skills[0].defaultAbility
  };
};

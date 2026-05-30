
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

// 批量生成辅助函数
const addBatch = (startId: number, abilities: number[], cat: SkillCategory) => {
  abilities.forEach((ability, i) => {
    // 治本之策：ID = 分类基数 + 0-based 索引
    skillDefs.push({ id: startId + i, category: cat, defaultAbility: ability });
  });
};

// 0: General (ID 0-16)
addBatch(0, [1, 3, 5, 0, 5, 5, 1, 1, 4, 5, 4, 1, 4, 1, 1, 4, 0], SkillCategory.General);

// 1: Trained (ID 1000-1004)
addBatch(1000, [1, 5, 3, 3, 5], SkillCategory.Trained);

// 2-5: Knowledge, Craft, Perform, Profession (固定属性类目)
const CAT_CONFIG: Record<number, { startId: number; count: number; ability: number }> = {
  [SkillCategory.Knowledge]:  { startId: 2000, count: 10, ability: 3 },
  [SkillCategory.Craft]:      { startId: 3000, count: 21, ability: 3 },
  [SkillCategory.Perform]:    { startId: 4000, count: 9,  ability: 5 },
  [SkillCategory.Profession]: { startId: 5000, count: 30, ability: 4 },
};

Object.entries(CAT_CONFIG).forEach(([cat, cfg]) => {
  const abilities = new Array(cfg.count).fill(cfg.ability);
  addBatch(cfg.startId, abilities, parseInt(cat));
});

export const SKILL_REGISTRY = skillDefs;

export const CATEGORY_IDS = [0, 1, 2, 3, 4, 5];

// 导出各分类的 ID 列表供 Handler 使用
export const KNOWLEDGE_IDS = SKILL_REGISTRY.filter(s => s.category === SkillCategory.Knowledge).map(s => s.id);
export const CRAFT_IDS = SKILL_REGISTRY.filter(s => s.category === SkillCategory.Craft).map(s => s.id);
export const PERFORM_IDS = SKILL_REGISTRY.filter(s => s.category === SkillCategory.Perform).map(s => s.id);
export const PROFESSION_IDS = SKILL_REGISTRY.filter(s => s.category === SkillCategory.Profession).map(s => s.id);

export const getSkillById = (id: number) => SKILL_REGISTRY.find(s => s.id === id);

export const getSkillsByCategory = (category: SkillCategory) => 
  SKILL_REGISTRY.filter(s => s.category === category);

import { get } from 'lodash-es';
import handlers from './dataTypes';

const {
  TextHandler, IntegerHandler, PosIntHandler, BonusHandler, LevelHandler,
  FloatHandler, BoolHandler, AttributeIndexHandler, QuantityHandler,
  CostHandler, WeightHandler, CritRangeHandler, CritMultiplierHandler,
  DistanceHandler, AbilityTypeHandler, SpellTypeHandler, CompositeHandler,
  SpellLevelHandler, DailyUsesHandler,
  // 业务表格 Handler
  AttributesTableHandler, AttackTableHandler, DefensesTableHandler,
  SavesTableHandler, SkillsTableHandler, SimpleListHandler,
  SpellTableHandler, MagicBlocksHandler, EquipmentItemsHandler,
  // 复合业务 Handler
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler
} = handlers;

/**
 * 角色数据导航原型树 (Character Prototype Tree)
 * 核心职责：将平面的 CharacterData 路径映射到复杂的业务逻辑 Handler
 * 必须与 defaultData.json 的物理结构 100% 对齐
 */
export const CharacterPrototype: any = {
  // 1. 基础信息 (对应 defaultData.json 中的 "basic")
  basic: {
    handler: BasicInfoHandler, // 复合展示
    name: TextHandler,
    classes: TextHandler,
    alignment: handlers.AlignmentHandler,
    size: handlers.SizeHandler,
    gender: handlers.GenderHandler,
    race: TextHandler,
    age: PosIntHandler,
    height: handlers.HeightHandler,
    weight: WeightHandler,
    speed: {
      handler: CompositeHandler,
      base: IntegerHandler,
      climb: IntegerHandler,
      swim: IntegerHandler,
      fly: IntegerHandler,
      maneuverability: handlers.ManeuverabilityHandler
    },
    senses: TextHandler,
    initiative: BonusHandler,
    perception: BonusHandler,
    languages: TextHandler,
    deity: TextHandler
  },

  story: TextHandler,

  // 2. 核心属性 (SoA 数组结构)
  attributes: {
    handler: AttributesTableHandler,
    final: IntegerHandler,
    modifier: BonusHandler,
    source: TextHandler,
    status: TextHandler
  },

  // 3. 战斗统计表 (对应 "combatTable")
  combatTable: {
    handler: CombatInfoHandler,
    bab: BonusHandler,
    cmb: BonusHandler,
    cmd: IntegerHandler,
    combatManeuverNotes: TextHandler
  },

  // 4. 攻击系统 (SoA 数组结构)
  attacks: {
    handler: CompositeHandler,
    meleeAttacks: {
      handler: AttackTableHandler,
      weapon: TextHandler,
      hit: BonusHandler,
      damage: TextHandler,
      critRange: CritRangeHandler,
      critMultiplier: CritMultiplierHandler,
      touch: DistanceHandler,
      damageType: TextHandler,
      special: TextHandler
    },
    rangedAttacks: {
      handler: AttackTableHandler,
      weapon: TextHandler,
      hit: BonusHandler,
      damage: TextHandler,
      critRange: CritRangeHandler,
      critMultiplier: CritMultiplierHandler,
      range: DistanceHandler,
      damageType: TextHandler,
      special: TextHandler
    },
    specialAttacks: TextHandler
  },

  // 5. 防御系统
  defenses: {
    handler: CompositeHandler,
    hp: PosIntHandler,
    hd: TextHandler,
    acTable: {
      handler: DefensesTableHandler,
      ac: IntegerHandler,
      source: TextHandler,
      flatFooted: IntegerHandler,
      touch: IntegerHandler,
      acNotes: TextHandler
    },
    savesTable: {
      handler: SavesTableHandler,
      fort: BonusHandler,
      ref: BonusHandler,
      will: BonusHandler,
      savesNotes: TextHandler
    },
    specialDefenses: TextHandler
  },

  // 6. 特性与专长 (SoA)
  racialTraits: {
    handler: SimpleListHandler,
    name: TextHandler,
    desc: TextHandler
  },
  backgroundTraits: {
    handler: SimpleListHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },
  favoredClass: TextHandler,
  favoredClassBonus: TextHandler,
  classFeatures: {
    handler: SimpleListHandler,
    level: LevelHandler,
    name: TextHandler,
    type: AbilityTypeHandler,
    desc: TextHandler
  },
  feats: {
    handler: SimpleListHandler,
    level: LevelHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },

  // 7. 技能 (SoA)
  skills: {
    handler: SkillsTableHandler,
    name: TextHandler,
    total: BonusHandler,
    rank: LevelHandler,
    cs: BoolHandler,
    ability: AttributeIndexHandler,
    misc: IntegerHandler,
    special: TextHandler
  },
  skillsTotal: IntegerHandler,
  armorCheckPenalty: IntegerHandler,

  // 8. 装备系统 (Array of Objects)
  equipmentBags: {
    handler: { ...handlers.BaseTable, view: 'EquipmentBags' },
    name: TextHandler,
    ignoreWeight: BoolHandler,
    items: {
      handler: EquipmentItemsHandler,
      item: TextHandler,
      quantity: QuantityHandler,
      cost: CostHandler,
      weight: WeightHandler,
      notes: TextHandler
    }
  },
  encumbranceMultiplier: FloatHandler,
  currency: {
    handler: CurrencyHandler,
    pp: IntegerHandler,
    gp: IntegerHandler,
    sp: IntegerHandler,
    cp: IntegerHandler,
    coinWeight: FloatHandler
  },

  // 9. 施法系统 (Array Mode)
  magicBlocks: {
    handler: { ...MagicBlocksHandler, view: 'MagicBlocks' },
    title: TextHandler,
    type: SpellTypeHandler,
    casterLevel: LevelHandler,
    concentration: BonusHandler,
    spellTable: {
      handler: SpellTableHandler,
      level: SpellLevelHandler,
      uses: DailyUsesHandler,
      spells: TextHandler
    },
    notes: TextHandler
  },

  additionalData: {
    handler: { ...handlers.BaseTable, view: 'AdditionalData' },
  }
};

/**
 * 路径归一化寻址器
 */
export function getHandlerByPath(path: string): any {
  try {
    if (!path) return null;
    
    const normalizedPath = path
      .replace(/\[\d+\]/g, '')
      .replace(/\.\d+(\.|$)/g, (match) => match.endsWith('.') ? '.' : '');

    const node = get(CharacterPrototype, normalizedPath);
    
    if (!node) {
      return null;
    }

    // 显式确保如果 handler 属性不存在，则返回 node 本身，如果两者都无则返回 null
    const handler = node.handler ? node.handler : node;
    return handler || null; 
  } catch (e) {
    console.error(`[Schema ERROR] Fatal error resolving path: "${path}"`, e);
    return null;
  }
}

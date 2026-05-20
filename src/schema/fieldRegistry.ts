import { get } from 'lodash-es';
import handlers from './dataTypes';

const {
  TextHandler, IntegerHandler, PosIntHandler, BonusHandler, LevelHandler,
  FloatHandler, BoolHandler, ClassSkillHandler, SkillAttributeHandler, QuantityHandler,
  CostHandler, WeightHandler, CritRangeHandler, CritMultiplierHandler,
  DistanceHandler, AbilityTypeHandler, SpellTypeHandler, CompositeHandler,
  DailyUsesHandler, AgeHandler, HeightHandler,
  // 业务表格 Handler
  AttributesTableHandler, AttackTableHandler, DefensesTableHandler,
  SavesTableHandler, SkillsTableHandler, SimpleListHandler,
  BackgroundTraitsTableHandler, ClassFeaturesTableHandler, FeatsTableHandler,
  SpellTableHandler, MagicBlocksHandler, EquipmentItemsHandler,
  // 复合业务 Handler
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler
} = handlers;

/**
 * 角色数据导航原型树 (Character Prototype Tree)
 * 核心职责：将平面的 CharacterData 路径映射到复杂的业务逻辑 Handler
 * 必须与 DEFAULT_DATA 的物理结构 100% 对齐
 */
export const CharacterPrototype: any = {
  // 0. 元数据
  id: TextHandler,
  folderId: TextHandler,
  ownerId: TextHandler,
  targetId: TextHandler,

  // 1. 基础信息
  basic: {
    handler: BasicInfoHandler,
    name: TextHandler,
    classes: TextHandler,
    alignment: handlers.AlignmentHandler,
    size: handlers.SizeHandler,
    gender: handlers.GenderHandler,
    race: TextHandler,
    age: AgeHandler,
    height: HeightHandler,
    weight: WeightHandler,
    speed: {
      land: DistanceHandler,
      fly: DistanceHandler,
      maneuverability: handlers.ManeuverabilityHandler,
      swim: DistanceHandler,
      climb: DistanceHandler,
      burrow: DistanceHandler
    },
    senses: TextHandler,
    initiative: BonusHandler,
    perception: BonusHandler,
    languages: TextHandler,
    deity: TextHandler,
    avatars: {
      url: TextHandler,
      note: TextHandler
    }
  },

  story: TextHandler,

  // 2. 核心属性
  attributes: {
    handler: AttributesTableHandler,
    final: IntegerHandler,
    modifier: BonusHandler,
    source: TextHandler,
    status: TextHandler
  },

  // 3. 战斗统计 (User structure: combatManeuver)
  combatManeuver: {
    handler: CombatInfoHandler,
    bab: BonusHandler,
    cmb: BonusHandler,
    cmd: IntegerHandler,
    notes: TextHandler
  },

  // 4. 攻击系统
  attacks: {
    handler: CompositeHandler,
    melee: {
      handler: handlers.MeleeAttackTableHandler,
      weapon: TextHandler,
      hit: BonusHandler,
      damage: TextHandler,
      critRange: CritRangeHandler,
      critMultiplier: CritMultiplierHandler,
      touch: DistanceHandler,
      damageType: TextHandler,
      special: TextHandler
    },
    ranged: {
      handler: handlers.RangedAttackTableHandler,
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
    armorClass: {
      handler: DefensesTableHandler,
      ac: IntegerHandler,
      source: TextHandler,
      flatFooted: IntegerHandler,
      touch: IntegerHandler,
      notes: TextHandler
    },
    saves: {
      handler: SavesTableHandler,
      fort: BonusHandler,
      ref: BonusHandler,
      will: BonusHandler,
      notes: TextHandler
    },
    specialDefenses: TextHandler
  },

  // 6. 特性与专长
  racialTraits: {
    handler: SimpleListHandler,
    name: TextHandler,
    desc: TextHandler
  },
  backgroundTraits: {
    handler: BackgroundTraitsTableHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },
  favoredClass: {
    fc: TextHandler,
    fcb: TextHandler
  },
  classFeatures: {
    handler: ClassFeaturesTableHandler,
    level: LevelHandler,
    name: TextHandler,
    type: AbilityTypeHandler,
    desc: TextHandler
  },
  feats: {
    handler: FeatsTableHandler,
    level: LevelHandler,
    source: TextHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },

  // 7. 技能 (User structure: skills)
  skills: {
    handler: SkillsTableHandler,
    name: TextHandler,
    total: BonusHandler, // 表格中的总计
    rank: LevelHandler,
    cs: ClassSkillHandler,
    ability: SkillAttributeHandler,
    others: TextHandler,
    special: TextHandler,
    // 技能区块配置 (重命名以避开冲突)
    totalPoints: handlers.NonNegativeIntHandler,
    acp: handlers.NonNegativeIntHandler,
    notes: TextHandler
  },

  // 8. 装备与资产 (User structure: equipment)
  equipment: {
    container: {
      handler: new handlers.BaseTable({ ...EquipmentItemsHandler, view: 'EquipmentBags' }),
      name: TextHandler,
      ignoreWeight: BoolHandler,
      // 物品平铺
      item: TextHandler,
      quantity: QuantityHandler,
      cost: CostHandler,
      weight: WeightHandler,
      notes: TextHandler
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
    notes: TextHandler
  },

  // 9. 施法系统 (Uses/Spells 平铺)
  magicBlocks: {
    handler: new handlers.BaseTable({ ...MagicBlocksHandler, view: 'MagicBlocks' }),
    title: TextHandler,
    type: SpellTypeHandler,
    casterLevel: LevelHandler,
    concentration: BonusHandler,
    uses: DailyUsesHandler, // 现在在 block 级别平铺
    spells: TextHandler, // 现在在 block 级别平铺
    notes: TextHandler
  },

  additionalData: {
    handler: new handlers.BaseTable({ view: 'AdditionalData' }),
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

    const handler = node.handler ? node.handler : node;
    return handler || null;
  } catch (e) {
    console.error(`[Schema ERROR] Fatal error resolving path: "${path}"`, e);
    return null;
  }
}

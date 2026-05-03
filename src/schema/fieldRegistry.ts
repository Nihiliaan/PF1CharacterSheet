import { 
  TextHandler, 
  IntegerHandler, 
  BonusHandler, 
  WeightHandler,
  LevelHandler,
  DistanceHandler,
  BoolHandler,
  FloatHandler
} from './dataTypes';
import { get } from 'lodash-es';

/**
 * 复合节点与表格节点的默认占位逻辑（可选扩展）
 */
const CompositeHandler = { update: (v: any) => v };
const TableHandler = { update: (v: any) => v };

/**
 * 人物卡处理器原型树 (The Blueprint)
 * 结构镜像 Data JSON，支持在字典节点通过 handler 属性定义整体逻辑
 */
export const CharacterPrototype: any = {
  basic: {
    handler: CompositeHandler,
    name: TextHandler,
    classes: TextHandler,
    alignment: IntegerHandler,
    size: IntegerHandler,
    gender: IntegerHandler,
    race: TextHandler,
    age: IntegerHandler,
    height: FloatHandler,
    weight: FloatHandler,
    speed: IntegerHandler,
    senses: TextHandler,
    initiative: BonusHandler,
    perception: BonusHandler,
    languages: TextHandler,
    deity: TextHandler,
    avatars: {
      handler: TableHandler,
      url: TextHandler,
      note: TextHandler
    }
  },

  story: TextHandler,

  attributes: {
    handler: TableHandler,
    final: IntegerHandler,
    modifier: BonusHandler,
    source: TextHandler,
    status: TextHandler
  },

  combatTable: {
    handler: CompositeHandler,
    bab: BonusHandler,
    cmb: BonusHandler,
    cmd: IntegerHandler,
    combatManeuverNotes: TextHandler
  },

  attacks: {
    handler: CompositeHandler,
    meleeAttacks: {
      handler: TableHandler,
      weapon: TextHandler,
      hit: BonusHandler,
      damage: TextHandler,
      critRange: TextHandler,
      critMultiplier: TextHandler,
      range: DistanceHandler,
      damageType: TextHandler,
      special: TextHandler
    },
    rangedAttacks: {
      handler: TableHandler,
      weapon: TextHandler,
      hit: BonusHandler,
      damage: TextHandler,
      critRange: TextHandler,
      critMultiplier: TextHandler,
      range: DistanceHandler,
      damageType: TextHandler,
      special: TextHandler
    },
    specialAttacks: TextHandler
  },

  defenses: {
    handler: CompositeHandler,
    hp: TextHandler,
    hd: TextHandler,
    acTable: {
      handler: CompositeHandler,
      ac: IntegerHandler,
      source: TextHandler,
      flatFooted: IntegerHandler,
      touch: IntegerHandler,
      acNotes: TextHandler
    },
    savesTable: {
      handler: CompositeHandler,
      fort: BonusHandler,
      ref: BonusHandler,
      will: BonusHandler,
      savesNotes: TextHandler
    },
    specialDefenses: TextHandler
  },

  racialTraits: {
    handler: TableHandler,
    name: TextHandler,
    desc: TextHandler
  },

  backgroundTraits: {
    handler: TableHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },

  favoredClass: TextHandler,
  favoredClassBonus: TextHandler,

  classFeatures: {
    handler: TableHandler,
    level: LevelHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },

  feats: {
    handler: TableHandler,
    level: LevelHandler,
    source: TextHandler,
    name: TextHandler,
    type: TextHandler,
    desc: TextHandler
  },

  skills: {
    handler: TableHandler,
    name: TextHandler,
    total: BonusHandler,
    rank: LevelHandler,
    cs: BoolHandler,
    ability: TextHandler,
    others: TextHandler,
    special: TextHandler
  },

  skillsTotal: IntegerHandler,
  armorCheckPenalty: IntegerHandler,

  equipmentBags: {
    handler: TableHandler, // 处理包列表整体逻辑
    name: TextHandler,
    ignoreWeight: BoolHandler,
    items: {
      handler: TableHandler, // 处理包内物品整表逻辑
      item: TextHandler,
      quantity: TextHandler,
      cost: TextHandler,
      weight: WeightHandler,
      notes: TextHandler
    }
  },

  encumbranceMultiplier: FloatHandler,
  equipmentNotes: TextHandler,

  currency: {
    handler: CompositeHandler,
    pp: IntegerHandler,
    gp: IntegerHandler,
    sp: IntegerHandler,
    cp: IntegerHandler,
    coinWeight: WeightHandler
  },

  magicBlocks: TextHandler,
  additionalData: TextHandler
};

/**
 * 路径归一化寻址：移除 [0] 和 .0 格式的索引
 * 自动识别并返回 handler 字段或节点本身
 */
export function getHandlerByPath(path: string): any {
  // 1. 归一化路径：移除所有 [数字] 或 .数字
  const normalizedPath = path
    .replace(/\[\d+\]/g, '') // 处理 equipmentBags[0]
    .replace(/\.\d+(\.|$)/g, (match) => match.endsWith('.') ? '.' : ''); // 处理 equipmentBags.0

  // 2. 寻址
  const node = get(CharacterPrototype, normalizedPath);

  // 3. 返回逻辑：如果节点有 handler 则返回，否则节点本身即 Handler
  return (node && node.handler) ? node.handler : node;
}

/**
 * 核心校验正则
 */
export const REGEX_PATTERNS = {
  posInt: /^\d*$/,
  int: /^[+-]?\d*$/,
  float: /^-?\d*\.?\d*$/,
};

import { KNOWLEDGE_IDS, CRAFT_IDS, PERFORM_IDS, PROFESSION_IDS, SKILL_REGISTRY } from '../constants/skills';

/**
 * 核心数据枚举
 */
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const SIZES = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];
const GENDERS = ['Male', 'Female', 'Other'];
const MANEUVERABILITY = ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'];
const ABILITY_TYPES = ['—', 'Sp', 'Su', 'Ex'];

/**
 * 基础处理器类 (Base Class)
 * 职责：定义接口规范与通用的显示/格式化逻辑
 */
export class BaseHandler {
  ui: string = 'text';
  defaultValue: any = '';

  constructor(config: Partial<BaseHandler> = {}) {
    Object.assign(this, config);
  }

  validate(v: any): boolean {
    return true;
  }

  update(v: any): any {
    return v;
  }

  getDefaultValue(): any {
    return this.defaultValue;
  }

  formatDisplay(v: any, context?: any): string {
    return (v ?? '') === '' ? '' : String(v);
  }

  formatInteractive(v: any, context?: any): string {
    return this.formatDisplay(v, context);
  }
}

/**
 * 文本处理器
 */
export class BaseText extends BaseHandler {
  ui = 'text';
  defaultValue = '';
}

/**
 * 数值处理器基类
 */
export class BaseInt extends BaseHandler {
  ui = 'number';
  step = 1;
  min = -Infinity;
  max = Infinity;
  defaultValue = 0;

  preProcess?(v: string): string;

  constructor(config: Partial<BaseInt> = {}) {
    super();
    Object.assign(this, config);
    this.defaultValue = Math.min(this.max, Math.max(this.min, this.defaultValue));
  }

  validate(v: string) {
    if (v === '') return true;
    const cleanV = this.preProcess ? this.preProcess(v) : v;
    return REGEX_PATTERNS.int.test(cleanV);
  }

  update(v: any): number {
    if (typeof v === 'number') return Math.min(this.max, Math.max(this.min, v));
    if ((v ?? '') === '') return this.defaultValue;
    let strV = String(v);
    if (this.preProcess) strV = this.preProcess(strV);
    const num = parseInt(strV, 10);
    if (isNaN(num)) return this.defaultValue;
    return Math.min(this.max, Math.max(this.min, num));
  }

  formatDisplay(v: any) {
    const s = String(v ?? '');
    return s === '' ? '—' : s;
  }
}

/**
 * 浮点数处理器基类
 */
export class BaseFloat extends BaseInt {
  validate(v: string) {
    if (v === '') return true;
    const cleanV = this.preProcess ? this.preProcess(v) : v;
    return REGEX_PATTERNS.float.test(cleanV);
  }

  update(v: any): number {
    if (typeof v === 'number') return Math.min(this.max, Math.max(this.min, v));
    if ((v ?? '') === '') return this.defaultValue;
    let strV = String(v);
    if (this.preProcess) strV = this.preProcess(strV);
    const num = parseFloat(strV);
    if (isNaN(num)) return this.defaultValue;
    const constrained = Math.min(this.max, Math.max(this.min, num));
    return Math.round(constrained * 100) / 100;
  }
}

/**
 * 选择处理器基类
 */
export class BaseSelect extends BaseHandler {
  ui = 'select';
  optionValues: any[] = [];
  optionIndices: number[] = [];
  defaultIndex: number = 0;
  i18nPrefix: string = '';

  constructor(config: Partial<BaseSelect> = {}) {
    super();
    const { optionIndices, ...rest } = config;
    Object.assign(this, rest);
    this.optionIndices = optionIndices || [...this.optionValues.keys()];
  }

  getDefaultValue(): any {
    return this.defaultIndex;
  }

  update(v: any): any {
    if (typeof v === 'number') return v;
    const idx = this.optionValues.indexOf(v);
    if (idx !== -1) return idx;
    const num = parseInt(v, 10);
    return isNaN(num) ? this.defaultIndex : num;
  }

  formatDisplay(v: any, context?: any): string {
    const key = this.optionValues[v];
    if (key === undefined || key === null || key === '') return '—';
    return context?.t ? context.t(`${this.i18nPrefix}${key}`) : String(key);
  }
}

/**
 * 技能名称处理器
 * 职责：处理 ID (number) 和 自定义文本 (string) 的混合场景，并管理分类规则。
 */
export class SkillNameHandlerClass extends BaseSelect {
  ui = 'select';
  i18nPrefix = 'editor.skills.names.';

  update(v: any): any {
    if (typeof v === 'number') return v;
    const num = parseInt(v, 10);
    if (!isNaN(num) && String(num) === String(v)) {
      if (SKILL_REGISTRY.some(s => s.id === num)) return num;
    }
    return v;
  }

  formatDisplay(v: any, context?: any): string {
    const t = context?.t;
    if (!t || (v ?? '') === '') return '—';

    if (typeof v === 'number') {
      const cat = Math.floor(v / 1000);
      const idx = v % 1000;
      const name = t(`${this.i18nPrefix}${cat}.${idx}`);
      // 如果不是在渲染下拉选项（isOption 为假），且属于分类 2-5，则添加大类前缀
      if (cat >= 2 && cat <= 5 && !context?.isOption) {
        const catName = t(`editor.skills.categories.${cat}`);
        return `${catName}（${name}）`;
      }
      return name;
    }
    return String(v);
  }

  // 根据大类获取对应选项序号列表
  getOptionIndices(cat: number): number[] {
    switch (cat) {
      case 2: return KNOWLEDGE_IDS;
      case 3: return CRAFT_IDS;
      case 4: return PERFORM_IDS;
      case 5: return PROFESSION_IDS;
      default: return [];
    }
  }

  // 判定是否为固定技能名
  isFixed(cat: number) {
    return cat <= 2;
  }

  // 获取下拉列表列数（专业类设为 3 列）
  getColumnCount(cat: number) {
    return cat === 5 ? 3 : 1;
  }
}

/**
 * 业务 Handler 实例与子类
 */

const TextHandler = new BaseText();

const SkillNameHandler = new SkillNameHandlerClass();

const IntegerHandler = new BaseInt();

const PosIntHandler = new BaseInt({
  ui: 'posInt',
  min: 1
});

const NonNegativeIntHandler = new BaseInt({
  ui: 'int',
  min: 0
});

const QuantityHandler = new BaseInt({
  ui: 'quantity',
  min: 1,
  formatDisplay: (v: any) => {
    const n = parseInt(v, 10);
    return (isNaN(n) || n <= 1) ? '' : `×${n}`;
  },
  formatInteractive: function (v: any) { return this.formatDisplay!(v); }
});

const LevelHandler = new BaseInt({
  ui: 'level',
  min: 0,
  max: 20,
  formatDisplay: (v: any, context?: any) => {
    const n = parseInt(v, 10);
    if (!n || n <= 0) return '';
    return context?.t ? context.t('editor.lists.level_format', { n }) : n.toString();
  },
  formatInteractive: function (v: any) {
    const n = parseInt(v, 10);
    return (!n || n <= 0) ? '' : n.toString();
  }
});

const DistanceHandler = new BaseInt({
  ui: 'distance',
  min: 0,
  step: 5,
  defaultValue: 5,
  preProcess: (v) => String(v).replace(/[^\d]/g, ''),
  formatDisplay: (v: any, context?: any) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n === 0) return '';
    return context?.t ? context.t('editor.lists.distance_format', { v: n }) : `${n} ft`;
  },
  formatInteractive: function (v: any) { return this.formatDisplay!(v); }
});

const BonusHandler = new BaseInt({
  ui: 'bonus',
  preProcess: (v) => String(v).replace('+', ''),
  formatDisplay: (v: any) => {
    const s = String(v ?? '');
    if (s === '') return '—';
    const num = parseInt(s, 10);
    if (isNaN(num)) return '—';
    return num >= 0 ? `+${num}` : `${num}`;
  },
  formatInteractive: function (v: any) { return this.formatDisplay!(v); }
});

const FloatHandler = new BaseFloat({
  ui: 'float'
});

const CostHandler = new BaseFloat({
  ui: 'cost',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    const n = parseFloat(v);
    if (isNaN(n) || n === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.gp') : 'gp';
    return `${n} ${unit}`;
  },
  formatInteractive: function (v: any) { return this.formatDisplay!(v); }
});

const WeightHandler = new BaseFloat({
  ui: 'weight',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    const n = parseFloat(v);
    if (isNaN(n) || n === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.lbs') : 'lbs';
    return `${n} ${unit}`;
  },
  formatInteractive: function (v: any) { return this.formatDisplay!(v); }
});

const BoolHandler = new BaseHandler({
  ui: 'bool',
  update: (v: any) => v === true || v === 'true',
  formatDisplay: (v: any) => (v ? '是' : '否'),
  formatInteractive: (v: any) => (v ? 'true' : 'false')
});

const ClassSkillHandler = new BaseHandler({
  ui: 'bool',
  update: (v: any) => v === true || v === 'true',
  formatDisplay: (v: any, context?: any) => {
    const rank = parseInt(context?.row?.rank, 10);
    return ((v === true || v === 'true') && rank > 0) ? '+3' : '';
  },
  formatExport: function (v: any, context?: any) {
    const display = this.formatDisplay(v, context);
    if (display === '+3') {
      const t = context?.t;
      return t ? `+3${t('editor.sections.cs_short')}` : '+3本职';
    }
    return display;
  }
} as any);

const AbilityTypeHandler = new BaseSelect({ optionValues: ABILITY_TYPES });

const SpellTypeHandler = new BaseSelect({
  optionValues: [0, 1, 2, 3, 4, 5],
  highestLevel: [9, 4, 9, 4, 6],
  lowestLevel: [0, 1, 0, 1, 1],
  formatDisplay: (v: any, context?: any) => context.t(`editor.spells.types.${v}`),
  getRequiredRowCount: function (type: number) {
    if (type === 5) return null;
    return this.highestLevel[type] - this.lowestLevel[type] + 1;
  }
} as any);

const SkillAttributeHandler = new BaseSelect({
  optionValues: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
  optionIndices: [0, 1, 3, 4, 5],
  formatDisplay: function (v: any, context?: any) {
    const mod = context.modifiers[this.optionValues[v]];
    return `${mod >= 0 ? '+' : ''}${mod}${context.t('editor.attributes.' + this.optionValues[v])}`;
  }
});

const ManeuverabilityHandler = new BaseSelect({ optionValues: MANEUVERABILITY, i18nPrefix: 'editor.basic.maneuverability_options.' });
const AlignmentHandler = new BaseSelect({ optionValues: ALIGNMENTS, i18nPrefix: 'editor.basic.alignment_options.' });
const SizeHandler = new BaseSelect({ optionValues: SIZES, optionIndices: [3, 4], i18nPrefix: 'editor.basic.size_options.' });
const GenderHandler = new BaseSelect({ optionValues: GENDERS, i18nPrefix: 'editor.basic.gender_options.' });

const AgeHandler = new BaseInt({
  min: 0,
  formatDisplay: (v: any, context?: any) => v ? (context?.t ? context.t('editor.lists.age_format', { n: v }) : `${v}岁`) : ''
});

const HeightHandler = new BaseInt({
  min: 1,
  formatDisplay: (v: any, context?: any) => {
    const inches = parseInt(v, 10);
    if (!inches) return '';
    const ft = Math.floor(inches / 12);
    const remainingIn = inches % 12;
    return context?.t ? (remainingIn > 0 ? context.t('editor.lists.height_format', { ft, in: remainingIn }) : context.t('editor.lists.height_format_ft', { ft })) : `${ft}'${remainingIn > 0 ? ` ${remainingIn}"` : ''}`;
  }
});

const CritRangeHandler = new BaseSelect({
  optionValues: [20, 19, 18, 17, 16, 15],
  formatDisplay: function (v: any) {
    const val = this.optionValues[v] ?? 20;
    return val == 20 ? '20' : `${val}-20`;
  },
});

const CritMultiplierHandler = new BaseSelect({
  optionValues: [2, 3, 4],
  formatDisplay: function (v: any) {
    const val = this.optionValues[v] ?? 2;
    return `×${val}`;
  }
});

const DailyUsesHandler = new BaseInt({
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    if (!v) return context?.t ? context.t('editor.spells.at_will') : '随意使用';
    return context?.t ? context.t('editor.spells.uses_per_day', { n: v }) : `${v}次/日`;
  },
  formatInteractive: (v: any) => v ? v.toString() : '0'
});

/**
 * 表格与业务复合处理器
 */
export class BaseTable extends BaseHandler {
  ui = 'table';
  columns: any[] = [];
  fixedRows: boolean = false;
  view?: string;

  constructor(config: Partial<BaseTable> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay(v: any) { return `Array(${v?.length || 0})`; }
}

export class CompositeHandler extends BaseHandler {
  ui = 'composite';
  view: string = 'CompositeView';
  columns?: any[];

  constructor(config: Partial<CompositeHandler> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay() { return 'Composite Object'; }
}

const AttributesTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.attributes.headers.attr', width: '10%' },
    { key: 'final', label: 'editor.attributes.headers.final', width: '10%', type: 'int' },
    { key: 'modifier', label: 'editor.attributes.headers.mod', width: '10%', type: 'bonus' },
    { key: 'source', label: 'editor.attributes.headers.source', width: '50%' },
    { key: 'status', label: 'editor.attributes.headers.status', width: '20%' }
  ],
  fixedRows: true
});

const MeleeAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.melee', width: '20%' },
    { key: 'hit', label: 'editor.attacks.hit', width: '8%', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '12%' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '8%', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '8%', type: 'critMultiplier' },
    { key: 'touch', label: 'editor.attacks.reach', width: '8%', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '10%' },
    { key: 'special', label: 'editor.attacks.special', width: '26%' }
  ]
});

const RangedAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.ranged', width: '20%' },
    { key: 'hit', label: 'editor.attacks.hit', width: '8%', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '12%' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '8%', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '8%', type: 'critMultiplier' },
    { key: 'range', label: 'editor.attacks.range', width: '8%', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '10%' },
    { key: 'special', label: 'editor.attacks.special', width: '26%' }
  ]
});

const DefensesTableHandler = new BaseTable({
  columns: [
    { key: 'ac', label: 'editor.defenses.ac', width: '15%', type: 'int' },
    { key: 'source', label: 'editor.attributes.headers.source', width: '55%' },
    { key: 'touch', label: 'editor.defenses.touch', width: '15%', type: 'int' },
    { key: 'flatFooted', label: 'editor.defenses.flat_footed', width: '15%', type: 'int' }
  ],
  fixedRows: true
});

const SavesTableHandler = new BaseTable({
  columns: [
    { key: 'fort', label: 'editor.defenses.fort', width: '33.33%', type: 'bonus' },
    { key: 'ref', label: 'editor.defenses.ref', width: '33.33%', type: 'bonus' },
    { key: 'will', label: 'editor.defenses.will', width: '33.34%', type: 'bonus' }
  ],
  fixedRows: true
});

const SkillsTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.skills.headers.skill', width: '15%' },
    { key: 'category', label: 'editor.lists.category', width: '0%', type: 'int' },
    { key: 'total', label: 'editor.skills.headers.total', width: '5%', type: 'bonus' },
    { key: 'rank', label: 'editor.skills.headers.rank', width: '5%', type: 'level' },
    { key: 'cs', label: 'editor.skills.headers.cs', width: '5%', type: 'classSkill' },
    { key: 'ability', label: 'editor.skills.headers.ability', width: '10%', type: 'attributeIndex' },
    { key: 'others', label: 'editor.skills.headers.others', width: '20%' },
    { key: 'special', label: 'editor.skills.headers.special', width: '35%' }
  ]
});

const SimpleListHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '25%' },
    { key: 'desc', label: 'editor.lists.description', width: '75%' }
  ]
});

const BackgroundTraitsTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '10%' },
    { key: 'desc', label: 'editor.lists.description', width: '70%' }
  ]
});

const ClassFeaturesTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '5%', type: 'level' },
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '5%', type: 'abilityType' },
    { key: 'desc', label: 'editor.lists.description', width: '70%' }
  ]
});

const FeatsTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '5%', type: 'level' },
    { key: 'source', label: 'editor.lists.source', width: '10%' },
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '10%' },
    { key: 'desc', label: 'editor.lists.description', width: '55%' }
  ]
});

const SpellTableHandler = new BaseTable({ view: 'SpellTable' });
const MagicBlocksHandler = new BaseTable({ view: 'MagicBlocks' });
const EquipmentItemsHandler = new BaseTable({
  columns: [
    { key: 'item', label: 'editor.items.headers.item', width: '35%', hideRightBorder: true },
    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
    { key: 'cost', label: 'editor.items.headers.cost', width: '10%', type: 'cost' },
    { key: 'weight', label: 'editor.items.headers.weight', width: '10%', type: 'weight' },
    { key: 'notes', label: 'editor.items.headers.notes', width: '40%' }
  ]
});

const BasicInfoHandler = new CompositeHandler();
const CombatInfoHandler = new CompositeHandler({
  columns: [
    { key: 'bab', label: 'editor.attributes.bab', width: '33.33%', type: 'bonus' },
    { key: 'cmb', label: 'editor.attributes.cmb', width: '33.33%', type: 'bonus' },
    { key: 'cmd', label: 'editor.attributes.cmd', width: '33.34%', type: 'int' }
  ]
});
const CurrencyHandler = new CompositeHandler();

export function getHandlerByType(type: string): BaseHandler {
  switch (type) {
    case 'number': case 'int': return IntegerHandler;
    case 'posInt': case 'quantity': return PosIntHandler;
    case 'level': return LevelHandler;
    case 'distance': return DistanceHandler;
    case 'bonus': return BonusHandler;
    case 'float': return FloatHandler;
    case 'cost': return CostHandler;
    case 'weight': return WeightHandler;
    case 'bool': case 'checkbox': return BoolHandler;
    case 'classSkill': return ClassSkillHandler;
    case 'critRange': return CritRangeHandler;
    case 'critMultiplier': return CritMultiplierHandler;
    case 'abilityType': return AbilityTypeHandler;
    case 'skillName': return SkillNameHandler;
    default: return TextHandler;
  }
}

const handlers: any = {
  TextHandler, SkillNameHandler,
  IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler, LevelHandler,
  DistanceHandler, SkillAttributeHandler, CostHandler, WeightHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  HeightHandler, AgeHandler, CritRangeHandler, CritMultiplierHandler, BonusHandler,
  FloatHandler, BoolHandler, ClassSkillHandler, AbilityTypeHandler, SpellTypeHandler,
  DailyUsesHandler, getHandlerByType,
  BaseHandler, BaseText, BaseInt, BaseSelect, BaseTable, CompositeHandler, SkillNameHandlerClass,
  AttributesTableHandler, MeleeAttackTableHandler, RangedAttackTableHandler, DefensesTableHandler,
  SavesTableHandler, SkillsTableHandler, SimpleListHandler, BackgroundTraitsTableHandler,
  ClassFeaturesTableHandler, FeatsTableHandler, SpellTableHandler, MagicBlocksHandler, EquipmentItemsHandler,
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler
};

export default handlers;

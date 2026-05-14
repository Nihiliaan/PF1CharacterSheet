/**
 * 核心校验正则
 */
export const REGEX_PATTERNS = {
  posInt: /^\d*$/,
  int: /^[+-]?\d*$/,
  float: /^-?\d*\.?\d*$/,
};

/**
 * 核心数据枚举
 */
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const SIZES = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];
const GENDERS = ['Male', 'Female', 'Other'];
const MANEUVERABILITY = ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'];
const ABILITY_TYPES = ['—', 'Sp', 'Su', 'Ex'];

/**
 * 基础处理器类
 */
export class BaseHandler {
  ui: string = 'text';

  constructor(config: Partial<BaseHandler> = {}) {
    Object.assign(this, config);
  }

  validate(v: any): boolean {
    return true;
  }

  update(v: any): any {
    return v;
  }

  formatDisplay(v: any, context?: any): string {
    return (v === undefined || v === null || v === '') ? '' : String(v);
  }

  formatInteractive(v: any, context?: any): string {
    return this.formatDisplay(v, context);
  }
}

export class BaseText extends BaseHandler {
  ui = 'text';
}

export class BaseInt extends BaseHandler {
  ui = 'number';
  step = 1;
  min = -Infinity;
  max = Infinity;

  constructor(config: Partial<BaseInt> = {}) {
    super();
    Object.assign(this, config);
  }

  validate(v: string) {
    if (v === '') return true;
    if (!REGEX_PATTERNS.int.test(v)) return false;
    const num = parseInt(v, 10);
    return num >= this.min && num <= this.max;
  }

  update(v: string) {
    if (v === '') return this.min === -Infinity ? 0 : this.min;
    const num = parseInt(v, 10);
    if (isNaN(num)) return this.min === -Infinity ? 0 : this.min;
    return Math.min(this.max, Math.max(this.min, num));
  }

  formatDisplay(v: any) {
    return (v === undefined || v === '' || v === null) ? '—' : v.toString();
  }
}

export class BaseSelect extends BaseHandler {
  ui = 'select';
  optionValues: any[] = [];
  options: number[] = [];
  i18nPrefix: string = '';

  constructor(config: Partial<BaseSelect> = {}) {
    super();
    const { options, ...rest } = config;
    Object.assign(this, rest);
    if (options) {
      this.options = options;
    } else if (this.optionValues.length > 0) {
      this.options = [...this.optionValues.keys()];
    }
  }

  update(v: any): any {
    if (typeof v === 'string') {
      const idx = this.optionValues.indexOf(v);
      if (idx !== -1) return idx;
      const num = parseInt(v, 10);
      if (!isNaN(num) && this.optionValues[num] !== undefined) return num;
    }
    return typeof v === 'number' ? v : 0;
  }

  formatDisplay(v: any, context?: any): string {
    let key = v;
    const idx = parseInt(v, 10);
    if (!isNaN(idx) && this.optionValues[idx] !== undefined) {
      key = this.optionValues[idx];
    }

    if (key === undefined || key === null || key === '') return '—';
    const t = context?.t;
    return t ? t(`${this.i18nPrefix}${key}`) : String(key);
  }
}

export class BaseTable extends BaseHandler {
  ui = 'table';
  columns: any[] = [];
  fixedRows: boolean = false;
  view?: string;

  constructor(config: Partial<BaseTable> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay(v: any) {
    return `Array(${v?.length || 0})`;
  }
}

export class CompositeHandler extends BaseHandler {
  ui = 'composite';
  view: string = 'CompositeView';
  columns?: any[];

  constructor(config: Partial<CompositeHandler> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay(v: any) {
    return 'Composite Object';
  }
}

/**
 * 具体业务处理器实现
 */

const TextHandler = new BaseText();

const IntegerHandler = new BaseInt();

const PosIntHandler = new BaseInt({
  ui: 'posInt',
  min: 1,
  validate: function (v: string) {
    if (v === '') return true;
    return REGEX_PATTERNS.posInt.test(v) && parseInt(v, 10) >= this.min;
  }
});

const NonNegativeIntHandler = new BaseInt({
  ui: 'int',
  min: 0,
  validate: function (v: string) {
    if (v === '') return true;
    return REGEX_PATTERNS.posInt.test(v) && parseInt(v, 10) >= this.min;
  }
});

const QuantityHandler = new BaseInt({
  ui: 'quantity',
  min: 1,
  validate: function (v: string) {
    if (v === '') return true;
    return REGEX_PATTERNS.posInt.test(v) && parseInt(v, 10) >= this.min;
  },
  formatDisplay: (v: any) => {
    const num = parseInt(v, 10);
    if (isNaN(num) || num <= 1) return '';
    return `×${num}`;
  },
  formatInteractive: (v: any) => {
    const num = parseInt(v, 10);
    return (num === 0 || isNaN(num)) ? '' : num.toString();
  }
});

const LevelHandler = new BaseInt({
  ui: 'level',
  min: 0,
  max: 20,
  update: function (v: string) {
    if (v === '' || v === '0') return 0;
    const num = parseInt(v, 10);
    return isNaN(num) ? 0 : Math.min(this.max, Math.max(0, num));
  },
  formatDisplay: (v: any, context?: any) => {
    if (v === 0 || v === '0' || !v) return '';
    return context.t('editor.lists.level_format', { n: v });
  },
  formatInteractive: (v: any) => (v === 0 || v === '0' || !v) ? '' : v.toString()
});

const DistanceHandler = new BaseInt({
  ui: 'distance',
  min: 0,
  step: 5,
  validate: (v: string | number) => {
    if (v === '' || v === undefined || v === null) return true;
    return REGEX_PATTERNS.posInt.test(String(v));
  },
  update: (v: string | number) => {
    if (v === '' || v === undefined || v === null) return 0;
    const num = parseInt(String(v).replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  },
  formatDisplay: (v: any, context?: any) => {
    if (v === '' || v === undefined || v === null || v === 0) return '';
    return context?.t ? context.t('editor.lists.distance_format', { v }) : `${v} ft`;
  }
});

const BonusHandler = new BaseInt({
  ui: 'bonus',
  validate: (v: string | number) => v === '' || REGEX_PATTERNS.int.test(String(v)),
  update: (v: string | number) => {
    if (v === '' || v === undefined || v === null) return 0;
    const clean = String(v).replace('+', '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  },
  formatDisplay: (v: any) => {
    const num = parseInt(v, 10);
    if (isNaN(num)) return '+0';
    return num >= 0 ? `+${num}` : `${num}`;
  }
});

const FloatHandler = new BaseInt({
  ui: 'float',
  validate: function (v: string) {
    if (v === '') return true;
    if (!REGEX_PATTERNS.float.test(v)) return false;
    const num = parseFloat(v);
    return num >= this.min && num <= this.max;
  },
  update: function (v: string) {
    if (v === '') return this.min === -Infinity ? 0 : this.min;
    let num = parseFloat(v);
    if (isNaN(num)) return this.min === -Infinity ? 0 : this.min;
    num = Math.round(num * 100) / 100;
    return Math.min(this.max, Math.max(this.min, num));
  }
});

const CostHandler = new BaseInt({
  ui: 'cost',
  min: 0,
  validate: function (v: string) { return FloatHandler.validate.call(this, v); },
  update: function (v: string) { return FloatHandler.update.call(this, v); },
  formatDisplay: (v: any, context?: any) => {
    if (v === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.gp') : 'gp';
    return `${v} ${unit}`;
  }
});

const WeightHandler = new BaseInt({
  ui: 'weight',
  min: 0,
  validate: function (v: string) { return FloatHandler.validate.call(this, v); },
  update: function (v: string) { return FloatHandler.update.call(this, v); },
  formatDisplay: (v: any, context?: any) => {
    if (v === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.lbs') : 'lbs';
    return `${v} ${unit}`;
  }
});

const BoolHandler = new BaseHandler({
  ui: 'bool',
  validate: (v: string) => v === 'true' || v === 'false' || v === '',
  update: (v: string) => v === 'true',
  formatDisplay: (v: any) => (v ? '是' : '否'),
  formatInteractive: (v: any) => (v ? 'true' : 'false')
});

const ClassSkillHandler = new BaseHandler({
  ui: 'bool',
  validate: (v: string) => v === 'true' || v === 'false' || v === '',
  update: (v: string) => v === 'true',
  formatInteractive: (v: any) => (v ? 'true' : 'false'),
  formatDisplay: (v: any, context?: any) => {
    const isCS = v === true || v === 'true';
    const rank = parseInt(context?.row?.rank, 10);
    return (isCS && !isNaN(rank) && rank > 0) ? '+3' : '';
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

const AbilityTypeHandler = new BaseSelect({
  optionValues: ABILITY_TYPES
});

const SpellTypeHandler = new BaseSelect({
  optionValues: [0, 1, 2, 3, 4, 5],
  highestLevel: [9, 4, 9, 4, 6],
  lowestLevel: [0, 1, 0, 1, 1],
  update: (v: any) => v,
  formatDisplay: (v: any, context?: any) => {
    return context.t(`editor.spells.types.${v}`);
  },
  getRequiredRowCount: function (type: number) {
    if (type === 5) return null;
    return this.highestLevel[type] - this.lowestLevel[type] + 1;
  }
} as any);

const SkillAttributeHandler = new BaseSelect({
  optionValues: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
  options: [0, 1, 3, 4, 5],
  formatDisplay: function (v: any, context?: any) {
    const mod = context.modifiers[this.optionValues[v]];
    const modStr = mod >= 0 ? `+${mod}` : mod;
    return `${modStr}${context.t('editor.attributes.' + this.optionValues[v])}`;
  }
});

const ManeuverabilityHandler = new BaseSelect({
  optionValues: MANEUVERABILITY,
  i18nPrefix: 'editor.basic.maneuverability_options.'
});

const AlignmentHandler = new BaseSelect({
  optionValues: ALIGNMENTS,
  i18nPrefix: 'editor.basic.alignment_options.'
});

const SizeHandler = new BaseSelect({
  optionValues: SIZES,
  options: [3, 4],
  i18nPrefix: 'editor.basic.size_options.'
});

const GenderHandler = new BaseSelect({
  optionValues: GENDERS,
  i18nPrefix: 'editor.basic.gender_options.'
});

const AgeHandler = new BaseInt({
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    if (v === undefined || v === null || v === '') return '';
    return context?.t ? context.t('editor.lists.age_format', { n: v }) : `${v}岁`;
  }
});
export { AgeHandler };

const HeightHandler = new BaseInt({
  min: 1,
  formatDisplay: (v: any, context?: any) => {
    const totalInches = parseInt(v, 10);
    if (!totalInches || totalInches <= 0) return '';
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    const t = context?.t;
    if (t) {
      return inches > 0
        ? t('editor.lists.height_format', { ft: feet, in: inches })
        : t('editor.lists.height_format_ft', { ft: feet });
    }

    return inches > 0 ? `${feet}' ${inches}"` : `${feet}'`;
  }
});
export { HeightHandler };

const CritRangeHandler = new BaseSelect({
  optionValues: [20, 19, 18, 17, 16, 15],
  update: function (v: any) {
    const idx = parseInt(v, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.optionValues.length) return this.optionValues[idx];
    return v;
  },
  formatDisplay: function (v: any) {
    let val = v;
    const idx = parseInt(v, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.optionValues.length && v < 10) {
      val = this.optionValues[idx];
    }
    return val == 20 ? '20' : `${val}-20`;
  },
});

const CritMultiplierHandler = new BaseSelect({
  optionValues: [2, 3, 4],
  update: function (v: any) {
    const idx = parseInt(v, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.optionValues.length) return this.optionValues[idx];
    return v;
  },
  formatDisplay: function (v: any) {
    let val = v;
    const idx = parseInt(v, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.optionValues.length && v < 3) {
      val = this.optionValues[idx];
    }
    return `×${val}`;
  }
});

const DailyUsesHandler = new BaseInt({
  min: 0,
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : Math.max(0, parseInt(v, 10))),
  formatDisplay: (v: any, context?: any) => {
    const num = parseInt(v, 10);
    if (isNaN(num) || num === 0) {
      return context?.t ? context.t('editor.spells.at_will') : '随意使用';
    }
    return context?.t ? context.t('editor.spells.uses_per_day', { n: num }) : `${num}次/日`;
  },
  formatInteractive: (v: any) => {
    const num = parseInt(v, 10);
    return (isNaN(num) || num === 0) ? '0' : num.toString();
  }
});

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

const AttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.weapon', width: '20%' },
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

const SpellTableHandler = new BaseTable({
  view: 'SpellTable'
});

const MagicBlocksHandler = new BaseTable({
  view: 'MagicBlocks',
  formatDisplay: (v: any) => `Casting Systems (${v?.length || 0})`
});

const EquipmentItemsHandler = new BaseTable({
  columns: [
    { key: 'item', label: 'editor.items.headers.item', width: '35%', hideRightBorder: true },
    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
    { key: 'cost', label: 'editor.items.headers.cost', width: '10%', type: 'cost' },
    { key: 'weight', label: 'editor.items.headers.weight', width: '10%', type: 'weight' },
    { key: 'notes', label: 'editor.items.headers.notes', width: '40%' }
  ]
});

/**
 * 业务专用复合处理器 (Composite Handlers)
 */
const BasicInfoHandler = new CompositeHandler();
const CombatInfoHandler = new CompositeHandler({
  columns: [
    { key: 'bab', label: 'editor.attributes.bab', width: '33.33%', type: 'bonus' },
    { key: 'cmb', label: 'editor.attributes.cmb', width: '33.33%', type: 'bonus' },
    { key: 'cmd', label: 'editor.attributes.cmd', width: '33.34%', type: 'int' }
  ]
});
const CurrencyHandler = new CompositeHandler();

/**
 * 根据 UI 类型获取对应的 Handler (兜底用)
 */
export function getHandlerByType(type: string): BaseHandler {
  switch (type) {
    case 'number':
    case 'int': return IntegerHandler;
    case 'posInt':
    case 'quantity': return PosIntHandler;
    case 'level': return LevelHandler;
    case 'distance': return DistanceHandler;
    case 'bonus': return BonusHandler;
    case 'float':
    case 'cost':
    case 'weight': return FloatHandler;
    case 'bool':
    case 'checkbox': return BoolHandler;
    case 'classSkill': return ClassSkillHandler;
    default: return TextHandler;
  }
}

/**
 * 导出与挂载
 */
const handlers: any = {
  TextHandler, IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler, LevelHandler,
  DistanceHandler, SkillAttributeHandler, CostHandler, WeightHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  HeightHandler, AgeHandler, CritRangeHandler, CritMultiplierHandler, BonusHandler,
  FloatHandler, BoolHandler, ClassSkillHandler, AbilityTypeHandler, SpellTypeHandler,
  DailyUsesHandler,
  getHandlerByType,
  // 业务层
  BaseHandler, BaseText, BaseInt, BaseSelect, BaseTable, CompositeHandler,
  AttributesTableHandler,
  AttackTableHandler,
  DefensesTableHandler,
  SavesTableHandler,
  SkillsTableHandler,
  SimpleListHandler,
  BackgroundTraitsTableHandler,
  ClassFeaturesTableHandler,
  FeatsTableHandler,
  SpellTableHandler,
  MagicBlocksHandler,
  EquipmentItemsHandler,
  // 复合型
  BasicInfoHandler,
  CombatInfoHandler,
  CurrencyHandler
};

if (typeof window !== 'undefined') {
  Object.assign(window, handlers);
}

export default handlers;

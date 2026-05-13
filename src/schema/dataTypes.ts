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
// ... (保留原有枚举定义)
const SIZES = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];
const GENDERS = ['Male', 'Female', 'Other'];
const MANEUVERABILITY = ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'];
const ABILITY_TYPES = ['—', 'Sp', 'Su', 'Ex'];
const SPELL_TYPES = ['有0环准备', '无0环准备', '有0环自发', '无0环自发', '类法术'];

/**
 * 基础类型定义
 */

const BaseText = {
  ui: 'text',
  validate: () => true,
  update: (v: string) => v,
  formatDisplay: (v: any) => v,
  formatInteractive: (v: any) => v,
  get formatExport() { return this.formatDisplay; }
};

const BaseInt = {
  ui: 'number',
  step: 1,
  min: -Infinity,
  max: Infinity,
  validate: function (v: string) {
    if (v === '') return true;
    if (!REGEX_PATTERNS.int.test(v)) return false;
    const num = parseInt(v, 10);
    return num >= this.min && num <= this.max;
  },
  update: function (v: string) {
    if (v === '') return this.min === -Infinity ? 0 : this.min;
    const num = parseInt(v, 10);
    if (isNaN(num)) return this.min === -Infinity ? 0 : this.min;
    return Math.min(this.max, Math.max(this.min, num));
  },
  formatDisplay: (v: any) => (v === undefined || v === '') ? '—' : v.toString(),
  formatInteractive: (v: any) => v?.toString() || '0',
  get formatExport() { return this.formatDisplay; }
};

const BaseSelect = {
  ui: 'select',
  validate: () => true,
  update: (v: string) => v,
  formatDisplay: (v: any) => v || '—',
  formatInteractive: (v: any) => v || '',
  get formatExport() { return this.formatDisplay; }
};

/**
 * 中间层：基于索引的选择器 (用于存储数字索引，显示文本的枚举)
 */
const BaseIndexSelect = Object.assign(Object.create(BaseSelect), {
  options: [] as string[],
  i18nPrefix: '',
  update: function (v: string) {
    const idx = this.options.indexOf(v);
    return idx === -1 ? 0 : idx;
  },
  formatDisplay: function (v: any, context?: any) {
    // 兼容索引和字符串 Key
    let key = v;
    if (typeof v === 'number' || /^\d+$/.test(String(v))) {
      key = this.options[parseInt(v, 10)];
    }

    if (!key) return '—';
    const t = context?.t;
    return t ? t(`${this.i18nPrefix}${key}`) : key;
  },
  formatInteractive: function (v: any, context?: any) {
    return this.formatDisplay(v, context);
  }
});

/**
 * 具体业务处理器实现
 */

const TextHandler = Object.create(BaseText);

const IntegerHandler = Object.create(BaseInt);

const PosIntHandler = Object.assign(Object.create(BaseInt), {
  ui: 'posInt',
  min: 1,
  validate: function (v: string) {
    if (v === '') return true;
    return REGEX_PATTERNS.posInt.test(v) && parseInt(v, 10) >= this.min;
  }
});

const NonNegativeIntHandler = Object.assign(Object.create(BaseInt), {
  ui: 'int',
  min: 0,
  validate: function (v: string) {
    if (v === '') return true;
    return REGEX_PATTERNS.posInt.test(v) && parseInt(v, 10) >= this.min;
  }
});

const QuantityHandler = Object.assign(Object.create(PosIntHandler), {
  ui: 'quantity',
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

const LevelHandler = Object.assign(Object.create(PosIntHandler), {
  ui: 'level',
  max: 20,
  update: function (v: string) {
    if (v === '' || v === '0') return 0; // 等级特例：允许 0 但 UI 显示为空
    const num = parseInt(v, 10);
    return isNaN(num) ? 0 : Math.min(this.max, Math.max(0, num));
  },
  formatDisplay: (v: any, context?: any) => {
    if (v === 0 || v === '0' || !v) return '';
    return context?.t ? context.t('editor.lists.level_format', { n: v }) : `${v}级`;
  },
  formatInteractive: (v: any) => (v === 0 || v === '0' || !v) ? '' : v.toString()
});

const DistanceHandler = Object.assign(Object.create(BaseInt), {
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

const BonusHandler = Object.assign(Object.create(BaseInt), {
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
  },
  formatInteractive: (v: any) => {
    const num = parseInt(v, 10);
    if (isNaN(num)) return '+0';
    return num >= 0 ? `+${num}` : `${num}`;
  }
});

const FloatHandler = Object.assign(Object.create(BaseInt), {
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

    // 限制最多两位小数
    num = Math.round(num * 100) / 100;

    return Math.min(this.max, Math.max(this.min, num));
  },
  formatInteractive: (v: any) => (v === 0 ? '0' : v.toString())
});

const CostHandler = Object.assign(Object.create(FloatHandler), {
  ui: 'cost',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    if (v === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.gp') : 'gp';
    return `${v} ${unit}`;
  }
});

const WeightHandler = Object.assign(Object.create(FloatHandler), {
  ui: 'weight',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    if (v === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.lbs') : 'lbs';
    return `${v} ${unit}`;
  }
});

const BoolHandler = Object.assign(Object.create(BaseText), {
  ui: 'bool',
  validate: (v: string) => v === 'true' || v === 'false' || v === '',
  update: (v: string) => v === 'true',
  formatDisplay: (v: any) => (v ? '是' : '否'),
  formatInteractive: (v: any) => (v ? 'true' : 'false')
});

const AbilityTypeHandler = Object.assign(Object.create(BaseSelect), {
  options: ['0', '1', '2', '3'],
  update: (v: string | number) => parseInt(String(v), 10) || 0,
  formatDisplay: (v: any) => ABILITY_TYPES[parseInt(v, 10)] || '—',
  formatInteractive: (v: any) => ABILITY_TYPES[parseInt(v, 10)] || ''
});

const SpellTypeHandler = Object.assign(Object.create(BaseSelect), {
  options: ['0', '1', '2', '3', '4'],
  update: (v: string | number) => v,
  formatDisplay: (v: any) => SPELL_TYPES[parseInt(v, 10)] || v || '—'
});

const SpellLevelHandler = Object.assign(Object.create(BaseInt), {
  validate: (v: string) => v === '' || /^[0-9]$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => (v === 0 || v === '0') ? '' : `${v}环`,
  formatInteractive: (v: any) => (v === 0 || v === '0') ? '' : v?.toString() || ''
});

const SkillAttributeHandler = Object.assign(Object.create(BaseInt), {
  ui: 'attributeIndex',
  update: (v: string | number) => {
    const val = parseInt(String(v), 10);
    return isNaN(val) || val === 0 ? 4 : val; // 默认智力
  },
  formatDisplay: (v: any, context?: any) => {
    const idx = parseInt(v, 10) || 4;
    const name = ['力量', '敏捷', '体质', '智力', '感知', '魅力'][idx - 1] || '智力';
    if (context?.modifiers) {
      const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const mod = context.modifiers[keys[idx - 1]];
      const modStr = mod >= 0 ? `+${mod}` : mod;
      return `${modStr} ${name}`;
    }
    return name;
  },
  // 确保聚焦时也显示格式化文本，并接收上下文
  formatInteractive: function (v: any, context?: any) { return this.formatDisplay(v, context); },
  options: ['1', '2', '4', '5', '6'] // 排除 3 (体质)
});

const ManeuverabilityHandler = Object.assign(Object.create(BaseIndexSelect), {
  options: MANEUVERABILITY,
  i18nPrefix: 'editor.basic.maneuverability_options.'
});

const AlignmentHandler = Object.assign(Object.create(BaseIndexSelect), {
  options: ALIGNMENTS,
  i18nPrefix: 'editor.basic.alignment_options.'
});

const SizeHandler = Object.assign(Object.create(BaseIndexSelect), {
  options: SIZES,
  i18nPrefix: 'editor.basic.size_options.'
});

const GenderHandler = Object.assign(Object.create(BaseIndexSelect), {
  options: GENDERS,
  i18nPrefix: 'editor.basic.gender_options.'
});

const AgeHandler = Object.assign(Object.create(NonNegativeIntHandler), {
  formatDisplay: (v: any, context?: any) => {
    if (v === undefined || v === null || v === '') return '';
    return context?.t ? context.t('editor.lists.age_format', { n: v }) : `${v}岁`;
  }
});
export { AgeHandler };

const HeightHandler = Object.assign(Object.create(PosIntHandler), {
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

const CritRangeHandler = Object.assign(Object.create(BaseSelect), {
  options: ['20', '19', '18', '17', '16', '15'],
  update: (v: string | number) => {
    const s = String(v);
    if (s.includes('-')) {
      const match = s.match(/^(\d+)-20$/);
      return match ? parseInt(match[1], 10) : 20;
    }
    return parseInt(s, 10) || 20;
  },
  formatDisplay: (v: any) => {
    const min = parseInt(v, 10);
    if (isNaN(min) || min >= 20) return '20';
    return `${min}-20`;
  },
  formatInteractive: (v: any) => {
    const min = parseInt(v, 10);
    if (isNaN(min) || min >= 20) return '20';
    return `${min}-20`;
  }
});

const CritMultiplierHandler = Object.assign(Object.create(BaseSelect), {
  options: ['2', '3', '4'],
  update: (v: string | number) => {
    const clean = String(v).replace('×', '').replace('x', '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 2 : num;
  },
  formatDisplay: (v: any) => (v ? `×${v}` : '—'),
  formatInteractive: (v: any) => (v ? `×${v}` : '—')
});

const DailyUsesHandler = Object.assign(Object.create(BaseInt), {
  validate: (v: string) => v === '' || /^-?\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => {
    if (v === -1) return '随意';
    return `${v}次/日`;
  },
  formatInteractive: (v: any) => v?.toString() || '0'
});

// 复合容器基类 (用于非表格的多列布局)
const CompositeHandler = {
  ui: 'composite',
  view: 'CompositeView', // 稍后我们将创建一个通用的 CompositeView
  formatDisplay: (v: any) => 'Composite Object',
  update: (v: any) => v
};

// 基础表格处理器
const BaseTable = {
  ui: 'table',
  columns: [] as any[],
  fixedRows: false,
  formatDisplay: (v: any) => `Array(${v?.length || 0})`,
  update: (v: any) => v
};

const AttributesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: 'editor.attributes.headers.attr', width: '10%' },
    { key: 'final', label: 'editor.attributes.headers.final', width: '10%', type: 'int' },
    { key: 'modifier', label: 'editor.attributes.headers.mod', width: '10%', type: 'bonus' },
    { key: 'source', label: 'editor.attributes.headers.source', width: '50%' },
    { key: 'status', label: 'editor.attributes.headers.status', width: '20%' }
  ],
  fixedRows: true
};

const AttackTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'weapon', label: 'editor.attacks.weapon', width: '20%' }, // 修正 Key
    { key: 'hit', label: 'editor.attacks.hit', width: '8%', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '12%' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '8%', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '8%', type: 'critMultiplier' },
    { key: 'range', label: 'editor.attacks.range', width: '8%', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '10%' },
    { key: 'special', label: 'editor.attacks.special', width: '26%' }
  ]
};

const DefensesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'ac', label: 'editor.defenses.ac', width: '15%', type: 'int' },
    { key: 'source', label: 'editor.attributes.headers.source', width: '55%' }, // 使用 attributes 里的 source
    { key: 'touch', label: 'editor.defenses.touch', width: '15%', type: 'int' },
    { key: 'flatFooted', label: 'editor.defenses.flat_footed', width: '15%', type: 'int' }
  ],
  fixedRows: true
};

const SavesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'fort', label: 'editor.defenses.fort', width: '33.33%', type: 'bonus' },
    { key: 'ref', label: 'editor.defenses.ref', width: '33.33%', type: 'bonus' },
    { key: 'will', label: 'editor.defenses.will', width: '33.34%', type: 'bonus' }
  ],
  fixedRows: true
};

const SkillsTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: 'editor.skills.headers.skill', width: '15%' },
    { key: 'total', label: 'editor.skills.headers.total', width: '5%', type: 'bonus' },
    { key: 'rank', label: 'editor.skills.headers.rank', width: '5%', type: 'level' },
    { key: 'cs', label: 'editor.skills.headers.cs', width: '5%', type: 'checkbox', displayFormatter: (val: any) => String(val) === 'true' ? '+3' : '' },
    { key: 'ability', label: 'editor.skills.headers.ability', width: '10%', type: 'attributeIndex' },
    { key: 'others', label: 'editor.skills.headers.others', width: '20%' },
    { key: 'special', label: 'editor.skills.headers.special', width: '35%' }
  ]
};

const SimpleListHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '25%' },
    { key: 'desc', label: 'editor.lists.description', width: '75%' }
  ]
};

const BackgroundTraitsTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '10%' },
    { key: 'desc', label: 'editor.lists.description', width: '70%' }
  ]
};

const ClassFeaturesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '5%', type: 'level' },
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '5%', type: 'abilityType' },
    { key: 'desc', label: 'editor.lists.description', width: '70%' }
  ]
};

const FeatsTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '5%', type: 'level' },
    { key: 'source', label: 'editor.lists.source', width: '10%' },
    { key: 'name', label: 'editor.lists.name', width: '20%' },
    { key: 'type', label: 'editor.lists.type', width: '10%' },
    { key: 'desc', label: 'editor.lists.description', width: '55%' }
  ]
};

const SpellTableHandler = {
  ...BaseTable,
  view: 'SpellTable'
};

const MagicBlocksHandler = {
  ...BaseTable,
  view: 'MagicBlocks',
  formatDisplay: (v: any) => `Casting Systems (${v?.length || 0})`
};

const EquipmentItemsHandler = {
  ...BaseTable,
  columns: [
    { key: 'item', label: 'editor.items.headers.item', width: '35%', hideRightBorder: true },
    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
    { key: 'cost', label: 'editor.items.headers.cost', width: '10%', type: 'cost' },
    { key: 'weight', label: 'editor.items.headers.weight', width: '10%', type: 'weight' },
    { key: 'notes', label: 'editor.items.headers.notes', width: '40%' }
  ]
};

/**
 * 业务专用复合处理器 (Composite Handlers)
 */
const BasicInfoHandler = { ...CompositeHandler };
const CombatInfoHandler = {
  ...CompositeHandler,
  columns: [
    { key: 'bab', label: 'BAB', width: '33.33%' },
    { key: 'cmb', label: 'CMB', width: '33.33%' },
    { key: 'cmd', label: 'CMD', width: '33.34%' }
  ]
};
const CurrencyHandler = { ...CompositeHandler };

/**
 * 根据 UI 类型获取对应的 Handler (兜底用)
 */
export function getHandlerByType(type: string): any {
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
  FloatHandler, BoolHandler, AbilityTypeHandler, SpellTypeHandler,
  SpellLevelHandler, DailyUsesHandler,
  getHandlerByType,
  // 业务层
  CompositeHandler,
  AttributesTableHandler,
  AttackTableHandler,
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
  CurrencyHandler
};

if (typeof window !== 'undefined') {
  Object.assign(window, handlers);
}

export default handlers;

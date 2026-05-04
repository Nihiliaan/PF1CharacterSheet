/**
 * 核心数据枚举
 */
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const SIZES = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];
const GENDERS = ['Male', 'Female', 'Other'];
const MANEUVERABILITY = ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'];
const ABILITY_TYPES = ['—', 'Sp', 'Su', 'Ex'];
const SPELL_TYPES = ['自发', '准备', '类法术能力'];

/**
 * 基础类型定义 (用于继承复用)
 */

const BaseText = {
  ui: 'text',
  validate: () => true,
  formatDisplay: (v: any) => v || '—',
  formatInteractive: (v: any) => v || '',
  get formatExport() { return this.formatDisplay; }
};

const BaseInt = {
  ui: 'number',
  validate: (v: string) => v === '' || /^-?\d+$/.test(v),
  formatDisplay: (v: any) => (v === undefined || v === '') ? '—' : v.toString(),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString()),
  get formatExport() { return this.formatDisplay; }
};

const BaseSelect = {
  ui: 'select',
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  formatInteractive: (v: any) => v?.toString() || '0',
  get formatExport() { return this.formatDisplay; }
};

/**
 * 业务展现层基础定义 (View Binding)
 */
const BaseTable = {
  ui: 'table',
  view: 'DynamicTable',
  validate: () => true,
  update: (v: any) => v,
  formatDisplay: (v: any) => `Table (${v?.length || 0} rows)`,
  formatInteractive: (v: any) => v,
  formatExport: (v: any) => v
};

/**
 * 具体业务处理器实现
 */

const TextHandler = {
  ...BaseText,
  update: (v: string) => v
};

const IntegerHandler = {
  ...BaseInt,
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10))
};

const PosIntHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : Math.max(0, parseInt(v, 10))),
  formatDisplay: (v: any) => (v || 0).toString(),
  formatInteractive: (v: any) => (v || 0).toString()
};

const QuantityHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => (v === 0 ? '0' : v.toString()),
  formatInteractive: (v: any) => (v === 0 ? '0' : v.toString())
};

const LevelHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || (/^\d+$/.test(v) && parseInt(v, 10) >= 1 && parseInt(v, 10) <= 20),
  update: (v: string) => (v === '' ? 1 : parseInt(v, 10)),
  formatDisplay: (v: any) => (v || 1).toString(),
  formatInteractive: (v: any) => (v || 1).toString()
};

const DistanceHandler = {
  ...BaseInt,
  validate: (v: string) => {
    if (v === '' || v === '0') return true;
    const num = parseInt(v.replace(/[^\d]/g, ''), 10);
    return !isNaN(num) && num % 5 === 0;
  },
  update: (v: string) => {
    const num = v.replace(/[^\d]/g, '');
    return num ? parseInt(num, 10) : 0;
  },
  formatDisplay: (v: any) => `${v || 0} ft`,
  formatInteractive: (v: any) => (v || 0).toString()
};

const AttributeIndexHandler = {
  ...BaseSelect,
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => (v > 0 && v <= 6) ? ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'][v - 1] : '—'
};

const CostHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^\d*\.?\d*$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseFloat(v)),
  formatDisplay: (v: any) => (v === 0 ? '—' : `${v} gp`),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString())
};

const WeightHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^\d*\.?\d*$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseFloat(v)),
  formatDisplay: (v: any) => (v === 0 ? '—' : `${v} lbs`),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString())
};

const ManeuverabilityHandler = {
  ...BaseSelect,
  options: MANEUVERABILITY,
  update: (v: string) => (v === '' ? 2 : parseInt(v, 10)),
  formatDisplay: (v: any) => MANEUVERABILITY[v] || '—'
};

const AlignmentHandler = {
  ...BaseSelect,
  options: ALIGNMENTS,
  update: (v: string) => (v === '' ? 4 : parseInt(v, 10)),
  formatDisplay: (v: any) => ALIGNMENTS[v] || '—'
};

const SizeHandler = {
  ...BaseSelect,
  options: SIZES,
  update: (v: string) => (v === '' ? 4 : parseInt(v, 10)),
  formatDisplay: (v: any) => SIZES[v] || '—'
};

const GenderHandler = {
  ...BaseSelect,
  options: GENDERS,
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => GENDERS[v] || '—'
};

const HeightHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^[\d\s'"]+$/.test(v),
  update: (v: string) => {
    if (!v) return 0;
    const nums = v.match(/\d+/g);
    if (!nums) return 0;
    if (nums.length >= 2) {
      return parseInt(nums[0], 10) * 12 + parseInt(nums[1], 10);
    }
    return parseInt(nums[0], 10);
  },
  formatDisplay: (v: any) => {
    if (!v) return '—';
    const ft = Math.floor(v / 12);
    const inch = v % 12;
    return `${ft}'${inch}"`;
  },
  formatInteractive: (v: any) => v?.toString() || '0'
};

const CritRangeHandler = {
  ...BaseInt,
  update: (v: string) => (v === '' ? 20 : parseInt(v, 10)),
  formatDisplay: (v: any) => (v >= 20 ? '20' : `${v}-20`),
  formatInteractive: (v: any) => v?.toString() || '20'
};

const CritMultiplierHandler = {
  ...BaseInt,
  update: (v: string) => (v === '' ? 2 : parseInt(v, 10)),
  formatDisplay: (v: any) => `x${v}`,
  formatInteractive: (v: any) => v?.toString() || '2'
};

const BonusHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^[+-]?\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v.replace('+', ''), 10)),
  formatDisplay: (v: any) => (v >= 0 ? `+${v}` : `${v}`),
  formatInteractive: (v: any) => (v === 0 ? '' : (v >= 0 ? `+${v}` : `${v}`))
};

const FloatHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^\d*\.?\d*$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseFloat(v)),
  formatDisplay: (v: any) => (v === undefined || v === '') ? '—' : v.toString(),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString())
};

const BoolHandler = {
  ui: 'bool',
  validate: (v: string) => v === 'true' || v === 'false',
  update: (v: string) => v === 'true',
  formatDisplay: (v: any) => (v ? '是' : '否'),
  formatInteractive: (v: any) => (v ? 'true' : 'false'),
  get formatExport() { return this.formatDisplay; }
};

const AbilityTypeHandler = {
  ...BaseSelect,
  options: ABILITY_TYPES,
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => ABILITY_TYPES[v] || '—'
};

const SpellTypeHandler = {
  ...BaseSelect,
  options: SPELL_TYPES,
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => SPELL_TYPES[v] || '—'
};

const SpellLevelHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^[0-9]$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => `${v}环`,
  formatInteractive: (v: any) => v?.toString() || '0'
};

const DailyUsesHandler = {
  ...BaseInt,
  validate: (v: string) => v === '' || /^-?\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => {
    if (v === -1) return '随意';
    return `${v}次/日`;
  },
  formatInteractive: (v: any) => v?.toString() || '0'
};

/**
 * 业务表现层处理器 (Table Handler Extensions)
 */

const AttributesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: '属性', width: '20%' },
    { key: 'final', label: '最终值', width: '20%' },
    { key: 'modifier', label: '调整值', width: '20%' },
    { key: 'source', label: '来源', width: '20%' },
    { key: 'status', label: '状态值', width: '20%' }
  ],
  fixedRows: true
};

const AttackTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'weapon', label: '武器名称', width: '30%' },
    { key: 'hit', label: '攻击', width: '15%' },
    { key: 'damage', label: '伤害', width: '15%' },
    { key: 'critRange', label: '暴击', width: '10%' },
    { key: 'critMultiplier', label: '倍率', width: '10%' },
    { key: 'range', label: '射程', width: '10%' },
    { key: 'special', label: '备注', width: '10%' }
  ]
};

const DefensesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'ac', label: 'AC', width: '25%' },
    { key: 'touch', label: '接触', width: '25%' },
    { key: 'flatFooted', label: '措手不及', width: '25%' },
    { key: 'source', label: '来源', width: '25%' }
  ],
  fixedRows: true
};

const SavesTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'fort', label: '强韧', width: '33.33%' },
    { key: 'ref', label: '反射', width: '33.33%' },
    { key: 'will', label: '意志', width: '33.34%' }
  ],
  fixedRows: true
};

const SkillsTableHandler = {
  ...BaseTable,
  columns: [
    { key: 'cs', label: '本职', width: '5%' },
    { key: 'name', label: '技能', width: '15%' },
    { key: 'ability', label: '属性', width: '10%' },
    { key: 'total', label: '总分', width: '5%' },
    { key: 'rank', label: '等级', width: '5%' },
    { key: 'special', label: '备注', width: '60%' }
  ]
};

const SimpleListHandler = {
  ...BaseTable,
  columns: [
    { key: 'name', label: '名称', width: '25%' },
    { key: 'desc', label: '描述', width: '75%' }
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
    { key: 'item', label: '物品', width: '40%' },
    { key: 'quantity', label: '数量', width: '10%' },
    { key: 'cost', label: '价格', width: '15%' },
    { key: 'weight', label: '重量', width: '15%' },
    { key: 'notes', label: '备注', width: '20%' }
  ]
};

/**
 * 导出与挂载
 */
const handlers: any = {
  TextHandler, IntegerHandler, PosIntHandler, QuantityHandler, LevelHandler,
  DistanceHandler, AttributeIndexHandler, CostHandler, WeightHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  HeightHandler, CritRangeHandler, CritMultiplierHandler, BonusHandler,
  FloatHandler, BoolHandler, AbilityTypeHandler, SpellTypeHandler,
  SpellLevelHandler, DailyUsesHandler,
  // 业务层
  BaseTable,
  AttributesTableHandler,
  AttackTableHandler,
  DefensesTableHandler,
  SavesTableHandler,
  SkillsTableHandler,
  SimpleListHandler,
  SpellTableHandler,
  MagicBlocksHandler,
  EquipmentItemsHandler
};

if (typeof window !== 'undefined') {
  Object.assign(window, handlers);
}

export default handlers;

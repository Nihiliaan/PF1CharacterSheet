/**
 * 核心校验正则
 */
export const REGEX_PATTERNS = {
  posInt: /^\d*$/,
  int: /^[+-]?\d*$/,
  float: /^-?\d*\.?\d*$/,
};

import { SKILL_REGISTRY, getCategoryDefaultAbility, getCategorySkillIds, getCategoryInitialValues } from '../constants/skills';
import { DEITIES_BY_PANTHEON } from '../database/deities';
import { ALL_LANGUAGES, LANGUAGES_BY_CATEGORY } from '../database/languages';
import { RACES_DATA, flattenDirectory as flattenRaces } from '../database/races';

/**
 * 基础处理器类 (Base Class)
 * 职责：定义接口规范与通用的显示/格式化逻辑
 */
export class BaseHandler {
  _ui: string = 'text';
  defaultValue: any = '';

  get ui(): string {
    return this._ui;
  }

  set ui(val: string) {
    this._ui = val;
  }

  constructor(config: Partial<BaseHandler> = {}) {
    Object.assign(this, config);
  }

  validate(v: any): boolean {
    return true;
  }

  update(v: any, context?: any): any {
    return v;
  }

  getDefaultValue(): any {
    return this.defaultValue;
  }

  formatDisplay(v: any, context?: any): any {
    return (v ?? '') === '' ? '' : String(v);
  }

  // 返回用于交互编辑的值
  formatInteractive(v: any, context?: any): any {
    return v;
  }
}

/**
 * 文本处理器
 */
export class BaseText extends BaseHandler {
  _ui = 'text';
  defaultValue = '';
}

/**
 * 数值处理器基类
 */
export class BaseInt extends BaseHandler {
  _ui = 'number';
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
 * 支持：单选/多选 (isMulti), 固定/可选可填 (isHybrid)
 */
export class BaseSelect extends BaseHandler {
  optionValues: any[] = [];
  optionIndices: number[] = [];
  defaultIndex: number = 0;
  i18nPrefix: string = '';
  separator: string = ', '; 
  
  isMulti: boolean = false;
  isHybrid: boolean = false;

  // 用于存储叶子节点到父节点的映射
  protected parentMap: Record<string, string> = {};
  // 用于存储父节点的元数据 (如 showParent)
  protected parentMetadataMap: Record<string, any> = {};

  get ui(): string {
    if (!this.isMulti && !this.isHybrid) return 'select';
    return 'datalist';
  }

  constructor(config: Partial<BaseSelect> = {}) {
    super();
    const { optionIndices, ...rest } = config;
    Object.assign(this, rest);
    this.optionIndices = optionIndices || [...this.optionValues.keys()];
  }

  getDefaultValue(): any {
    return this.isMulti ? [] : this.defaultIndex;
  }

  update(v: any, context?: any): any {
    const processItem = (item: any): any => {
      if (item === undefined || item === null || (typeof item === 'string' && item.trim() === '')) return this.defaultIndex;
      
      let index = -1;
      if (typeof item === 'number') {
        index = item;
      } else if (typeof item === 'string' && /^\d+$/.test(item.trim())) {
        index = parseInt(item.trim(), 10);
      }

      if (index !== -1 && (this.optionValues[index] !== undefined || index < this.optionValues.length)) {
        return index;
      }

      const t = context?.t;
      if (t && typeof item === 'string') {
        const foundIndex = this.optionValues.findIndex(key => 
          t(`${this.i18nPrefix}${key}`) === item.trim()
        );
        if (foundIndex !== -1) return foundIndex;
      }

      return this.isHybrid ? (typeof item === 'string' ? item.trim() : item) : this.defaultIndex;
    };

    if (this.isMulti) {
      let items = v;
      if (typeof v === 'string') {
        if (v.trim() === '') return [];
        // 如果是字符串，尝试按分隔符拆分 (兼容旧数据或直接输入的字符串)
        items = v.split(this.separator).map(s => s.trim());
      }

      if (!Array.isArray(items)) {
        if (v !== undefined && v !== null && v !== '') {
          // 仅在完全无法处理时警告
          console.warn(`[BaseSelect.update] Multi-select "${this.i18nPrefix}" received unprocessable value:`, v);
        }
        return (v === undefined || v === null || v === '') ? [] : [processItem(v)];
      }
      return Array.from(new Set(items.map(processItem))).filter(item => item !== undefined && item !== null);
    }

    return processItem(v);
  }

  formatDisplay(v: any, context?: any): string {
    if (Array.isArray(v)) {
      if (v.length === 0) return '—';
      return v.map(item => this.formatDisplay(item, context)).join(this.separator);
    }

    if (v === undefined || v === null || v === '') return '—';
    const t = context?.t;

    let index = -1;
    if (typeof v === 'number') {
      index = v;
    } else if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
      index = parseInt(v.trim(), 10);
    }

    if (index !== -1 && this.optionValues[index] !== undefined) {
      const key = this.optionValues[index];
      return t ? t(`${this.i18nPrefix}${key}`) : String(key);
    }

    return String(v);
  }

  formatInteractive(v: any, context?: any): any {
    if (this.isMulti) {
        return Array.isArray(v) ? v : [];
    }
    // 无论是混合还是普通单选，交互时都显示文本名而非序号，防止输入框显示数字
    return (v === '' || v === undefined || v === null) 
      ? '' 
      : this.formatDisplay(v, { ...context, isOption: true });
  }

  /**
   * 递归构建分组选项 tree
   */
  protected buildTree(data: any[], context?: any): any[] {
    const t = context?.t;
    // 重置映射表
    this.parentMap = {};
    this.parentMetadataMap = {};

    const build = (items: any[], parentName?: string): any[] => {
      return items.map(item => {
        if (typeof item === 'object' && item !== null && 'name' in item) {
          const label = t ? t(`${this.i18nPrefix}${item.name}`) : item.name;
          const valueIndex = this.optionValues.indexOf(item.name);
          
          if (parentName) this.parentMap[item.name] = parentName;
          
          // 存储父节点元数据
          this.parentMetadataMap[item.name] = {
            showParent: !!item.showParent
          };

          return {
            label,
            value: item.selectable ? valueIndex : item.name,
            selectable: !!item.selectable,
            children: build(item.content || [], item.name)
          };
        }
        
        if (parentName) this.parentMap[item] = parentName;

        return {
          label: t ? t(`${this.i18nPrefix}${item}`) : item,
          value: this.optionValues.indexOf(item)
        };
      });
    };

    return build(data);
  }
}

/**
 * 辅助：展平目录结构获取所有选项值
 */
function flattenDirectory(data: any[]): any[] {
  let result: any[] = [];
  data.forEach(item => {
    if (typeof item === 'object' && item !== null && 'content' in item) {
      if (item.selectable) {
        result.push(item.name);
      }
      result = result.concat(flattenDirectory(item.content));
    } else {
      result.push(item);
    }
  });
  return result;
}

/**
 * 混合选择处理器 (兼容层)
 */
export class HybridSelect extends BaseSelect {
  constructor(config: Partial<BaseSelect> = {}) {
    super({ ...config, isHybrid: true });
  }
}

/**
 * 技能名称处理器
 */
export class SkillNameHandlerClass extends HybridSelect {
  i18nPrefix = 'editor.skills.names.';

  update(v: any, context?: any): any {
    const processSingle = (item: any): any => {
        if (typeof item === 'number') return item;
        const t = context?.t;
        if (t && typeof item === 'string') {
            for (const s of SKILL_REGISTRY) {
                const cat = Math.floor(s.id / 1000);
                const idx = s.id % 1000;
                if (t(`${this.i18nPrefix}${cat}.${idx}`) === item.trim()) return s.id;
            }
        }
        return super.update(item, context);
    };

    if (this.isMulti) {
      if (!Array.isArray(v)) return [processSingle(v)];
      return v.map(processSingle);
    }
    return processSingle(v);
  }

  formatDisplay(v: any, context?: any): string {
    if (Array.isArray(v)) {
      if (v.length === 0) return '—';
      return v.map(item => this.formatDisplay(item, context)).join(', ');
    }
    const t = context?.t;
    if (!t || (v ?? '') === '') return '—';

    let name = '';
    let cat = -1;

    if (typeof v === 'number') {
      cat = Math.floor(v / 1000);
      const idx = v % 1000;
      name = t(`${this.i18nPrefix}${cat}.${idx}`);
    } else {
      name = super.formatDisplay(v, { ...context, isOption: true });
      if (typeof v === 'string') cat = context?.row?.category;
    }

    if (cat >= 2 && cat <= 5 && !context?.isOption) {
      const catName = t(`editor.skills.categories.${cat}`);
      return `${catName}（${name}）`;
    }
    
    return name;
  }

  getOptions(context?: any): number[] {
    const cat = context?.row?.category;
    if (cat !== undefined) {
      return this.getOptionIndices(cat);
    }
    return this.optionIndices;
  }

  getOptionIndices(cat: number): number[] {
    return getCategorySkillIds(cat);
  }

  isFixed(cat: number) {
    return cat <= 2;
  }

  getDefaultAbility(cat: number): number | null {
    return getCategoryDefaultAbility(cat);
  }

  getColumnCount(cat: number) {
    return cat === 5 ? 3 : 1;
  }
}

/**
 * 业务 Handler 实例
 */
const TextHandler = new BaseText();
const SkillNameHandler = new SkillNameHandlerClass();
const IntegerHandler = new BaseInt();
const PosIntHandler = new BaseInt({ ui: 'posInt', min: 1 });
const NonNegativeIntHandler = new BaseInt({ ui: 'int', min: 0 });
const QuantityHandler = new BaseInt({
  ui: 'quantity',
  min: 1,
  formatDisplay: (v: any) => {
    const n = parseInt(v, 10);
    return (isNaN(n) || n <= 1) ? '' : `×${n}`;
  }
});

const LevelHandler = new BaseInt({
  ui: 'level',
  min: 0,
  max: 20,
  formatDisplay: (v: any, context?: any) => {
    const n = parseInt(v, 10);
    if (!n || n <= 0) return '';
    return context?.t ? context.t('editor.lists.level_format', { n }) : n.toString();
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
  }
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
  }
});

const FloatHandler = new BaseFloat({ ui: 'float' });
const CostHandler = new BaseFloat({
  ui: 'cost',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    const n = parseFloat(v);
    if (isNaN(n) || n === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.gp') : 'gp';
    return `${n} ${unit}`;
  }
});

const ACPHandler = new BaseInt({
  ui: 'int',
  min: 0,
  formatDisplay: (v: any) => {
    const n = parseInt(v, 10);
    if (!n || n === 0) return '0';
    return `-${n}`;
  }
});

const WeightHandler = new BaseFloat({
  ui: 'weight',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    const n = parseFloat(v);
    if (isNaN(n) || n === 0) return '—';
    const unit = context?.t ? context.t('editor.items.units.lbs') : 'lbs';
    return `${n} ${unit}`;
  }
});

const BoolHandler = new BaseHandler({
  ui: 'bool',
  update: (v: boolean) => v === true,
  formatDisplay: (v: boolean) => v === true
});

const ClassSkillHandler = new BaseHandler({
  ui: 'bool',
  formatDisplay: (v: boolean, context?: any) => {
    const rank = parseInt(context?.row?.rank, 10);
    return (v && rank > 0) ? '+3' : '';
  },
  formatExport: (v: boolean, context?: any) => {
    const rank = parseInt(context?.row?.rank, 10);
    if (v && rank > 0) {
      const label = context?.t ? context.t('editor.skills.headers.cs') : '本职';
      return `+3${label}`;
    }
    return '';
  }
});

const AbilityTypeHandler = new BaseSelect({ optionValues: ['', 'Sp', 'Su', 'Ex'] });

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

const ManeuverabilityHandler = new BaseSelect({ optionValues: ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'], i18nPrefix: 'editor.basic.maneuverability_options.' });
const AlignmentHandler = new BaseSelect({ optionValues: ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'], i18nPrefix: 'editor.basic.alignment_options.' });
const SizeHandler = new BaseSelect({ optionValues: ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'], optionIndices: [3, 4], i18nPrefix: 'editor.basic.size_options.' });
const GenderHandler = new BaseSelect({ optionValues: ['Male', 'Female', 'Other'], i18nPrefix: 'editor.basic.gender_options.' });

const DeityHandler = new BaseSelect({
  isHybrid: true,
  optionValues: ['None', ...flattenDirectory(DEITIES_BY_PANTHEON)],
  i18nPrefix: 'editor.basic.deity_options.',
  defaultIndex: 0,
  getOptions: function(context?: any) {
    const t = context?.t;
    const noneOption = {
      label: t ? t(`${this.i18nPrefix}None`) : 'None',
      value: 0
    };
    return [noneOption, ...this.buildTree(DEITIES_BY_PANTHEON, context)];
  }
});

const RaceHandler = new BaseSelect({
  isHybrid: true,
  optionValues: flattenRaces(RACES_DATA),
  i18nPrefix: 'editor.basic.race_options.',
  getOptions: function(context?: any) {
    return this.buildTree(RACES_DATA, context);
  },
  formatDisplay: function(v: any, context?: any) {
    const t = context?.t;
    const baseDisplay = BaseSelect.prototype.formatDisplay.call(this, v, context);
    if (context?.isOption || !t || (v ?? '') === '') return baseDisplay;

    // 获取内部存储的 key
    let key = '';
    if (typeof v === 'number') {
      key = this.optionValues[v];
    } else if (typeof v === 'string') {
      key = v.trim();
    }

    const parentKey = this.parentMap[key];
    const parentMeta = parentKey ? this.parentMetadataMap[parentKey] : null;

    // 仅在父级节点显式标记了 showParent: true 时显示父类前缀
    if (parentKey && parentMeta?.showParent) {
      const parentDisplay = t(`${this.i18nPrefix}${parentKey}`);
      return `${parentDisplay} (${baseDisplay})`;
    }

    return baseDisplay;
  }
});


const TraitTypeHandler = new BaseSelect({ 
  isHybrid: true, 
  i18nPrefix: 'editor.lists.trait_options.',
  optionValues: [
    'Combat', 'Faith', 'Magic', 'Social', 'Campaign', 'Cosmic', 
    'Equipment', 'Exemplar', 'Faction', 'Family', 'Mount', 
    'Race', 'Region', 'Religion', 'Drawbacks'
  ] 
});

const SensesHandler = new BaseSelect({ 
  isHybrid: true, 
  isMulti: true, 
  optionValues: ['Darkvision', 'Low-Light Vision', 'Scent', 'Blindsight', 'Blindsense', 'Tremorsense'],
  i18nPrefix: 'editor.basic.senses_options.'
});

const LanguagesHandler = new BaseSelect({ 
  isHybrid: true, 
  isMulti: true, 
  optionValues: ALL_LANGUAGES,
  i18nPrefix: 'editor.basic.languages_options.',
  getOptions: function(context?: any) {
    return this.buildTree(LANGUAGES_BY_CATEGORY, context);
  }
});

class EncodedSelect extends BaseSelect {
  bitsPerSelection: number;
  maxSelections: number;

  constructor(config: Partial<BaseSelect> & { maxSelections?: number, bitsPerSelection?: number } = {}) {
    super({ ...config, isMulti: true });

    this.maxSelections = config.maxSelections || 2;
    
    // 强制设置 optionIndices 排除 0 (General)，使其在 UI 不可选
    if (!config.optionIndices) {
      this.optionIndices = [...this.optionValues.keys()].slice(1);
    }

    // 自动计算位数：log2(选项总数)
    // 这里不使用 +1 偏移，0 直接代表索引 0 (General)
    const bitCount = Math.ceil(Math.log2(this.optionValues.length || 1));
    this.bitsPerSelection = config.bitsPerSelection || bitCount;
  }

  /**
   * 解码：将单一数字映射回索引数组
   */
  private decode(v: number): number[] {
    if (v === undefined || v === null || typeof v !== 'number') return [];
    const ids: number[] = [];
    const mask = (1 << this.bitsPerSelection) - 1;

    // 从低位到高位提取
    // 存储结构：[MSB...LSB] 对应 [最早选择...最后选择]
    for (let i = 0; i < this.maxSelections; i++) {
      const val = (v >> (i * this.bitsPerSelection)) & mask;
      // 0 是有效的索引 (General)，但在多选中我们通常将其视为填充
      // 除非整个数组都是 0，否则我们过滤掉它
      ids.unshift(val);
    }
    
    // 过滤掉 General (0)，因为它是填充项
    const filtered = ids.filter(id => id > 0);
    // 如果过滤后为空，说明全是 General 或没选，返回 [0] 代表 General
    return filtered.length > 0 ? filtered : [0];
  }

  /**
   * 编码：将索引数组打包为单一数字 (FIFO)
   */
  private encode(ids: any[]): number {
    // 1. 过滤掉非法项，并确保是数字索引
    // 2. 移除 0 (General)，因为我们要重新打包，0 会作为填充自动存在
    const validIndices = ids
      .map(id => {
        if (typeof id === 'number') return id;
        const n = parseInt(String(id), 10);
        return isNaN(n) ? -1 : n;
      })
      .filter(id => id > 0)
      .slice(-this.maxSelections);

    let result = 0;
    // 按照 [最早 -> 高位, 最晚 -> 低位] 的顺序打包
    // 剩余的高位会自动保持为 0 (General)
    for (let i = 0; i < validIndices.length; i++) {
      const val = validIndices[i];
      const shift = (validIndices.length - 1 - i) * this.bitsPerSelection;
      result |= (val << shift);
    }
    return result;
  }

  update(v: any, context?: any): any {
    let inputIds: any[] = [];
    if (typeof v === 'number') {
      inputIds = this.decode(v);
    } else {
      // 调用基类的 update 获取处理后的索引数组
      inputIds = super.update(v, context);
      if (!Array.isArray(inputIds)) {
        inputIds = (inputIds === undefined || inputIds === null || inputIds === '') ? [] : [inputIds];
      }
    }

    return this.encode(inputIds);
  }

  formatDisplay(v: any, context?: any): string {
    if (context?.isOption) return super.formatDisplay(v, context);
    
    const ids = this.decode(typeof v === 'number' ? v : 0);
    // decode 保证了至少返回一个 [0]
    return ids
      .map(id => super.formatDisplay(id, { ...context, isOption: true }))
      .join(this.separator);
  }

  formatInteractive(v: any, context?: any): any {
    const ids = (typeof v === 'number') ? this.decode(v) : (Array.isArray(v) ? v : []);
    // UI (Combobox) 不应该看到 General (0)，否则它会显示 in 已选列表中
    return ids.filter(id => id > 0);
  }
}

const DamageTypeHandler = new EncodedSelect({ 
  optionValues: ['', 'P', 'S', 'B'],
  separator: '/',
  i18nPrefix: 'editor.attacks.damage_types.',
  maxSelections: 3
});
const FavoredClassHandler = new BaseSelect({ isHybrid: true, isMulti: true });

const FeatTypeHandler = new EncodedSelect({ 
  i18nPrefix: 'editor.lists.feat_options.',
  optionValues: [
    '', 'Combat', 'Item Creation', 'Metamagic', 
    'Teamwork', 'Critical', 'Style', 'Performance', 'Grit', 'Panache', 'Meditation', 'Conduit', 'Item Mastery',
    'Achievement', 'Story', 'Monster', 'Armor Mastery', 'Shield Mastery', 'Weapon Mastery', 'Armor Style', 'Shield Style', 'Combat Stamina',
    'Alignment', 'Damnation', 'Stare', 'Words of Power', 'Blood Hex', 'Called Shot', 'Combination', 'Targeting', 'Trick',
    'Faction', 'Familiar', 'Coven', 'Esoteric', 'Hero Point', 'Origin', 'Gathlain Court Title'
  ] 
});

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
  }
});

/**
 * 复合处理器
 */
export class BaseTable extends BaseHandler {
  _ui = 'table';
  columns: any[] = [];
  fixedRows: boolean = false;
  sortableColumns: string[] = []; 
  view?: string;

  constructor(config: Partial<BaseTable> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay(v: any) { return `Array(${v?.length || 0})`; }
}

export class CompositeHandler extends BaseHandler {
  _ui = 'composite';
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
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '12%' },
    { key: 'special', label: 'editor.attacks.special', width: '24%' }
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
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '12%' },
    { key: 'special', label: 'editor.attacks.special', width: '24%' }
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
  ],
  sortableColumns: ['name', 'total', 'rank', 'cs', 'ability']
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
  ],
  sortableColumns: ['item', 'cost', 'weight']
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

const handlers: any = {
  TextHandler, SkillNameHandler,
  IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler, LevelHandler,
  DistanceHandler, SkillAttributeHandler, CostHandler, WeightHandler, ACPHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  DeityHandler, RaceHandler, TraitTypeHandler, SensesHandler, LanguagesHandler, DamageTypeHandler,
  FavoredClassHandler, FeatTypeHandler,
  AttributesTableHandler, MeleeAttackTableHandler, RangedAttackTableHandler, DefensesTableHandler,
  SavesTableHandler, SkillsTableHandler, SimpleListHandler, BackgroundTraitsTableHandler,
  ClassFeaturesTableHandler, FeatsTableHandler, SpellTableHandler, MagicBlocksHandler, EquipmentItemsHandler,
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler,
  BaseHandler, BaseText, BaseInt, BaseSelect, BaseTable, CompositeHandler, SkillNameHandlerClass,
  DailyUsesHandler, BoolHandler, FloatHandler, AbilityTypeHandler, SpellTypeHandler, ClassSkillHandler,
  AgeHandler, HeightHandler, CritRangeHandler, CritMultiplierHandler, BonusHandler,
  getHandlerByType: (type: string): BaseHandler => {
    switch (type) {
      case 'number': case 'int': return IntegerHandler;
      case 'posInt': case 'quantity': return PosIntHandler;
      case 'level': return LevelHandler;
      case 'distance': return DistanceHandler;
      case 'bonus': return BonusHandler;
      case 'float': return FloatHandler;
      case 'cost': return CostHandler;
      case 'weight': return WeightHandler;
      case 'acp': return ACPHandler;
      case 'bool': case 'checkbox': return BoolHandler;
      case 'skillName': return SkillNameHandler;
      case 'deity': return DeityHandler;
      case 'race': return RaceHandler;
      case 'traitType': return TraitTypeHandler;
      case 'senses': return SensesHandler;
      case 'languages': return LanguagesHandler;
      case 'damageType': return DamageTypeHandler;
      case 'favoredClass': return FavoredClassHandler;
      case 'featType': return FeatTypeHandler;
      default: return TextHandler;
    }
  }
};

export default handlers;

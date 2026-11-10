/**
 * selectHandlers.ts —— 下拉/枚举类 Handler
 * 职责：BaseSelect 基类、HybridSelect/EncodedSelect 变体，以及各类业务下拉 Handler（种族、阵营、法术类型、技能名、神祇、生物类型、语言等）
 * 依赖 primitives.ts 的 BaseHandler 基类
 */
import { SKILL_REGISTRY, getCategoryDefaultAbility, getCategorySkillIds } from '../../constants/skills';
import { DEITIES_BY_PANTHEON } from '../../database/deities';
import { ALL_LANGUAGES, LANGUAGES_BY_CATEGORY } from '../../database/languages';
import { RACES_DATA, flattenDirectory as flattenRaces } from '../../database/races';
import { CREATURE_TYPES, CREATURE_SUBTYPES } from '../../database/creatures';
import i18n from 'i18next';
import { toTraditional } from '../../i18n/config';
import { getFactionDisplayName, PFS_FACTION_ENUM } from '../../database/pfsFactions';
import { BaseHandler } from './primitives';

/**
 * 选择处理器基类
 * 支持：单选/多选 (isMulti), 固定/可选可填 (isHybrid)
 */
export class BaseSelect extends BaseHandler {
  optionValues: any[] = [];
  optionIndices: number[] = [];
  defaultIndex: number = 0;
  i18nPrefix: string = '';
  separator?: string;

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

      if (typeof item === 'string') {
        const itemClean = item.trim();
        const itemLower = itemClean.toLowerCase();

        // 1. 尝试在 optionValues (英文原名) 中直接比对
        const directIdx = this.optionValues.findIndex(key => String(key).toLowerCase() === itemLower);
        if (directIdx !== -1) return directIdx;

        // 2. 尝试在 localizedMap 中比对简体与繁体
        if (this.localizedMap) {
          for (const [enKey, zhVal] of Object.entries(this.localizedMap)) {
            if (
              zhVal.toLowerCase() === itemLower ||
              toTraditional(zhVal).toLowerCase() === itemLower ||
              enKey.toLowerCase() === itemLower
            ) {
              const idx = this.optionValues.indexOf(enKey);
              if (idx !== -1) return idx;
            }
          }
        }

        // 3. 尝试通过 i18n 文本查找索引
        const t = context?.t;
        if (t) {
          const foundIndex = this.optionValues.findIndex((key, idx) => {
            return t(`${this.i18nPrefix}${idx}`) === itemClean || t(`${this.i18nPrefix}${key}`) === itemClean;
          });
          if (foundIndex !== -1) return foundIndex;
        }
      }

      return this.isHybrid ? (typeof item === 'string' ? item.trim() : item) : this.defaultIndex;
    };

    if (this.isMulti) {
      let items = v;
      if (typeof v === 'string') {
        if (v.trim() === '') return [];
        // 支持全角逗号、顿号、半角逗号、分号等切分
        items = v.split(/[,，、;；\n]+/).map(s => s.trim()).filter(Boolean);
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

  localizedMap: Record<string, string> = {};

  getLocalizedDisplay(key: string, context?: any): string | null {
    if (!this.localizedMap || Object.keys(this.localizedMap).length === 0) {
      if (typeof (this as any).getOptions === 'function') {
        (this as any).getOptions(context);
      }
    }
    if (this.localizedMap && this.localizedMap[key]) {
      const currentLang = i18n.language || 'zh';
      if (currentLang.startsWith('en')) return key;
      const zh = this.localizedMap[key];
      if (currentLang === 'zh-TW' || currentLang === 'zh-HK') {
        return toTraditional(zh);
      }
      return zh;
    }
    return null;
  }

  getSeparator(context?: any): string {
    if (this.separator) return this.separator;
    const currentLang = context?.t?.language || i18n.language || 'zh';
    return currentLang.startsWith('zh') ? '，' : ', ';
  }

  formatDisplay(v: any, context?: any): string {
    if (Array.isArray(v)) {
      if (v.length === 0) return '—';
      return v.map(item => this.formatDisplay(item, context)).join(this.getSeparator(context));
    }

    if (v === undefined || v === null || v === '') return '—';
    const t = context?.t;

    let index = -1;
    if (typeof v === 'number') {
      index = v;
    } else if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
      index = parseInt(v.trim(), 10);
    }

    let key = '';
    if (index !== -1 && this.optionValues[index] !== undefined) {
      key = this.optionValues[index];
    } else if (typeof v === 'string') {
      key = v.trim();
    }

    if (key) {
      const localized = this.getLocalizedDisplay(key, context);
      if (localized) return localized;
    }

    if (index !== -1 && this.optionValues[index] !== undefined) {
      if (!t) return String(this.optionValues[index]);

      const pathWithIndex = `${this.i18nPrefix}${index}`;
      const pathWithKey = `${this.i18nPrefix}${key}`;

      // 优先尝试按 Key 查找 (适配数据库和旧格式)
      // 如果 Key 查找成功 (返回值不等于 Key 本身)，则使用该翻译
      const resKey = t(pathWithKey);
      if (resKey !== key && resKey !== pathWithKey) return resKey;

      // 如果 Key 查找失败，尝试按 Index 查找 (适配序列化数组)
      const resIndex = t(pathWithIndex);
      if (resIndex !== String(index) && resIndex !== pathWithIndex) return resIndex;

      return String(key);
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
    const currentLang = i18n.language || 'zh';
    // 重置映射表
    this.parentMap = {};
    this.parentMetadataMap = {};
    this.localizedMap = {};

    const parsePair = (val: any): [string, string] => {
      if (Array.isArray(val)) {
        return [val[0], val[1] ?? val[0]];
      }
      return [String(val), String(val)];
    };

    const getLocalizedLabel = (pair: [string, string], i18nKey?: string): string => {
      const [en, zh] = pair;
      this.localizedMap[en] = zh;

      if (currentLang.startsWith('en')) {
        return en;
      }

      let label = zh;
      if (label === en && i18nKey && t) {
        const trans = t(i18nKey);
        if (trans && trans !== i18nKey && trans !== en) {
          label = trans;
          this.localizedMap[en] = trans;
        }
      }

      if (currentLang === 'zh-TW' || currentLang === 'zh-HK') {
        return toTraditional(label);
      }
      return label;
    };

    const build = (items: any[], parentEnName?: string): any[] => {
      return items.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'name' in item) {
          const [enName, zhName] = parsePair(item.name);
          const label = getLocalizedLabel([enName, zhName], `${this.i18nPrefix}${enName}`);
          const valueIndex = this.optionValues.indexOf(enName);

          if (parentEnName) this.parentMap[enName] = parentEnName;

          // 存储父节点元数据
          this.parentMetadataMap[enName] = {
            showParent: !!item.showParent
          };

          const keywords = [enName, zhName, toTraditional(zhName)];
          const hasContent = Array.isArray(item.content) && item.content.length > 0;
          const isSelectable = item.selectable !== undefined ? !!item.selectable : !hasContent;

          return {
            label,
            value: isSelectable ? valueIndex : enName,
            selectable: isSelectable,
            keywords,
            ...(hasContent ? { children: build(item.content, enName) } : {})
          };
        }

        const [enItem, zhItem] = parsePair(item);
        const label = getLocalizedLabel([enItem, zhItem], `${this.i18nPrefix}${enItem}`);
        if (parentEnName) this.parentMap[enItem] = parentEnName;
        const keywords = [enItem, zhItem, toTraditional(zhItem)];

        return {
          label,
          value: this.optionValues.indexOf(enItem),
          keywords
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
    if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'content' in item) {
      if (item.selectable) {
        const en = Array.isArray(item.name) ? item.name[0] : item.name;
        result.push(en);
      }
      result = result.concat(flattenDirectory(item.content));
    } else if (Array.isArray(item)) {
      result.push(item[0]);
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
            const prefix = this.i18nPrefix.endsWith('.') ? this.i18nPrefix.slice(0, -1) : this.i18nPrefix;
            const names = t(prefix, { returnObjects: true });
            for (const s of SKILL_REGISTRY) {
                const cat = Math.floor(s.id / 1000);
                const idx = s.id % 1000;
                if (names?.[cat]?.[idx] === item.trim()) return s.id;
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
      const prefix = this.i18nPrefix.endsWith('.') ? this.i18nPrefix.slice(0, -1) : this.i18nPrefix;
      const names = t(prefix, { returnObjects: true });
      name = names?.[cat]?.[idx] || t(`${this.i18nPrefix}${cat}.${idx}`);
    } else {
      name = super.formatDisplay(v, { ...context, isOption: true });
      if (typeof v === 'string') cat = context?.row?.category;
    }

    if (cat >= 2 && cat <= 5 && !context?.isOption) {
      const cats = t('editor.skills.categories', { returnObjects: true });
      const catName = Array.isArray(cats) ? cats[cat] : (cats?.[cat] || cat);
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
const SkillNameHandler = new SkillNameHandlerClass();

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
    const modifiers = context?.computed?.modifiers || context?.modifiers;
    const mod = modifiers?.[this.optionValues[v]] ?? 0;
    const attrs = context?.t ? context.t('editor.attributes', { returnObjects: true }) : null;
    const attrName = Array.isArray(attrs) ? attrs[v] : (attrs?.[v] || v);
    return `${mod >= 0 ? '+' : ''}${mod}${attrName}`;
  }
});

const ManeuverabilityHandler = new BaseSelect({ optionValues: ['Clumsy', 'Poor', 'Average', 'Good', 'Perfect'], i18nPrefix: 'editor.basic.maneuverability_options.' });
const AlignmentHandler = new BaseSelect({ optionValues: ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'], i18nPrefix: 'editor.basic.alignment_options.' });
const SizeHandler = new BaseSelect({ optionValues: ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'], optionIndices: [3, 4], i18nPrefix: 'editor.basic.size_options.' });
const GenderHandler = new BaseSelect({ optionValues: ['Male', 'Female', 'Other'], i18nPrefix: 'editor.basic.gender_options.' });

const CreatureTypeHandler = new BaseSelect({
  optionValues: CREATURE_TYPES.map(t => t[0]),
  defaultValue: 5, // Humanoid
  getOptions: function(context?: any) {
    return this.buildTree(CREATURE_TYPES, context);
  },
  formatDisplay: function(v: any, context?: any) {
    if (v === '' || v === undefined || v === null) return '';
    const idx = typeof v === 'number' ? v : this.optionValues.indexOf(v);
    if (idx >= 0 && idx < CREATURE_TYPES.length) {
      const currentLang = i18n.language || 'zh';
      if (currentLang.startsWith('en')) return CREATURE_TYPES[idx][0];
      const zh = CREATURE_TYPES[idx][1];
      return (currentLang === 'zh-TW' || currentLang === 'zh-HK') ? toTraditional(zh) : zh;
    }
    return String(v);
  }
});

const CreatureSubtypeHandler = new BaseSelect({
  isHybrid: true,
  isMulti: true,
  optionValues: CREATURE_SUBTYPES.map(t => t[0]),
  getOptions: function(context?: any) {
    return this.buildTree(CREATURE_SUBTYPES, context);
  },
  formatDisplay: function(v: any, context?: any) {
    if (v === '' || v === undefined || v === null) return '';
    const currentLang = i18n.language || 'zh';
    const resolveSingle = (item: any) => {
      const idx = typeof item === 'number' ? item : this.optionValues.indexOf(item);
      if (idx >= 0 && idx < CREATURE_SUBTYPES.length) {
        if (currentLang.startsWith('en')) return CREATURE_SUBTYPES[idx][0];
        const zh = CREATURE_SUBTYPES[idx][1];
        return (currentLang === 'zh-TW' || currentLang === 'zh-HK') ? toTraditional(zh) : zh;
      }
      return String(item);
    };

    if (Array.isArray(v)) {
      return v.map(resolveSingle).join(', ');
    }
    return resolveSingle(v);
  }
});

const DeityHandler = new BaseSelect({
  isHybrid: true,
  optionValues: ['None', ...flattenDirectory(DEITIES_BY_PANTHEON)],
  i18nPrefix: 'editor.basic.deity_options.',
  defaultIndex: 0,
  getOptions: function(context?: any) {
    const currentLang = i18n.language || 'zh';
    let noneLabel = 'None';
    if (currentLang.startsWith('zh')) {
      noneLabel = (currentLang === 'zh-TW' || currentLang === 'zh-HK') ? '無信仰' : '无信仰';
    } else if (context?.t) {
      noneLabel = context.t(`${this.i18nPrefix}None`);
    }
    const noneOption = {
      label: noneLabel,
      value: 0
    };
    return [noneOption, ...this.buildTree(DEITIES_BY_PANTHEON, context)];
  },
  formatDisplay: function(v: any, context?: any) {
    if (v === 0 || v === '0' || v === 'None') {
      const currentLang = i18n.language || 'zh';
      if (currentLang.startsWith('en')) return 'None';
      return (currentLang === 'zh-TW' || currentLang === 'zh-HK') ? '無信仰' : '无信仰';
    }
    return BaseSelect.prototype.formatDisplay.call(this, v, context);
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
    if (context?.isOption || (v ?? '') === '') return baseDisplay;

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
      const parentDisplay = this.getLocalizedDisplay(parentKey, context) || (t ? t(`${this.i18nPrefix}${parentKey}`) : parentKey);
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

  getDefaultValue(): any {
    return 0;
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
  optionValues: [
    '', 'P', 'S', 'B',
    'Acid', 'Cold', 'Electricity', 'Fire', 'Sonic', 'Force',
    'Positive', 'Negative', 'Holy', 'Unholy'
  ],
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
    'Faction', 'Familiar', 'Coven', 'Esoteric', 'Hero Point', 'Origin', 'Gathlain Court Title', 'Betrayal'
  ]
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

const PfsFactionHandler = new BaseSelect({
  optionValues: PFS_FACTION_ENUM.map(f => f.id),
  // optionIndices 控制下拉列表中供用户选择的选项，仅包含现役势力 (1-8)
  optionIndices: PFS_FACTION_ENUM.filter(f => !f.retired && f.id > 0).map(f => f.id),
  getOptions: (context?: any) => {
    const active = PFS_FACTION_ENUM.filter(f => !f.retired && f.id > 0).map(f => f.id);
    const currentVal = parseInt(context?.value ?? context?.row?.faction ?? context?.data, 10);
    // 若已有数据包含退役势力 (id >= 9)，则将该退役势力加入选项列表以确保能正确显示
    if (currentVal && !active.includes(currentVal)) {
      return [...active, currentVal];
    }
    return active;
  },
  formatDisplay: (v: any, context?: any) => {
    const id = parseInt(v, 10);
    if (!id || id <= 0) return '—';
    const lang = context?.t ? (context.t('common.lang_code') || 'zh') : 'zh';
    return getFactionDisplayName(id, lang);
  }
});

export {
  SkillNameHandler, AbilityTypeHandler, SpellTypeHandler, SkillAttributeHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  CreatureTypeHandler, CreatureSubtypeHandler, DeityHandler, RaceHandler,
  TraitTypeHandler, SensesHandler, LanguagesHandler, DamageTypeHandler,
  FavoredClassHandler, FeatTypeHandler, CritRangeHandler, CritMultiplierHandler,
  PfsFactionHandler
};

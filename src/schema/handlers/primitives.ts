/**
 * primitives.ts —— 基础层 Handler
 * 职责：核心校验正则、BaseHandler 基类与基础类型 Handler（text/int/float/bool/level/distance/cost/weight/date/link 等）
 * 本文件不依赖其他 handlers 子模块，是整个 handlers 体系的下沉基座
 */

/**
 * 核心校验正则
 */
export const REGEX_PATTERNS = {
  posInt: /^\d*$/,
  int: /^[+-]?\d*$/,
  float: /^-?\d*\.?\d*$/,
};

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

  formatExport?(v: any, context?: any): any;
  getOptions?(context?: any): any;
}

/**
 * 文本处理器
 */
export class BaseText extends BaseHandler {
  _ui = 'text';
  defaultValue = '';

  constructor(config: Partial<BaseText> = {}) {
    super();
    Object.assign(this, config);
    if (config.ui) {
      this._ui = config.ui;
    }
  }
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
 * 业务 Handler 实例
 */
const TextHandler = new BaseText();
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

const SkillTotalPointsHandler = new BaseInt({
  ui: 'int',
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    const ranks = context?.data?.skills?.rank;
    const usedPoints = Array.isArray(ranks)
      ? ranks.reduce((sum: number, r: any) => sum + (Number(r) || 0), 0)
      : 0;
    const total = (v ?? '') === '' ? 0 : v;
    return `${usedPoints}/${total}`;
  },
  formatExport: (v: any) => {
    return (v ?? '') === '' ? '0' : String(v);
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

const DailyUsesHandler = new BaseInt({
  min: 0,
  formatDisplay: (v: any, context?: any) => {
    if (!v) return context?.t ? context.t('editor.spells.at_will') : '随意使用';
    return context?.t ? context.t('editor.spells.uses_per_day', { n: v }) : `${v}次/日`;
  }
});

export class HalfIntHandlerClass extends BaseInt {
  _ui = 'halfInt';
  step = 1;
  min = 0;
  max = Infinity;
  defaultValue = 0;

  validate(v: string) {
    if (v === '') return true;
    const cleanV = this.preProcess ? this.preProcess(v) : v;
    return /^\d*(\.(5|0)?)?$/.test(cleanV);
  }

  update(v: any): number {
    if (typeof v === 'number') {
      const clamped = Math.max(0, v);
      return Math.round(clamped * 2) / 2;
    }
    if ((v ?? '') === '') return this.defaultValue;
    let strV = String(v).trim();
    if (this.preProcess) strV = this.preProcess(strV);
    const num = parseFloat(strV);
    if (isNaN(num) || num < 0) return this.defaultValue;
    return Math.round(num * 2) / 2;
  }

  formatDisplay(v: any) {
    if (v === null || v === undefined || v === '') return '0';
    return String(v);
  }
}

export const HalfIntHandler = new HalfIntHandlerClass();

export class DateHandlerClass extends BaseHandler {
  _ui = 'date';
  defaultValue = '';

  validate(v: any): boolean {
    if (!v) return true;
    const s = String(v).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) || !isNaN(Date.parse(s));
  }

  update(v: any): string {
    if (!v) return '';
    const s = String(v).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return s;
  }

  formatDisplay(v: any): string {
    return (v ?? '') === '' ? '—' : String(v);
  }
}
const DateHandler = new DateHandlerClass();

const LinkHandler = new BaseText({
  ui: 'link',
  formatDisplay: (v: any) => (v ? String(v).trim() : ''),
  formatExport: (v: any) => (v ? String(v).trim() : '')
});

export {
  TextHandler, IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler,
  LevelHandler, DistanceHandler, BonusHandler, FloatHandler, CostHandler, ACPHandler,
  SkillTotalPointsHandler, WeightHandler, BoolHandler, ClassSkillHandler,
  AgeHandler, HeightHandler, DailyUsesHandler, DateHandler, LinkHandler
};

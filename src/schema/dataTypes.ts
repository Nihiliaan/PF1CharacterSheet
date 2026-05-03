/**
 * 基础类型处理器集合
 * 所有处理器均约定包含统一的入口方法：update
 */

/** 基础文本 */
export const TextHandler = {
  validate: () => true,
  update: (v: string) => v,
  formatDisplay: (v: any) => v || '—',
  formatInteractive: (v: any) => v || '',
  formatExport: (v: any) => v || '',
};

/** 整数 */
export const IntegerHandler = {
  validate: (v: string) => v === '' || /^-?\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v, 10)),
  formatDisplay: (v: any) => v.toString(),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString()),
  formatExport: (v: any) => v.toString(),
};

/** 加值 */
export const BonusHandler = {
  validate: (v: string) => v === '' || /^[+-]?\d+$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseInt(v.replace('+', ''), 10)),
  formatDisplay: (v: any) => (v >= 0 ? `+${v}` : `${v}`),
  formatInteractive: (v: any) => (v === 0 ? '' : (v >= 0 ? `+${v}` : `${v}`)),
  formatExport: (v: any) => (v >= 0 ? `+${v}` : `${v}`),
};

/** 重量 */
export const WeightHandler = {
  validate: (v: string) => v === '' || /^\d*\.?\d*$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseFloat(v)),
  formatDisplay: (v: any) => (v === 0 ? '—' : `${v} lbs`),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString()),
  formatExport: (v: any) => (v === 0 ? '0' : v.toString()),
};

/** 等级 */
export const LevelHandler = {
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  update: (v: string) => v,
  formatDisplay: (v: any) => v || '0',
  formatInteractive: (v: any) => v,
  formatExport: (v: any) => v || '0',
};

/** 距离 */
export const DistanceHandler = {
  validate: (v: string) => v === '' || /^\d+$/.test(v),
  update: (v: string) => v,
  formatDisplay: (v: any) => (v ? `${v} ft` : '—'),
  formatInteractive: (v: any) => v,
  formatExport: (v: any) => (v ? `${v} ft` : ''),
};

/** 布尔 */
export const BoolHandler = {
  validate: (v: string) => v === 'true' || v === 'false',
  update: (v: string) => v === 'true',
  formatDisplay: (v: any) => (v ? '是' : '否'),
  formatInteractive: (v: any) => (v ? 'true' : 'false'),
  formatExport: (v: any) => (v ? 'Yes' : 'No'),
};

/** 浮动数值 */
export const FloatHandler = {
  validate: (v: string) => v === '' || /^\d*\.?\d*$/.test(v),
  update: (v: string) => (v === '' ? 0 : parseFloat(v)),
  formatDisplay: (v: any) => v.toString(),
  formatInteractive: (v: any) => (v === 0 ? '' : v.toString()),
  formatExport: (v: any) => v.toString(),
};

/**
 * 全局数据类型处理器声明
 */

interface IHandler {
  ui: 'text' | 'number' | 'select' | 'bool';
  view?: any; // 绑定业务展现层组件，如 SpellTable
  options?: string[];
  validate(v: string): boolean;
  update(v: string): any;
  formatDisplay(v: any): string;
  formatInteractive(v: any): string;
  formatExport(v: any): string;
}

declare const TextHandler: IHandler;
declare const IntegerHandler: IHandler;
declare const PosIntHandler: IHandler;
declare const QuantityHandler: IHandler;
declare const LevelHandler: IHandler;
declare const DistanceHandler: IHandler;
declare const AttributeIndexHandler: IHandler;
declare const CostHandler: IHandler;
declare const WeightHandler: IHandler;
declare const ManeuverabilityHandler: IHandler;
declare const AlignmentHandler: IHandler;
declare const SizeHandler: IHandler;
declare const GenderHandler: IHandler;
declare const HeightHandler: IHandler;
declare const CritRangeHandler: IHandler;
declare const CritMultiplierHandler: IHandler;
declare const BonusHandler: IHandler;
declare const FloatHandler: IHandler;
declare const BoolHandler: IHandler;

declare const AbilityTypeHandler: IHandler;
declare const SpellTypeHandler: IHandler;
declare const SpellLevelHandler: IHandler;
declare const DailyUsesHandler: IHandler;

declare const CompositeHandler: IHandler;
declare const TableHandler: IHandler;

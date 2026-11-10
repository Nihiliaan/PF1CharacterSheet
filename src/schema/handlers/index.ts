/**
 * index.ts —— handlers 汇总出口
 * 职责：组装默认导出对象 handlers（字段与拆分前逐个一致）、getHandlerByType 分发表，
 *       并原样转发拆分前的全部具名导出（REGEX_PATTERNS、各基类与 Class 后缀类、单例等）
 */
import {
  REGEX_PATTERNS, BaseHandler, BaseText, BaseInt, BaseFloat,
  TextHandler, IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler,
  LevelHandler, DistanceHandler, BonusHandler, FloatHandler, CostHandler, ACPHandler,
  SkillTotalPointsHandler, WeightHandler, BoolHandler, ClassSkillHandler,
  AgeHandler, HeightHandler, DailyUsesHandler,
  HalfIntHandlerClass, HalfIntHandler, DateHandlerClass, DateHandler, LinkHandler
} from './primitives';
import {
  BaseSelect, HybridSelect, SkillNameHandlerClass,
  SkillNameHandler, AbilityTypeHandler, SpellTypeHandler, SkillAttributeHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  CreatureTypeHandler, CreatureSubtypeHandler, DeityHandler, RaceHandler,
  TraitTypeHandler, SensesHandler, LanguagesHandler, DamageTypeHandler,
  FavoredClassHandler, FeatTypeHandler, CritRangeHandler, CritMultiplierHandler,
  PfsFactionHandler
} from './selectHandlers';
import {
  BaseTable, CheckGroupHandlerClass, CheckGroupHandler,
  AttributesTableHandler, MeleeAttackTableHandler, RangedAttackTableHandler,
  DefensesTableHandler, SavesTableHandler, SkillsTableHandler, SimpleListHandler,
  BackgroundTraitsTableHandler, ClassFeaturesTableHandler, PfsBoonsTableHandler,
  PfsChroniclesTableHandler, FeatsTableHandler, SpellTableHandler, MagicBlocksHandler,
  EquipmentItemsHandler
} from './tableHandlers';
import {
  CompositeHandler, BasicInfoHandler, CombatInfoHandler, CurrencyHandler
} from './composite';

// 具名导出（与拆分前 handlers.ts 完全一致）
export {
  REGEX_PATTERNS,
  BaseHandler, BaseText, BaseInt, BaseFloat, BaseSelect, HybridSelect,
  SkillNameHandlerClass, BaseTable, CompositeHandler,
  CheckGroupHandlerClass, CheckGroupHandler,
  HalfIntHandlerClass, HalfIntHandler,
  DateHandlerClass
};

const handlers: any = {
  TextHandler, SkillNameHandler,
  IntegerHandler, PosIntHandler, NonNegativeIntHandler, QuantityHandler, LevelHandler,
  DistanceHandler, SkillAttributeHandler, CostHandler, WeightHandler, ACPHandler,
  ManeuverabilityHandler, AlignmentHandler, SizeHandler, GenderHandler,
  CreatureTypeHandler, CreatureSubtypeHandler,
  DeityHandler, RaceHandler, TraitTypeHandler, SensesHandler, LanguagesHandler, DamageTypeHandler,
  FavoredClassHandler, FeatTypeHandler,
  AttributesTableHandler, MeleeAttackTableHandler, RangedAttackTableHandler, DefensesTableHandler,
  SavesTableHandler, SkillsTableHandler, SimpleListHandler, BackgroundTraitsTableHandler,
  ClassFeaturesTableHandler, FeatsTableHandler, PfsBoonsTableHandler, PfsFactionHandler, PfsChroniclesTableHandler, CheckGroupHandler, CheckGroupHandlerClass, HalfIntHandler, HalfIntHandlerClass, DateHandler, DateHandlerClass, SpellTableHandler, MagicBlocksHandler, EquipmentItemsHandler,
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler, LinkHandler,
  BaseHandler, BaseText, BaseInt, BaseSelect, BaseTable, CompositeHandler, SkillNameHandlerClass,
  DailyUsesHandler, BoolHandler, FloatHandler, AbilityTypeHandler, SpellTypeHandler, ClassSkillHandler,
  AgeHandler, HeightHandler, CritRangeHandler, CritMultiplierHandler, BonusHandler, SkillTotalPointsHandler,
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
      case 'creatureType': return CreatureTypeHandler;
      case 'creatureSubtype': return CreatureSubtypeHandler;
      case 'traitType': return TraitTypeHandler;
      case 'senses': return SensesHandler;
      case 'languages': return LanguagesHandler;
      case 'damageType': return DamageTypeHandler;
      case 'favoredClass': return FavoredClassHandler;
      case 'featType': return FeatTypeHandler;
      case 'date': return DateHandler;
      case 'pfsFaction': return PfsFactionHandler;
      case 'checkGroup': return CheckGroupHandler;
      case 'halfInt': return HalfIntHandler;
      case 'link': return LinkHandler;
      default: return TextHandler;
    }
  }
};

export default handlers;

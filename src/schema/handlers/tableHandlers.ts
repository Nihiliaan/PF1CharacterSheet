/**
 * tableHandlers.ts —— 业务表格 Handler
 * 职责：BaseTable 基类与各业务表格实例（属性表、攻击表、豁免表、技能表、法术表、装备表、PFS 表等）
 * 依赖 primitives.ts 的 BaseHandler 基类
 */
import { BaseHandler } from './primitives';

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

const AttributesTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.attributes_headers.attr', width: '10%' },
    { key: 'final', label: 'editor.attributes_headers.final', width: '10%', type: 'int' },
    { key: 'modifier', label: 'editor.attributes_headers.mod', width: '10%', type: 'bonus' },
    { key: 'source', label: 'editor.attributes_headers.source', width: '50%' },
    { key: 'status', label: 'editor.attributes_headers.status', width: '20%' }
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
    { key: 'source', label: 'editor.attributes_headers.source', width: '55%' },
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

export class CheckGroupHandlerClass extends BaseHandler {
  _ui = 'checkGroup';
  defaultValue = 0;

  validate(v: any): boolean {
    const num = parseInt(v, 10);
    return !isNaN(num) && num >= 0;
  }

  update(v: any): number {
    const num = parseInt(v, 10);
    return isNaN(num) || num < 0 ? 0 : num;
  }

  formatDisplay(v: any): string {
    const num = parseInt(v, 10) || 0;
    const checks = num & 0xff;
    const max = (num >> 8) & 0xff;
    if (max <= 0) return '—';
    return `${checks} / ${max}`;
  }
}

export const CheckGroupHandler = new CheckGroupHandlerClass();

const PfsBoonsTableHandler = new BaseTable({
  columns: [
    { key: 'uses', label: 'editor.pfs.boon_uses_tracking', width: '22%', type: 'checkGroup' },
    { key: 'name', label: 'editor.pfs.boon_name', width: '24%', type: 'text' },
    { key: 'desc', label: 'editor.pfs.boon_desc', width: '42%', type: 'text' },
    { key: 'sheetNo', label: 'editor.pfs.boon_sheet_no', width: '12%', type: 'posInt' }
  ]
});

const PfsChroniclesTableHandler = new BaseTable({
  columns: [
    { key: 'date', label: 'editor.pfs.chronicle_date', width: '12%', type: 'date' },
    { key: 'scenario', label: 'editor.pfs.chronicle_scenario', width: '28%', type: 'text' },
    { key: 'gm', label: 'editor.pfs.chronicle_gm', width: '12%', type: 'text' },
    { key: 'event', label: 'editor.pfs.chronicle_event', width: '12%', type: 'text' },
    { key: 'faction', label: 'editor.pfs.chronicle_faction', width: '14%', type: 'pfsFaction' },
    { key: 'prestige', label: 'editor.pfs.chronicle_pp', width: '6%', type: 'halfInt' },
    { key: 'notes', label: 'editor.pfs.chronicle_notes', width: '10%', type: 'text' },
    { key: 'link', label: 'editor.pfs.chronicle_link', width: '6%', type: 'link' }
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

export {
  AttributesTableHandler, MeleeAttackTableHandler, RangedAttackTableHandler,
  DefensesTableHandler, SavesTableHandler, SkillsTableHandler, SimpleListHandler,
  BackgroundTraitsTableHandler, ClassFeaturesTableHandler, PfsBoonsTableHandler,
  PfsChroniclesTableHandler, FeatsTableHandler, SpellTableHandler, MagicBlocksHandler,
  EquipmentItemsHandler
};

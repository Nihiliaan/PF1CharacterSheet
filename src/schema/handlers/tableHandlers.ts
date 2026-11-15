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

// 列宽模型（与分栏一致的思路）：短内容列（等级/来源/类型/数值/名称等）为名称式短文本或数值类型，
// 不换行渲染——表格 auto 布局天然"以显示的文字为准"：列宽 = 显示文字实际宽度，内容更长列自动放宽，
// 无需写死 minWidth 地板。每表留一个不设宽的多行弹性列（描述/来源/备注等）吸收剩余空间；
// 弹性列的 minWidth 仅防极端收缩，多行文本经 min-content 传播参与分栏最小宽与整体缩放时机。

const AttributesTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.attributes_headers.attr', width: '1%', type: 'name' },
    { key: 'final', label: 'editor.attributes_headers.final', width: '1%', type: 'int' },
    { key: 'modifier', label: 'editor.attributes_headers.mod', width: '1%', type: 'bonus' },
    { key: 'source', label: 'editor.attributes_headers.source', minWidth: '140px' },
    { key: 'status', label: 'editor.attributes_headers.status', width: '1%' }
  ],
  fixedRows: true
});

const MeleeAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.melee', width: '1%', type: 'name' },
    { key: 'hit', label: 'editor.attacks.hit', width: '1%', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '1%', type: 'name' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '1%', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '1%', type: 'critMultiplier' },
    { key: 'touch', label: 'editor.attacks.reach', width: '1%', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '1%' },
    { key: 'special', label: 'editor.attacks.special', width: '25%', type: 'name' }
  ]
});

const RangedAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.ranged', width: '1%', type: 'name' },
    { key: 'hit', label: 'editor.attacks.hit', width: '1%', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '1%', type: 'name' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '1%', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '1%', type: 'critMultiplier' },
    { key: 'range', label: 'editor.attacks.range', width: '1%', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '1%' },
    { key: 'special', label: 'editor.attacks.special', width: '25%', type: 'name' }
  ]
});

const DefensesTableHandler = new BaseTable({
  columns: [
    { key: 'ac', label: 'editor.defenses.ac', width: '1%', type: 'int' },
    { key: 'source', label: 'editor.attributes_headers.source', minWidth: '140px' },
    { key: 'touch', label: 'editor.defenses.touch', width: '1%', type: 'int' },
    { key: 'flatFooted', label: 'editor.defenses.flat_footed', width: '1%', type: 'int' }
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
    { key: 'name', label: 'editor.skills.headers.skill', width: '1%', type: 'name' },
    { key: 'category', label: 'editor.lists.category', width: '0%', type: 'int' },
    { key: 'total', label: 'editor.skills.headers.total', width: '1%', type: 'bonus' },
    { key: 'rank', label: 'editor.skills.headers.rank', width: '1%', type: 'level' },
    { key: 'cs', label: 'editor.skills.headers.cs', width: '1%', type: 'classSkill' },
    { key: 'ability', label: 'editor.skills.headers.ability', width: '1%', type: 'attributeIndex' },
    { key: 'others', label: 'editor.skills.headers.others', width: '1%', type: 'name' },
    { key: 'special', label: 'editor.skills.headers.special', minWidth: '200px' }
  ],
  sortableColumns: ['name', 'total', 'rank', 'cs', 'ability']
});

const SimpleListHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '1%', type: 'name' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const BackgroundTraitsTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '1%', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', type: 'name' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const ClassFeaturesTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '1%', type: 'level' },
    { key: 'name', label: 'editor.lists.name', width: '1%', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', type: 'abilityType' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
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
    // 三条窄列不设百分比宽——不换行渲染（type:'name'/数值类型）使其收缩到显示文字宽，
    // desc 不设宽 → 多行换行吸收全部剩余空间（minWidth 仅防极端收缩）
    { key: 'uses', label: 'editor.pfs.boon_uses_tracking', width: '1%', type: 'checkGroup' },
    { key: 'name', label: 'editor.pfs.boon_name', width: '1%', type: 'name' },
    { key: 'desc', label: 'editor.pfs.boon_desc', minWidth: '220px', type: 'text' },
    { key: 'sheetNo', label: 'editor.pfs.boon_sheet_no', width: '1%', type: 'posInt' }
  ]
});

const PfsChroniclesTableHandler = new BaseTable({
  columns: [
    { key: 'date', label: 'editor.pfs.chronicle_date', width: '1%', type: 'date' },
    { key: 'scenario', label: 'editor.pfs.chronicle_scenario', minWidth: '140px', type: 'text' },
    { key: 'gm', label: 'editor.pfs.chronicle_gm', width: '1%', type: 'name' },
    { key: 'event', label: 'editor.pfs.chronicle_event', width: '1%', type: 'name' },
    { key: 'faction', label: 'editor.pfs.chronicle_faction', width: '1%', type: 'pfsFaction' },
    { key: 'prestige', label: 'editor.pfs.chronicle_pp', width: '1%', type: 'halfInt' },
    { key: 'notes', label: 'editor.pfs.chronicle_notes', width: '1%', type: 'text' },
    { key: 'link', label: 'editor.pfs.chronicle_link', width: '1%', type: 'link' }
  ]
});

const FeatsTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '1%', type: 'level' },
    { key: 'source', label: 'editor.lists.source', width: '1%', type: 'name' },
    { key: 'name', label: 'editor.lists.name', width: '1%', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', type: 'name' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const SpellTableHandler = new BaseTable({ view: 'SpellTable' });
const MagicBlocksHandler = new BaseTable({ view: 'MagicBlocks' });
const EquipmentItemsHandler = new BaseTable({
  columns: [
    { key: 'item', label: 'editor.items.headers.item', width: '1%', minWidth: '110px', hideRightBorder: true },
    { key: 'quantity', label: '', width: '1%', type: 'quantity' },
    { key: 'cost', label: 'editor.items.headers.cost', width: '1%', type: 'cost' },
    { key: 'weight', label: 'editor.items.headers.weight', width: '1%', type: 'weight' },
    { key: 'notes', label: 'editor.items.headers.notes', minWidth: '120px' }
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

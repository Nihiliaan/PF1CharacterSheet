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

// 列宽模型（与分栏一致的思路）：短内容列（等级/来源/类型/数值等）width:'1%' + minWidth——
// 收缩到"不换行的内容最小宽"，内容更长则自动放宽；每表留一个不设宽的弹性列（描述/来源/特性等）吸收剩余空间。
// minWidth 为叶子层声明，参与 min-content 传播（决定分栏最小宽与整体缩放时机）。
// 名称类列（武器/名称/物品/技能/特性等）显式 align:'center' 居中。

const AttributesTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.attributes_headers.attr', width: '1%', minWidth: '56px', type: 'name' },
    { key: 'final', label: 'editor.attributes_headers.final', width: '1%', minWidth: '56px', type: 'int' },
    { key: 'modifier', label: 'editor.attributes_headers.mod', width: '1%', minWidth: '56px', type: 'bonus' },
    { key: 'source', label: 'editor.attributes_headers.source', minWidth: '140px' },
    { key: 'status', label: 'editor.attributes_headers.status', width: '1%', minWidth: '72px' }
  ],
  fixedRows: true
});

const MeleeAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.melee', width: '1%', minWidth: '96px', type: 'name' },
    { key: 'hit', label: 'editor.attacks.hit', width: '1%', minWidth: '56px', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '1%', minWidth: '72px' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '1%', minWidth: '64px', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '1%', minWidth: '64px', type: 'critMultiplier' },
    { key: 'touch', label: 'editor.attacks.reach', width: '1%', minWidth: '64px', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '1%', minWidth: '114px' },
    { key: 'special', label: 'editor.attacks.special', minWidth: '96px', type: 'name' }
  ]
});

const RangedAttackTableHandler = new BaseTable({
  columns: [
    { key: 'weapon', label: 'editor.attacks.ranged', width: '1%', minWidth: '96px', type: 'name' },
    { key: 'hit', label: 'editor.attacks.hit', width: '1%', minWidth: '56px', type: 'bonus' },
    { key: 'damage', label: 'editor.attacks.damage', width: '1%', minWidth: '72px' },
    { key: 'critRange', label: 'editor.attacks.crit_range', width: '1%', minWidth: '64px', type: 'critRange' },
    { key: 'critMultiplier', label: 'editor.attacks.crit_multiplier', width: '1%', minWidth: '64px', type: 'critMultiplier' },
    { key: 'range', label: 'editor.attacks.range', width: '1%', minWidth: '64px', type: 'distance' },
    { key: 'damageType', label: 'editor.attacks.damage_type', width: '1%', minWidth: '114px' },
    { key: 'special', label: 'editor.attacks.special', minWidth: '96px', type: 'name' }
  ]
});

const DefensesTableHandler = new BaseTable({
  columns: [
    { key: 'ac', label: 'editor.defenses.ac', width: '1%', minWidth: '56px', type: 'int' },
    { key: 'source', label: 'editor.attributes_headers.source', minWidth: '140px' },
    { key: 'touch', label: 'editor.defenses.touch', width: '1%', minWidth: '56px', type: 'int' },
    { key: 'flatFooted', label: 'editor.defenses.flat_footed', width: '1%', minWidth: '56px', type: 'int' }
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
    { key: 'name', label: 'editor.skills.headers.skill', width: '1%', minWidth: '110px', type: 'name' },
    { key: 'category', label: 'editor.lists.category', width: '0%', type: 'int' },
    { key: 'total', label: 'editor.skills.headers.total', width: '1%', minWidth: '48px', type: 'bonus' },
    { key: 'rank', label: 'editor.skills.headers.rank', width: '1%', minWidth: '48px', type: 'level' },
    { key: 'cs', label: 'editor.skills.headers.cs', width: '1%', minWidth: '40px', type: 'classSkill' },
    { key: 'ability', label: 'editor.skills.headers.ability', width: '1%', minWidth: '72px', type: 'attributeIndex' },
    { key: 'others', label: 'editor.skills.headers.others', width: '1%', minWidth: '88px' },
    { key: 'special', label: 'editor.skills.headers.special', minWidth: '200px' }
  ],
  sortableColumns: ['name', 'total', 'rank', 'cs', 'ability']
});

const SimpleListHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '1%', minWidth: '120px', type: 'name' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const BackgroundTraitsTableHandler = new BaseTable({
  columns: [
    { key: 'name', label: 'editor.lists.name', width: '1%', minWidth: '120px', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', minWidth: '88px' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const ClassFeaturesTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '1%', minWidth: '56px', type: 'level' },
    { key: 'name', label: 'editor.lists.name', width: '1%', minWidth: '120px', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', minWidth: '72px', type: 'abilityType' },
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
    // 三条窄列不设百分比宽——width:'1%' + minWidth 让其收缩到内容宽（内容更长则自动放宽），
    // desc 不设宽 → 吸收全部剩余空间；minWidth 为语义最小宽（叶子层声明，参与 min-content 传播）
    { key: 'uses', label: 'editor.pfs.boon_uses_tracking', width: '1%', minWidth: '72px', type: 'checkGroup' },
    { key: 'name', label: 'editor.pfs.boon_name', width: '1%', minWidth: '120px', type: 'name' },
    { key: 'desc', label: 'editor.pfs.boon_desc', minWidth: '220px', type: 'text' },
    { key: 'sheetNo', label: 'editor.pfs.boon_sheet_no', width: '1%', minWidth: '72px', type: 'posInt' }
  ]
});

const PfsChroniclesTableHandler = new BaseTable({
  columns: [
    { key: 'date', label: 'editor.pfs.chronicle_date', width: '1%', minWidth: '88px', type: 'date' },
    { key: 'scenario', label: 'editor.pfs.chronicle_scenario', minWidth: '140px', type: 'text' },
    { key: 'gm', label: 'editor.pfs.chronicle_gm', width: '1%', minWidth: '72px', type: 'text' },
    { key: 'event', label: 'editor.pfs.chronicle_event', width: '1%', minWidth: '64px', type: 'text' },
    { key: 'faction', label: 'editor.pfs.chronicle_faction', width: '1%', minWidth: '88px', type: 'pfsFaction' },
    { key: 'prestige', label: 'editor.pfs.chronicle_pp', width: '1%', minWidth: '48px', type: 'halfInt' },
    { key: 'notes', label: 'editor.pfs.chronicle_notes', width: '1%', minWidth: '96px', type: 'text' },
    { key: 'link', label: 'editor.pfs.chronicle_link', width: '1%', minWidth: '48px', type: 'link' }
  ]
});

const FeatsTableHandler = new BaseTable({
  columns: [
    { key: 'level', label: 'editor.lists.level', width: '1%', minWidth: '56px', type: 'level' },
    { key: 'source', label: 'editor.lists.source', width: '1%', minWidth: '88px' },
    { key: 'name', label: 'editor.lists.name', width: '1%', minWidth: '120px', type: 'name' },
    { key: 'type', label: 'editor.lists.type', width: '1%', minWidth: '88px' },
    { key: 'desc', label: 'editor.lists.description', minWidth: '200px' }
  ]
});

const SpellTableHandler = new BaseTable({ view: 'SpellTable' });
const MagicBlocksHandler = new BaseTable({ view: 'MagicBlocks' });
const EquipmentItemsHandler = new BaseTable({
  columns: [
    { key: 'item', label: 'editor.items.headers.item', width: '1%', minWidth: '110px', type: 'name', hideRightBorder: true },
    { key: 'quantity', label: '', width: '1%', minWidth: '48px', type: 'quantity' },
    { key: 'cost', label: 'editor.items.headers.cost', width: '1%', minWidth: '72px', type: 'cost' },
    { key: 'weight', label: 'editor.items.headers.weight', width: '1%', minWidth: '72px', type: 'weight' },
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

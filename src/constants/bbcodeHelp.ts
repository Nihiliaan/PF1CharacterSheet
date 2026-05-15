export interface BBCodeSyntaxItem {
  code: string;
  desc: string;
  example?: string;
}

export interface BBCodeTreeItem {
  key: string;
  desc: string;
  children?: BBCodeTreeItem[];
  isSoA?: boolean;
}

export const BBCODE_SYNTAX_GUIDE: BBCodeSyntaxItem[] = [
  { code: '{{field}}', desc: '输出变量的格式化文本值' },
  { code: '{{raw "field"}}', desc: '输出变量的原始数值 (常用于计算或逻辑判断)', example: '{{#if (eq (raw "spellType") 1)}}...{{/if}}' },
  { code: '{{raw "../field"}}', desc: '在循环内部访问上一层级原始数据' },
  { code: '{{#with field}}...{{/with}}', desc: '进入一个对象的作用域' },
  { code: '{{#each field}}...{{/each}}', desc: '遍历数组或 SoA 结构。在内部可使用当前行字段，也可使用 {{@index}}、{{@first}}、{{@last}}' },
  { code: '{{#if condition}}...{{else}}...{{/if}}', desc: '条件判断' },
  { code: '{{#unless condition}}...{{/unless}}', desc: '反向条件判断 (当条件为 false 时显示)' },
  { code: '(eq a b)', desc: '逻辑 Helper: 相等判断', example: '{{#if (eq (raw "size") 4)}}中型{{/if}}' },
  { code: '(and a b), (or a b), (not a)', desc: '逻辑 Helper: 与、或、非运算' },
  { code: '{{md2bb field}}', desc: '将 Markdown 链接 [文字](url) 转换为 BBCode [url=url]文字[/url]' },
  { code: '{{#md2bb}}...{{/md2bb}}', desc: '块级 Helper: 将内部所有 Markdown 链接转换为 BBCode' },
];

export const BBCODE_DATA_TREE: BBCodeTreeItem[] = [
  {
    key: 'basic',
    desc: '基础信息',
    children: [
      { key: 'name', desc: '角色名' },
      { key: 'classes', desc: '职业等级' },
      { key: 'alignment', desc: '阵营' },
      { key: 'race', desc: '种族' },
      { key: 'deity', desc: '信仰' },
      { key: 'size', desc: '体型' },
      { key: 'gender', desc: '性别' },
      { key: 'age', desc: '年龄' },
      { key: 'height', desc: '身高' },
      { key: 'weight', desc: '体重' },
      { key: 'initiative', desc: '先攻加值' },
      { key: 'perception', desc: '察觉加值' },
      { key: 'languages', desc: '语言' },
      { key: 'senses', desc: '感官' },
      {
        key: 'speed', desc: '速度对象', children: [
          { key: 'land', desc: '陆地速度' },
          { key: 'fly', desc: '飞行速度' },
          { key: 'swim', desc: '游泳速度' },
          { key: 'climb', desc: '攀爬速度' },
          { key: 'burrow', desc: '掘地速度' },
          { key: 'maneuverability', desc: '机动性 (原始值 0-4)' },
        ]
      },
      {
        key: 'avatars', desc: '头像 SoA', isSoA: true, children: [
          { key: 'url', desc: '图片链接' },
          { key: 'note', desc: '备注' },
        ]
      },
    ]
  },
  { key: 'story', desc: '背景故事 (Markdown 文本)' },
  {
    key: 'attributes',
    desc: '属性 SoA',
    isSoA: true,
    children: [
      { key: 'name', desc: '属性名' },
      { key: 'final', desc: '最终值' },
      { key: 'modifier', desc: '调整值' },
      { key: 'source', desc: '基础与加值说明' },
      { key: 'status', desc: '状态/临时修正' },
    ]
  },
  {
    key: 'combatTable',
    desc: '战斗属性',
    children: [
      { key: 'bab', desc: '基本攻击加值' },
      { key: 'cmb', desc: '战技加值' },
      { key: 'cmd', desc: '战技防御' },
    ]
  },
  { key: 'combatManeuverNotes', desc: '战技备注' },
  {
    key: 'attacks',
    desc: '攻击信息',
    children: [
      {
        key: 'meleeAttacks', desc: '近战攻击 SoA', isSoA: true, children: [
          { key: 'weapon', desc: '武器名称' },
          { key: 'hit', desc: '攻击加值' },
          { key: 'damage', desc: '伤害骰/值' },
          { key: 'critRange', desc: '暴击威胁范围 (如 20)' },
          { key: 'critMultiplier', desc: '暴击倍率 (如 2)' },
          { key: 'range', desc: '射程' },
          { key: 'damageType', desc: '伤害类型' },
          { key: 'special', desc: '特殊属性/说明' },
        ]
      },
      {
        key: 'rangedAttacks', desc: '远程攻击 SoA', isSoA: true, children: [
          { key: 'weapon', desc: '武器名称' },
          { key: 'hit', desc: '攻击加值' },
          { key: 'damage', desc: '伤害骰/值' },
          { key: 'critRange', desc: '暴击威胁范围' },
          { key: 'critMultiplier', desc: '暴击倍率' },
          { key: 'range', desc: '射程' },
          { key: 'damageType', desc: '伤害类型' },
          { key: 'special', desc: '特殊属性/说明' },
        ]
      },
      { key: 'specialAttacks', desc: '特殊攻击 (文本)' },
    ]
  },
  {
    key: 'defenses',
    desc: '防御信息',
    children: [
      { key: 'hp', desc: '生命值' },
      { key: 'hd', desc: '生命骰 (文本, 如 1d10+2)' },
      {
        key: 'acTable', desc: 'AC 详情', children: [
          { key: 'ac', desc: '防御等级' },
          { key: 'touch', desc: '接触' },
          { key: 'flatFooted', desc: '措手不及' },
          { key: 'source', desc: 'AC 组成说明' },
        ]
      },
      { key: 'acNotes', desc: 'AC 备注' },
      {
        key: 'savesTable', desc: '存档详情', children: [
          { key: 'fort', desc: '强韧存档' },
          { key: 'ref', desc: '反射存档' },
          { key: 'will', desc: '意志存档' },
        ]
      },
      { key: 'savesNotes', desc: '存档备注' },
      { key: 'defensiveAbilities', desc: '防御能力' },
      { key: 'specialDefenses', desc: '特殊防御' },
    ]
  },
  {
    key: 'racialTraits',
    desc: '种族特性 SoA',
    isSoA: true,
    children: [
      { key: 'name', desc: '特性名' },
      { key: 'desc', desc: '特性描述' },
    ]
  },
  {
    key: 'backgroundTraits',
    desc: '背景特性 SoA',
    isSoA: true,
    children: [
      { key: 'name', desc: '特性名' },
      { key: 'type', desc: '特性类别' },
      { key: 'desc', desc: '特性描述' },
    ]
  },
  { key: 'favoredClass', desc: '天赋职业' },
  { key: 'favoredClassBonus', desc: '天赋职业奖励' },
  {
    key: 'classFeatures',
    desc: '职业特性 SoA',
    isSoA: true,
    children: [
      { key: 'level', desc: '获得等级' },
      { key: 'name', desc: '特性名' },
      { key: 'type', desc: '特性类型 (原始值 0:-, 1:Sp, 2:Su, 3:Ex)' },
      { key: 'desc', desc: '特性描述' },
    ]
  },
  {
    key: 'feats',
    desc: '专长 SoA',
    isSoA: true,
    children: [
      { key: 'level', desc: '获得等级' },
      { key: 'source', desc: '获得来源' },
      { key: 'name', desc: '专长名' },
      { key: 'type', desc: '专长类别' },
      { key: 'desc', desc: '专长描述' },
    ]
  },
  {
    key: 'skills',
    desc: '技能 SoA',
    isSoA: true,
    children: [
      { key: 'name', desc: '技能名' },
      { key: 'total', desc: '总加值' },
      { key: 'rank', desc: '技能等级' },
      { key: 'cs', desc: '本职技能 (布尔值)' },
      { key: 'ability', desc: '关联属性 (原始值 1-6)' },
      { key: 'others', desc: '其它修正' },
      { key: 'special', desc: '特殊加值说明' },
    ]
  },
  { key: 'skillsTotal', desc: '技能点总数' },
  { key: 'armorCheckPenalty', desc: '防具检定减值 (ACP)' },
  { key: 'skillsNotes', desc: '技能备注' },
  {
    key: 'magicBlocks',
    desc: '法术/能力块数组 (Array)',
    children: [
      { key: 'title', desc: '标题' },
      { key: 'casterLevel', desc: '施法者等级' },
      { key: 'concentration', desc: '专注加值' },
      { key: 'spellType', desc: '法术类型 (1:自发, 2:准备, 4:类法术, 5:其它表格)' },
      { key: 'notes', desc: '块备注' },
      {
        key: 'tableData', desc: '表格内容 SoA', isSoA: true, children: [
          { key: 'level', desc: '环位/等级 (由系统自动计算注入)' },
          { key: 'spells', desc: '法术名/项' },
          { key: 'uses', desc: '使用次数/次数说明' },
        ]
      },
    ]
  },
  {
    key: 'equipmentBags',
    desc: '物品栏数组 (Array)',
    children: [
      { key: 'name', desc: '包名' },
      { key: 'ignoreWeight', desc: '是否忽略重量 (布尔值)' },
      {
        key: 'items', desc: '物品 SoA', isSoA: true, children: [
          { key: 'item', desc: '物品名称' },
          { key: 'quantity', desc: '数量' },
          { key: 'cost', desc: '单价 (gp)' },
          { key: 'weight', desc: '单重 (lbs)' },
          { key: 'notes', desc: '物品备注' },
        ]
      },
    ]
  },
  { key: 'equipmentNotes', desc: '装备总备注' },
  {
    key: 'currency',
    desc: '货币/资产详情',
    children: [
      { key: 'pp', desc: '白金币 (pp)' },
      { key: 'gp', desc: '金币 (gp)' },
      { key: 'sp', desc: '银币 (sp)' },
      { key: 'cp', desc: '铜币 (cp)' },
      { key: 'coinWeight', desc: '货币总重' },
    ]
  },
  { key: 'totalCost', desc: '总资产 (gp)' },
  { key: 'totalWeight', desc: '负重总重 (lbs)' },
  { key: 'encumbrance', desc: '负重状态 (轻/中/重/超/不动)' },
  { key: 'additionalData', desc: '附加数据数组' },
];

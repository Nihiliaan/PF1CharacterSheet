import { CharacterData } from './types';

export const DEFAULT_DATA: CharacterData = {
  id: '',
  folderId: null,
  ownerId: '',
  targetId: '',

  basic: {
    name: '新人物',
    classes: '',
    alignment: 4, // N
    size: 4, // Medium
    gender: 0,
    race: '',
    age: 0,
    height: 0,
    weight: 0,
    speed: {
      land: 30,
      fly: 0,
      maneuverability: 2, // Average
      swim: 0,
      climb: 0,
      burrow: 0
    },
    senses: '',
    initiative: 0,
    perception: 0,
    languages: '',
    deity: '',
    avatars: {
      url: [],
      note: []
    },
  },
  story: '',
  attributes: {
    final: [10, 10, 10, 10, 10, 10],
    modifier: [0, 0, 0, 0, 0, 0],
    source: ['10', '10', '10', '10', '10', '10'],
    status: ['', '', '', '', '', '']
  },
  combatTable: {
    bab: 0,
    cmb: 0,
    cmd: 10
  },
  combatManeuverNotes: '',
  attacks: {
    meleeAttacks: {
      weapon: [],
      hit: [],
      damage: [],
      critRange: [],
      critMultiplier: [],
      range: [],
      damageType: [],
      special: []
    },
    rangedAttacks: {
      weapon: [],
      hit: [],
      damage: [],
      critRange: [],
      critMultiplier: [],
      range: [],
      damageType: [],
      special: []
    },
    specialAttacks: '',
  },
  defenses: {
    hp: 0,
    hd: '',
    acTable: {
      ac: 10,
      source: '10',
      flatFooted: 10,
      touch: 10
    },
    acNotes: '',
    savesTable: {
      fort: 0,
      ref: 0,
      will: 0
    },
    savesNotes: '',
    defensiveAbilities: '',
    specialDefenses: ''
  },
  racialTraits: {
    name: [],
    desc: []
  },
  backgroundTraits: {
    name: [],
    type: [],
    desc: []
  },
  favoredClass: '',
  favoredClassBonus: '',
  classFeatures: {
    level: [],
    name: [],
    type: [],
    desc: []
  },
  feats: {
    level: [],
    source: [],
    name: [],
    type: [],
    desc: []
  },
  magicBlocks: [] as any[],
  skills: {
    name: [],
    total: [],
    rank: [],
    cs: [],
    ability: [],
    others: [],
    special: []
  },
  skillsTotal: 0,
  armorCheckPenalty: 0,
  skillsNotes: '',
  equipmentBags: [
    {
      id: 'bag-default',
      name: '身上',
      ignoreWeight: false,
      items: {
        item: [],
        quantity: [],
        cost: [],
        weight: [],
        notes: []
      }
    }
  ],
  encumbranceMultiplier: 1,
  equipmentNotes: '',
  currency: {
    pp: 0,
    gp: 0,
    sp: 0,
    cp: 0,
    coinWeight: 0
  },
  additionalData: [] as any[]
};

export const DEFAULT_BBCODE_TEMPLATE = `{{#md2bb}}{{#with basic}}[table][tr][td]
{{name}} {{classes}}
{{alignment}} {{deity}}
{{size}} {{gender}} {{race}}
{{height}} {{weight}} {{age}}
{{speed.land}} {{senses}}
先攻 {{initiative}} 察觉 {{perception}}
语言 {{languages}}
[/td]
[td][img width=200 height=200]{{avatars.url.[0]}}[/img][/td]
[/tr]
[/table]{{/with}}
[hr]
[b]属性[/b]
[hr]
[table]
{{#each attributes}}
[tr][td]{{name}}[/td][td]{{final}}[/td][td]{{modifier}}[/td][td]{{source}}{{status}}[/td][/tr]
{{/each}}
[/table]
{{#with combatTable}}BAB {{bab}}，CMB {{cmb}}，CMD {{cmd}}{{/with}}
[hr]
[b]攻击[/b]
[hr]
近战攻击
[table]
{{#each attacks.meleeAttacks}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{range}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
远程攻击
[table]
{{#each attacks.rangedAttacks}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{range}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
{{#if attacks.specialAttacks}}
特殊攻击
{{attacks.specialAttacks}}
{{/if}}
[hr]
[b]防御[/b]
[hr]
{{#with defenses}}
{{#with acTable}}AC {{ac}}（{{source}}），措手不及 {{flatFooted}}，接触 {{touch}}{{/with}}
hp {{hp}} ({{hd}})
{{#with savesTable}}强韧 {{fort}}，反射 {{ref}}，意志 {{will}}{{/with}}
{{#if savesNotes}}备注：{{savesNotes}}{{/if}}
{{/with}}
[hr]
[b]背景特性与天赋职业[/b]
[hr]
[b]背景特性：[/b]
{{#each backgroundTraits}}{{name}}（{{type}}）: {{desc}}{{/each}}
[b]天赋职业奖励：[/b] {{favoredClass}} ({{favoredClassBonus}})
[hr]
[b]种族特性[/b]
[hr]
[table]
{{#each racialTraits}}
[tr][td]{{name}}[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]职业特性[/b]
[hr]
[table]
{{#each classFeatures}}
[tr][td]{{level}}[/td][td]{{name}}（{{type}}）[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
{{#if magicBlocks}}
[b]法术与类法术能力[/b]
[hr]
{{#each magicBlocks}}
[b]{{title}}[/b]（CL {{casterLevel}}{{#unless (eq (raw "spellType") 4)}}, 专注 {{concentration}}{{/unless}}）
[table]
{{#each tableData}}
[tr]{{#unless (eq (raw "../spellType") 5)}}[td]{{level}}[/td]{{/unless}}{{#if uses}}[td]{{uses}}[/td]{{/if}}[td]{{spells}}[/td][/tr]
{{/each}}
[/table]
{{#if notes}}备注：{{notes}}{{/if}}
{{/each}}
{{/if}}
[hr]
[b]技能[/b]
[hr]
[table]
{{#each skills}}
[tr][td]{{name}}[/td][td]{{total}} ({{rank}}{{cs}}{{ability}} {{others}})[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]专长[/b]
[hr]
[table]
{{#each feats}}
[tr][td]{{level}}[/td][td]{{name}} ({{type}})[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr]
[b]物品[/b]
[hr]
{{#each equipmentBags}}
[quote author={{name}}]
[table]
{{#each items}}
[tr][td]{{item}}[/td][td]{{quantity}}[/td][td]{{cost}}[/td][td]{{weight}}[/td][td]{{notes}}[/td][/tr]
{{/each}}
[/table]
[/quote]
{{/each}}
[b]总资产 {{totalCost}}gp，总重 {{totalWeight}}lbs[/b]
{{/md2bb}}
`;

import { CREATURE_SUBTYPES } from './creatures';

export type LocalizedName = [string, string];

export interface RaceNode {
  name: LocalizedName;
  type?: number;
  subtype?: number[];
  selectable?: boolean;
  showParent?: boolean;
  content?: (RaceNode | LocalizedName)[];
}

/**
 * 辅助函数：根据英文子类名称动态解析当前最新的整数子类 ID 列表
 */
const st = (names: string[]): number[] =>
  names
    .map(name => CREATURE_SUBTYPES.findIndex(s => s[0].toLowerCase() === name.toLowerCase()))
    .filter(idx => idx >= 0);

export const RACES_DATA: RaceNode[] = [
  {
    name: ['core', '核心种族'],
    content: [
      {
        name: ['Human', '人类'],
        subtype: st(['Human']),
        showParent: true,
        content: [
          ['Azlanti', '阿兹兰特人'],
          ['Chelaxian', '切利亚斯人'],
          ['Garundi', '加伦德人'],
          ['Keleshite', '卡莱德人'],
          ['Kellid', '凯利德人'],
          ['Minkai', '民海人'],
          ['Mwangi', '芒吉人'],
          ['Shoanti', '休盎提人'],
          ['Taldan', '塔尔多人'],
          ['Tian', '天洲人'],
          ['Ulfen', '乌尔芬人'],
          ['Varisian', '瓦瑞西亚人'],
          ['Vudrani', '乌荼罗人']
        ]
      },
      { name: ['Elf', '精灵'], subtype: st(['Elf']) },
      { name: ['Dwarf', '矮人'], subtype: st(['Dwarf']) },
      { name: ['Gnome', '侏儒'], subtype: st(['Gnome']) },
      { name: ['Halfling', '半身人'], subtype: st(['Halfling']) },
      { name: ['Half-Orc', '半兽人'], subtype: st(['Human', 'Orc']) },
      { name: ['Half-Elf', '半精灵'], subtype: st(['Elf', 'Human']) }
    ]
  },
  {
    name: ['uncommon', '非核心种族'],
    content: [
      {
        name: ['Aasimar', '神裔'],
        type: 9,
        subtype: st(['Native']),
        selectable: true,
        showParent: true,
        content: [
          ['Agathion-Blooded', '神使裔'],
          ['Angel-Blooded', '天使裔'],
          ['Archon-Blooded', '亚空裔'],
          ['Azata-Blooded', '爱塔裔'],
          ['Garuda-Blooded', '迦楼罗裔'],
          ['Peri-Blooded', '佩里裔']
        ]
      },
      { name: ['Drow', '卓尔'], subtype: st(['Elf']) },
      {
        name: ['Geniekin', '元素裔'],
        type: 9,
        subtype: st(['Native']),
        selectable: true,
        showParent: true,
        content: [
          { name: ['Ifrit', '火元素裔'], subtype: st(['Native', 'Fire']) },
          { name: ['Oread', '土元素裔'], subtype: st(['Native', 'Earth']) },
          ['Suli', '巨灵裔'],
          { name: ['Sylph', '风元素裔'], subtype: st(['Native', 'Air']) },
          { name: ['Undine', '水元素裔'], subtype: st(['Native', 'Water']) }
        ]
      },
      { name: ['Goblin', '地精'], subtype: st(['Goblinoid']) },
      { name: ['Kobold', '狗头人'], subtype: st(['Reptilian']) },
      { name: ['Orc', '兽人'], subtype: st(['Orc']) },
      {
        name: ['Tiefling', '魔裔'],
        type: 9,
        subtype: st(['Native']),
        selectable: true,
        showParent: true,
        content: [
          ['Asura-Spawn', '阿修罗裔'],
          ['Daemon-Spawn', '邪魔裔'],
          ['Demodand-Spawn', '反神裔'],
          ['Demon-Spawn', '恶魔裔'],
          ['Devil-Spawn', '魔鬼裔'],
          ['Div-Spawn', '低灵裔'],
          ['Kyton-Spawn', '链魔裔'],
          ['Oni-Spawn', '鬼裔'],
          ['Qlippoth-Spawn', '古灵裔'],
          ['Rakshasa-Spawn', '罗刹裔']
        ]
      }
    ]
  },
  {
    name: ['rare', '稀有种族'],
    content: [
      {
        name: ['aliens', '异星种族'],
        content: [
          { name: ['Kasatha', '卡萨塔'], subtype: st(['Kasatha']) },
          { name: ['Lashunta', '勒珊塔'], subtype: st(['Lashunta']) },
          { name: ['Triaxian', '特里亚克萨斯'], subtype: st(['Triaxian']) },
          { name: ['Trox', '特洛克斯'], type: 7 }
        ]
      },
      { name: ['Android', '仿生人'], subtype: st(['Android']) },
      { name: ['Catfolk', '猫族'], subtype: st(['Catfolk']) },
      { name: ['Changeling', '替换儿'], subtype: st(['Changeling']) },
      {
        name: ['Dhampir', '吸血裔'],
        subtype: st(['Dhampir']),
        selectable: true,
        showParent: true,
        content: [
          ['Jiang-Shi-Born', '僵尸裔'],
          ['Moroi-Born', '吸血鬼裔'],
          ['Nosferatu-Born', '诺斯费拉图裔'],
          ['Vetala-Born', '毕塔拉裔']
        ]
      },
      {
        name: ['dragon_empires', '龙国'],
        content: [
          { name: ['Kitsune', '狐妖'], subtype: st(['Kitsune', 'Shapechanger']) },
          { name: ['Nagaji', '娜迦裔'], subtype: st(['Reptilian']) },
          { name: ['Samsaran', '轮回者'], subtype: st(['Samsaran']) },
          { name: ['Tengu', '天狗'], subtype: st(['Tengu']) },
          { name: ['Wayang', '剪影人'], subtype: st(['Wayang']) }
        ]
      },
      { name: ['Fetchling', '窃影鬼'], type: 9, subtype: st(['Native']) },
      { name: ['Ghoran', '蒿兰人'], type: 10 },
      { name: ['Gillman', '半鱼人'], subtype: st(['Aquatic']) },
      { name: ['Hobgoblin', '大地精'], subtype: st(['Goblinoid']) },
      {
        name: ['other', '其它种族'],
        content: [
          { name: ['Aquatic Elf', '水栖精灵'], subtype: st(['Elf', 'Aquatic']) },
          { name: ['Duergar', '灰矮人'], subtype: st(['Dwarf']) },
          { name: ['Gathlain', '伽瑟兰'], type: 4 },
          { name: ['Grippli', '树蛙人'], subtype: st(['Grippli']) },
          { name: ['Merfolk', '人鱼'], subtype: st(['Aquatic']) },
          {
            name: ['Skinwalker', '兽态人'],
            subtype: st(['Skinwalker', 'Shapechanger']),
            selectable: true,
            showParent: true,
            content: [
              ['Werebat-Kin', '半蝙蝠人'],
              ['Werebear-Kin', '半熊人'],
              ['Wereboar-Kin', '半猪人'],
              ['Werecrocodile-Kin', '半鳄鱼人'],
              ['Wererat-Kin', '半鼠人'],
              ['Wereshark-Kin', '半鲨鱼人'],
              ['Weretiger-Kin', '半虎人'],
              ['Werewolf-Kin', '半狼人']
            ]
          },
          { name: ['Svirfneblin', '地底侏儒'], subtype: st(['Gnome']) },
          { name: ['Vanara', '灵猴族'], subtype: st(['Vanara']) },
          { name: ['Vishkanya', '蝮血裔'], subtype: st(['Vishkanya']) },
          { name: ['Wyrwood', '汲魂木'], type: 2 },
          { name: ['Wyvaran', '翼龙人'], type: 3 }
        ]
      },
      { name: ['Ratfolk', '鼠人'], subtype: st(['Ratfolk']) },
      { name: ['Strix', '鸮形人'], subtype: st(['Strix']) }
    ]
  }
];

export interface RaceCreatureMapping {
  type: number;
  subtype: number[];
}

/**
 * 展平种族树，同时生成名称列表、生物类型与子类映射列表以及双语反查字典
 */
function flattenRacesData(data: RaceNode[]) {
  const races: string[] = [];
  const creatureData: RaceCreatureMapping[] = [];
  const nameMap: Record<string, number> = {};

  function walk(nodes: (RaceNode | LocalizedName)[], parentType: number = 5, parentSubtype: number[] = []) {
    nodes.forEach(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'name' in item) {
        const [en, zh] = item.name;
        const currentType = item.type !== undefined ? item.type : parentType;
        const currentSubtype = item.subtype !== undefined ? item.subtype : parentSubtype;
        const hasContent = Array.isArray(item.content) && item.content.length > 0;

        if (item.selectable || !hasContent) {
          const idx = races.length;
          races.push(en);
          creatureData.push({ type: currentType, subtype: currentSubtype });
          if (en) nameMap[en.toLowerCase()] = idx;
          if (zh) nameMap[zh.toLowerCase()] = idx;
        }

        if (hasContent) {
          walk(item.content!, currentType, currentSubtype);
        }
      } else if (Array.isArray(item)) {
        const [en, zh] = item;
        const idx = races.length;
        races.push(en);
        creatureData.push({ type: parentType, subtype: parentSubtype });
        if (en) nameMap[en.toLowerCase()] = idx;
        if (zh) nameMap[zh.toLowerCase()] = idx;
      }
    });
  }

  walk(data);
  nameMap['human'] = 0;
  nameMap['人类'] = 0;
  return { races, creatureData, nameMap };
}

const { races, creatureData, nameMap } = flattenRacesData(RACES_DATA);

export const ALL_RACES = races;
export const RACE_CREATURE_DATA = creatureData;
export const flattenDirectory = (data: any[]): string[] => flattenRacesData(data).races;

/**
 * 根据种族序号或名称获取默认的生物类型与子类
 */
export function getCreatureTypeByRace(race: any): RaceCreatureMapping | null {
  if (race === undefined || race === null || race === '') return null;
  const idx = typeof race === 'number' ? race : nameMap[String(race).trim().toLowerCase()];
  return (idx !== undefined && RACE_CREATURE_DATA[idx]) ? RACE_CREATURE_DATA[idx] : null;
}

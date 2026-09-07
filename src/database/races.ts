export type LocalizedName = [string, string];

export interface RaceNode {
  name: LocalizedName;
  selectable?: boolean;
  showParent?: boolean;
  content: (RaceNode | LocalizedName)[];
}

export const RACES_DATA: RaceNode[] = [
  {
    name: ['core', '核心种族'],
    content: [
      {
        name: ['Human', '人类'],
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
      ['Elf', '精灵'],
      ['Dwarf', '矮人'],
      ['Gnome', '侏儒'],
      ['Halfling', '半身人'],
      ['Half-Orc', '半兽人'],
      ['Half-Elf', '半精灵']
    ]
  },
  {
    name: ['uncommon', '非核心种族'],
    content: [
      {
        name: ['Aasimar', '神裔'],
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
      ['Drow', '卓尔'],
      {
        name: ['Geniekin', '元素裔'],
        selectable: true,
        showParent: true,
        content: [
          ['Ifrit', '火元素裔'],
          ['Oread', '土元素裔'],
          ['Suli', '巨灵裔'],
          ['Sylph', '风元素裔'],
          ['Undine', '水元素裔']
        ]
      },
      ['Goblin', '地精'],
      ['Kobold', '狗头人'],
      ['Orc', '兽人'],
      {
        name: ['Tiefling', '魔裔'],
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
          ['Kasatha', '卡萨塔'],
          ['Lashunta', '勒珊塔'],
          ['Triaxian', '特里亚克萨斯'],
          ['Trox', '特洛克斯']
        ]
      },
      ['Android', '仿生人'],
      ['Catfolk', '猫族'],
      ['Changeling', '替换儿'],
      {
        name: ['Dhampir', '吸血裔'],
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
          ['Kitsune', '狐妖'],
          ['Nagaji', '娜迦裔'],
          ['Samsaran', '轮回者'],
          ['Tengu', '天狗'],
          ['Wayang', '剪影人']
        ]
      },
      ['Fetchling', '窃影鬼'],
      ['Ghoran', '蒿兰人'],
      ['Gillman', '半鱼人'],
      ['Hobgoblin', '大地精'],
      {
        name: ['other', '其它种族'],
        content: [
          ['Aquatic Elf', '水栖精灵'],
          ['Duergar', '灰矮人'],
          ['Gathlain', '伽瑟兰'],
          ['Grippli', '树蛙人'],
          ['Merfolk', '人鱼'],
          {
            name: ['Skinwalker', '兽态人'],
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
          ['Svirfneblin', '地底侏儒'],
          ['Vanara', '灵猴族'],
          ['Vishkanya', '蝮血裔'],
          ['Wyrwood', '汲魂木'],
          ['Wyvaran', '翼龙人']
        ]
      },
      ['Ratfolk', '鼠人'],
      ['Strix', '鸮形人']
    ]
  }
];

export function flattenDirectory(data: any[]): string[] {
  let result: string[] = [];
  data.forEach(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'content' in item) {
      if (item.selectable) {
        const en = Array.isArray(item.name) ? item.name[0] : item.name;
        result.push(en);
      }
      result = result.concat(flattenDirectory(item.content));
    } else if (Array.isArray(item)) {
      result.push(item[0]);
    } else if (typeof item === 'string') {
      result.push(item);
    }
  });
  return result;
}

export const ALL_RACES = flattenDirectory(RACES_DATA);

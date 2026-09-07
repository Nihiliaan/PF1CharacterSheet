export type LocalizedName = [string, string];

export interface LanguageCategory {
  name: LocalizedName;
  content: LocalizedName[];
}

export const LANGUAGES_BY_CATEGORY: LanguageCategory[] = [
  {
    name: ['Human Languages', '人类语言'],
    content: [
      ['Calda', 'Calda'],
      ['Tang (Dtang)', '唐语'],
      ['Erutaki', '艾鲁塔基语'],
      ['Hallit', '哈利特语'],
      ['Hongali (Hon-La)', '弘剌语'],
      ['Hwan', '嬛语'],
      ['Iblydosi (Iblydan)', 'Iblydosi (Iblydan)'],
      ['Iobarian', '艾奥巴瑞亚语'],
      ['Kelish', '珂莱士语'],
      ['Kibwani', 'Kibwani'],
      ['Lirgeni', '利尔刚语'],
      ['Minatan', '民那塔语'],
      ['Minkaian', '明海语'],
      ['Mwangi (Polyglot)', '芒吉语（混通语）'],
      ['Mzunu', 'Mzunu'],
      ['Ocotan', 'Ocotan'],
      ['Osiriani', '奥斯利昂语'],
      ['Razatlani', 'Razatlani'],
      ['Senzar', '神知语'],
      ['Shadowtongue', '暗影语'],
      ['Shoanti', '休盎提语'],
      ['Skald', '乌尔芬语'],
      ['Taldane', '塔尔多语（通用语）'],
      ['Taltien', 'Taltien'],
      ['Thassilonian', '瑟西隆语'],
      ['Tien', '天洲语'],
      ['Varisian', '瓦瑞西亚语'],
      ['Varki', '瓦尔基语'],
      ['Vudrani', '乌荼罗语'],
      ['Xanmba', 'Xanmba'],
      ['Napsu-Sign language (Pathfinder Hand Signs)', '探索者手语']
    ]
  },
  {
    name: ['Dead Languages', '古代语言'],
    content: [
      ['Ancient Osiriani', '古奥斯利昂语'],
      ['Azlanti (Ancient Azlanti)', '（古）阿兹兰特语'],
      ['Jistka', '吉斯塔克语'],
      ['Shory', '首理语'],
      ['Tekritanin', '泰克立坦语']
    ]
  },
  {
    name: ['Nonhuman Languages', '非人语言'],
    content: [
      ['Adlet', '狼妖语'],
      ['Alghollthu (Aboleth)', '底栖魔鱼语'],
      ['Amurrun (Catfolk)', '猫族语'],
      ['Anugobu', 'Anugobu'],
      ['Arboreal (Treant)', '树人语'],
      ['Boggard', '沼蜍人语'],
      ['Ceratioidi', 'Ceratioidi'],
      ['Cyclops', '独眼巨人语'],
      ['Draconic', '龙语'],
      ['Drooni', 'Drooni'],
      ['Dwarven', '矮人语'],
      ['Elven', '精灵语'],
      ['Ekujae shape-script', '埃库迦树形文'],
      ['Sylvan', '木族语'],
      ['Garuda', '迦楼罗语'],
      ['Girtablilu', 'Girtablilu'],
      ['Gnomish', '侏儒语'],
      ['Goblin', '地精语'],
      ['Goloma', 'Goloma'],
      ['Halfling', '半身语'],
      ['Iruxi', 'Iruxi'],
      ['Jotun (Giant)', '巨人语'],
      ['Kasatha', '卡萨达语'],
      ['Kashrishi', 'Kashrishi'],
      ['Kech', 'Kech'],
      ['Kholo (Gnoll)', '豺狼人语'],
      ['Kuru', 'Kuru'],
      ['Munavri', '白化人语'],
      ['Nagaji', '娜迦语'],
      ['Orcish (Orc)', '兽人语'],
      ['Plantspeech', '植物交谈'],
      ['Ratfolk (Ysoki)', '鼠人语'],
      ['Rougarou', '狩狼人语'],
      ['Sedacthy (Sahuagin)', '沙华鱼人语'],
      ['Samsaran', '轮回语'],
      ['Sasquatch', '大脚野人语'],
      ['Shisk', 'Shisk'],
      ['Shoony', 'Shoony'],
      ['Sphinx', '斯芬克斯语'],
      ['Strix', '枭形人语'],
      ['Syrinx', '猫头鹰人语'],
      ['Tengu', '天狗语'],
      ['Thriae', 'Thriae'],
      ['Tripkee', 'Tripkee'],
      ['Vanaran', '灵猴语'],
      ['Vishkanya', '蝮血裔语'],
      ['Wayang', '剪影人语'],
      ['Wildsong (Druidic)', '德鲁伊语'],
      ['Kasthezvi sign language', 'Kasthezvi sign language'],
      ['Sakvroth', 'Sakvroth']
    ]
  },
  {
    name: ['Planar & Other Languages', '位面及其他语言'],
    content: [
      ['Aklo', '邪灵语'],
      ['Caligni (Dark Folk)', '卡利尼语（暗民语）'],
      ['Canto', 'Canto'],
      ['Flail Snail', '链枷蜗牛语'],
      ['Gug', '古革巨人语'],
      ['Necril', '亡灵语'],
      ['Orvian', '奥乌语'],
      ['Sakvroth (Undercommon)', '地底通用语'],
      ['Vegepygmy', '孢子人语'],
      ['Chthonian (Abyssal)', '深渊语'],
      ['Cyrunian', 'Cyrunian'],
      ['Daemonic', '邪魔语'],
      ['Diabolic (Infernal)', '炼狱语'],
      ['D\'ziriak', 'D\'ziriak'],
      ['Empyrean (Celestial)', '天界语'],
      ['First Speech (Feycommon)', '原初之语'],
      ['Jandelayan', 'Jandelayan'],
      ['Jyoti', '乔帝语'],
      ['Muan', 'Muan'],
      ['Petran (Terran)', '土族语'],
      ['Protean', '幻蛇语'],
      ['Pyric (Ignan)', '火族语'],
      ['Requian', 'Requian'],
      ['Shae', '影民语'],
      ['Sussuran (Auran)', '风族语'],
      ['Talican', 'Talican'],
      ['Thalassic (Aquan)', '水族语'],
      ['Truespeech', '真言'],
      ['Utopian', 'Utopian'],
      ['Bonewrought willow sign language', 'Bonewrought willow sign language'],
      ['Ib', 'Ib']
    ]
  }
];

export function flatten(items: any[]): string[] {
  let result: string[] = [];
  items.forEach(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'content' in item) {
      result = result.concat(flatten(item.content));
    } else if (Array.isArray(item)) {
      result.push(item[0]);
    } else if (typeof item === 'string') {
      result.push(item);
    }
  });
  return result;
}

export const ALL_LANGUAGES = flatten(LANGUAGES_BY_CATEGORY);

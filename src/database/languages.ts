export const LANGUAGES_BY_CATEGORY = [
  {
    name: "Human Languages",
    content: [
      "Calda", "Dtang", "Erutaki", "Hallit", "Hongali (Hon-La)", "Hwan", "Iblydosi (Iblydan)", "Iobarian", "Kelish", "Kibwani", "Lirgeni", "Minatan", "Minkaian", "Mwangi (Polyglot)", "Mzunu", "Ocotan", "Osiriani", "Razatlani", "Senzar", "Shadowtongue", "Shoanti", "Skald", "Taldane", "Taltien", "Tang", "Thassilonian", "Tien", "Varisian", "Varki", "Vudrani", "Xanmba",
      "Napsu-Sign language (Pathfinder Hand Signs)"
    ]
  },
  {
    name: "Dead Languages",
    content: ["Ancient Osiriani", "Azlanti (Ancient Azlanti)", "Jistka", "Shory", "Tekritanin"]
  },
  {
    name: "Nonhuman Languages",
    content: [
      "Adlet", "Alghollthu (Aboleth)", "Amurrun (Catfolk)", "Anugobu", "Arboreal (Treant)", "Boggard", "Ceratioidi", "Cyclops", "Draconic", "Drooni", "Dwarven", "Elven", "Ekujae shape-script", "Sylvan", "Garuda", "Girtablilu", "Gnomish", "Goblin", "Goloma", "Halfling", "Iruxi", "Jotun (Giant)", "Kasatha", "Kashrishi", "Kech", "Kholo (Gnoll)", "Kuru", "Munavri", "Nagaji", "Orcish (Orc)", "Plantspeech", "Ratfolk (Ysoki)", "Rougarou", "Sedacthy (Sahuagin)", "Samsaran", "Sasquatch", "Shisk", "Shoony", "Sphinx", "Strix", "Syrinx", "Tengu", "Thriae", "Tripkee", "Vanaran", "Vishkanya", "Wayang", "Wildsong (Druidic)",
      "Kasthezvi sign language", "Sakvroth"
    ]
  },
  {
    name: "Planar & Other Languages",
    content: [
      "Aklo", "Caligni (Dark Folk)", "Canto", "Flail Snail", "Gug", "Necril", "Orvian", "Sakvroth (Undercommon)", "Vegepygmy", "Darklands Slang",
      "Chthonian (Abyssal)", "Cyrunian", "Daemonic", "Diabolic (Infernal)", "D'ziriak", "Empyrean (Celestial)", "First Speech (Feycommon)", "Jandelayan", "Jyoti", "Muan", "Petran (Terran)", "Protean", "Pyric (Ignan)", "Requian", "Shae", "Sussuran (Auran)", "Talican", "Thalassic (Aquan)", "Truespeech", "Utopian",
      "Bonewrought willow sign language", "Ib"
    ]
  }
];

function flatten(items: any[]): string[] {
  let result: string[] = [];
  items.forEach(item => {
    if (typeof item === 'object' && item !== null && 'content' in item) {
      result = result.concat(flatten(item.content));
    } else {
      result.push(item);
    }
  });
  return result;
}

export const ALL_LANGUAGES = flatten(LANGUAGES_BY_CATEGORY);

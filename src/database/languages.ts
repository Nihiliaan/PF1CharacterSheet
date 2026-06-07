export const LANGUAGES_BY_CATEGORY: Record<string, string[]> = {
  "Human Languages": [
    "Calda", "Dtang", "Erutaki", "Hallit", "Hongali (Hon-La)", "Hwan", "Iblydosi (Iblydan)", "Iobarian", "Kelish", "Kibwani", "Lirgeni", "Minatan", "Minkaian", "Mwangi (Polyglot)", "Mzunu", "Ocotan", "Osiriani", "Razatlani", "Senzar", "Shadowtongue", "Shoanti", "Skald", "Taldane", "Taltien", "Tang", "Thassilonian", "Tien", "Varisian", "Varki", "Vudrani", "Xanmba",
    "Napsu-Sign language (Pathfinder Hand Signs)"
  ],
  "Dead Languages": [
    "Ancient Osiriani", "Azlanti (Ancient Azlanti)", "Jistka", "Shory", "Tekritanin"
  ],
  "Nonhuman Languages": [
    "Adlet", "Alghollthu (Aboleth)", "Amurrun (Catfolk)", "Anugobu", "Arboreal (Treant)", "Boggard", "Ceratioidi", "Cyclops", "Draconic", "Drooni", "Dwarven", "Elven", "Ekujae shape-script", "Fey (Sylvan)", "Garuda", "Girtablilu", "Gnome (Gnomish)", "Goblin", "Goloma", "Halfling", "Iruxi", "Jotun (Giant)", "Kasatha", "Kashrishi", "Kech", "Kholo (Gnoll)", "Kuru", "Munavri", "Nagaji", "Orcish (Orc)", "Plantspeech", "Ratfolk (Ysoki)", "Rougarou", "Sedacthy (Sahuagin)", "Samsaran", "Sasquatch", "Shisk", "Shoony", "Sphinx", "Strix", "Syrinx", "Tengu", "Thriae", "Tripkee", "Vanaran", "Vishkanya", "Wayang", "Wildsong (Druidic)",
    "Kasthezvi sign language", "Sakvroth"
  ],
  "Planar & Other Languages": [
    "Aklo", "Caligni (Dark Folk)", "Canto", "Flail Snail", "Gug", "Necril", "Orvian", "Sakvroth (Undercommon)", "Vegepygmy", "Darklands Slang",
    "Chthonian (Abyssal)", "Cyrunian", "Daemonic", "Diabolic (Infernal)", "D'ziriak", "Empyrean (Celestial)", "First Speech (Feycommon)", "Jandelayan", "Jyoti", "Muan", "Petran (Terran)", "Protean", "Pyric (Ignan)", "Requian", "Shae", "Sussuran (Auran)", "Talican", "Thalassic (Aquan)", "Truespeech", "Utopian",
    "Bonewrought willow sign language", "Ib"
  ]
};

export const ALL_LANGUAGES = Object.values(LANGUAGES_BY_CATEGORY).flat();

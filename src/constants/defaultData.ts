import { CharacterData } from '../schema/types';

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
    source: ['', '', '', '', '', ''],
    status: ['', '', '', '', '', '']
  },
  combatManeuver: {
    bab: 0,
    cmb: 0,
    cmd: 10,
    notes: ''
  },
  attacks: {
    melee: {
      weapon: [],
      hit: [],
      damage: [],
      critRange: [],
      critMultiplier: [],
      touch: [],
      damageType: [],
      special: []
    },
    ranged: {
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
    armorClass: {
      ac: 10,
      source: '10',
      flatFooted: 10,
      touch: 10,
      notes: ''
    },
    saves: {
      fort: 0,
      ref: 0,
      will: 0,
      notes: ''
    },
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
  favoredClass: {
    fc: '',
    fcb: ''
  },
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
  magicBlocks: [{
    id: 'magic-default',
    title: "类法术能力",
    type: 5,
    casterLevel: 1,
    concentration: 1,
    uses: [],
    spells: [],
    notes: ""
  }],
  skills: {
    name: [],
    total: [],
    rank: [],
    cs: [],
    ability: [],
    others: [],
    special: [],
    category: [],
    totalPoints: 0,
    acp: 0,
    notes: '',
  },
  equipment: {
    container: [
      {
        id: 'bag-default',
        name: '身上',
        ignoreWeight: false,
        item: [],
        quantity: [],
        cost: [],
        weight: [],
        notes: []
      }
    ],
    encumbranceMultiplier: 1,
    currency: {
      pp: 0,
      gp: 0,
      sp: 0,
      cp: 0,
      coinWeight: 0
    },
    notes: '',
  },
  additionalData: [] as any[]
};

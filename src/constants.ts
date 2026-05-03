import { CharacterData } from './types';

export const DEFAULT_DATA: CharacterData = {
  basic: {
    name: '新人物',
    classes: '',
    alignment: 0,
    size: 0,
    gender: 0,
    race: '',
    age: 0,
    height: 0,
    weight: 0,
    speed: 0,
    senses: '',
    initiative: 0,
    perception: 0,
    languages: '',
    deity: '',
    avatars: [] as { url: string; note: string }[],
  },
  story: '',
  attributes: {
    final: [10, 10, 10, 10, 10, 10],
    modifier: [0, 0, 0, 0, 0, 0],
    source: ['', '', '', '', '', ''],
    status: ['', '', '', '', '', '']
  },
  combatTable: {
    bab: 0,
    cmb: 0,
    cmd: 10,
    combatManeuverNotes: ''
  },
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
    specialAttacks: ''
  },
  defenses: {
    hp: '',
    hd: '',
    acTable: { 
      ac: 10, 
      source: '', 
      flatFooted: 10, 
      touch: 10,
      acNotes: "" 
    },
    savesTable: { 
      fort: 0, 
      ref: 0, 
      will: 0,
      savesNotes: "" 
    },
    specialDefenses: ''
  },
  racialTraits: { name: [], desc: [] },
  backgroundTraits: { name: [], type: [], desc: [] },
  favoredClass: '',
  favoredClassBonus: '',
  classFeatures: { level: [], name: [], type: [], desc: [] },
  feats: { level: [], source: [], name: [], type: [], desc: [] },
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
  equipmentBags: [
    {
      name: "身上",
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

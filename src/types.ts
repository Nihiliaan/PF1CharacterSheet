export type { User as FirebaseUser } from 'firebase/auth';

export type InputType = 'text' | 'float' | 'quantity' | 'select' | 'int' | 'posInt' | 'checkbox' | 'bonus' | 'level' | 'distance' | 'attributeIndex' | 'cost' | 'weight' | 'markdown';

export interface Column {
  key: string;
  label: string;
  width?: string;
  type?: InputType;
  options?: string[];
  displayFormatter?: (v: string, isFocused: boolean) => string;
  hideRightBorder?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

export interface CharacterData {
  basic: {
    name: string;
    classes: string;
    alignment: number;
    size: number;
    gender: number;
    race: string;
    age: number;
    height: number;
    weight: number;
    speed: {
      base: number;
      climb: number;
      swim: number;
      fly: number;
      maneuverability: number;
    };
    senses: string;
    initiative: number;
    perception: number;
    languages: string;
    deity: string;
    avatars: { url: string; note: string }[];
  };
  story: string;
  attributes: { 
    final: number[]; 
    modifier: number[]; 
    source: string[]; 
    status: string[]; 
  };
  combatTable: {
    bab: number;
    cmb: number;
    cmd: number;
    combatManeuverNotes: string;
  };
  attacks: {
    meleeAttacks: {
      weapon: string[];
      hit: number[];
      damage: string[];
      critRange: number[];
      critMultiplier: number[];
      range: string[];
      damageType: string[];
      special: string[];
    };
    rangedAttacks: {
      weapon: string[];
      hit: number[];
      damage: string[];
      critRange: number[];
      critMultiplier: number[];
      range: string[];
      damageType: string[];
      special: string[];
    };
    specialAttacks: string;
  };
  defenses: {
    hp: number;
    hd: string;
    acTable: { 
      ac: number; 
      source: string; 
      flatFooted: number; 
      touch: number;
      acNotes: string;
    };
    savesTable: { 
      fort: number; 
      ref: number; 
      will: number;
      savesNotes: string;
    };
    specialDefenses: string;
  };
  racialTraits: { name: string[]; desc: string[] };
  backgroundTraits: { name: string[]; type: string[]; desc: string[] };
  favoredClass: string;
  favoredClassBonus: string;
  classFeatures: { level: number[]; name: string[]; type: number[]; desc: string[] };
  feats: { level: number[]; source: string[]; name: string[]; type: string[]; desc: string[] };
  magicBlocks: {
    title: string[];
    type: number[];
    casterLevel: number[];
    concentration: number[];
    spellTable: {
      level: number[];
      uses: number[];
      spells: string[];
    }[];
    notes: string[];
  };
  skills: {
    name: string[];
    total: number[];
    rank: string[];
    cs: boolean[];
    ability: string[];
    others: string[];
    special: string[];
  };
  skillsTotal: number;
  armorCheckPenalty: number;
  equipmentBags: {
    name: string;
    ignoreWeight: boolean;
    items: {
      item: string[];
      quantity: number[];
      cost: number[];
      weight: number[];
      notes: string[];
    };
  }[];
  encumbranceMultiplier: number;
  equipmentNotes: string;
  currency: {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
    coinWeight: number;
  };
  additionalData: any[];
}

export interface CharacterMetadata {
  id: string;
  name: string;
  avatar: string;
  classes: string;
  data: CharacterData;
  folderId?: string | null;
  ownerId?: string;
  isLink?: boolean;
  targetId?: string;
}

export interface MagicBlock {
  id: string;
  type: 'text' | 'table';
  title: string;
  content?: string;
  columns?: Column[];
  tableData?: Record<string, any>[];
}

export interface SpellBlock {
  id: string;
  type: 'spell';
  spellTemplate: 'sla' | 'spontaneous' | 'prepared';
  title: string;
  casterLevel: string;
  concentration: string;
  notes: string;
  baseLevel: 0 | 1;
  columns?: Column[];
  tableData?: Record<string, any>[];
}

export const ATTRIBUTE_NAMES = [
  'STR',
  'DEX',
  'CON',
  'INT',
  'WIS',
  'CHA'
];

export interface FolderMetadata {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
}

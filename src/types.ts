export type { User as FirebaseUser } from 'firebase/auth';

export interface FolderMetadata {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  createdAt: any;
  updatedAt: any;
}

export type InputType = 'text' | 'float' | 'quantity' | 'select' | 'int' | 'posInt' | 'checkbox' | 'bonus' | 'level' | 'distance' | 'attributeIndex' | 'cost' | 'weight' | 'markdown' | 'dailyUses';

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

export interface DynamicTableProps {
  columns?: Column[];
  data: Record<string, any>;
  originalData?: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  newItemGenerator?: () => Record<string, any>;
  fixedRows?: boolean;
  readonlyColumns?: string[];
  rowDraggable?: boolean;
  rowActionMode?: 'drag' | 'delete';
  onRowActionModeToggle?: () => void;
  onRowDragStart?: (index: number, e: any) => void;
  onRowDragOver?: (index: number, e: any) => void;
  onRowDrop?: (index: number, e: any) => void;
  readOnly?: boolean;
  path?: string;
}

export interface SingleRowTableProps {
  columns?: Column[];
  data: Record<string, any>;
  originalData?: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  readonlyColumns?: string[];
  readOnly?: boolean;
  path?: string;
  minWidth?: string;
}

export interface AttributesSoA {
  final: number[];
  modifier: number[];
  source: string[];
  status: string[];
}

export interface CombatData {
  bab: number;
  cmb: number;
  cmd: number;
}

export interface AttacksSoA {
  weapon: string[];
  hit: number[];
  damage: string[];
  critRange: number[];
  critMultiplier: number[];
  range: number[];
  damageType: string[];
  special: string[];
}

export interface ACData {
  ac: number;
  source: string;
  flatFooted: number;
  touch: number;
}

export interface SavesData {
  fort: number;
  ref: number;
  will: number;
}

export interface TraitsSoA {
  name: string[];
  desc: string[];
}

export interface BackgroundTraitsSoA {
  name: string[];
  type: string[];
  desc: string[];
}

export interface ClassFeaturesSoA {
  level: number[];
  name: string[];
  type: number[]; // 0:—, 1:Sp, 2:Su, 3:Ex
  desc: string[];
}

export interface FeatsSoA {
  level: number[];
  source: string[];
  name: string[];
  type: string[];
  desc: string[];
}

export interface SkillsSoA {
  name: string[];
  total: number[];
  rank: number[];
  cs: boolean[];
  ability: number[]; // 1-6
  others: string[];
  special: string[];
}

export interface EquipmentItemsSoA {
  item: string[];
  quantity: number[];
  cost: number[];
  weight: number[];
  notes: string[];
}

export interface AvatarsSoA {
  url: string[];
  note: string[];
}

export interface CharacterDocument {
  id: string;
  name: string;
  data: CharacterData;
  ownerId: string;
  folderId: string | null;
  targetId?: string;
  isLink?: boolean;
  isTemplate?: boolean;
  updatedAt?: any;
  createdAt?: any;
}

export interface CharacterData {
  // 元数据 (从 CharacterMetadata 迁移并精简)
  id: string;
  folderId?: string | null;
  ownerId?: string;
  targetId?: string; // 存在且不为空即为 isLink
  isLink?: boolean;
  isTemplate?: boolean;
  content?: string; // 用于 BBCode 模板

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
      land: number;
      fly: number;
      maneuverability: number;
      swim: number;
      climb: number;
      burrow: number;
    };
    senses: string;
    initiative: number;
    perception: number;
    languages: string;
    deity: string;
    avatars: AvatarsSoA;
  };
  story: string;
  attributes: AttributesSoA;
  combatTable: CombatData;
  combatManeuverNotes: string;
  attacks: {
    meleeAttacks: AttacksSoA;
    rangedAttacks: AttacksSoA;
    specialAttacks: string;
  };
  defenses: {
    hp: number;
    hd: string;
    acTable: ACData;
    acNotes: string;
    savesTable: SavesData;
    savesNotes: string;
    defensiveAbilities: string;
    specialDefenses: string;
  };
  racialTraits: TraitsSoA;
  backgroundTraits: BackgroundTraitsSoA;
  favoredClass: string;
  favoredClassBonus: string;
  classFeatures: ClassFeaturesSoA;
  feats: FeatsSoA;
  magicBlocks: (MagicBlock | SpellBlock)[];
  skills: SkillsSoA;
  skillsTotal: number;
  armorCheckPenalty: number;
  skillsNotes: string;
  equipmentBags: {
    id: string;
    name: string;
    ignoreWeight: boolean;
    items: EquipmentItemsSoA;
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

export interface MagicBlock {
  id: string;
  type: 'text' | 'table';
  title: string;
  content?: string;
  columns?: Column[];
  tableData?: Record<string, any[]>; // SoA inside blocks
}

export interface SpellBlock {
  id: string;
  type: 'spell';
  spellType?: number;
  title: string;
  casterLevel: string;
  concentration: string;
  notes: string;
  columns?: Column[];
  tableData?: Record<string, any[]>; // SoA inside blocks
}

export const ATTRIBUTE_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

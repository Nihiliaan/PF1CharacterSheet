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
  showAll?: boolean;
  minWidth?: string;
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
  notes: string;
}

export interface MeleeAttacksSoA {
  weapon: string[];
  hit: number[];
  damage: string[];
  critRange: number[];
  critMultiplier: number[];
  touch: number[]; // Renamed from range
  damageType: string[];
  special: string[];
}

export interface RangedAttacksSoA {
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
  notes: string;
}

export interface SavesData {
  fort: number;
  ref: number;
  will: number;
  notes: string;
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

export interface SkillsData extends Record<string, any> {
  name: (number | string)[];
  total: number[];
  rank: number[];
  cs: boolean[];
  ability: number[];
  others: string[];
  special: string[];
  category: number[];
  totalPoints: number; // 对应 DEFAULT_DATA 中的 total (重命名以避开冲突)
  acp: number;
  notes: string;
}

export interface ContainerData {
  id: string;
  name: string;
  ignoreWeight: boolean;
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
  id: string;
  folderId?: string | null;
  ownerId?: string;
  targetId?: string;
  isLink?: boolean;
  isTemplate?: boolean;
  content?: string;

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
  combatManeuver: CombatData;
  attacks: {
    melee: MeleeAttacksSoA;
    ranged: RangedAttacksSoA;
    specialAttacks: string;
  };
  defenses: {
    hp: number;
    hd: string;
    armorClass: ACData;
    saves: SavesData;
    specialDefenses: string;
  };
  racialTraits: TraitsSoA;
  backgroundTraits: BackgroundTraitsSoA;
  favoredClass: {
    fc: string;
    fcb: string;
  };
  classFeatures: ClassFeaturesSoA;
  feats: FeatsSoA;
  magicBlocks: any[]; // 结构灵活
  skills: SkillsData;
  equipment: {
    container: ContainerData[];
    encumbranceMultiplier: number;
    currency: {
      pp: number;
      gp: number;
      sp: number;
      cp: number;
      coinWeight: number;
    };
    notes: string;
  };
  additionalData: any[];
}

export const ATTRIBUTE_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

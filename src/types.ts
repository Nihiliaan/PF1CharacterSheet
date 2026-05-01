export type { User as FirebaseUser } from 'firebase/auth';

export type Column = {
  key: string;
  label: string;
  width?: string;
  hideRightBorder?: boolean;
  type?: 'text' | 'float' | 'quantity' | 'select' | 'int' | 'posInt' | 'checkbox' | 'bonus';
  options?: string[];
  displayFormatter?: (v: string) => string;
};

export interface DynamicTableProps {
  columns: Column[];
  data: Record<string, string>[];
  originalData?: Record<string, string>[];
  onChange: (data: Record<string, string>[]) => void;
  newItemGenerator?: () => Record<string, string>;
  fixedRows?: boolean;
  readonlyColumns?: string[];
  footerRow?: Record<string, string>;
  onFooterChange?: (data: Record<string, string>) => void;
  footerReadonlyColumns?: string[];
  onColumnLabelChange?: (index: number, newLabel: string) => void;
  onRemoveColumn?: (index: number) => void;
  onAddColumn?: () => void;
  rowDraggable?: boolean;
  rowActionMode?: 'drag' | 'delete';
  onRowActionModeToggle?: () => void;
  onRowDragStart?: (index: number, e: React.DragEvent) => void;
  onRowDragOver?: (index: number, e: React.DragEvent) => void;
  onRowDrop?: (index: number, e: React.DragEvent) => void;
  readOnly?: boolean;
}

export interface CharacterData {
  basic: {
    name: string;
    classes: string;
    alignment: string;
    size: string;
    gender: string;
    race: string;
    age: string;
    height: string;
    weight: string;
    speed: string;
    senses: string;
    initiative: string;
    perception: string;
    languages: string;
    deity: string;
    avatars: { url: string; note: string }[];
  };
  story: string;
  attributes: { final: string; modifier: string; source: string; status: string }[];
  babTable: { bab: string; cmb: string; cmd: string }[];
  combatManeuverNotes: string;
  meleeAttacks: any[];
  rangedAttacks: any[];
  specialAttacks: string;
  defenses: {
    hp: string;
    hd: string;
    acTable: { ac: string; flatFooted: string; touch: string }[];
    acNotes: string;
    savesTable: { fort: string; ref: string; will: string }[];
    savesNotes: string;
  };
  racialTraits: any[];
  backgroundTraits: any[];
  favoredClass: string;
  favoredClassBonus: string;
  classFeatures: any[];
  feats: any[];
  magicBlocks: any[];
  skills: any[];
  skillsTotal: string;
  skillsNotes: string;
  equipmentBags: any[];
  encumbranceMultiplier: string;
  equipmentNotes: string;
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

export const ATTRIBUTE_NAMES = [
  '力量 (STR)',
  '敏捷 (DEX)',
  '体质 (CON)',
  '智力 (INT)',
  '感知 (WIS)',
  '魅力 (CHA)'
];

export interface FolderMetadata {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
}

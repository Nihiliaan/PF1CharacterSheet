import { ATTRIBUTE_NAMES, Column, InputType } from '../types';
import { getDisplayValue } from './formatters';

export interface FieldSpec {
  key: string;
  path: string;
  type?: InputType;
  labelKey?: string;
  displayFormatter?: (v: any, ...args: any[]) => string;
}

export const BASIC_FIELD_SPECS: FieldSpec[] = [
  { key: 'name', path: 'basic.name', labelKey: 'editor.basic.name' },
  { key: 'classes', path: 'basic.classes', labelKey: 'editor.basic.classes' },
  { key: 'alignment', path: 'basic.alignment', labelKey: 'editor.basic.alignment' },
  { key: 'deity', path: 'basic.deity', labelKey: 'editor.basic.deity' },
  { key: 'size', path: 'basic.size', labelKey: 'editor.basic.size' },
  { key: 'gender', path: 'basic.gender', labelKey: 'editor.basic.gender' },
  { key: 'race', path: 'basic.race', labelKey: 'editor.basic.race' },
  { key: 'age', path: 'basic.age', labelKey: 'editor.basic.age' },
  { key: 'height', path: 'basic.height', labelKey: 'editor.basic.height' },
  { key: 'weight', path: 'basic.weight', labelKey: 'editor.basic.weight' },
  { key: 'speed', path: 'basic.speed', labelKey: 'editor.basic.speed' },
  { key: 'senses', path: 'basic.senses', labelKey: 'editor.basic.senses' },
  { key: 'initiative', path: 'basic.initiative', labelKey: 'editor.basic.initiative', type: 'bonus' },
  { key: 'perception', path: 'basic.perception', labelKey: 'editor.basic.perception', type: 'bonus' },
];

export const DEFENSE_FIELD_SPECS: FieldSpec[] = [
  { key: 'hp', path: 'defenses.hp', labelKey: 'editor.defenses.hp' },
  { key: 'hd', path: 'defenses.hd', labelKey: 'editor.defenses.hd' },
  { key: 'acNotes', path: 'defenses.acNotes', labelKey: 'editor.defenses.ac_notes' },
  { key: 'savesNotes', path: 'defenses.saves_notes', labelKey: 'editor.defenses.saves_notes' },
  { key: 'specialDefenses', path: 'defenses.specialDefenses', labelKey: 'editor.defenses.special_defenses' },
  { key: 'defensiveAbilities', path: 'defenses.defensiveAbilities', labelKey: 'editor.defenses.defensive_abilities' },
];

export const OTHER_FIELD_SPECS: FieldSpec[] = [
  { key: 'favoredClass', path: 'favoredClass', labelKey: 'editor.lists.favored_class' },
  { key: 'favoredClassBonus', path: 'favoredClassBonus', labelKey: 'editor.lists.favored_class_bonus' },
  { key: 'skillNotes', path: 'skillsNotes', labelKey: 'editor.skills.notes' }
];

export const getSkillColumns = (t: any, data: any): Column[] => [
  { key: 'name', label: t('editor.skills.headers.skill'), width: '15%' },
  { key: 'total', label: t('editor.skills.headers.total'), width: '5%', type: 'bonus' },
  { key: 'rank', label: t('editor.skills.headers.rank'), width: '5%', type: 'level' },
  {
    key: 'cs', label: t('editor.skills.headers.cs'), width: '5%', type: 'bool',
    displayFormatter: (val, isFocused, row) => {
      const rank = parseInt(row?.rank) || 0;
      return (rank > 0 && val) ? '+3' : '';
    }
  },
  {
    key: 'ability',
    label: t('editor.skills.headers.ability'),
    width: '10%',
    type: 'attributeIndex',
    displayFormatter: (val) => {
      if (!val || val === '0') return '';
      const idx = parseInt(val, 10) - 1;
      const localizedName = t('editor.attributes.' + ATTRIBUTE_NAMES[idx]);
      const attrValue = data.attributes[idx]?.modifier;
      const modStr = getDisplayValue(attrValue, 'bonus', t);
      return `${modStr}${localizedName}`;
    }
  },
  { key: 'others', label: t('editor.skills.headers.others'), width: '20%' },
  { key: 'special', label: t('editor.skills.headers.special'), width: '35%' }
];

export const getMeleeAttackColumns = (t: any): Column[] => [
  { key: 'weapon', label: t('editor.attacks.melee'), width: '20%' },
  { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
  { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
  { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%', type: 'select', options: ['20', '19', '18', '17', '16', '15', '14', '13', '12', '11'] },
  { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%', type: 'select', options: ['×2', '×3', '×4', '×5'] },
  { key: 'range', label: t('editor.attacks.reach'), width: '8%', type: 'distance' },
  { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
  { key: 'special', label: t('editor.attacks.special'), width: '22%' }
];

export const getRangedAttackColumns = (t: any): Column[] => [
  { key: 'weapon', label: t('editor.attacks.ranged'), width: '20%' },
  { key: 'hit', label: t('editor.attacks.hit'), width: '12%', type: 'bonus' },
  { key: 'damage', label: t('editor.attacks.damage'), width: '12%' },
  { key: 'critRange', label: t('editor.attacks.crit_range'), width: '8%', type: 'select', options: ['20', '19', '18', '17', '16', '15', '14', '13', '12', '11'] },
  { key: 'critMultiplier', label: t('editor.attacks.crit_multiplier'), width: '8%', type: 'select', options: ['×2', '×3', '×4', '×5'] },
  { key: 'range', label: t('editor.attacks.range'), width: '8%', type: 'distance' },
  { key: 'damageType', label: t('editor.attacks.damage_type'), width: '10%' },
  { key: 'special', label: t('editor.attacks.special'), width: '22%' }
];

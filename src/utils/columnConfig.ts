import { ATTRIBUTE_NAMES, Column } from '../types';
import { getDisplayValue } from './formatters';

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

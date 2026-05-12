import { CharacterData } from '../types';

export const getModifier = (value: number | string): number => {
  const val = typeof value === 'string' ? parseInt(value) || 10 : value;
  return Math.floor((val - 10) / 2);
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export const getSizeModifier = (size: string): number => {
  const s = size.toLowerCase();
  if (s.includes('超微') || s.includes('fine')) return 8;
  if (s.includes('极小') || s.includes('diminutive')) return 4;
  if (s.includes('微型') || s.includes('tiny')) return 2;
  if (s.includes('小型') || s.includes('small')) return 1;
  if (s.includes('中型') || s.includes('medium')) return 0;
  if (s.includes('大型') || s.includes('large')) return -1;
  if (s.includes('超大') || s.includes('huge')) return -2;
  if (s.includes('极巨') || s.includes('gargantuan')) return -4;
  if (s.includes('超巨') || s.includes('colossal')) return -8;
  return 0;
};

export const calculateTotalCost = (data: CharacterData): string => {
  let total = 0;
  data.equipmentBags.forEach(bag => {
    bag.items.forEach(item => {
      const cost = parseFloat(item.cost) || 0;
      const qty = parseInt(item.quantity) || 1;
      total += cost * qty;
    });
  });

  const pp = parseInt(data.currency?.pp) || 0;
  const gp = parseInt(data.currency?.gp) || 0;
  const sp = parseInt(data.currency?.sp) || 0;
  const cp = parseInt(data.currency?.cp) || 0;
  total += pp * 10 + gp + sp * 0.1 + cp * 0.01;

  return total.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const calculateTotalWeightNum = (data: CharacterData): number => {
  let total = parseFloat(data.currency?.coinWeight) || 0;
  data.equipmentBags.forEach(bag => {
    if (!bag.ignoreWeight) {
      bag.items.forEach(item => {
        const weight = parseFloat(item.weight) || 0;
        const qty = parseInt(item.quantity) || 1;
        total += weight * qty;
      });
    }
  });
  return total;
};

export interface EncumbranceThresholds {
  light: number;
  medium: number;
  heavy: number;
}

export const getComputedEncumbrance = (data: CharacterData): EncumbranceThresholds => {
  const strAttr = data.attributes[0];
  const strValue = strAttr ? parseInt(strAttr.final) || 10 : 10;
  const mult = parseFloat(data.encumbranceMultiplier) > 0 ? parseFloat(data.encumbranceMultiplier) : 1;

  let heavy = 0;
  if (strValue <= 10) {
    heavy = strValue * 10;
  } else {
    const seq = [115, 130, 150, 175, 200, 230, 260, 300, 350];
    if (strValue >= 11 && strValue <= 19) {
      heavy = seq[strValue - 11];
    } else {
      const eff = (strValue % 10) + 10; // Result is 10-19
      const baseHeavy = eff === 10 ? 100 : seq[eff - 11];
      const power = Math.floor((strValue - eff) / 10);
      heavy = baseHeavy * Math.pow(4, power);
    }
  }

  const light = Math.floor(heavy / 3);
  const medium = Math.floor(heavy * 2 / 3);

  return {
    light: Math.floor(light * mult),
    medium: Math.floor(medium * mult),
    heavy: Math.floor(heavy * mult)
  };
};

/**
 * 获取属性调整值对象，方便快速查找
 */
export const getAttributeModifiers = (data: CharacterData) => {
  return {
    str: getModifier(data.attributes[0]?.final),
    dex: getModifier(data.attributes[1]?.final),
    con: getModifier(data.attributes[2]?.final),
    int: getModifier(data.attributes[3]?.final),
    wis: getModifier(data.attributes[4]?.final),
    cha: getModifier(data.attributes[5]?.final),
  };
};


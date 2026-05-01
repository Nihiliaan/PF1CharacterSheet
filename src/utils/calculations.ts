import { CharacterData } from '../types';

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
  let total = 0;
  data.equipmentBags.forEach(bag => {
    if (!bag.ignoreWeight) {
      bag.items.forEach(item => {
        const weight = parseFloat(item.weight) || 0;
        const qty = parseInt(item.quantity) || 1;
        total += weight * qty;
      });
    }
  });

  total += parseFloat(data.currency?.coinWeight) || 0;

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

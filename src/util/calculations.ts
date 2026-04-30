import { CharacterData } from '../types';

export const calculateTotalCost = (data: CharacterData): number => {
  let total = 0;
  data.equipmentBags.forEach(bag => {
    bag.items.forEach(item => {
      const cost = parseFloat(item.cost) || 0;
      const qty = parseInt(item.quantity) || 1;
      total += cost * qty;
    });
  });
  return total;
};

export const calculateTotalWeight = (data: CharacterData): number => {
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
  return total;
};

export interface EncumbranceThresholds {
  light: number;
  medium: number;
  heavy: number;
}

export const getComputedEncumbrance = (data: CharacterData): EncumbranceThresholds => {
  // Strength is the first attribute (index 0)
  const strValue = parseInt(data.attributes[0]?.final) || 10;
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

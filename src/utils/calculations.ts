import { CharacterData } from '../types';

/**
 * 辅助工具：获取 SoA 结构的行数
 */
const getSoACount = (soaObj: any) => {
  if (!soaObj || typeof soaObj !== 'object') return 0;
  const keys = Object.keys(soaObj).filter(k => Array.isArray(soaObj[k]));
  return keys.length > 0 ? soaObj[keys[0]].length : 0;
};

export const calculateTotalCost = (data: CharacterData): string => {
  let totalArr = 0;
  (data.equipmentBags || []).forEach(bag => {
    const items = bag.items || {};
    const count = getSoACount(items);
    for (let i = 0; i < count; i++) {
        const cost = parseFloat((items as any).cost?.[i]) || 0;
        const qty = parseInt((items as any).quantity?.[i]) || 1;
        totalArr += cost * qty;
    }
  });

  const pp = parseInt(data.currency?.pp) || 0;
  const gp = parseInt(data.currency?.gp) || 0;
  const sp = parseInt(data.currency?.sp) || 0;
  const cp = parseInt(data.currency?.cp) || 0;
  totalArr += pp * 10 + gp + sp * 0.1 + cp * 0.01;

  return totalArr.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const calculateTotalWeightNum = (data: CharacterData): number => {
  let totalW = parseFloat(data.currency?.coinWeight) || 0;
  (data.equipmentBags || []).forEach(bag => {
    if (!bag.ignoreWeight) {
      const items = bag.items || {};
      const count = getSoACount(items);
      for (let i = 0; i < count; i++) {
          const weight = parseFloat((items as any).weight?.[i]) || 0;
          const qty = parseInt((items as any).quantity?.[i]) || 1;
          totalW += weight * qty;
      }
    }
  });
  return totalW;
};

export interface EncumbranceThresholds {
  light: number;
  medium: number;
  heavy: number;
}

export const getComputedEncumbrance = (data: CharacterData): EncumbranceThresholds => {
  // SoA 适配：从 attributes.final 数组中取第一个值（力量）
  const strValueRaw = data.attributes?.final?.[0];
  const strValue = strValueRaw !== undefined ? (parseInt(strValueRaw as any) || 10) : 10;
  
  const mult = parseFloat(data.encumbranceMultiplier) > 0 ? parseFloat(data.encumbranceMultiplier) : 1;

  let heavy = 0;
  if (strValue <= 10) {
    heavy = strValue * 10;
  } else {
    const seq = [115, 130, 150, 175, 200, 230, 260, 300, 350];
    if (strValue >= 11 && strValue <= 19) {
      heavy = seq[strValue - 11];
    } else {
      const eff = (strValue % 10) + 10;
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

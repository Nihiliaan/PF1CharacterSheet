import { describe, it, expect } from 'vitest';
import {
  getModifier,
  formatModifier,
  getSizeModifier,
  calculateCurrencyTotal,
  calculateTotalCost,
  calculateTotalWeightNum,
  getComputedEncumbrance,
  getAttributeModifiers,
} from '../calculations';
import type { CharacterData } from '../../schema/types';

const makeData = (equipment: any, final: number[] = [10, 10, 10, 10, 10, 10]): CharacterData =>
  ({ equipment, attributes: { final } }) as unknown as CharacterData;

describe('getModifier', () => {
  it('标准 PF1 属性调整值：10/11 为 0，偶数加值，奇数向下取整', () => {
    expect(getModifier(10)).toBe(0);
    expect(getModifier(11)).toBe(0);
    expect(getModifier(12)).toBe(1);
    expect(getModifier(13)).toBe(1); // (13-10)/2=1.5 → floor 1
    expect(getModifier(9)).toBe(-1);
    expect(getModifier(7)).toBe(-2); // (7-10)/2=-1.5 → floor -2
    expect(getModifier(20)).toBe(5);
  });

  it('接受字符串输入，非法字符串回退为 10', () => {
    expect(getModifier('14')).toBe(2);
    expect(getModifier('')).toBe(0);
    expect(getModifier('abc')).toBe(0);
  });
});

describe('formatModifier', () => {
  it('非负数带 + 号，负数带 - 号', () => {
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(-2)).toBe('-2');
  });
});

describe('getSizeModifier', () => {
  it('中英文名称均能映射到体型修正', () => {
    expect(getSizeModifier('中型')).toBe(0);
    expect(getSizeModifier('Medium')).toBe(0);
    expect(getSizeModifier('小型')).toBe(1);
    expect(getSizeModifier('Small')).toBe(1);
    expect(getSizeModifier('微型')).toBe(2);
    expect(getSizeModifier('大型')).toBe(-1);
    expect(getSizeModifier('超巨')).toBe(-8);
    expect(getSizeModifier('Colossal')).toBe(-8);
  });

  it('未知体型返回 0', () => {
    expect(getSizeModifier('???')).toBe(0);
  });
});

describe('calculateCurrencyTotal', () => {
  it('按 1pp=10gp, 1sp=0.1gp, 1cp=0.01gp 折算并保留两位小数', () => {
    const data = makeData({ currency: { pp: '2', gp: '5', sp: '3', cp: '4' } });
    // 20 + 5 + 0.3 + 0.04 = 25.34
    expect(calculateCurrencyTotal(data)).toBe(25.34);
  });

  it('浮点精度：纯银铜币合计不产生 0.30000000000000004', () => {
    const data = makeData({ currency: { pp: '0', gp: '0', sp: '3', cp: '0' } });
    expect(calculateCurrencyTotal(data)).toBe(0.3);
  });

  it('缺字段按 0 处理', () => {
    expect(calculateCurrencyTotal(makeData({}))).toBe(0);
    expect(calculateCurrencyTotal(makeData({ currency: {} }))).toBe(0);
  });
});

describe('calculateTotalCost', () => {
  it('装备 cost×qty 求和 + 钱币合计', () => {
    const data = makeData({
      container: [
        { item: ['长剑', '弓'], cost: ['15', '100'], quantity: ['1', '2'], weight: ['4', '3'] },
      ],
      currency: { gp: '10' },
    });
    // 15*1 + 100*2 + 10 = 225
    expect(calculateTotalCost(data)).toBe('225');
  });

  it('ignoreCost 的背包不计入装备价值', () => {
    const data = makeData({
      container: [
        { ignoreCost: true, item: ['王冠'], cost: ['5000'], quantity: ['1'] },
        { item: ['火把'], cost: ['0.1'], quantity: ['10'] },
      ],
      currency: {},
    });
    expect(calculateTotalCost(data)).toBe('1');
  });

  it('quantity 非法时按 1 件计', () => {
    const data = makeData({
      container: [{ item: ['绳子'], cost: ['2'], quantity: ['x'] }],
      currency: {},
    });
    expect(calculateTotalCost(data)).toBe('2');
  });

  it('千位分隔符与两位小数上限', () => {
    const data = makeData({
      container: [{ item: ['钻石'], cost: ['12345.6'], quantity: ['1'] }],
      currency: {},
    });
    expect(calculateTotalCost(data)).toBe('12,345.6');
  });
});

describe('calculateTotalWeightNum', () => {
  it('钱币重量 + 装备 weight×qty 求和', () => {
    const data = makeData({
      container: [{ item: ['剑', '弓'], weight: ['4', '3'], quantity: ['1', '2'] }],
      currency: { coinWeight: '5.5' },
    });
    // 5.5 + 4*1 + 3*2 = 15.5
    expect(calculateTotalWeightNum(data)).toBe(15.5);
  });

  it('ignoreWeight 的背包不计入', () => {
    const data = makeData({
      container: [
        { ignoreWeight: true, item: ['背包'], weight: ['100'], quantity: ['1'] },
        { item: ['匕首'], weight: ['1'], quantity: ['1'] },
      ],
      currency: { coinWeight: '0' },
    });
    expect(calculateTotalWeightNum(data)).toBe(1);
  });
});

describe('getComputedEncumbrance', () => {
  // 对照 PF1 官方负重表（磅）
  it.each([
    [10, 100],
    [11, 115],
    [12, 130],
    [15, 200],
    [18, 300],
    [19, 350],
    [20, 400],
    [21, 460],
    [29, 1400],
    [30, 1600],
    [40, 6400],
  ])('力量 %i → 重载阈值 %i', (str, heavy) => {
    const result = getComputedEncumbrance(makeData({}, [str, 10, 10, 10, 10, 10]));
    expect(result.heavy).toBe(heavy);
    expect(result.light).toBe(Math.floor(heavy / 3));
    expect(result.medium).toBe(Math.floor((heavy * 2) / 3));
  });

  it('encumbranceMultiplier 放大阈值（向下取整）', () => {
    const data = makeData({ encumbranceMultiplier: '2' }, [10, 10, 10, 10, 10, 10]);
    const r = getComputedEncumbrance(data);
    expect(r.heavy).toBe(200);
    expect(r.light).toBe(66); // floor(33*2)
    expect(r.medium).toBe(132); // floor(66*2)
  });

  it('multiplier 缺失或非法时按 1 处理；力量缺失按 10 处理', () => {
    expect(getComputedEncumbrance(makeData({ encumbranceMultiplier: '0' })).heavy).toBe(100);
    expect(getComputedEncumbrance(makeData({})).heavy).toBe(100);
    expect(getComputedEncumbrance({} as CharacterData).heavy).toBe(100);
  });
});

describe('getAttributeModifiers', () => {
  it('按 STR/DEX/CON/INT/WIS/CHA 顺序返回调整值', () => {
    const mods = getAttributeModifiers(
      makeData({}, [14, 10, 8, 12, 13, 7]) as CharacterData
    );
    expect(mods).toEqual({ STR: 2, DEX: 0, CON: -1, INT: 1, WIS: 1, CHA: -2 });
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseFractionOrNumber,
  cleanCost,
  cleanWeight,
  cleanQuantity,
  extractEmbeddedQuantity,
  detectFormatMode,
  parseEquipmentText,
} from '../equipmentBatchParser';

describe('parseFractionOrNumber', () => {
  it.each([
    ['1/2', 0.5],
    ['3/4', 0.75],
    ['-1/2', -0.5],
    ['1 1/2', 1.5],
    ['10', 10],
    ['10.5', 10.5],
    ['-3', -3],
  ])('数值与分数：%s → %i', (input, expected) => {
    expect(parseFractionOrNumber(input)).toBe(expected);
  });

  it.each(['-', '—', '--', '无', 'free', 'n/a', '', 'abc'])('%s → 0', (input) => {
    expect(parseFractionOrNumber(input)).toBe(0);
  });

  it('从混合文本中提取首个数字', () => {
    expect(parseFractionOrNumber('4磅')).toBe(4);
    expect(parseFractionOrNumber('15 gp')).toBe(15);
  });
});

describe('cleanCost', () => {
  it.each([
    ['10gp', 10],
    ['15', 15],
    ['34金币', 34],
    ['50sp', 5],
    ['100cp', 1],
    ['5pp', 50],
    ['2白金币', 20],
    ['1/2', 0.5],
  ])('单位换算：%s → %i gp', (input, expected) => {
    expect(cleanCost(input)).toBe(expected);
  });

  it('空值与非数值返回 0', () => {
    expect(cleanCost('')).toBe(0);
    expect(cleanCost('-')).toBe(0);
    expect(cleanCost('赠品')).toBe(0);
  });
});

describe('cleanQuantity', () => {
  it('默认 1；正数取整；非正数回退 1', () => {
    expect(cleanQuantity('')).toBe(1);
    expect(cleanQuantity('5')).toBe(5);
    expect(cleanQuantity('2.7')).toBe(3);
    expect(cleanQuantity('0')).toBe(1);
    expect(cleanQuantity('-3')).toBe(1);
  });
});

describe('cleanWeight', () => {
  it('提取数字并支持分数重量', () => {
    expect(cleanWeight('4磅')).toBe(4);
    expect(cleanWeight('1/2')).toBe(0.5);
    expect(cleanWeight('10 lbs')).toBe(10);
    expect(cleanWeight('—')).toBe(0);
  });
});

describe('extractEmbeddedQuantity', () => {
  it.each([
    ['弩矢（20）', 1, '弩矢', 20],
    ['火把 (10)', 1, '火把', 10],
    ['口粮 x5', 1, '口粮', 5],
    ['箭矢*50', 1, '箭矢', 50],
    ['"绳子"', 1, '绳子', 1],
  ])('从名称提取数量：%s', (name, qty, expName, expQty) => {
    expect(extractEmbeddedQuantity(name, qty)).toEqual({ item: expName, quantity: expQty });
  });

  it('括号内非纯数字不拆分（如增强加值）', () => {
    expect(extractEmbeddedQuantity('精魂链甲 +1', 1)).toEqual({ item: '精魂链甲 +1', quantity: 1 });
    expect(extractEmbeddedQuantity('长剑（精制）', 1)).toEqual({ item: '长剑（精制）', quantity: 1 });
  });

  it('已有数量 (>1) 时不被名称内嵌数量覆盖', () => {
    expect(extractEmbeddedQuantity('弩矢（20）', 5)).toEqual({ item: '弩矢', quantity: 5 });
  });
});

describe('detectFormatMode', () => {
  it('制表符 → tsv，逗号 → csv，BBCode 表格 → bbcode，多空格 → space', () => {
    expect(detectFormatMode('长剑\t1\t15')).toBe('tsv');
    expect(detectFormatMode('长剑,1,15')).toBe('csv');
    expect(detectFormatMode('[table][tr][td]长剑[/td][/tr][/table]')).toBe('bbcode');
    expect(detectFormatMode('长剑  15  4')).toBe('space');
    expect(detectFormatMode('')).toBe('tsv');
  });

  it('显式指定 mode 时不做自动检测（auto 才检测）', () => {
    // parseEquipmentText 内部调用；这里只验证 auto 入口行为
    const r = parseEquipmentText('长剑,1,15', 'auto');
    expect(r.detectedMode).toBe('csv');
  });
});

describe('parseEquipmentText', () => {
  it('TSV + 标准表头：正确映射五列并跳过表头行', () => {
    const text = '物品\t数量\t价格\t重量\t备注\n长剑\t1\t15gp\t4磅\t军用\n铁盾\t2\t10gp\t8磅\t';
    const r = parseEquipmentText(text);
    expect(r.detectedMode).toBe('tsv');
    expect(r.items).toEqual([
      { item: '长剑', quantity: 1, cost: 15, weight: 4, notes: '军用' },
      { item: '铁盾', quantity: 2, cost: 10, weight: 8, notes: '' },
    ]);
    expect(r.rawCount).toBe(2);
  });

  it('无表头 4 列且第 2 列像价格：按 [物品,价格,重量,备注] 推断', () => {
    const text = '长剑,15gp,4,军用\n铁盾,10gp,8,';
    const r = parseEquipmentText(text);
    expect(r.items[0]).toEqual({ item: '长剑', quantity: 1, cost: 15, weight: 4, notes: '军用' });
    expect(r.items[1]).toEqual({ item: '铁盾', quantity: 1, cost: 10, weight: 8, notes: '' });
  });

  it('BBCode 表格：剥离标签后按表头解析', () => {
    const text = '[table][tr][td]物品[/td][td]价格[/td][td]重量[/td][/tr][tr][td]长剑[/td][td]15gp[/td][td]4磅[/td][/tr][/table]';
    const r = parseEquipmentText(text);
    expect(r.detectedMode).toBe('bbcode');
    expect(r.items).toEqual([{ item: '长剑', quantity: 1, cost: 15, weight: 4, notes: '' }]);
  });

  it('名称内嵌数量被提取', () => {
    const r = parseEquipmentText('弩矢（20）\t1\t1gp\t1磅\t');
    expect(r.items[0]).toEqual({ item: '弩矢', quantity: 20, cost: 1, weight: 1, notes: '' });
  });

  it('跳过空行与纯分隔线', () => {
    const r = parseEquipmentText('---\n\n===\n长剑\t1\t15\t4');
    expect(r.items).toEqual([{ item: '长剑', quantity: 1, cost: 15, weight: 4, notes: '' }]);
  });

  it('显式 mode 覆盖自动检测', () => {
    // 单空格分隔在 auto 下会走 space 分支；强制 csv 则按逗号切
    const r = parseEquipmentText('长剑,15,4', 'csv');
    expect(r.detectedMode).toBe('csv');
    expect(r.items[0].item).toBe('长剑');
  });

  it('空输入返回空结果', () => {
    expect(parseEquipmentText('')).toEqual({ detectedMode: 'auto', items: [], rawCount: 0, warnings: [] });
    expect(parseEquipmentText('   \n  ').items).toEqual([]);
  });
});

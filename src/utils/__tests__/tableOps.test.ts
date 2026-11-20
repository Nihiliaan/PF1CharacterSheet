import { describe, it, expect } from 'vitest';
import {
  insertRows, applyGrid, fillRows, clearCells, buildTsv, parseTsvGrid, writeCell, type CellRect
} from '../tableOps';
import type { Column } from '../../schema/types';

// 装备物品表列结构与 schema/fieldRegistry 注册一致（经真实 handler 管线测试语义）；
// handler 解析走 fieldRegistry 真实注册，列定义仅提供键序
const columns: Column[] = [
  { key: 'item', label: '物品' },
  { key: 'quantity', label: '' },
  { key: 'cost', label: '价格 (gp)' },
  { key: 'weight', label: '重量 (磅)' },
  { key: 'notes', label: '备注' }
];

const PATH = 'equipment.container[0]';

const makeBag = (rows: Array<[string, number, number, number, string]>) => ({
  id: 'bag-1',
  name: '背包',
  ignoreWeight: false,
  item: rows.map(r => r[0]),
  quantity: rows.map(r => r[1]),
  cost: rows.map(r => r[2]),
  weight: rows.map(r => r[3]),
  notes: rows.map(r => r[4])
});

describe('parseTsvGrid', () => {
  it('基础行列拆分', () => {
    expect(parseTsvGrid('a\tb\tc\nd\te\tf\n')).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
  });

  it('引号单元格内嵌换行/制表符/引号转义', () => {
    const text = 'a\t"b1\tb2"\n"c1\nc2"\t"say ""hi"""';
    expect(parseTsvGrid(text)).toEqual([
      ['a', 'b1\tb2'],
      ['c1\nc2', 'say "hi"']
    ]);
  });

  it('末尾空行剔除、行尾空单元格保留', () => {
    expect(parseTsvGrid('a\t\t\nb\t2\t\n')).toEqual([['a', '', ''], ['b', '2', '']]);
    expect(parseTsvGrid('')).toEqual([]);
  });
});

describe('buildTsv / parseTsvGrid 往返', () => {
  it('含引号与换行的值可无损往返', () => {
    const data = makeBag([['绳索（含"备用"段）', 2, 1.5, 0.5, '多行\n备注']]);
    const rect: CellRect = { row0: 0, row1: 0, col0: 0, col1: 4 };
    const tsv = buildTsv(data, columns, rect);
    expect(parseTsvGrid(tsv)).toEqual([['绳索（含"备用"段）', '2', '1.5', '0.5', '多行\n备注']]);
  });

  it('写出原始存储值（数量为数字无 × 装饰、价格为纯数字无单位）', () => {
    const data = makeBag([['火把', 5, 0.25, 1, '']]);
    const tsv = buildTsv(data, columns, { row0: 0, row1: 0, col0: 0, col1: 4 });
    expect(tsv).toBe('火把\t5\t0.25\t1\t');
  });
});

describe('insertRows', () => {
  it('所有列同步插入默认值（quantity=1、cost/weight=0、文本空）', () => {
    const next = insertRows(makeBag([['绳索', 2, 1, 0.1, '']]), columns, PATH, 0, 2);
    expect(next.item).toEqual(['', '', '绳索']);
    expect(next.quantity).toEqual([1, 1, 2]);
    expect(next.cost).toEqual([0, 0, 1]);
    expect(next.weight).toEqual([0, 0, 0.1]);
    expect(next.notes).toEqual(['', '', '']);
    // 非列键不受影响
    expect(next.id).toBe('bag-1');
    expect(next.name).toBe('背包');
  });

  it('at 越界钳制到表尾（追加）', () => {
    const next = insertRows(makeBag([['a', 1, 0, 0, '']]), columns, PATH, 99, 1);
    expect(next.item).toEqual(['a', '']);
    expect(next.quantity).toEqual([1, 1]);
  });
});

describe('applyGrid', () => {
  it('粘贴落盘：值经 handler 管线钳制，行不足自动扩行，选区返回目标矩形', () => {
    const result = applyGrid(makeBag([['绳索', 1, 0, 0, '']]), columns, PATH, 1, 0, [
      ['火把', '5', '0.25', '1', ''],
      ['弓', '1', '20', '2', '远程']
    ]);
    expect(result.data.item).toEqual(['绳索', '火把', '弓']);
    expect(result.data.quantity).toEqual([1, 5, 1]);
    expect(result.data.cost).toEqual([0, 0.25, 20]);
    expect(result.rect).toEqual({ row0: 1, row1: 2, col0: 0, col1: 4 });
  });

  it('超列截断（列结构固定 5 列）', () => {
    const result = applyGrid(makeBag([['a', 1, 0, 0, '']]), columns, PATH, 0, 4, [
      ['备注A', '多余列', '再多列']
    ]);
    expect(result.data.notes).toEqual(['备注A']);
    expect(result.data).not.toHaveProperty('多余列');
  });
});

describe('fillRows', () => {
  it('源行块为周期循环复制到目标行', () => {
    const src: CellRect = { row0: 0, row1: 1, col0: 0, col1: 4 };
    const next = fillRows(
      makeBag([['A', 1, 0, 0, ''], ['B', 2, 0, 0, ''], ['', 1, 0, 0, ''], ['', 1, 0, 0, '']]),
      columns, PATH, src, [2, 3]
    );
    expect(next.item).toEqual(['A', 'B', 'A', 'B']);
    expect(next.quantity).toEqual([1, 2, 1, 2]);
  });

  it('向上填充：目标行反向循环取源行块（首行取源块末行）', () => {
    const src: CellRect = { row0: 2, row1: 3, col0: 0, col1: 0 };
    const next = fillRows(
      makeBag([['', 1, 0, 0, ''], ['target', 1, 0, 0, ''], ['C', 1, 0, 0, ''], ['D', 1, 0, 0, '']]),
      columns, PATH, src, [1, 0]
    );
    // t=1: (1-2)%2=-1 → 源块末行 D；t=0: (0-2)%2=0 → 源块首行 C
    expect(next.item).toEqual(['C', 'D', 'C', 'D']);
  });
});

describe('clearCells', () => {
  it('经 handler 管线清空：数量回 1、数值回 0、文本回空', () => {
    const next = clearCells(
      makeBag([['A', 7, 12.5, 3.3, 'x']]),
      columns, PATH, { row0: 0, row1: 0, col0: 0, col1: 4 }
    );
    expect(next.item).toEqual(['']);
    expect(next.quantity).toEqual([1]);
    expect(next.cost).toEqual([0]);
    expect(next.weight).toEqual([0]);
    expect(next.notes).toEqual(['']);
  });
});

describe('writeCell', () => {
  it('写值经 handler 钳制（成本两位小数）', () => {
    const bag = makeBag([]);
    const next = writeCell(bag, PATH, 'cost', 0, '12.3456');
    expect(next.cost).toEqual([12.35]);
  });
});

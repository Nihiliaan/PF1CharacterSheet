import { getHandlerByPath } from '../schema/fieldRegistry';
import type { Column } from '../schema/types';

/**
 * SoA 表格（Record<列key, 行数组>）的 Excel 式批量操作工具。
 * 全部为纯函数：接收表对象返回新对象（浅拷贝外壳 + 被改列数组拷贝），
 * 单元格写入一律经 fieldRegistry handler 的 update() 管线，与逐格编辑语义完全一致。
 * 适用范围：装备物品表等"列固定、无跨列联动"的 SoA 表。
 */

/** 闭矩形选区（行列均为含端点的数据索引，col 为 columns 下标） */
export interface CellRect {
  row0: number;
  row1: number;
  col0: number;
  col1: number;
}

export const normalizeRect = (a: { row: number; col: number }, b: { row: number; col: number }): CellRect => ({
  row0: Math.min(a.row, b.row),
  row1: Math.max(a.row, b.row),
  col0: Math.min(a.col, b.col),
  col1: Math.max(a.col, b.col),
});

export const rowCountOf = (data: Record<string, any>, columns: Column[]): number => {
  const first = columns[0]?.key;
  if (!first) return 0;
  const arr = data?.[first];
  return Array.isArray(arr) ? arr.length : 0;
};

const colHandler = (path: string, key: string) => getHandlerByPath(`${path}.${key}[0]`);

const colDefault = (path: string, key: string): any => {
  const h = colHandler(path, key);
  return h?.getDefaultValue ? h.getDefaultValue() : '';
};

export const readCell = (data: Record<string, any>, key: string, index: number): any => data?.[key]?.[index] ?? '';

/** 写单元格：数组自动补齐到 index，值经 handler.update() 钳制（数量/两位小数等既有语义） */
export const writeCell = (data: Record<string, any>, path: string, key: string, index: number, value: any): Record<string, any> => {
  const handler = colHandler(path, key);
  const def = colDefault(path, key);
  const finalValue = handler?.update ? handler.update(value) : value;
  const arr = Array.isArray(data[key]) ? [...data[key]] : [];
  while (arr.length <= index) arr.push(def);
  arr[index] = finalValue;
  return { ...data, [key]: arr };
};

/** 在 at 位置插入 count 行（所有列同步 splice，填列默认值；at 越界钳制到 0..rowCount） */
export const insertRows = (data: Record<string, any>, columns: Column[], path: string, at: number, count: number): Record<string, any> => {
  if (count <= 0 || columns.length === 0) return data;
  const rowCount = rowCountOf(data, columns);
  const insertAt = Math.max(0, Math.min(at, rowCount));
  const next = { ...data };
  columns.forEach((c) => {
    const def = colDefault(path, c.key);
    const arr = Array.isArray(next[c.key]) ? [...next[c.key]] : new Array(rowCount).fill(def);
    while (arr.length < rowCount) arr.push(def);
    arr.splice(insertAt, 0, ...new Array(count).fill(def));
    next[c.key] = arr;
  });
  return next;
};

/** 粘贴落盘：grid 以 (anchorRow, anchorCol) 为左上角写入；超行自动扩行，超列截断（列结构固定） */
export const applyGrid = (
  data: Record<string, any>,
  columns: Column[],
  path: string,
  anchorRow: number,
  anchorCol: number,
  grid: string[][]
): { data: Record<string, any>; rect: CellRect } => {
  const rows = grid.length;
  if (rows === 0) return { data, rect: { row0: anchorRow, row1: anchorRow, col0: anchorCol, col1: anchorCol } };
  const cols = Math.max(...grid.map((r) => r.length));
  const clampedCols = Math.min(cols, columns.length - anchorCol);
  const currentRows = rowCountOf(data, columns);
  const shortRows = anchorRow + rows - currentRows;
  let next = shortRows > 0 ? insertRows(data, columns, path, currentRows, shortRows) : data;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < clampedCols; c++) {
      next = writeCell(next, path, columns[anchorCol + c].key, anchorRow + r, grid[r][c] ?? '');
    }
  }
  return { data: next, rect: { row0: anchorRow, row1: anchorRow + rows - 1, col0: anchorCol, col1: anchorCol + clampedCols - 1 } };
};

/**
 * 循环复制填充：源矩形行块为周期，复制到 targetRows（仅支持向下语义）。
 * 值为已入库的存储值直接复制（handler.update 对规范化值幂等，重跑无害）。
 */
export const fillRows = (
  data: Record<string, any>,
  columns: Column[],
  path: string,
  src: CellRect,
  targetRows: number[]
): Record<string, any> => {
  const height = src.row1 - src.row0 + 1;
  if (height <= 0 || targetRows.length === 0) return data;
  const srcRows: any[][] = [];
  for (let r = src.row0; r <= src.row1; r++) {
    srcRows.push(columns.slice(src.col0, src.col1 + 1).map((c) => readCell(data, c.key, r)));
  }
  let next = data;
  targetRows.forEach((t) => {
    // 支持向上填充：负数索引经双取模映射回源行块（Excel 向上=源行块反向循环）
    const srcRow = srcRows[(((t - src.row0) % height) + height) % height];
    srcRow.forEach((v, i) => {
      next = writeCell(next, path, columns[src.col0 + i].key, t, v);
    });
  });
  return next;
};

/** 选区清空：逐格写 '' 经 handler 管线（数量回 1、数值回 0、文本回 ''），与单格删除语义一致 */
export const clearCells = (data: Record<string, any>, columns: Column[], path: string, rect: CellRect): Record<string, any> => {
  let next = data;
  for (let r = rect.row0; r <= rect.row1; r++) {
    for (let c = rect.col0; c <= rect.col1; c++) {
      next = writeCell(next, path, columns[c].key, r, '');
    }
  }
  return next;
};

/** 选区 → TSV（原始存储值，无显示装饰；含引号/制表符/换行的单元格按 TSV 引号转义） */
export const buildTsv = (data: Record<string, any>, columns: Column[], rect: CellRect): string => {
  const encode = (v: any): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /["\t\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  for (let r = rect.row0; r <= rect.row1; r++) {
    const cells: string[] = [];
    for (let c = rect.col0; c <= rect.col1; c++) {
      cells.push(encode(data?.[columns[c].key]?.[r]));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
};

/** TSV → 二维网格（支持引号单元格内嵌换行/制表符/"" 转义；剔除末尾空行） */
export const parseTsvGrid = (text: string): string[][] => {
  const grid: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let cellQuoted = false;
  const pushCell = () => {
    row.push(cell);
    cell = '';
    cellQuoted = false;
  };
  const pushRow = () => {
    pushCell();
    grid.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === '') { inQuotes = true; cellQuoted = true; continue; }
    if (ch === '\t') { pushCell(); continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { pushRow(); continue; }
    cell += ch;
  }
  if (cell !== '' || row.length > 0 || cellQuoted) pushRow();
  return grid.filter((r) => !(r.length === 1 && r[0] === ''));
};

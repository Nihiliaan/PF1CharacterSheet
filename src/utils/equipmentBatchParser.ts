export type EquipmentParseMode = 'auto' | 'tsv' | 'csv' | 'space' | 'bbcode';

export interface ParsedEquipmentItem {
  item: string;
  quantity: number;
  cost: number;
  weight: number;
  notes: string;
}

export interface ParseResult {
  detectedMode: EquipmentParseMode;
  items: ParsedEquipmentItem[];
  rawCount: number;
  warnings: string[];
}

/**
 * 将字符串解析为浮点数，支持常见分数形式（如 1/2, 1/4, 1/8, 3/4 等）
 */
export function parseFractionOrNumber(str: string): number {
  if (!str) return 0;
  const s = str.trim();
  if (s === '-' || s === '—' || s === '--' || s === '无' || s.toLowerCase() === 'free' || s.toLowerCase() === 'n/a') {
    return 0;
  }
  
  // 匹配分数：如 1/2, 3/4
  const fracMatch = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) return Math.round((num / den) * 1000) / 1000;
  }

  // 匹配带分数的混合数：如 1 1/2
  const mixedMatch = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den !== 0) {
      const sign = whole < 0 ? -1 : 1;
      return Math.round((whole + sign * (num / den)) * 1000) / 1000;
    }
  }

  // 提取标准浮点数
  const numMatch = s.match(/-?\d+(?:\.\d+)?/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    return isNaN(val) ? 0 : val;
  }

  return 0;
}

/**
 * 解析并清洗价格，转换为 gp 为基准单位的数字
 * 支持: 10gp, 50sp, 100cp, 5pp, 34金币, 15 等
 */
export function cleanCost(str: string): number {
  if (!str) return 0;
  const s = str.trim().toLowerCase();
  const val = parseFractionOrNumber(s);
  if (val === 0) return 0;

  if (s.includes('pp') || s.includes('白金')) {
    return Math.round(val * 10 * 100) / 100;
  }
  if (s.includes('sp') || s.includes('银币') || s.includes('银')) {
    return Math.round((val / 10) * 100) / 100;
  }
  if (s.includes('cp') || s.includes('铜币') || s.includes('铜')) {
    return Math.round((val / 100) * 100) / 100;
  }

  // 默认为 gp / 金币
  return val;
}

/**
 * 解析并清洗重量，转换为磅 (lbs) 的数字
 * 支持: 10lbs, 5 lb, 1/2磅, 0.5 等
 */
export function cleanWeight(str: string): number {
  if (!str) return 0;
  return parseFractionOrNumber(str);
}

/**
 * 清洗数量，默认 1
 */
export function cleanQuantity(str: string): number {
  if (!str) return 1;
  const val = parseFractionOrNumber(str);
  return val > 0 ? Math.round(val) : 1;
}

/**
 * 智能拆分物品名称中内嵌的数量
 * 例如:
 *  "弩矢（20）" -> name: "弩矢", quantity: 20
 *  "火把 (10)" -> name: "火把", quantity: 10
 *  "口粮 x5" -> name: "口粮", quantity: 5
 *  "精魂链甲 +1" -> name: "精魂链甲 +1", quantity: 不变
 */
export function extractEmbeddedQuantity(itemName: string, currentQuantity: number): { item: string; quantity: number } {
  let name = (itemName || '').trim();
  let quantity = currentQuantity;

  // 移除首尾引号
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    name = name.slice(1, -1).trim();
  }

  // 1. 括号格式: 物品名(数字) 或 物品名（数字）
  const bracketMatch = name.match(/^(.*?)\s*[(（]\s*(\d+)\s*(?:件|个|支|张|发|枚|瓶|根|份|包|磅)?\s*[)）]\s*(.*)$/);
  if (bracketMatch) {
    const extractedQty = parseInt(bracketMatch[2], 10);
    if (!isNaN(extractedQty) && extractedQty > 0) {
      const cleanPrefix = bracketMatch[1].trim();
      const cleanSuffix = bracketMatch[3].trim();
      name = cleanPrefix ? (cleanSuffix ? `${cleanPrefix} ${cleanSuffix}` : cleanPrefix) : cleanSuffix;
      // 只有当前数量为默认值 1 时，才以名称内的数量覆盖
      if (quantity <= 1) {
        quantity = extractedQty;
      }
    }
  } else {
    // 2. 乘号格式: 物品名 x10 或 物品名*5
    const multiplierMatch = name.match(/^(.*?)\s*[xX*×]\s*(\d+)\s*$/);
    if (multiplierMatch) {
      const extractedQty = parseInt(multiplierMatch[2], 10);
      if (!isNaN(extractedQty) && extractedQty > 0) {
        name = multiplierMatch[1].trim();
        if (quantity <= 1) {
          quantity = extractedQty;
        }
      }
    }
  }

  return { item: name, quantity };
}

/**
 * 简单 CSV 行拆分器（支持单行内引号转义）
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * 清除 BBCode 标签，如 [b], [/b], [color=red] 等
 */
function stripBbcodeTags(text: string): string {
  return text.replace(/\[\/?[a-zA-Z0-9_-]+(?:=[^\]]+)?\]/g, '').trim();
}

/**
 * 解析 BBCode 表格内容
 */
function parseBbcodeTable(rawText: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /\[tr\]([\s\S]*?)\[\/tr\]/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(rawText)) !== null) {
    const trContent = trMatch[1];
    const cells: string[] = [];
    const tdRegex = /\[(td|th)\]([\s\S]*?)\[\/\1\]/gi;
    let tdMatch: RegExpExecArray | null;

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      cells.push(stripBbcodeTags(tdMatch[2]));
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

interface ColumnMap {
  item: number;
  quantity: number;
  cost: number;
  weight: number;
  notes: number;
}

/**
 * 表头检测：根据首行关键词推断列映射
 */
function detectColumnMapping(headerRow: string[]): { mapping: ColumnMap; isHeader: boolean } {
  let item = -1;
  let quantity = -1;
  let cost = -1;
  let weight = -1;
  let notes = -1;

  let matchedKeywordCount = 0;

  headerRow.forEach((col, idx) => {
    const c = col.trim().toLowerCase();
    if (!c) return;

    if (item === -1 && /^(?:物品|名称|装备|道具|item|name|equipment)$/i.test(c)) {
      item = idx;
      matchedKeywordCount++;
    } else if (quantity === -1 && /^(?:数量|件数|份数|计数|qty|quantity|count|amount)$/i.test(c)) {
      quantity = idx;
      matchedKeywordCount++;
    } else if (cost === -1 && /^(?:价格|价值|售价|金币|价钱|cost|price|gp|gold)$/i.test(c)) {
      cost = idx;
      matchedKeywordCount++;
    } else if (weight === -1 && /^(?:重量|负重|负载|重|磅|weight|wt|lbs|lb)$/i.test(c)) {
      weight = idx;
      matchedKeywordCount++;
    } else if (notes === -1 && /^(?:备注|说明|特性|描述|效果|note|notes|desc|description|info)$/i.test(c)) {
      notes = idx;
      matchedKeywordCount++;
    }
  });

  // 如果至少匹配到 2 个标准列名关键词，则认定为表头
  const isHeader = matchedKeywordCount >= 2;

  // 未指定的字段按常规顺序补足或默认
  return {
    mapping: {
      item: item !== -1 ? item : 0,
      quantity: quantity,
      cost: cost,
      weight: weight,
      notes: notes
    },
    isHeader
  };
}

/**
 * 对未识别出表头的常规行应用默认推断列映射
 */
function inferDefaultMapping(sampleRows: string[][]): ColumnMap {
  if (sampleRows.length === 0) {
    return { item: 0, quantity: 1, cost: 2, weight: 3, notes: 4 };
  }

  const colCount = Math.max(...sampleRows.map(r => r.length));

  if (colCount >= 5) {
    // 5列及以上：默认 [物品, 数量, 价格, 重量, 备注]
    return { item: 0, quantity: 1, cost: 2, weight: 3, notes: 4 };
  }

  if (colCount === 4) {
    // 4列：分析第2列是数量还是价格
    // 如果第2列包含 gp 或小数，或者数值普遍 > 50，通常是 [物品, 价格, 重量, 备注]
    let col1LooksLikePrice = false;
    for (const r of sampleRows.slice(0, 5)) {
      const v = (r[1] || '').toLowerCase();
      if (v.includes('gp') || v.includes('sp') || v.includes('cp') || v.includes('金')) {
        col1LooksLikePrice = true;
        break;
      }
      const num = parseFloat(v);
      if (!isNaN(num) && (num > 50 || v.includes('.'))) {
        col1LooksLikePrice = true;
        break;
      }
    }

    if (col1LooksLikePrice) {
      return { item: 0, quantity: -1, cost: 1, weight: 2, notes: 3 };
    } else {
      return { item: 0, quantity: 1, cost: 2, weight: 3, notes: -1 };
    }
  }

  if (colCount === 3) {
    // 3列：[物品, 价格, 重量] 或 [物品, 数量, 备注]
    return { item: 0, quantity: -1, cost: 1, weight: 2, notes: -1 };
  }

  if (colCount === 2) {
    // 2列：[物品, 重量/价格/备注]
    return { item: 0, quantity: -1, cost: -1, weight: 1, notes: -1 };
  }

  // 1列：[物品]
  return { item: 0, quantity: -1, cost: -1, weight: -1, notes: -1 };
}

/**
 * 自动检测文本的格式模式
 */
export function detectFormatMode(rawText: string): EquipmentParseMode {
  const text = rawText.trim();
  if (!text) return 'tsv';

  // 1. 检查 BBCode 表格
  if (/\[tr\][\s\S]*?\[\/tr\]/i.test(text) || (/\[table\]/i.test(text) && /\[td\]/i.test(text))) {
    return 'bbcode';
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return 'tsv';

  let tsvCount = 0;
  let csvCount = 0;
  let multiSpaceCount = 0;

  for (const line of lines.slice(0, 10)) {
    if (line.includes('\t')) tsvCount++;
    if (line.includes(',')) csvCount++;
    if (/\s{2,}/.test(line.trim())) multiSpaceCount++;
  }

  if (tsvCount > 0 && tsvCount >= csvCount) {
    return 'tsv';
  }
  if (csvCount > 0 && csvCount > tsvCount) {
    return 'csv';
  }
  if (multiSpaceCount > 0) {
    return 'space';
  }

  return 'tsv';
}

/**
 * 核心批量解析入口
 */
export function parseEquipmentText(rawText: string, mode: EquipmentParseMode = 'auto'): ParseResult {
  const warnings: string[] = [];
  if (!rawText || !rawText.trim()) {
    return { detectedMode: mode, items: [], rawCount: 0, warnings };
  }

  const finalMode = mode === 'auto' ? detectFormatMode(rawText) : mode;
  let rawRows: string[][] = [];

  if (finalMode === 'bbcode') {
    rawRows = parseBbcodeTable(rawText);
  } else {
    const rawLines = rawText.split(/\r?\n/);
    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      // 跳过空行和纯分隔线
      if (!line || /^[-=_*~]{3,}$/.test(line)) {
        continue;
      }

      if (finalMode === 'tsv') {
        rawRows.push(rawLine.split('\t').map(c => c.trim()));
      } else if (finalMode === 'csv') {
        rawRows.push(splitCsvLine(rawLine));
      } else if (finalMode === 'space') {
        // 多空格或制表符
        if (/\s{2,}/.test(line)) {
          rawRows.push(line.split(/\s{2,}/).map(c => c.trim()));
        } else {
          // 单空格切分，但若第一个词后有类似 "10gp" 或 "5磅"，做智能切分
          rawRows.push(line.split(/\s+/).map(c => c.trim()));
        }
      }
    }
  }

  if (rawRows.length === 0) {
    return { detectedMode: finalMode, items: [], rawCount: 0, warnings };
  }

  // 检测首行是否为表头
  const firstRow = rawRows[0];
  const { mapping: headerMapping, isHeader } = detectColumnMapping(firstRow);

  const dataRows = isHeader ? rawRows.slice(1) : rawRows;
  const colMapping = isHeader ? headerMapping : inferDefaultMapping(dataRows);

  const parsedItems: ParsedEquipmentItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length === 0 || row.every(c => !c)) continue;

    const rawItemName = colMapping.item !== -1 && row[colMapping.item] !== undefined ? row[colMapping.item] : (row[0] || '');
    if (!rawItemName.trim()) continue;

    const rawQtyStr = colMapping.quantity !== -1 && row[colMapping.quantity] !== undefined ? row[colMapping.quantity] : '';
    const rawCostStr = colMapping.cost !== -1 && row[colMapping.cost] !== undefined ? row[colMapping.cost] : '';
    const rawWeightStr = colMapping.weight !== -1 && row[colMapping.weight] !== undefined ? row[colMapping.weight] : '';
    const rawNotesStr = colMapping.notes !== -1 && row[colMapping.notes] !== undefined ? row[colMapping.notes] : '';

    const initialQty = cleanQuantity(rawQtyStr);
    const { item, quantity } = extractEmbeddedQuantity(rawItemName, initialQty);
    const cost = cleanCost(rawCostStr);
    const weight = cleanWeight(rawWeightStr);
    const notes = rawNotesStr.trim();

    parsedItems.push({
      item,
      quantity,
      cost,
      weight,
      notes
    });
  }

  return {
    detectedMode: finalMode,
    items: parsedItems,
    rawCount: parsedItems.length,
    warnings
  };
}

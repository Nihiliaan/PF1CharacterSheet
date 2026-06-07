import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import * as OpenCC from 'opencc-js';

// 导入所有数据库
import { DEITIES_BY_PANTHEON } from '../src/database/deities';
import { LANGUAGES_BY_CATEGORY } from '../src/database/languages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../src/database/PF1.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/i18n/locales/zh/database.json');

const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

/**
 * 自动化同步配置
 * key: database.json 中的分类名
 * sources: 包含所有英文 Key 的数组或对象
 */
const SYNC_TARGETS = [
  {
    ns: 'deities',
    keys: Object.values(DEITIES_BY_PANTHEON).flat()
  },
  {
    ns: 'pantheons',
    keys: Object.keys(DEITIES_BY_PANTHEON)
  },
  {
    ns: 'languages',
    keys: Object.values(LANGUAGES_BY_CATEGORY).flat()
  },
  {
    ns: 'language_categories',
    keys: Object.keys(LANGUAGES_BY_CATEGORY)
  }
];

function sync() {
  console.log('🚀 开始全量同步术语表...');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ 找不到术语表文件: ${CSV_PATH}`);
    return;
  }

  // 1. 汇总所有需要查找的 Key
  const allNeededKeys = new Set<string>();
  SYNC_TARGETS.forEach(target => {
    target.keys.forEach(k => allNeededKeys.add(k));
  });

  console.log(`🔎 待匹配总词条数: ${allNeededKeys.size}`);

  // 2. 解析 CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // 3. 建立全局映射字典 (CHS)
  const csvMap: Record<string, string> = {};
  for (const record of records) {
    const en = record.en?.trim();
    if (en) csvMap[en] = record.cht?.trim() || '';
  }

  const output: Record<string, Record<string, string>> = {};
  let totalFound = 0;

  SYNC_TARGETS.forEach(target => {
    output[target.ns] = {};
    target.keys.forEach(key => {
      // 1. 精确匹配
      let translated = csvMap[key];
      
      // 2. 模糊匹配：尝试剥离括号内的内容 (如 "Hongali (Hon-La)" -> "Hongali")
      if (!translated && key.includes('(')) {
        const strippedKey = key.split('(')[0].trim();
        translated = csvMap[strippedKey];
      }

      if (translated) {
        output[target.ns][key] = converter(translated);
        totalFound++;
      }
    });
  });

  // 5. 写入文件
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  
  console.log(`✅ 同步完成！已更新: ${OUTPUT_PATH}`);
  console.log(`📊 统计: 需求 ${allNeededKeys.size} 条, 成功匹配 ${totalFound} 条.`);
  
  // 打印缺失大项
  SYNC_TARGETS.forEach(target => {
    const missing = target.keys.filter(k => !output[target.ns][k]);
    if (missing.length > 0) {
      console.warn(`⚠️ [${target.ns}] 缺失 ${missing.length} 条翻译 (如: ${missing.slice(0, 3).join(', ')}...)`);
    }
  });
}

try {
  sync();
} catch (err) {
  console.error('❌ 同步失败:', err);
  process.exit(1);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import * as OpenCC from 'opencc-js';
import { DEITIES_BY_PANTHEON } from '../src/database/deities';

// 解决 ESM 中的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 工业级术语表同步脚本
 * 逻辑：
 * 1. 扫描代码中定义的英文 Key (如神祇名)
 * 2. 读取庞大的 PF1.csv
 * 3. 使用 OpenCC 将 CSV 中的繁体转为简体（为了匹配项目 zh.json 的标准）
 * 4. 提取匹配项并生成精简的 database.json
 */

const CSV_PATH = path.join(__dirname, '../src/database/PF1.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/i18n/locales/zh/database.json');

// 初始化 OpenCC (繁体 -> 简体)
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

function sync() {
  console.log('🚀 开始从术语表同步翻译...');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ 找不到术语表文件: ${CSV_PATH}`);
    return;
  }

  // 1. 收集所有需要翻译的英文名
  const deityNames = new Set(Object.values(DEITIES_BY_PANTHEON).flat());
  const pantheonNames = new Set(Object.keys(DEITIES_BY_PANTHEON));

  console.log(`🔎 待匹配词条数: 神祇(${deityNames.size}), 神系(${pantheonNames.size})`);

  // 2. 读取并解析 CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const translations: Record<string, any> = {
    deities: {},
    pantheons: {}
  };

  // 3. 匹配并转换
  for (const record of records) {
    const en = record.en?.trim();
    if (!en) continue;

    const cht = record.cht?.trim() || '';
    // 将 CSV 的繁体转换为简体，以符合项目 zh.json 的规范
    const chs = converter(cht);

    if (deityNames.has(en)) {
      translations.deities[en] = chs;
    }
    if (pantheonNames.has(en)) {
      translations.pantheons[en] = chs;
    }
  }

  // 4. 检查缺失项
  const missingDeities = Array.from(deityNames).filter(name => !translations.deities[name]);
  if (missingDeities.length > 0) {
    console.warn(`⚠️ 缺失 ${missingDeities.length} 个神祇翻译 (将使用英文原名):`, missingDeities.slice(0, 5).join(', ') + '...');
  }

  // 5. 写入文件
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(translations, null, 2));
  console.log(`✅ 同步完成！已更新: ${OUTPUT_PATH} (共翻译 ${Object.keys(translations.deities).length} 个神祇)`);
}

try {
  sync();
} catch (err) {
  console.error('❌ 同步失败:', err);
  process.exit(1);
}

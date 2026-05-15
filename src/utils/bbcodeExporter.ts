import Handlebars from 'handlebars';
import { get } from 'lodash-es';
import { CharacterData } from '../types';
import { getExportValue } from './formatters';
import { getHandlerByPath } from '../schema/fieldRegistry';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from './calculations';
import handlers from '../schema/dataTypes';

// 创建隔离的 Handlebars 实例
const hbs = Handlebars.create();

/**
 * 辅助函数：根据路径安全从 SoA 取原始值
 */
function getValueFromSoA(rootStorage: any, logicalPath: string, propName: string): any {
  if (!rootStorage) return null;

  let currentPath = logicalPath || "";
  let currentProp = propName;

  // 处理 ../ 前缀，对齐 Handlebars 的向上寻址逻辑
  while (currentProp.startsWith('../')) {
    currentProp = currentProp.substring(3);
    if (currentPath) {
      const parts = currentPath.split('.');
      const last = parts.pop();
      // 如果弹出的最后一部分是数字索引，则根据 Handlebars 习惯，通常需要再弹出一层（字段名）
      // 使得 ../ 能从 each 的项回到 each 的父级
      if (last && /^\d+$/.test(last) && parts.length > 0) {
        parts.pop();
      }
      currentPath = parts.join('.');
    }
  }

  if (!currentPath) return rootStorage[currentProp];

  // logicalPath 示例: "skills.5", "defenses.acTable", "equipmentBags.0.items.2"
  const parts = currentPath.split('.');
  const lastPart = parts[parts.length - 1];

  // 检查最后一部分是否是数字索引
  const isIndexed = /^\d+$/.test(lastPart);

  if (isIndexed) {
    const index = parseInt(parts.pop()!, 10);
    const parentPath = parts.join('.');
    const target = parentPath ? get(rootStorage, parentPath) : rootStorage;

    if (Array.isArray(target)) {
      // 处理普通数组 AoO (如 equipmentBags)
      return target[index] ? target[index][currentProp] : null;
    } else if (target && target[currentProp] && Array.isArray(target[currentProp])) {
      // 处理 SoA (如 skills)
      return target[currentProp][index];
    }
  } else {
    // 处理静态对象，如 defenses.acTable
    const target = get(rootStorage, currentPath);
    return target ? target[currentProp] : null;
  }
  return null;
}

// 1. 覆盖 {{#each}} 以支持 SoA 和路径追踪
hbs.registerHelper('each', function (this: any, context: any, options: Handlebars.HelperOptions) {
  if (!context) return options.inverse(this);

  let result = "";
  const data = Handlebars.createFrame(options.data);

  // 优先从 context 自身获取路径 (由 buildViewObject 注入)
  const contextPath = (context && typeof context === 'object') ? (context as any)._path : "";

  // 回退机制：如果 context 没有路径，尝试通过 options.ids 手动拼接 (旧逻辑)
  let currentNodePath = contextPath;
  if (!currentNodePath) {
    const parentPath = data.fullPath || "";
    const currentKey = (options as any).ids ? (options as any).ids[0] : "";
    // 过滤掉 "this" 或 "." 等无意义的键
    const cleanKey = (currentKey === 'this' || currentKey === '.') ? '' : currentKey;
    currentNodePath = parentPath && cleanKey ? `${parentPath}.${cleanKey}` : (cleanKey || parentPath);
  }

  const keys = (typeof context === 'object' && !Array.isArray(context)) ? Object.keys(context) : [];
  // 增强 SoA 判定：包含数组属性的对象
  const isSoA = !Array.isArray(context) && keys.length > 0 && keys.some(k => Array.isArray(context[k]));

  // 找寻最大长度
  let length = 0;
  if (isSoA) {
    keys.forEach(k => {
      if (Array.isArray(context[k])) length = Math.max(length, context[k].length);
    });
  } else if (Array.isArray(context)) {
    length = context.length;
  }

  for (let i = 0; i < length; i++) {
    data.index = i;
    data.first = (i === 0);
    data.last = (i === length - 1);

    // 维护绝对逻辑路径
    data.fullPath = currentNodePath ? `${currentNodePath}.${i}` : `${i}`;

    let rowData;
    if (isSoA) {
      rowData = {};
      keys.forEach(k => {
        rowData[k] = Array.isArray(context[k]) ? context[k][i] : context[k];
      });
    } else {
      rowData = context[i];
    }

    result += options.fn(rowData, { data });
  }
  return result;
});

// 2. 覆盖 {{#with}} 以追踪路径
hbs.registerHelper('with', function (this: any, context: any, options: Handlebars.HelperOptions) {
  if (!context || (typeof context === 'object' && Object.keys(context).length === 0)) {
    return options.inverse(this);
  }

  const data = Handlebars.createFrame(options.data);

  // 优先从 context 自身获取路径
  const contextPath = (context && typeof context === 'object') ? (context as any)._path : "";

  if (contextPath) {
    data.fullPath = contextPath;
  } else {
    // 回退机制
    const parentPath = data.fullPath || "";
    const currentKey = (options as any).ids ? (options as any).ids[0] : "";
    const cleanKey = (currentKey === 'this' || currentKey === '.') ? '' : currentKey;
    data.fullPath = parentPath && cleanKey ? `${parentPath}.${cleanKey}` : (cleanKey || parentPath);
  }

  return options.fn(context, { data });
});

// 3. 实现 {{raw "prop"}} 从原始存储取值
hbs.registerHelper('raw', function (propName: string, options: Handlebars.HelperOptions) {
  const fullPath = options.data.fullPath;
  const rootStorage = options.data.root._storage;
  const val = getValueFromSoA(rootStorage, fullPath, propName);
  console.log(`[BBCode Raw] path: ${fullPath}, prop: ${propName}, val:`, val);
  return val;
});

// 4. 逻辑辅助函数 (保持不变)
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('ne', (a, b) => a != b);
hbs.registerHelper('and', (a, b) => a && b);
hbs.registerHelper('or', (a, b) => a || b);
hbs.registerHelper('not', (a) => !a);

// 5. Markdown 到 BBCode 转换辅助函数
const mdLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
const convertMdLinks = (text: any) => {
  if (typeof text !== 'string') return text;
  return text.replace(mdLinkRegex, '[url=$2]$1[/url]');
};

hbs.registerHelper('md2bb', function (this: any, context: any, options?: any) {
  // 处理块级用法: {{#md2bb}}...{{/md2bb}} 或 {{#md2bb context}}...{{/md2bb}}
  const actualOptions = options || context;
  if (actualOptions && typeof actualOptions.fn === 'function') {
    const content = actualOptions.fn(this);
    return new Handlebars.SafeString(convertMdLinks(content));
  }
  // 处理行内用法: {{md2bb field}}
  return convertMdLinks(context);
});

/**
 * 将数据转换为仅包含显示值的视图对象 (保持 SoA/Object 结构不变)
 */
export function buildViewObject(data: any, t: any, characterContext?: any): any {
  const context = {
    t,
    modifiers: characterContext?.computed?.modifiers,
    character: characterContext
  };

  function processNode(val: any, path: string): any {
    if (val === null || val === undefined) return val;

    // 1. 处理数组
    if (Array.isArray(val)) {
      let result;
      // 检查数组类型：如果是 AoO (对象数组)，对每个对象递归
      if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
        result = val.map((item, i) => processNode(item, `${path}.${i}`));
      } else {
        // 如果是 SoA 列 (基础值数组) 或空数组，对每个元素格式化
        result = val.map((item) => getExportValue(item, 'text', t, { path, context }));
      }
      // 为数组注入路径
      Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
      return result;
    }

    // 2. 处理对象
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      // SoA 判定：非数组对象，且所有属性值都是数组 (如 skills)
      const isSoA = keys.length > 0 &&
        keys.every((k, i, arr) =>
          Array.isArray(val[k]) && (i === 0 || val[k].length === val[arr[0]].length));

      if (isSoA) {
        const length = val[keys[0]].length;
        const result: any = {};
        keys.forEach(k => result[k] = []);

        for (let i = 0; i < length; i++) {
          // 预先组装这一行的原始数据作为上下文
          const row: any = {};
          keys.forEach(k => row[k] = val[k][i]);

          keys.forEach(k => {
            const childPath = path ? `${path}.${k}` : k;
            // 传入包含 row 的 context，确保 ClassSkillHandler 等能找到同行数据
            result[k].push(getExportValue(val[k][i], 'text', t, {
              path: childPath,
              context: { ...context, row }
            }));
          });
        }
        // 为 SoA 对象注入路径
        Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
        return result;
      }

      // 普通对象处理
      const result: any = {};
      for (const key in val) {
        const childPath = path ? `${path}.${key}` : key;
        const childVal = val[key];
        result[key] = processNode(childVal, childPath);
      }
      // 为普通对象注入路径
      Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
      return result;
    }

    // 3. 处理终端基础值 (字符串、数字等)
    return getExportValue(val, 'text', t, { path, context });
  }

  // 构建仅包含显示值的树
  const view = processNode(data, '');


  // 注入计算属性
  view.totalCost = calculateTotalCost(data);
  view.totalWeight = calculateTotalWeightNum(data).toFixed(1);
  const enc = getComputedEncumbrance(data);
  view.encumbrance = enc;

  // 处理法术块与自定义表格的环位注入、数据归一化
  if (view.magicBlocks && Array.isArray(view.magicBlocks)) {
    view.magicBlocks.forEach((block: any, blockIdx: number) => {
      const rawBlock = data.magicBlocks[blockIdx] as any;
      if (!rawBlock) return;

      // 1. 强制归一化 tableData 为 SoA 结构 (并剔除残留的数组索引 Key)
      if (rawBlock.tableData) {
        let soa: any = {};
        if (Array.isArray(rawBlock.tableData)) {
          // AoO 模式转换
          if (rawBlock.tableData.length > 0 && typeof rawBlock.tableData[0] === 'object') {
            const keys = Object.keys(rawBlock.tableData[0]);
            keys.forEach(k => {
              soa[k] = rawBlock.tableData.map((row: any) => row[k]);
            });
          }
        } else {
          // 对象模式：剔除可能存在的数字索引 Key (如 "0", "1")
          Object.keys(rawBlock.tableData).forEach(k => {
            if (isNaN(Number(k)) && Array.isArray(rawBlock.tableData[k])) {
              soa[k] = rawBlock.tableData[k];
            }
          });
        }
        block.tableData = processNode(soa, `magicBlocks.${blockIdx}.tableData`);
      }

      // 2. 环位注入逻辑 (确保 rowCount 计算准确)
      const tableData = block.tableData;
      if (tableData && typeof tableData === 'object' && !Array.isArray(tableData)) {
        // 兼容 Key 别名
        if (tableData.spells) tableData.spell_name = tableData.spells;

        // 找寻最长的数据列作为行数参考 (排除 level 自身)
        const rowCount = Object.keys(tableData)
          .filter(k => k !== 'level')
          .reduce((max, k) => Math.max(max, Array.isArray(tableData[k]) ? tableData[k].length : 0), 0);

        if (rawBlock.type === 'spell') {
          const spellType = rawBlock.spellType || 0;
          const lowestLevel = handlers.SpellTypeHandler.lowestLevel[spellType] || 0;
          tableData.level = Array.from({ length: rowCount }, (_, i) => String(rowCount - 1 - i + lowestLevel));

          // 同步 columns
          if (block.columns) {
            if (!block.columns.some((c: any) => c.key === 'level')) {
              block.columns = [{ key: 'level', label: t('editor.spells.level') }, ...block.columns];
            }
          }
        }
      }
    });
  }

  // 额外快捷访问
  if (view.basic) {
    view.name = view.basic.name;
    view.race = view.basic.race;
  }

  return view;
}

export function generateBBCode(data: CharacterData, template: string, t: any, characterContext?: any): string {
  try {
    const viewObject = buildViewObject(data, t, characterContext);

    // 显式挂载 _storage 并设置为不可枚举，防止递归遍历崩溃，同时方便在控制台查看
    Object.defineProperty(viewObject, '_storage', {
      value: data,
      enumerable: false,
      writable: true,
      configurable: true
    });
    console.log('BBCode View Object (Enhanced):', viewObject);
    console.log('--- Storage Data Check ---');
    console.log('Storage content:', (viewObject as any)._storage);

    const compile = hbs.compile(template);
    return compile(viewObject);
  } catch (error: any) {
    console.error('BBCode Export Error:', error);
    return `[color=red]导出错误: ${error.message}[/color]\n\n模板源码:\n${template}`;
  }
}

export default generateBBCode;

import i18n from '../i18n/config';
import Handlebars from 'handlebars';
import { get } from 'lodash-es';
import { CharacterData, ATTRIBUTE_NAMES } from '../schema/types';
import { getExportValue } from './formatters';
import { getHandlerByPath } from '../schema/fieldRegistry';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from './calculations';
import handlers from '../schema/handlers';

// 创建隔离的 Handlebars 实例
const hbs = Handlebars.create();

// 注册技能名辅助函数，处理 ID 到文本的转换
hbs.registerHelper('skillName', function (name: string | number) {
  if (typeof name === 'number') {
    return i18n.t(`editor.skills.names.${name}`);
  }
  return name;
});

/**
 * 辅助函数：根据路径安全从 SoA 取原始值
 */
function getValueFromSoA(rootStorage: any, logicalPath: string, propName: string): any {
  if (!rootStorage) return null;

  let currentPath = logicalPath || "";
  let currentProp = propName;

  while (currentProp.startsWith('../')) {
    currentProp = currentProp.substring(3);
    if (currentPath) {
      const parts = currentPath.split('.');
      const last = parts.pop();
      if (last && /^\d+$/.test(last) && parts.length > 0) {
        parts.pop();
      }
      currentPath = parts.join('.');
    }
  }

  if (!currentPath) return rootStorage[currentProp];

  const parts = currentPath.split('.');
  const lastPart = parts[parts.length - 1];
  const isIndexed = /^\d+$/.test(lastPart);

  if (isIndexed) {
    const index = parseInt(parts.pop()!, 10);
    const parentPath = parts.join('.');
    const target = parentPath ? get(rootStorage, parentPath) : rootStorage;

    if (Array.isArray(target)) {
      return target[index] ? target[index][currentProp] : null;
    } else if (target && target[currentProp] && Array.isArray(target[currentProp])) {
      return target[currentProp][index];
    }
  } else {
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
  const contextPath = (context && typeof context === 'object') ? (context as any)._path : "";

  let currentNodePath = contextPath;
  if (!currentNodePath) {
    const parentPath = data.fullPath || "";
    const currentKey = (options as any).ids ? (options as any).ids[0] : "";
    const cleanKey = (currentKey === 'this' || currentKey === '.') ? '' : currentKey;
    currentNodePath = parentPath && cleanKey ? `${parentPath}.${cleanKey}` : (cleanKey || parentPath);
  }

  const keys = (typeof context === 'object' && !Array.isArray(context)) ? Object.keys(context) : [];
  // SoA 判定：包含数组属性的对象，且这些数组长度一致 (排除掉 notes, totalPoints 等非列表字段)
  const listKeys = keys.filter(k => Array.isArray(context[k]));
  const isSoA = !Array.isArray(context) && listKeys.length > 0;

  let length = 0;
  if (isSoA) {
    listKeys.forEach(k => {
      length = Math.max(length, context[k].length);
    });
  } else if (Array.isArray(context)) {
    length = context.length;
  }

  for (let i = 0; i < length; i++) {
    data.index = i;
    data.first = (i === 0);
    data.last = (i === length - 1);
    data.fullPath = currentNodePath ? `${currentNodePath}.${i}` : `${i}`;

    let rowData;
    if (isSoA) {
      rowData = {};
      // 这里的 rowData 包含所有字段，但列表字段取索引值
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
  const contextPath = (context && typeof context === 'object') ? (context as any)._path : "";

  if (contextPath) {
    data.fullPath = contextPath;
  } else {
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
  return getValueFromSoA(rootStorage, fullPath, propName);
});

hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('ne', (a, b) => a != b);
hbs.registerHelper('and', (a, b) => a && b);
hbs.registerHelper('or', (a, b) => a || b);
hbs.registerHelper('not', (a) => !a);

const convertMdLinks = (text: any) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '[url=$2]$1[/url]');
};

hbs.registerHelper('md2bb', function (this: any, context: any, options?: any) {
  const actualOptions = options || context;
  if (actualOptions && typeof actualOptions.fn === 'function') {
    const content = actualOptions.fn(this);
    return new Handlebars.SafeString(convertMdLinks(content));
  }
  return new Handlebars.SafeString(convertMdLinks(context));
});

/**
 * 将数据转换为仅包含显示值的视图对象
 */
export function buildViewObject(data: any, t: any, characterContext?: any): any {
  const context = {
    t,
    modifiers: characterContext?.computed?.modifiers,
    character: characterContext
  };

  function processNode(val: any, path: string): any {
    if (val === null || val === undefined) return val;

    if (Array.isArray(val)) {
      const result = (val.length > 0 && val[0]?.constructor === Object)
        ? val.map((item, i) => processNode(item, `${path}.${i}`))
        : val.map((item) => getExportValue(item, 'text', t, { path, context }));
      Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
      return result;
    }

    if (val?.constructor === Object) {
      const keys = Object.keys(val);
      // SoA 判定：至少有两个属性值是数组且长度一致 (排除掉只有一个列表的情况)
      const listKeys = keys.filter(k => Array.isArray(val[k]));
      const isSoA = listKeys.length >= 2 && listKeys.every(k => val[k].length === val[listKeys[0]].length);

      if (isSoA) {
        const length = val[listKeys[0]].length;
        const result: any = { _path: path };
        // 复制非列表字段 (如 skills.notes)
        keys.forEach(k => {
          if (!Array.isArray(val[k])) result[k] = processNode(val[k], `${path}.${k}`);
          else result[k] = [];
        });

        for (let i = 0; i < length; i++) {
          const row: any = {};
          listKeys.forEach(k => row[k] = val[k][i]);

          listKeys.forEach(k => {
            const childPath = path ? `${path}.${k}` : k;
            result[k].push(getExportValue(val[k][i], 'text', t, {
              path: childPath,
              context: { ...context, row }
            }));
          });
        }
        Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
        return result;
      }

      const result: any = {};
      for (const key in val) {
        const childPath = path ? `${path}.${key}` : key;
        result[key] = processNode(val[key], childPath);
      }
      Object.defineProperty(result, '_path', { value: path, enumerable: false, configurable: true });
      return result;
    }

    return getExportValue(val, 'text', t, { path, context });
  }

  const view = processNode(data, '');

  // 注入属性名称 (因为数据层没有存储固定名称)
  if (view.attributes) {
    view.attributes.name = ATTRIBUTE_NAMES.map(attr => t('editor.attributes.' + attr));
  }

  // 注入计算属性
  if (view.equipment) {
    view.equipment.totalCost = calculateTotalCost(data);
    view.equipment.totalWeight = calculateTotalWeightNum(data).toFixed(1);
    view.equipment.encumbrance = getComputedEncumbrance(data);
  }

  // 处理法术块 (注入虚拟 level 数组以支持 SoA 遍历)
  if (view.magicBlocks && Array.isArray(view.magicBlocks)) {
    view.magicBlocks.forEach((block: any, blockIdx: number) => {
      const rawBlock = data.magicBlocks[blockIdx] as any;
      if (!rawBlock) return;

      const rowCount = Math.max(
        Array.isArray(rawBlock.uses) ? rawBlock.uses.length : 0,
        Array.isArray(rawBlock.spells) ? rawBlock.spells.length : 0
      );

      // 类型 5 是类法术，其它通常是法术
      const isSpellBlock = rawBlock.type !== 5;
      
      if (isSpellBlock) {
        const spellType = typeof rawBlock.type === 'number' ? rawBlock.type : 0;
        const lowestLevel = handlers.SpellTypeHandler.lowestLevel[spellType] || 0;

        // 注入 level 数组 (法术通常从 lowestLevel 开始递增)
        block.level = [];
        for (let i = 0; i < rowCount; i++) {
          block.level.push(t('editor.spells.computed_level', { n: i + lowestLevel }));
        }
      } else {
        // 类法术能力通常不分环位，或者 level 字段有其它用途
        block.level = Array(rowCount).fill('—');
      }
    });
  }

  if (view.basic) {
    view.name = view.basic.name;
    view.race = view.basic.race;
  }

  return view;
}

export function generateBBCode(data: CharacterData, template: string, t: any, characterContext?: any): string {
  try {
    const viewObject = buildViewObject(data, t, characterContext);
    Object.defineProperty(viewObject, '_storage', {
      value: data,
      enumerable: false,
      writable: true,
      configurable: true
    });
    const compile = hbs.compile(template, { noEscape: true });
    return compile(viewObject);
  } catch (error: any) {
    console.error('BBCode Export Error:', error);
    return `[color=red]导出错误: ${error.message}[/color]\n\n模板源码:\n${template}`;
  }
}

export default generateBBCode;

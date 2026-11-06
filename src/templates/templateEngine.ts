import Handlebars from 'handlebars';
import { CharacterData } from '../schema/types';
import { buildViewObject } from '../utils/bbcodeExporter';
import { TemplateDefinition, RenderOptions } from './types';
import { getTemplateById } from './templateRegistry';
import i18n from '../i18n/config';

// 创建统一的隔离 Handlebars 引擎实例
const hbs = Handlebars.create();

// 注册技能名辅助函数
hbs.registerHelper('skillName', function (name: string | number) {
  if (typeof name === 'number') {
    return i18n.t(`editor.skills.names.${name}`);
  }
  return name;
});

// 数学与坐标辅助函数 (用于 SVG 渲染精确定位)
hbs.registerHelper('add', (a, b) => (parseFloat(a) || 0) + (parseFloat(b) || 0));
hbs.registerHelper('sub', (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
hbs.registerHelper('mul', (a, b) => (parseFloat(a) || 0) * (parseFloat(b) || 0));
hbs.registerHelper('div', (a, b) => {
  const div = parseFloat(b);
  return div ? (parseFloat(a) || 0) / div : 0;
});

hbs.registerHelper('gt', (a, b) => parseFloat(a) > parseFloat(b));
hbs.registerHelper('gte', (a, b) => parseFloat(a) >= parseFloat(b));
hbs.registerHelper('lt', (a, b) => parseFloat(a) < parseFloat(b));
hbs.registerHelper('lte', (a, b) => parseFloat(a) <= parseFloat(b));
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('ne', (a, b) => a != b);
hbs.registerHelper('and', (a, b) => a && b);
hbs.registerHelper('or', (a, b) => a || b);
hbs.registerHelper('not', (a) => !a);

// 属性调整值计算 (例如 18 => +4, 8 => -1)
hbs.registerHelper('attrMod', (attrVal) => {
  const n = parseInt(attrVal, 10);
  if (isNaN(n)) return '+0';
  const mod = Math.floor((n - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
});

// 符号数值格式化 (例如 3 => +3, -2 => -2)
hbs.registerHelper('signed', (val) => {
  if (val === undefined || val === null || val === '') return '+0';
  const str = String(val).trim();
  if (str.startsWith('+') || str.startsWith('-')) return str;
  const n = parseInt(str, 10);
  if (isNaN(n)) return val;
  return n >= 0 ? `+${n}` : `${n}`;
});

// 默认值兜底
hbs.registerHelper('default', (val, def) => {
  return (val !== undefined && val !== null && String(val).trim() !== '') ? val : def;
});

// 字符串截断
hbs.registerHelper('truncate', (str, len) => {
  if (typeof str !== 'string') return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
});

// XML 安全转义
hbs.registerHelper('xmlEscape', (str) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
});

// 支持 SoA 迭代与嵌套
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

// 路径追踪 with
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

// Markdown 链接转 BBCode 格式
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
 * 统一渲染入口
 * @param charData 角色卡核心数据
 * @param templateOrId 模板定义对象或模板 ID
 * @param options 可选配置（国际化函数、样式定制、上下文等）
 */
export function renderTemplate(
  charData: CharacterData,
  templateOrId: string | TemplateDefinition,
  options?: RenderOptions
): { content: string; mimeType: string; extension: string; template: TemplateDefinition } {
  let template: TemplateDefinition | undefined;

  if (typeof templateOrId === 'string') {
    template = getTemplateById(templateOrId);
    if (!template) {
      throw new Error(`[TemplateEngine] Template not found for ID: "${templateOrId}"`);
    }
  } else {
    template = templateOrId;
  }

  const t = options?.t || i18n.t.bind(i18n);
  const viewObject = buildViewObject(charData, t, options?.characterContext);

  // 注入用户可选自定义参数
  if (options?.customTitle) {
    viewObject.name = options.customTitle;
  }
  if (options?.hideAvatar) {
    if (viewObject.basic?.avatars) {
      viewObject.basic.avatars.url = [];
    }
  }

  Object.defineProperty(viewObject, '_storage', {
    value: charData,
    enumerable: false,
    writable: true,
    configurable: true
  });

  const compiled = hbs.compile(template.source, { noEscape: true });
  const content = compiled(viewObject);

  return {
    content,
    mimeType: template.mimeType,
    extension: template.extension,
    template
  };
}

export default renderTemplate;

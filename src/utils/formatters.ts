import { getHandlerByPath } from '../schema/fieldRegistry';
import handlers from '../schema/dataTypes';

const { getHandlerByType } = handlers;

export const getDisplayValue = (
  value: any,
  type: string,
  t: any,
  options: {
    isFocused?: boolean;
    path?: string;
    columnKey?: string;
    row?: any;
    displayFormatter?: (v: string, isFocused: boolean) => string;
    context?: any;
  } = {}
): string => {
  const { isFocused, path, displayFormatter } = options;

  // 1. 优先使用传入的显式格式化函数
  if (displayFormatter) return displayFormatter(value, isFocused || false);

  // 2. 获取 Handler
  const handler = path ? getHandlerByPath(path) : getHandlerByType(type);

  if (handler) {
    if (isFocused && handler.formatInteractive) {
      return handler.formatInteractive(value, options.context || { t });
    }
    if (handler.formatDisplay) {
      return handler.formatDisplay(value, options.context || { t });
    }
  }

  // 3. 最后的兜底逻辑
  if (value === '' || value === undefined || value === null) return '';
  const result = String(value);
  return result.trim() === '' ? '' : result;
};

/**
 * 获取用于导出 (BBCode/文本) 的格式化值
 */
export const getExportValue = (
  value: any,
  type: string,
  t: any,
  options: {
    path?: string;
    context?: any;
  } = {}
): string => {
  if (value === '' || value === undefined || value === null) return '';

  const { path } = options;
  const handler = path ? getHandlerByPath(path) : getHandlerByType(type);

  let result = value;

  if (handler) {
    if (handler.formatExport) {
      result = handler.formatExport(value, options.context || { t });
    } else if (handler.formatDisplay) {
      result = handler.formatDisplay(value, options.context || { t });
    }
  }

  if (result === '' || result === undefined || result === null) return '';
  const str = String(result);
  return str.trim() === '' ? '' : str;
};

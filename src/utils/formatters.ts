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
  const { isFocused, path, displayFormatter, columnKey, row } = options;

  // 1. 优先使用传入的显式格式化函数
  if (displayFormatter) return displayFormatter(value, isFocused || false);

  // 2. 获取 Handler (优先通过 path，其次通过 type 兜底)
  const handler = path ? getHandlerByPath(path) : getHandlerByType(type);

  if (handler) {
    if (isFocused && handler.formatInteractive) {
      return handler.formatInteractive(value, options.context);
    }
    if (handler.formatDisplay) {
      return handler.formatDisplay(value, options.context);
    }
  }

  // 3. 最后的兜底逻辑
  if (value === '' || value === undefined || value === null) return '';
  return String(value);
};

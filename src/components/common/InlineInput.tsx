import React, { useMemo } from 'react';
import DynamicInput from './DynamicInput';
import { InputType } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import { isEqual } from 'lodash-es';
import { useTranslation } from 'react-i18next';

interface InlineInputProps {
  label: string;
  value: any;
  path?: string; // 如果提供了 path，则自动从 Schema 获取 Handler
  originalValue?: any;
  onChange: (v: any) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  type?: InputType;
  transactionFilter?: (tr: any) => boolean;
  displayFormatter?: (v: string, isFocused: boolean) => string;
  align?: 'left' | 'center' | 'right';
  singleLine?: boolean;
  /** 叶子层最小宽声明：向上参与 min-content 传播，决定分栏最小宽与整体缩放时机 */
  minWidth?: string;
}

const InlineInput = ({
  label,
  value,
  path,
  originalValue,
  onChange,
  placeholder = '',
  className = '',
  readOnly = false,
  type = 'text',
  transactionFilter,
  displayFormatter,
  align = 'center',
  singleLine = true,
  minWidth = '88px'
}: InlineInputProps) => {
  const { t } = useTranslation();
  // 从 Schema 获取逻辑 (主要用于 UI 样式的 isChanged 判断)
  const handler = path ? getHandlerByPath(path) : null;

  const isChanged = useMemo(() => {
    if (originalValue === undefined || readOnly) return false;
    
    // 如果有 handler，先进行 normalize (update)，确保比较的是最终存储格式
    const v1 = handler?.update ? handler.update(value, { t }) : value;
    const v2 = handler?.update ? handler.update(originalValue, { t }) : originalValue;
    
    return !isEqual(v1, v2);
  }, [value, originalValue, handler, readOnly, t]);

  // Extract text size and font weight classes from className to pass to DynamicInput
  const textClasses = useMemo(() => {
    return className.split(' ').filter(c =>
      c.startsWith('text-') || c.startsWith('font-')
    ).join(' ');
  }, [className]);

  return (
    // 左右排版（用户裁决 2026-11-16）：标签左、值右——原两行模式（标签上/值下）在水平空间
    // 充裕的位置浪费一半高度；全局生效，multiline 值仍在右侧换行
    <div
      style={{ minWidth }}
      className={`flex items-center gap-2 border border-stone-200 bg-stone-50 rounded p-1.5 transition-all group/input ${isChanged ? 'bg-amber-50/50 border-amber-300 shadow-sm' : 'hover:border-stone-400 focus-within:border-stone-600 focus-within:bg-white focus-within:shadow-sm'} ${className}`}
    >
      <label className={`text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none whitespace-nowrap shrink-0 transition-colors ${isChanged ? 'text-amber-700' : 'group-focus-within/input:text-stone-900'}`}>
        {label}
      </label>
      <div className="min-h-[24px] h-auto relative flex items-center flex-1 min-w-0">
        <DynamicInput
          value={value ?? ''}
          onChange={onChange}
          path={path}
          originalValue={originalValue}
          type={handler?.ui || type}
          readOnly={readOnly}
          placeholder={placeholder}
          singleLine={singleLine}
          transactionFilter={transactionFilter}
          displayFormatter={displayFormatter}
          align={align}
          minHeight="24px"
          hideIndicator={true}
          wrapperClassName="w-full h-auto"
          className={`w-full h-auto !p-0 ${textClasses}`}
        />
        {isChanged && (
          <div className="absolute -right-1 -top-1 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default InlineInput;

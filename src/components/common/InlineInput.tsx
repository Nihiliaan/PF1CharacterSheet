import React from 'react';
import DynamicInput from './DynamicInput';
import { InputType } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';

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
  displayFormatter
}: InlineInputProps) => {
  // 从 Schema 获取逻辑 (主要用于 UI 样式的 isChanged 判断)
  const handler = path ? getHandlerByPath(path) : null;

  const isChanged = originalValue !== undefined && value !== originalValue;

  // Extract text size and font weight classes from className to pass to DynamicInput
  const textClasses = React.useMemo(() => {
    return className.split(' ').filter(c =>
      c.startsWith('text-') || c.startsWith('font-')
    ).join(' ');
  }, [className]);

  return (
    <div
      className={`flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 transition-all group/input ${isChanged ? 'bg-amber-50/50 border-amber-300 shadow-sm' : 'hover:border-stone-400 focus-within:border-stone-600 focus-within:bg-white focus-within:shadow-sm'} ${className}`}
    >
      <label className={`text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none mb-1 transition-colors ${isChanged ? 'text-amber-700' : 'group-focus-within/input:text-stone-900'}`}>
        {label}
      </label>
      <div className="h-6 relative">
        <DynamicInput
          value={String(value ?? '')}
          onChange={onChange}
          path={path}
          originalValue={originalValue !== undefined ? String(originalValue) : undefined}
          type={handler?.ui || type}
          readOnly={readOnly}
          placeholder={placeholder}
          singleLine={true}
          transactionFilter={transactionFilter}
          displayFormatter={displayFormatter}
          align="center"
          height="24px"
          minHeight="24px"
          hideIndicator={true}
          wrapperClassName="w-full h-full"
          className={`w-full h-full !p-0 ${textClasses}`}
        />
        {isChanged && (
          <div className="absolute -right-0.5 -top-3 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default InlineInput;

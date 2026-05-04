import React from 'react';
import MarkdownInlineEditor from './atoms/MarkdownInlineEditor';
import { useNumericStepper } from '../hooks/useNumericStepper';

/**
 * 通用渲染属性接口
 */
export interface TemplateProps {
  value: any;
  tempValue: string;
  isFocused: boolean;
  isReadOnly: boolean;
  isChanged: boolean;
  placeholder?: string;
  className?: string;
  align?: string;
  handler: any;
  onChange: (val: string) => void;
  onTriggerChange: (val: string) => void; // 用于步进器等直接触发表送
  onFocus: () => void;
  onBlur: () => void;
  // 额外透传
  options?: string[];
  singleLine?: boolean;
}

/**
 * 1. 文本/Markdown模板
 */
// 1. TextControl
export const TextControl = ({ 
  value, isFocused, isReadOnly, placeholder, 
  className, handler, onChange, onFocus, onBlur, singleLine 
}: TemplateProps) => {
  const displayValue = isFocused ? value : (handler?.formatDisplay?.(value) ?? (value || '—'));
  
  return (
    <div className="flex items-center w-full h-full">
      <MarkdownInlineEditor
        value={isFocused ? value : displayValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        singleLine={singleLine}
        readOnly={isReadOnly}
        className={`!bg-transparent !p-0 w-full ${className}`}
      />
    </div>
  );
};

// 2. NumericControl
export const NumericControl = ({ 
  value, tempValue, isFocused, isReadOnly, isChanged, 
  className, handler, onChange, onTriggerChange, onFocus, onBlur, placeholder
}: TemplateProps) => {
  
  const containerRef = useNumericStepper({
    value: isFocused ? tempValue : (handler?.formatInteractive?.(value) ?? (value || '0')),
    onChange: onTriggerChange,
    type: 'int', 
    readOnly: isReadOnly,
  });

  const displayValue = isFocused ? tempValue : (handler?.formatDisplay?.(value) ?? (value || '—'));
  
  return (
    <div ref={containerRef} className="grid h-full w-full">
      <div className={`col-start-1 row-start-1 invisible whitespace-pre-wrap break-words px-2 py-1 w-full h-full font-medium ${className} pointer-events-none`}>
        {displayValue + '\n'}
      </div>
      <textarea
        value={isFocused ? tempValue : displayValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={isReadOnly}
        className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden outline-none bg-transparent px-2 py-1 font-medium transition-colors ${isChanged ? 'text-amber-900' : ''} ${className}`}
        rows={1}
        placeholder={placeholder}
      />
    </div>
  );
};

// 3. SelectControl
export const SelectControl = ({ 
  value, isReadOnly, isChanged, className, handler, 
  onTriggerChange, onFocus, onBlur, options, placeholder 
}: TemplateProps) => {
  const displayValue = handler?.formatDisplay?.(value) ?? (value || '—');
  const opts = options || handler?.options || [];

  return (
    <div className="relative w-full h-full">
      {!isReadOnly && (
        <select
          value={value?.toString() || ''}
          onChange={(e) => onTriggerChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        >
          <option value="">{placeholder || '—'}</option>
          {opts.map((opt: string, idx: number) => (
            <option key={idx} value={idx.toString()}>{opt}</option>
          ))}
        </select>
      )}
      <div className={`w-full h-full flex items-center justify-center font-medium px-2 py-1 ${isChanged ? 'text-amber-700' : 'text-ink'} ${className}`}>
        {displayValue || <span className="text-stone-300">—</span>}
      </div>
    </div>
  );
};

// 4. CheckboxControl
export const CheckboxControl = ({ 
  value, isReadOnly, isChanged, className, handler, onTriggerChange 
}: TemplateProps) => {
  const toggle = () => {
    if (isReadOnly) return;
    onTriggerChange(value === true || value === 'true' ? 'false' : 'true');
  };

  return (
    <div 
      onClick={toggle}
      className={`w-full h-full flex items-center justify-center cursor-pointer hover:bg-stone-100/50 font-medium px-2 py-1 ${isChanged ? 'text-amber-900' : 'text-ink'} ${className}`}
    >
      {handler?.formatDisplay?.(value) ?? (value ? '是' : '否')}
    </div>
  );
};

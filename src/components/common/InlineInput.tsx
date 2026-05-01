import React, { useState } from 'react';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { InputType } from '../types';

interface InlineInputProps {
  label: string;
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  type?: InputType;
  transactionFilter?: (tr: any) => boolean;
  displayFormatter?: (v: string, isFocused: boolean) => string;
}

import { getTransactionFilter, normalizeValue } from '../../utils/validation';

const InlineInput = ({
  label,
  value,
  originalValue,
  onChange,
  placeholder = '',
  className = '',
  readOnly = false,
  type = 'text',
  transactionFilter,
  displayFormatter
}: InlineInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const isChanged = originalValue !== undefined && value !== originalValue;

  // Resolve transaction filter based on type
  const resolvedFilter = transactionFilter || (type !== 'text' ? getTransactionFilter(type) : undefined);

  const handleChange = (v: string) => {
    const normalized = normalizeValue(v, type || 'text');
    onChange(normalized);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (type === 'ft5' && value !== '') {
      const num = parseInt(value);
      if (!isNaN(num)) {
        const rounded = Math.round(num / 5) * 5;
        if (rounded.toString() !== value) {
          onChange(rounded.toString());
        }
      }
    }
  };

  return (
    <div 
      className={`flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 transition-all group/input ${isChanged ? 'bg-amber-50/50 border-amber-300 shadow-sm' : 'hover:border-stone-400 focus-within:border-stone-600 focus-within:bg-white focus-within:shadow-sm'} ${className}`}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={handleBlur}
    >
      <label className={`text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none mb-1 transition-colors ${isChanged ? 'text-amber-700' : 'group-focus-within/input:text-stone-900'}`}>
        {label}
      </label>
      <div className="h-6 relative">
        <MarkdownInlineEditor
          value={displayFormatter ? displayFormatter(value, isFocused) : value}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          singleLine={true}
          transactionFilter={resolvedFilter}
          height="24px"
          minHeight="24px"
          className="font-medium text-ink"
        />
        {isChanged && (
          <div className="absolute -right-0.5 -top-3 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default InlineInput;

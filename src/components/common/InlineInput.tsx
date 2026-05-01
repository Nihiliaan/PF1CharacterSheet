import React from 'react';
import MarkdownInlineEditor from './MarkdownInlineEditor';

interface InlineInputProps {
  label: string;
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const InlineInput = ({
  label,
  value,
  originalValue,
  onChange,
  placeholder = '',
  className = '',
  readOnly = false
}: InlineInputProps) => {
  const isChanged = originalValue !== undefined && value !== originalValue;

  return (
    <div className={`flex flex-col gap-0 pt-1 px-1.5 transition-all border-b group
      ${isChanged
        ? 'border-amber-400 bg-amber-50/30'
        : 'border-stone-200 hover:border-stone-300 focus-within:border-primary focus-within:bg-stone-50/30'
      } ${className}`}
    >
      <div className="flex justify-between items-center px-0.5">
        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest group-focus-within:text-primary transition-colors">
          {label}
        </label>
        {isChanged && (
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
        )}
      </div>

      <div className="pb-0">
        <MarkdownInlineEditor
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          singleLine={true}
          height="24px"
          minHeight="24px"
          className="font-medium text-ink"
        />
      </div>
    </div>
  );
};

export default InlineInput;

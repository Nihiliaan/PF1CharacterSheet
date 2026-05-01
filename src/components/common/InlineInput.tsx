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
    <div className={`flex flex-col gap-0.5 p-1.5 transition-all border-b group
      ${isChanged 
        ? 'border-amber-300 bg-amber-50/30' 
        : 'border-stone-200 hover:border-stone-300 focus-within:border-primary'
      } ${className}`}
    >
      <div className="flex justify-between items-center px-0.5">
        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest group-focus-within:text-primary transition-colors">
          {label}
        </label>
        {isChanged && (
          <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
        )}
      </div>
      
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
  );
};

export default InlineInput;

import React from 'react';
import MarkdownInlineEditor from './MarkdownInlineEditor';

interface MultilineInputProps {
  label: string;
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  height?: string;
  isAutoHeight?: boolean;
}

const MultilineInput = ({
  label,
  value,
  originalValue,
  onChange,
  placeholder = '',
  className = '',
  readOnly = false,
  height = '120px',
  isAutoHeight = false
}: MultilineInputProps) => {
  const isChanged = originalValue !== undefined && value !== originalValue;

  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl transition-all border group
      ${isChanged 
        ? 'bg-amber-50/50 border-amber-200 shadow-sm' 
        : 'bg-stone-50/30 border-stone-200 hover:border-stone-300 focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-md'
      } ${className}`}
    >
      <div className="flex justify-between items-center px-0.5">
        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-primary transition-colors">
          {label}
        </label>
        {isChanged && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">未保存</span>
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm" />
          </div>
        )}
      </div>
      
      <div className="min-h-[24px]">
        <MarkdownInlineEditor
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          height={isAutoHeight ? 'auto' : height}
          minHeight="24px"
          singleLine={false}
          className="text-stone-700 leading-relaxed"
        />
      </div>
    </div>
  );
};

export default MultilineInput;

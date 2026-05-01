import React from 'react';
import DynamicInput from './DynamicInput';
import { InputType } from '../../types';

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
  type?: InputType;
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
  isAutoHeight = false,
  type = 'text'
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
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm pointer-events-none" />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[24px] flex flex-col relative w-full h-full">
        <DynamicInput
          value={value}
          onChange={onChange}
          originalValue={originalValue}
          type={type}
          readOnly={readOnly}
          placeholder={placeholder}
          singleLine={false}
          align="left"
          height={isAutoHeight ? 'auto' : height}
          minHeight="24px"
          hideIndicator={true}
          wrapperClassName="w-full h-full flex flex-col flex-1"
          className="text-stone-700 leading-relaxed flex-1 w-full !p-0"
        />
      </div>
    </div>
  );
};

export default MultilineInput;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_NAMES, InputType } from '../../types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { validateInput, normalizeValue } from '../../utils/validation';
import { useNumericStepper } from '../../hooks/useNumericStepper';

export interface DynamicInputProps {
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  className?: string; // Applied to inner element
  wrapperClassName?: string; // Applied to outermost div
  readOnly?: boolean;
  columnKey?: string;
  type?: InputType;
  options?: string[];
  displayFormatter?: (v: string, isFocused: boolean) => string;
  
  // Extended props for broader use
  placeholder?: string;
  singleLine?: boolean;
  transactionFilter?: (tr: any) => boolean;
  hideIndicator?: boolean;
  align?: 'left' | 'center' | 'right';
  height?: string;
  minHeight?: string;
}

export const DynamicInput = ({
  value,
  originalValue,
  onChange,
  className = '',
  wrapperClassName = '',
  readOnly = false,
  columnKey,
  type = 'text',
  options,
  displayFormatter,
  placeholder = '',
  singleLine = false,
  transactionFilter,
  hideIndicator = false,
  align,
  height,
  minHeight
}: DynamicInputProps) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = React.useState(false);
  const isChanged = !readOnly && originalValue !== undefined && value !== originalValue;

  const containerRef = useNumericStepper({
    value,
    onChange,
    type: type || 'text',
    readOnly
  });

  const isDescriptionCol = (key?: string) => {
    if (!key) return false;
    const k = key.toLowerCase();
    return ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => k.includes(word));
  };

  const displayValue = () => {
    if (displayFormatter) return displayFormatter(value, isFocused);
    if (type === 'checkbox') return value === 'true' ? '+3' : '';
    if (type === 'quantity' && !isFocused) {
      if (!value || value === '1') return '';
      return `×${value}`;
    }
    if (type === 'bonus' && !isFocused && value !== '') {
      const num = parseInt(value);
      if (!isNaN(num)) return num >= 0 ? `+${num}` : num.toString();
    }
    if (type === 'level' && !isFocused && value !== '') {
      return t('editor.lists.level_format', { n: value });
    }
    if (type === 'distance' && !isFocused && value !== '') {
      return t('editor.lists.distance_format', { v: value });
    }
    if (type === 'cost' && !isFocused) {
      if (!value) return '—';
      return `${value} ${t('editor.items.units.gp')}`;
    }
    if (type === 'weight' && !isFocused) {
      if (!value) return '—';
      return `${value} ${t('editor.items.units.lbs')}`;
    }
    return value;
  };

  const handleChange = (val: string) => {
    if (validateInput(val, type || 'text')) {
      const normalized = normalizeValue(val, type || 'text');
      onChange(normalized);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e.target.value);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const toggleCheckbox = () => {
    if (readOnly) return;
    onChange(value === 'true' ? '' : 'true');
  };

  const alignClass = align ? `text-${align}` : '';
  
  // If we are given explicit height constraints through props, we use those,
  // Otherwise we use the table default height of min-h-[32px]
  const defaultHeightClass = (height || minHeight || wrapperClassName.includes('h-') || wrapperClassName.includes('min-h-')) ? '' : 'min-h-[32px]';
  const innerClass = `w-full h-full font-medium transition-colors ${alignClass} ${className}`;
  
  // Only apply table-specific padding if not overridden
  const paddingClass = className.includes('p-') ? '' : 'px-2 py-1';

  if (readOnly) {
    return (
      <div className={`flex items-center h-full w-full break-words whitespace-pre-wrap ${paddingClass} ${innerClass} ${wrapperClassName}`}>
        <MarkdownInlineEditor 
          value={value} 
          readOnly={true} 
          onChange={() => {}} 
          className="!bg-transparent !p-0"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`grid h-full w-full relative group transition-colors ${defaultHeightClass} ${isChanged && !hideIndicator ? 'bg-amber-100/40' : ''} ${wrapperClassName}`}
    >
      {(type === 'select' && options) || type === 'attributeIndex' ? (
        <div className="relative w-full h-full">
          <select
            value={value || (type === 'attributeIndex' ? '0' : '')}
            onChange={handleSelectChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            {type === 'attributeIndex' ? (
              <>
                <option value="0">—</option>
                {ATTRIBUTE_NAMES.map((attr, idx) => (
                  <option key={attr} value={String(idx + 1)}>{t('editor.attributes.' + attr)}</option>
                ))}
              </>
            ) : options?.map(opt => (
              <option key={opt} value={opt}>{opt || '—'}</option>
            ))}
          </select>
          <div className={`${paddingClass} ${innerClass} flex items-center justify-center ${isChanged ? 'text-amber-700' : 'text-ink'}`}>
            {displayValue() || <span className="text-stone-300">—</span>}
          </div>
        </div>
      ) : type === 'checkbox' ? (
        <div 
          onClick={toggleCheckbox}
          className={`${paddingClass} ${innerClass} flex items-center justify-center cursor-pointer hover:bg-stone-100/50 ${isChanged ? 'text-amber-900' : 'text-ink'}`}
        >
          {displayValue()}
        </div>
      ) : type === 'text' ? (
          <div className={`${paddingClass} ${innerClass} flex items-center`}>
            <MarkdownInlineEditor
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                singleLine={singleLine}
                transactionFilter={transactionFilter}
                height={height}
                minHeight={minHeight}
                className="!bg-transparent !p-0 w-full"
            />
          </div>
      ) : (
        <>
          <div className={`col-start-1 row-start-1 invisible whitespace-pre-wrap break-words ${paddingClass} ${innerClass} pointer-events-none`}>
            {displayValue() + '\n'}
          </div>
          <textarea
            value={isFocused && (type === 'quantity' || type === 'bonus' || type === 'int' || type === 'posInt' || type === 'level' || type === 'distance' || type === 'cost' || type === 'weight') ? value : displayValue()}
            onChange={handleTextareaChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden outline-none bg-transparent ${paddingClass} ${innerClass} ${type === 'quantity' ? 'text-stone-500' : ''} ${isChanged ? 'text-amber-900' : ''}`}
            rows={1}
            placeholder={placeholder}
          />
        </>
      )}
      {isChanged && !hideIndicator && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
};

export default DynamicInput;

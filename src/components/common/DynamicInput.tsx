import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { ATTRIBUTE_NAMES, InputType } from '../../types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { validateInput, normalizeValue } from '../../utils/validation';
import { useNumericStepper } from '../../hooks/useNumericStepper';
import { getDisplayValue } from '../../utils/formatters';

export interface DynamicInputProps {
  value: any;
  originalValue?: any;
  onChange: (v: any) => void;
  className?: string; // Applied to inner element
  wrapperClassName?: string; // Applied to outermost div
  readOnly?: boolean;
  columnKey?: string;
  type?: InputType;
  options?: string[];
  displayFormatter?: (v: any, ...args: any[]) => string;
  
  // Extended props for broader use
  placeholder?: string;
  singleLine?: boolean;
  transactionFilter?: (tr: any) => boolean;
  hideIndicator?: boolean;
  align?: 'left' | 'center' | 'right';
  height?: string;
  minHeight?: string;
  row?: any;
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
  minHeight,
  row
}: DynamicInputProps) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = React.useState(false);
  const isChanged = !readOnly && originalValue !== undefined && value !== originalValue;

  const [tempValue, setTempValue] = React.useState(value);
  React.useEffect(() => {
    if (!isFocused) setTempValue(value);
  }, [value, isFocused]);

  const handleStepperChange = (v: string) => {
    setTempValue(v);
    onChange(v);
  };

  const containerRef = useNumericStepper({
    value: tempValue,
    onChange: handleStepperChange,
    type: type || 'text',
    readOnly: readOnly,
  });

  const isDescriptionCol = (key?: string) => {
    if (!key) return false;
    const k = key.toLowerCase();
    return ['desc', 'notes', 'special', 'content', 'remarks', 'story', 'languages', 'trait'].some(word => k.includes(word));
  };

  const displayValue = () => {
    return getDisplayValue(value, type || 'text', t, { 
      isFocused, 
      displayFormatter, 
      formatterArgs: [row, columnKey] 
    });
  };

  const handleChange = (val: string) => {
    setTempValue(val);
    // Real-time for most types now, ensuring bonus/int can handle signs
    if (type === 'text' || type === 'bool' || type === 'select' || type === 'attributeIndex' || type === 'markdown' || type === 'bonus' || type === 'int' || type === 'posInt') {
       if (validateInput(val, type || 'text')) {
         const normalized = normalizeValue(val, type || 'text');
         onChange(normalized);
       }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Final normalization pass across all types
    let blurValue = tempValue;
    if (blurValue === '+' || blurValue === '-') blurValue = '0';
    
    if (validateInput(blurValue, type || 'text')) {
      let normalized = normalizeValue(blurValue, type || 'text');
      if (type === 'level' && normalized === '0') normalized = '1';
      onChange(normalized);
    } else {
      setTempValue(value);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (validateInput(val, type || 'text')) {
      onChange(normalizeValue(val, type || 'text'));
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
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
      ) : type === 'bool' ? (
        <div className={`${paddingClass} ${innerClass} flex items-center justify-center`}>
          <button
            onClick={() => onChange(!value)}
            className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0 ${value === true || value === 'true' ? 'bg-primary border-primary text-white shadow-sm' : 'border-stone-300 hover:border-stone-400 bg-white'}`}
          >
            {(value === true || value === 'true') && <Check size={14} strokeWidth={3} />}
          </button>
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
            value={isFocused ? tempValue : displayValue()}
            onChange={handleTextareaChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
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

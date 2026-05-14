import React from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_NAMES, InputType } from '../../types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { useNumericStepper } from '../../hooks/useNumericStepper';
import { getDisplayValue } from '../../utils/formatters';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import handlers from '../../schema/dataTypes';

const { getHandlerByType } = handlers;

import { useCharacter } from '../../contexts/CharacterContext';

export interface DynamicInputProps {
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  path?: string;
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
  row?: any;
}

export const DynamicInput = ({
  value,
  originalValue,
  onChange,
  path,
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
  const characterContext = useCharacter();
  const [isFocused, setIsFocused] = React.useState(false);

  const context = React.useMemo(() => ({
    modifiers: characterContext?.computed?.modifiers,
    t,
    row
  }), [characterContext?.computed?.modifiers, t, row]);

  // 优先级：Path 获取的 Handler > Type 获取的兜底 Handler
  const handler = React.useMemo(() => {
    const h = path ? getHandlerByPath(path) : null;
    return h || getHandlerByType(type);
  }, [path, type]);

  const alignClass = align ? `text-${align}` : '';
  const innerClass = `w-full h-full font-medium transition-colors leading-relaxed ${alignClass} ${className}`;

  // Ensure default font size if not provided by className
  const finalInnerClass = React.useMemo(() => {
    const hasTextSize = innerClass.includes('text-xs') ||
                       innerClass.includes('text-sm') ||
                       innerClass.includes('text-base') ||
                       innerClass.includes('text-lg') ||
                       innerClass.includes('text-xl');
    return hasTextSize ? innerClass : `text-sm ${innerClass}`;
  }, [innerClass]);

  const isChanged = React.useMemo(() => {
    if (readOnly || originalValue === undefined) return false;

    // 如果值严格相等，直接返回
    if (value === originalValue) return false;

    // 使用 Schema 定义的 update 函数对两者进行预处理（转换成存储格式）再比较
    // 这能处理 "0" vs 0, "" vs undefined, "1.0" vs 1 等情况
    const v1 = handler?.update ? handler.update(String(value)) : value;
    const v2 = handler?.update ? handler.update(String(originalValue)) : originalValue;

    // 对于对象或数组（如 SoA 中的某些字段），使用 JSON 比较
    if (typeof v1 === 'object' || typeof v2 === 'object') {
      return JSON.stringify(v1) !== JSON.stringify(v2);
    }

    return v1 !== v2;
  }, [readOnly, originalValue, value, handler]);

  const [tempValue, setTempValue] = React.useState(value);
  React.useEffect(() => {
    if (!isFocused) setTempValue(value);
  }, [value, isFocused]);

  const handleStepperChange = (v: string) => {
    const finalValue = handler?.update ? handler.update(v) : v;
    setTempValue(v);
    onChange(finalValue);
  };

  const containerRef = useNumericStepper({
    value: tempValue,
    onChange: handleStepperChange,
    type: type || 'text',
    readOnly: readOnly,
    min: handler?.min,
    max: handler?.max,
    step: handler?.step,
  });

  const displayValue = (val: string = value) => {
    return getDisplayValue(val, type || 'text', t, { isFocused, path, columnKey, row, displayFormatter, context });
  };

  const handleChange = (val: string) => {
    setTempValue(val);

    // 优先使用传入的拦截器（CodeMirror 场景）
    if (transactionFilter) {
      if (!transactionFilter({ docChanged: true, nextEvents: [{ text: val }] })) {
        return;
      }
    }

    // 使用 Handler 进行实时拦截
    if (handler?.validate) {
      if (!handler.validate(val)) return;
    }

    // 更新数据 (使用 update 进行存储格式化)
    const finalValue = handler?.update ? handler.update(val) : val;
    onChange(finalValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const finalValue = handler?.update ? handler.update(tempValue) : tempValue;
    onChange(finalValue);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const finalValue = handler?.update ? handler.update(val) : val;
    onChange(finalValue);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const toggleBool = () => {
    if (readOnly) return;
    onChange(value === 'true' ? '' : 'true');
  };

  // If we are given explicit height constraints through props, we use those,
  // Otherwise we use the table default height of min-h-[32px]
  const defaultHeightClass = (height || minHeight || wrapperClassName.includes('h-') || wrapperClassName.includes('min-h-')) ? '' : 'min-h-[32px]';

  // Only apply table-specific padding if not overridden
  const paddingClass = className.includes('p-') ? '' : 'px-2 py-1';

  if (readOnly) {
    return (
      <div className={`flex items-center h-full w-full break-words whitespace-pre-wrap ${paddingClass} ${finalInnerClass} ${wrapperClassName}`}>
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
      {(type === 'select' || type === 'attributeIndex' || handler?.ui === 'select' || handler?.ui === 'attributeIndex') ? (
        <div className="relative w-full h-full">
          <select
            value={value || (type === 'attributeIndex' ? '4' : '')}
            onChange={handleSelectChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            {(options || handler?.options || []).map((opt: string) => (
              <option key={opt} value={opt}>
                {handler?.formatDisplay ? handler.formatDisplay(opt, context) : opt}
              </option>
            ))}
          </select>
          <div className={`${paddingClass} ${finalInnerClass} flex items-center justify-center ${isChanged ? 'text-amber-700' : 'text-ink'}`}>
            {displayValue() || <span className="text-stone-300">—</span>}
          </div>
        </div>
      ) : (type as string === 'bool' || handler?.ui === 'bool') ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleBool();
          }}
          className={`${paddingClass} ${finalInnerClass} flex items-center justify-center cursor-pointer hover:bg-stone-200/50 transition-colors w-full h-full min-h-[32px] ${isChanged ? 'text-amber-900 bg-amber-50/30' : 'text-ink'}`}
        >
          {displayValue()}
        </button>
      ) : type === 'text' ? (
          <div className={`${paddingClass} ${finalInnerClass} flex items-center`}>
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
          <div className={`col-start-1 row-start-1 invisible whitespace-pre-wrap break-words ${paddingClass} ${finalInnerClass} pointer-events-none`}>
            {displayValue() + '\n'}
          </div>
          <textarea
            value={isFocused ? tempValue : displayValue()}
            onChange={handleTextareaChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden outline-none bg-transparent ${paddingClass} ${finalInnerClass} ${type === 'quantity' ? 'text-stone-500' : ''} ${isChanged ? 'text-amber-900' : ''}`}
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

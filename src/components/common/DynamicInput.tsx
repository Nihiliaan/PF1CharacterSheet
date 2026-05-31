import React from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_NAMES, InputType } from '../../schema/types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { useNumericStepper } from '../../hooks/useNumericStepper';
import { getDisplayValue } from '../../utils/formatters';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import handlers from '../../schema/handlers';

const { getHandlerByType } = handlers;

import { useCharacter } from '../../contexts/CharacterContext';

export interface DynamicInputProps {
  value: string | number;
  originalValue?: string | number;
  onChange: (v: string | number) => void;
  path?: string;
  className?: string; // Applied to inner element
  wrapperClassName?: string; // Applied to outermost div
  readOnly?: boolean;
  columnKey?: string;
  type?: InputType;
  optionIndices?: number[];
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

// 极简的 Markdown 链接渲染器，用于提升初始渲染性能
const MarkdownLinkRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:underline cursor-pointer"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {match[1]}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
};

export const DynamicInput = React.memo(({
  value,
  originalValue,
  onChange,
  path,
  className = '',
  wrapperClassName = '',
  readOnly = false,
  columnKey,
  type = 'text',
  optionIndices,
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
  const [isEditing, setIsEditing] = React.useState(false);
  const lastClickCoords = React.useRef<{ x: number, y: number } | null>(null);

  const modifiers = characterContext?.computed?.modifiers;

  const context = React.useMemo(() => ({
    modifiers,
    t,
    row
  }), [modifiers, t, row]);

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
    const v1 = handler?.update ? handler.update(value) : value;
    const v2 = handler?.update ? handler.update(originalValue) : originalValue;

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
    const finalValue = handler?.update?.(v) ?? v;
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

    if (transactionFilter) {
      if (!transactionFilter({ docChanged: true, nextEvents: [{ text: val }] })) {
        return;
      }
    }

    if (handler?.validate) {
      if (!handler.validate(val)) return;
    }

    const finalValue = handler?.update ? handler.update(val) : val;
    onChange(finalValue);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTempValue(val);
    const finalValue = handler?.update ? handler.update(val) : val;
    onChange(finalValue);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const toggleBool = () => {
    if (readOnly) return;
    const next = value === 'true' ? '' : 'true';
    setTempValue(next);
    onChange(next);
  };

  const defaultHeightClass = (height || minHeight || wrapperClassName.includes('h-') || wrapperClassName.includes('min-h-')) ? '' : 'min-h-[32px]';
  const paddingClass = className.includes('p-') ? '' : 'px-2 py-1';

  // 核心样式复用：确保预览和编辑状态的文字位置、间距、字体完全一致
  const sharedStyles = `w-full h-full break-words whitespace-pre-wrap ${paddingClass} ${finalInnerClass}`;

  const renderContent = () => {
    // 只读模式直接返回预览
    if (readOnly) {
      const val = displayValue();
      return (
        <div className={`${sharedStyles} flex items-start`}>
          <div className="w-full">
            <MarkdownLinkRenderer text={val} />
          </div>
        </div>
      );
    }

    // Select 类型：始终渲染透明 select 以捕获初次点击，但根据 focus 状态显示预览或样式
    if (handler?.ui === 'select') {
      return (
        <div className="relative w-full h-full">
          <select
            value={value || ''}
            onChange={handleSelectChange}
            onFocus={() => setIsFocused(true)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="">{t('common.select_option')}...</option>
            {(optionIndices || handler.optionIndices || []).map((opt: number) => (
              <option key={opt} value={opt}>
                {handler?.formatDisplay ? handler.formatDisplay(opt, context) : opt}
              </option>
            ))}
          </select>
          <div className={`${sharedStyles} flex items-center justify-center ${isChanged ? 'text-amber-700' : 'text-ink'} ${isFocused ? 'bg-stone-50' : ''}`}>
            {displayValue() || <span className="text-stone-300">—</span>}
          </div>
        </div>
      );
    }

    // Bool 类型：点击切换
    if (handler?.ui === 'bool') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleBool();
          }}
          className={`${sharedStyles} flex items-center justify-center cursor-pointer hover:bg-stone-200/50 transition-colors ${isChanged ? 'text-amber-900 bg-amber-50/30' : 'text-ink'}`}
        >
          {displayValue()}
        </button>
      );
    }

    // 预览模式：非焦点状态下显示预览
    if (!isFocused) {
      const val = displayValue();
      return (
        <div className={`${sharedStyles} cursor-text min-h-[32px] flex items-start`}>
          <div className="w-full">
            <MarkdownLinkRenderer text={val} />
          </div>
        </div>
      );
    }

    // 编辑模式：所有非 select/bool 类型统一使用增强的 MarkdownInlineEditor 以支持精准光标定位
    return (
      <div className={`${paddingClass} ${finalInnerClass} flex items-center w-full h-full`}>
        <MarkdownInlineEditor
          value={String(value ?? '')}
          onChange={handleChange}
          placeholder={placeholder}
          singleLine={singleLine}
          transactionFilter={transactionFilter}
          height={height}
          minHeight={minHeight}
          className="!bg-transparent !p-0 w-full"
          autoFocus={true}
          initialClickCoords={lastClickCoords.current}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={readOnly ? undefined : 0}
      onMouseDown={(e) => {
        if (!readOnly) {
          lastClickCoords.current = { x: e.clientX, y: e.clientY };
          setIsFocused(true);
        }
      }}
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={(e) => {
        // 如果窗口失去焦点（如切换到其他应用），保留编辑状态，方便切回
        if (!document.hasFocus()) return;

        // 利用 focusout 冒泡判断是否真的离开了组件
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
          const finalValue = handler?.update ? handler.update(tempValue) : tempValue;
          onChange(finalValue);
        }
      }}
      className={`grid h-full w-full relative group transition-colors ${defaultHeightClass} ${isChanged && !hideIndicator ? 'bg-amber-100/40' : ''} ${wrapperClassName}`}
    >
      {renderContent()}
      {isChanged && !hideIndicator && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
});

export default DynamicInput;

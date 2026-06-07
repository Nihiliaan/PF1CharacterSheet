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

import { cn } from '../../lib/utils';
import { Combobox } from '../ui/combobox';
import { X } from 'lucide-react';

export interface DynamicInputProps {
  value: any;
  originalValue?: any;
  onChange: (v: any) => void;
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
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  const lastClickCoords = React.useRef<{ x: number, y: number } | null>(null);
  const datalistId = React.useId(); // 稳定 datalist ID

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
  const justifyClass = React.useMemo(() => {
    switch (align) {
      case 'left': return 'justify-start';
      case 'right': return 'justify-end';
      case 'center': return 'justify-center';
      default: return 'justify-start';
    }
  }, [align]);

  const innerClass = `font-medium transition-colors leading-relaxed ${alignClass} ${className}`;

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

  const [tempValue, setTempValue] = React.useState(() => 
    handler?.formatInteractive ? handler.formatInteractive(value, context) : value
  );
  
  // 同步逻辑：非焦点状态下，通过 handler.formatInteractive 获取最新的编辑值
  React.useEffect(() => {
    if (!isFocused) {
      const interactiveValue = handler?.formatInteractive ? handler.formatInteractive(value, context) : value;
      setTempValue(interactiveValue);
    }
  }, [value, isFocused, handler, context]);

  const inputRef = React.useRef<HTMLInputElement>(null);

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
  const sharedStyles = cn(
    "h-full transition-colors leading-relaxed flex min-h-[32px] px-2",
    singleLine ? "items-center" : "items-start pt-1.5",
    justifyClass,
    singleLine ? "whitespace-nowrap w-max min-w-full" : "break-words whitespace-pre-wrap w-full",
    finalInnerClass
  );

  // Datalist 缓存：避免几百个技能名在每一行、每一帧都重新翻译
  // 我们使用一个模块级或 Ref 级的缓存来存储翻译后的选项
  const optionsCache = React.useRef<Record<string, { value: string, id: number }[]>>({});

  const renderContent = () => {
    // 只读模式直接返回预览
    if (readOnly) {
      const val = displayValue();
      return (
        <div className={sharedStyles}>
          <div className={cn(!singleLine && "w-full")}>
            <MarkdownLinkRenderer text={val} />
          </div>
        </div>
      );
    }

    // Datalist 类型：改用 Shadcn/UI Combobox 实现
    if (handler?.ui === 'datalist') {
      const getDatalistOptions = () => {
        const rawOptions = optionIndices || (handler.getOptions ? handler.getOptions(context) : handler.optionIndices) || [];
        
        // 如果已经是格式化好的对象结构（带 children 或 label/value），直接返回
        if (rawOptions.length > 0 && typeof rawOptions[0] === 'object' && rawOptions[0] !== null) {
          return rawOptions;
        }

        // 否则按传统扁平索引转换
        return rawOptions.map((opt: number) => ({
          label: handler?.formatDisplay ? handler.formatDisplay(opt, { ...context, isOption: true }) : String(opt),
          value: opt
        }));
      };

      const options = getDatalistOptions();
      
      // 多选标签化渲染：仅在获得焦点（交互状态）或下拉框打开时显示 Tag，平时显示纯文本
      let displayContent: React.ReactNode;
      const displayLabel = handler?.formatDisplay ? handler.formatDisplay(value, context) : String(value);

      const showTags = (isFocused || isComboboxOpen) && handler.isMulti && Array.isArray(value) && value.length > 0;

      if (showTags) {
        displayContent = (
          <div className={cn("flex gap-1 items-center py-0.5", (singleLine && !isComboboxOpen) ? "flex-nowrap" : "flex-wrap")}>
            {value.map((v, i) => {
              const label = handler?.formatDisplay ? handler.formatDisplay(v, { ...context, isOption: true }) : String(v);
              return (
                <div 
                  key={`${v}-${i}`}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[13px] font-medium leading-tight group/tag hover:bg-primary/20 transition-colors whitespace-nowrap"
                >
                  {label}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // 关键：阻止删除操作触发下拉框的开关
                      const next = [...value];
                      next.splice(i, 1);
                      onChange(next);
                    }}
                    className="p-0.5 hover:bg-primary/30 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        );
      } else {
        // 单选或非焦点状态下的纯文本显示
        displayContent = displayLabel || <span className="text-stone-300">—</span>;
      }

      return (
        <Combobox
          options={options}
          value={value}
          multiSelect={handler.isMulti}
          onSelect={(val) => {
            onChange(val);
          }}
          onOpenChange={setIsComboboxOpen}
          className={cn(sharedStyles, "!p-0 font-inherit bg-transparent hover:bg-stone-50 transition-colors", showTags && !singleLine && "h-auto")}
          placeholder={displayContent}
          singleLine={singleLine}
        />
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
            {(optionIndices || handler.optionIndices || []).map((opt: number) => (
              <option key={opt} value={opt}>
                {handler?.formatDisplay ? handler.formatDisplay(opt, { ...context, isOption: true }) : opt}
              </option>
            ))}
          </select>
          <div className={`${sharedStyles} ${isChanged ? 'text-amber-700' : 'text-ink'} ${isFocused ? 'bg-stone-50' : ''}`}>
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
          className={`${sharedStyles} cursor-pointer hover:bg-stone-200/50 transition-colors ${isChanged ? 'text-amber-900 bg-amber-50/30' : 'text-ink'}`}
        >
          {displayValue()}
        </button>
      );
    }

    // 所有其他 Markdown 输入类型：统一交给混合模式编辑器处理
    return (
      <div className={cn(sharedStyles, isFocused && "bg-white/50 shadow-sm ring-1 ring-primary/20")}>
        <MarkdownInlineEditor
          value={String(value ?? '')}
          onChange={handleChange}
          isFocused={isFocused}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          singleLine={singleLine}
          height={height}
          minHeight={minHeight}
          className="!bg-transparent !p-0 w-full"
          initialClickCoords={lastClickCoords.current}
          align={align}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={readOnly || isFocused ? undefined : 0}
      onMouseDown={(e) => {
        if (!readOnly) {
          lastClickCoords.current = { x: e.clientX, y: e.clientY };
          // 仅在非焦点时阻止默认行为，允许点击穿透给编辑器
          if (!isFocused) e.preventDefault();
          setIsFocused(true);
        }
      }}
      onFocus={(e) => {
          if (!readOnly && !isFocused) setIsFocused(true);
      }}
      onBlur={(e) => {
        if (!document.hasFocus()) return;
        const currentTarget = e.currentTarget;
        // 延迟检查焦点是否真的离开了组件
        setTimeout(() => {
          if (!currentTarget.contains(document.activeElement)) {
            setIsFocused(false);
            if (handler?.ui !== 'datalist') {
                const finalValue = handler?.update ? handler.update(tempValue, context) : tempValue;
                onChange(finalValue);
            }
          }
        }, 100);
      }}
      className={cn(
        "grid h-full relative group transition-colors",
        !singleLine && "w-full",
        defaultHeightClass,
        isChanged && !hideIndicator ? 'bg-amber-100/40' : '',
        wrapperClassName
      )}
    >
      {renderContent()}
      {isChanged && !hideIndicator && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
});

export default DynamicInput;

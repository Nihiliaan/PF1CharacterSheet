import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { InputType } from '../../schema/types';
import MarkdownInlineEditor from './MarkdownInlineEditor';
import { getDisplayValue } from '../../utils/formatters';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import handlers from '../../schema/handlers';
import { useCharacter } from '../../contexts/CharacterContext';
import { cn } from '../../lib/utils';
import { Combobox } from '../ui/combobox';
import { X, ExternalLink, Link as LinkIcon, Edit3, Plus } from 'lucide-react';
import CheckGroupInput, { CheckGroupInputProps, encodeCheckGroup, decodeCheckGroup } from './CheckGroupInput';
export { CheckGroupInput, encodeCheckGroup, decodeCheckGroup };
export type { CheckGroupInputProps };

import { isEqual } from 'lodash-es';

const { getHandlerByType } = handlers;

export interface DynamicInputProps {
  value: any;
  originalValue?: any;
  onChange: (v: any) => void;
  path?: string;
  className?: string;
  wrapperClassName?: string;
  readOnly?: boolean;
  columnKey?: string;
  type?: InputType;
  optionIndices?: number[];
  displayFormatter?: (v: string, isFocused: boolean) => string;
  placeholder?: string;
  singleLine?: boolean;
  transactionFilter?: (tr: any) => boolean;
  hideIndicator?: boolean;
  align?: 'left' | 'center' | 'right';
  height?: string;
  minHeight?: string;
  row?: any;
}

const MarkdownLinkRenderer = ({ text }: { text: string }) => {
  if (!text) return null;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline cursor-pointer" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        {match[1]}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return <>{parts.length > 0 ? parts : text}</>;
};

const SimpleInlineEditor = ({ value, onChange, placeholder, autoFocus, className, onFocus }: any) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onFocus={onFocus}
    placeholder={placeholder}
    autoFocus={autoFocus}
    className={cn("w-full bg-transparent outline-none border-none p-0 m-0 font-inherit leading-inherit placeholder:text-stone-300 placeholder:italic", className)}
  />
);

export const DynamicInput = React.memo(({
  value, originalValue, onChange, path, className = '', wrapperClassName = '',
  readOnly = false, columnKey, type = 'text', optionIndices, displayFormatter,
  placeholder = '', singleLine = false, transactionFilter, hideIndicator = false,
  align, height, minHeight, row
}: DynamicInputProps) => {
  const { t } = useTranslation();
  const characterContext = useCharacter();
  const [isFocused, setIsFocused] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [cellRect, setCellRect] = useState<{ top: number; left: number; height: number; width: number } | null>(null);
  const [draggedTagIndex, setDraggedTagIndex] = useState<number | null>(null);
  const [dragOverTagIndex, setDragOverTagIndex] = useState<number | null>(null);
  const lastClickCoords = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const computed = characterContext?.computed;
  const data = characterContext?.data;
  const context = useMemo(() => ({ data, computed, t, row }), [data, computed, t, row]);
  const handler = useMemo(() => (path ? getHandlerByPath(path) : null) || getHandlerByType(type || 'text'), [path, type]);

  const fontStack = "Inter, 'Noto Sans SC', system-ui, -apple-system, sans-serif";
  const sharedStyles = cn(
    "h-full transition-colors leading-relaxed flex min-h-[32px] px-2",
    singleLine ? "items-center" : "items-start pt-1.5",
    align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left',
    singleLine ? "whitespace-nowrap w-full overflow-hidden" : "break-words whitespace-pre-wrap w-full",
    "text-sm font-medium",
    className
  );

  const [tempValue, setTempValue] = useState(() => handler?.formatInteractive ? handler.formatInteractive(value, context) : value);
  
  useEffect(() => {
    if (!isFocused) setTempValue(handler?.formatInteractive ? handler.formatInteractive(value, context) : value);
  }, [value, isFocused, handler, context]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || readOnly || !isFocused || !handler?.step) return;
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault(); e.stopPropagation();
        const delta = e.deltaY > 0 ? -handler.step : handler.step;
        const currentVal = parseFloat(String(tempValue)) || 0;
        let newVal = Math.min(handler.max ?? Infinity, Math.max(handler.min ?? -Infinity, currentVal + delta));
        handleChange(String(newVal));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isFocused, tempValue, handler]);

  const handleChange = useCallback((val: any) => {
    setTempValue(val);
    if (handler?.validate && !handler.validate(val)) return;
    onChange(handler?.update ? handler.update(val, context) : val);
  }, [handler, context, onChange]);

  const toggleBool = useCallback(() => {
    if (readOnly) return;
    const next = (value === 'true' || value === true) ? '' : 'true';
    setTempValue(next);
    onChange(next);
  }, [readOnly, value, onChange]);

  const isChanged = useMemo(() => {
    if (readOnly || originalValue === undefined) return false;
    
    const v1 = handler?.update ? handler.update(value, context) : value;
    const v2 = handler?.update ? handler.update(originalValue, context) : originalValue;
    
    return !isEqual(v1, v2);
  }, [readOnly, originalValue, value, handler, context]);

  const handleManualFocus = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    lastClickCoords.current = { x: e.clientX, y: e.clientY };
    if (!isFocused) e.preventDefault(); // 仅针对需要手动控制焦点的组件（MD/Text）阻止默认行为
    setIsFocused(true);
  }, [readOnly, isFocused]);

  const handleAutoBlur = useCallback((e: React.FocusEvent) => {
    if (type === 'link' || handler?.ui === 'link') return;
    if (!document.hasFocus()) return;
    const currentTarget = e.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement)) setIsFocused(false);
    }, 50);
  }, [type, handler]);

  const renderContent = () => {
    const ui = handler?.ui;

    if (ui === 'link' || type === 'link') {
      const url = String(value || '').trim();
      const hasUrl = Boolean(url);

      const handleCellClick = () => {
        if (readOnly) return;
        const targetEl = containerRef.current;
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          setCellRect({
            top: rect.top,
            left: rect.left,
            height: rect.height,
            width: rect.width
          });
        }
        setIsFocused(true);
      };

      return (
        <div 
          className={cn(sharedStyles, "justify-center items-center py-1 relative cursor-pointer whitespace-nowrap overflow-visible")}
          onClick={handleCellClick}
          title={hasUrl ? `${url}\n(点击空白处编辑)` : (!readOnly ? t('editor.pfs.click_to_add_url', '点击添加外链') : '')}
        >
          {hasUrl ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1 rounded text-amber-800 hover:text-amber-600 hover:bg-amber-100/60 transition-colors cursor-pointer"
              title={`${url}\n(在新窗口打开)`}
            >
              <LinkIcon size={15} />
            </a>
          ) : (
            !readOnly ? (
              <span className="text-stone-300 hover:text-stone-500 p-1">
                <LinkIcon size={13} className="opacity-40 hover:opacity-100 transition-opacity" />
              </span>
            ) : (
              <span className="text-stone-300">—</span>
            )
          )}

          {/* 完全挂载在 body 顶层、无缝盖在原单元格上、可无限长出任何父容器且不超出视口边缘的极简输入框 */}
          {isFocused && !readOnly && cellRect && createPortal(
            <input
              type="text"
              value={tempValue ?? ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              autoFocus={true}
              placeholder={placeholder || t('editor.pfs.enter_url', '输入外链...')}
              style={{
                position: 'fixed',
                top: `${cellRect.top}px`,
                left: `${cellRect.left}px`,
                height: `${cellRect.height}px`,
                minWidth: `${Math.max(cellRect.width, 160)}px`,
                width: tempValue && String(tempValue).length > 20 ? `${Math.min(String(tempValue).length * 8 + 32, window.innerWidth - cellRect.left - 16)}px` : 'auto',
                maxWidth: `calc(100vw - ${cellRect.left + 16}px)`,
                zIndex: 9999,
              }}
              className="bg-white text-xs text-stone-900 outline-none border border-amber-500 rounded-xs px-2 shadow-xl whitespace-nowrap font-sans m-0 box-border leading-normal"
            />,
            document.body
          )}
        </div>
      );
    }

    if (readOnly) return (
      <div className={sharedStyles} style={{ fontFamily: fontStack }}>
        <div className={cn(!singleLine && "w-full")}><MarkdownLinkRenderer text={getDisplayValue(value, type || 'text', t, { isFocused, path, context })} /></div>
      </div>
    );

    if (ui === 'datalist') {
      const options = (optionIndices || (handler.getOptions ? handler.getOptions(context) : handler.optionIndices) || []).map((opt: any) => 
        (typeof opt === 'object' && opt !== null) ? opt : { label: handler?.formatDisplay ? handler.formatDisplay(opt, { ...context, isOption: true }) : String(opt), value: opt }
      );
      
      const interactiveValue = isFocused ? tempValue : (handler?.formatInteractive ? handler.formatInteractive(value, context) : value);
      const isMulti = handler.isMulti;
      const showTags = (isFocused || isComboboxOpen) && isMulti && Array.isArray(interactiveValue) && interactiveValue.length > 0;
      
      const displayContent = showTags ? (
        <div className={cn("flex gap-1 items-center py-0.5", (singleLine && !isComboboxOpen) ? "flex-nowrap" : "flex-wrap")}>
          {interactiveValue.map((v: any, i: number) => {
            const isDragging = draggedTagIndex === i;
            const isOver = dragOverTagIndex === i;
            return (
              <div
                key={`${v}-${i}`}
                draggable={!readOnly}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggedTagIndex(i);
                  e.dataTransfer.setData('text/plain', String(i));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverTagIndex !== i) {
                    setDragOverTagIndex(i);
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dragOverTagIndex === i) {
                    setDragOverTagIndex(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTagIndex(null);
                  setDraggedTagIndex(null);
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                  if (isNaN(fromIndex) || fromIndex === i) return;
                  const next = [...interactiveValue];
                  const [moved] = next.splice(fromIndex, 1);
                  next.splice(i, 0, moved);
                  handleChange(next);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggedTagIndex(null);
                  setDragOverTagIndex(null);
                }}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[13px] font-medium whitespace-nowrap select-none transition-all",
                  !readOnly && "cursor-grab active:cursor-grabbing",
                  isDragging && "opacity-40 scale-95 border-dashed border-primary",
                  isOver && "border-primary ring-2 ring-primary/30 bg-primary/20"
                )}
                title={!readOnly ? t('editor.lists.drag_to_sort', '按住拖动排序') : undefined}
              >
                {handler?.formatDisplay ? handler.formatDisplay(v, { ...context, isOption: true }) : String(v)}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const next = [...interactiveValue];
                      next.splice(i, 1);
                      handleChange(next);
                    }}
                    className="p-0.5 hover:bg-primary/30 rounded-full cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <span className={cn("w-full text-stone-800", !singleLine && "break-words whitespace-normal leading-relaxed")}>
          {(handler?.formatDisplay ? handler.formatDisplay(value, context) : String(value)) || <span className="text-stone-300">—</span>}
        </span>
      );

      return (
        <Combobox
          options={options} value={interactiveValue} multiSelect={isMulti} onSelect={handleChange} onOpenChange={setIsComboboxOpen}
          className={cn(sharedStyles, "font-inherit bg-transparent hover:bg-stone-50 transition-colors", !singleLine && "h-auto")}
          placeholder={displayContent} singleLine={singleLine} disablePadding={true}
        />
      );
    }

    if (ui === 'select') return (
      <div className="relative w-full h-full" onFocus={() => setIsFocused(true)}>
        <select
          value={value ?? ''}
          onChange={(e) => onChange(handler?.update ? handler.update(e.target.value, context) : e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        >
          {(optionIndices || handler.optionIndices || []).map((opt: number) => (
            <option key={opt} value={opt}>{handler?.formatDisplay ? handler.formatDisplay(opt, { ...context, isOption: true }) : opt}</option>
          ))}
        </select>
        <div className={cn(sharedStyles, isChanged ? 'text-amber-700' : 'text-ink', "group-focus-within:bg-stone-50")}>
          {getDisplayValue(value, type || 'text', t, { isFocused, path, context }) || <span className="text-stone-300">—</span>}
        </div>
      </div>
    );

    if (ui === 'bool') return (
      <button type="button" onClick={toggleBool} className={cn(sharedStyles, "cursor-pointer hover:bg-stone-200/50", isChanged ? 'text-amber-900 bg-amber-50/30' : 'text-ink')}>
        {getDisplayValue(value, type || 'text', t, { isFocused, path, context })}
      </button>
    );

    if (ui === 'date' || type === 'date') {
      if (isFocused) {
        return (
          <div className={cn(sharedStyles, "items-center group-focus-within:bg-white/90")}>
            <input
              type="date"
              value={tempValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => setIsFocused(false)}
              autoFocus={true}
              className="w-full bg-transparent outline-none border-none p-0 m-0 text-xs text-stone-800 font-sans"
            />
          </div>
        );
      }
      return (
        <div 
          className={cn(sharedStyles, "items-center text-xs cursor-pointer select-none")}
          onClick={() => !readOnly && setIsFocused(true)}
        >
          <span>{tempValue || getDisplayValue(value, 'date', t, { isFocused, path, context }) || '—'}</span>
        </div>
      );
    }

    if (ui === 'checkGroup' || type === 'checkGroup') {
      return (
        <CheckGroupInput
          value={value}
          readOnly={readOnly}
          className={sharedStyles}
          onChange={onChange}
        />
      );
    }

    // 对于 Text/Markdown 字段，才需要特殊的 Mousedown 拦截来精准定位
    return (
      <div className={cn(sharedStyles, "group-focus-within:bg-white/50")} style={{ fontFamily: fontStack }} onMouseDown={handleManualFocus}>
        {ui === 'text' || type === 'markdown' ? (
          <MarkdownInlineEditor
            value={String(value ?? '')} onChange={handleChange} isFocused={isFocused} onFocus={() => setIsFocused(true)}
            placeholder={placeholder} singleLine={singleLine} height={height} minHeight={minHeight}
            className="!bg-transparent !p-0 w-full" initialClickCoords={lastClickCoords.current} align={align}
          />
        ) : (
          isFocused ? (
            <SimpleInlineEditor
              value={tempValue}
              onChange={handleChange}
              autoFocus={true}
              placeholder={placeholder}
              className={align ? `text-${align}` : ''}
              onFocus={() => setIsFocused(true)}
            />
          ) : (
            <div className={cn(singleLine && "whitespace-nowrap")}>
              {getDisplayValue(value, type || 'text', t, { isFocused, path, context }) || <span className="text-stone-300 italic">{placeholder}</span>}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onBlur={handleAutoBlur}
      className={cn(
        "grid h-full w-full relative group transition-colors",
        (height || minHeight || wrapperClassName.includes('h-') || wrapperClassName.includes('min-h-')) ? '' : 'min-h-[32px]',
        isChanged && !hideIndicator ? 'bg-amber-100/40' : '',
        "focus-within:shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:rounded-md",
        wrapperClassName
      )}
    >
      {renderContent()}
      {isChanged && !hideIndicator && <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />}
    </div>
  );
});

export default DynamicInput;

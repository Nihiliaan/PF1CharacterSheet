import React, { useEffect, useRef, useState } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, placeholder as cmPlaceholder, drawSelection, dropCursor } from '@codemirror/view';
import { EditorState, RangeSetBuilder, Annotation, StateEffect, StateField } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { cn } from '../../lib/utils';

const programmaticUpdate = Annotation.define<boolean>();
const setConcealActive = StateEffect.define<boolean>();

// Conceal 控制状态：允许动态开启/关闭链接隐藏功能
const concealActiveField = StateField.define<boolean>({
  create: () => false, // 默认初始时不激活展开逻辑
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setConcealActive)) return e.value;
    return value;
  }
});

// 极简预览渲染器
const MarkdownPreviewer = ({ text, placeholder }: { text: string, placeholder?: string }) => {
  if (!text) return <span className="text-stone-300 italic pointer-events-none select-none">{placeholder}</span>;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(<span key={match.index} className="text-primary underline cursor-pointer">{match[1]}</span>);
    lastIndex = linkRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return <>{parts}</>;
};

// 核心插件：增强版链接隐藏逻辑，支持动态开关
const markdownConcealPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = this.getDecorations(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.viewportChanged || update.startState.field(concealActiveField) !== update.state.field(concealActiveField)) {
      this.decorations = this.getDecorations(update.view);
    }
  }
  getDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc.toString();
    const selection = view.state.selection.main;
    const isActive = view.state.field(concealActiveField);
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(doc)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const label = match[1];
      const isCursorInside = isActive && ((selection.from >= start && selection.from <= end) || (selection.to >= start && selection.to <= end));
      if (!isCursorInside) {
        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({
          attributes: { style: "color: var(--color-primary); text-decoration: underline; cursor: pointer;" },
          class: "cm-md-link-active"
        }));
        builder.add(start + 1 + label.length, end, Decoration.replace({}));
      }
    }
    return builder.finish();
  }
}, { decorations: v => v.decorations });

interface MarkdownInlineEditorProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  isFocused?: boolean;
  onFocus?: () => void;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  singleLine?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  initialClickCoords?: { x: number, y: number } | null;
}

const MarkdownInlineEditor = ({
  value,
  onChange,
  onBlur,
  isFocused = false,
  onFocus,
  placeholder = '',
  height = 'auto',
  minHeight = '24px',
  singleLine = false,
  align = 'left',
  className = '',
  initialClickCoords
}: MarkdownInlineEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fontStack = "Inter, 'Noto Sans SC', system-ui, -apple-system, sans-serif";

  useEffect(() => {
    if (isFocused && containerRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: String(value ?? ''),
        extensions: [
          concealActiveField,
          markdown({ base: markdownLanguage }),
          markdownConcealPlugin,
          drawSelection(),
          dropCursor(),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", backgroundColor: "transparent", fontSize: "inherit" },
            "&.cm-focused": { outline: "none" },
            ".cm-content": {
              padding: "0",
              fontFamily: fontStack,
              lineHeight: "1.625",
              caretColor: "#854d0e !important",
              minHeight: "1.625em"
            },
            ".cm-line": { display: "block", padding: "0", minHeight: "1.625em" },
            ".cm-line:empty::before": { content: '"\\200b"', display: "inline-block", width: "0" },
            ".cm-cursor": { borderLeft: "2px solid #854d0e !important" },
            ".cm-placeholder": { color: "#a8a29e", fontStyle: "italic", fontFamily: fontStack },
            "&.cm-focused .cm-placeholder": { display: "none" }
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some(tr => tr.annotation(programmaticUpdate))) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          placeholder ? cmPlaceholder(placeholder) : []
        ]
      });

      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;

      requestAnimationFrame(() => {
        if (!viewRef.current) return;
        viewRef.current.focus();
        
        if (initialClickCoords) {
          // 此时 concealActiveField 默认为 false，内容结构与预览态 100% 一致
          const pos = viewRef.current.posAtCoords(initialClickCoords);
          if (pos !== null) {
            viewRef.current.dispatch({
              selection: { anchor: pos, head: pos },
              scrollIntoView: true
            });
          }
        }

        // 定位完成后，开启“光标进入即展开”逻辑
        setTimeout(() => {
          if (viewRef.current) {
            viewRef.current.dispatch({ effects: setConcealActive.of(true) });
          }
        }, 50);
      });
    } else if (!isFocused && viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }
  }, [isFocused]);

  useEffect(() => {
    if (viewRef.current) {
      const safeValue = String(value ?? '');
      if (safeValue !== viewRef.current.state.doc.toString()) {
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: safeValue },
          annotations: [programmaticUpdate.of(true)]
        });
      }
    }
  }, [value]);

  const textAlignClass = {
    left: 'text-left justify-start',
    center: 'text-center justify-center',
    right: 'text-right justify-end'
  }[align];

  return (
    <div 
      className={cn("w-full h-full min-h-[1.625em] flex items-start cursor-text", textAlignClass, className)}
      style={{ height: isFocused ? height : 'auto', minHeight, fontFamily: fontStack }}
    >
      <div ref={containerRef} className={cn("w-full", !isFocused && "hidden")} />
      {!isFocused && (
        <div className="w-full break-words whitespace-pre-wrap">
          <MarkdownPreviewer text={value} placeholder={placeholder} />
        </div>
      )}
    </div>
  );
};

export default MarkdownInlineEditor;

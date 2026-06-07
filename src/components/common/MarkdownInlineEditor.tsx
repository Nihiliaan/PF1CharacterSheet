import React, { useEffect, useRef, useState } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, placeholder as cmPlaceholder, drawSelection, dropCursor } from '@codemirror/view';
import { EditorState, RangeSetBuilder, Annotation } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { cn } from '../../lib/utils';

const programmaticUpdate = Annotation.define<boolean>();

// 极简预览渲染器：仅处理链接，节省初次渲染开销
const MarkdownPreviewer = ({ text, placeholder }: { text: string, placeholder?: string }) => {
  if (!text) return <span className="text-stone-300 italic pointer-events-none select-none">{placeholder}</span>;
  
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(
      <span key={match.index} className="text-primary underline cursor-pointer">
        {match[1]}
      </span>
    );
    lastIndex = linkRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return <>{parts}</>;
};

// 链接隐藏插件
const markdownConcealPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = this.getDecorations(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.decorations = this.getDecorations(update.view);
    }
  }
  getDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc.toString();
    const selection = view.state.selection.main;
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(doc)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const label = match[1];
      const isCursorInside = (selection.from >= start && selection.from <= end) || (selection.to >= start && selection.to <= end);
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
  isFocused?: boolean; // 由父组件控制
  onFocus?: () => void; // 通知父组件已聚焦
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

  // 核心：处理编辑器的挂载与销毁
  useEffect(() => {
    if (isFocused && containerRef.current && !viewRef.current) {
      // 进入编辑模式：原地启动 CodeMirror
      const state = EditorState.create({
        doc: String(value ?? ''),
        extensions: [
          markdown({ base: markdownLanguage }),
          markdownConcealPlugin,
          drawSelection(),
          dropCursor(),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", backgroundColor: "transparent" },
            "&.cm-focused": { outline: "none" },
            ".cm-content": {
              padding: "0",
              fontFamily: "inherit",
              lineHeight: "1.625",
              caretColor: "#854d0e !important",
              minHeight: "1.625em"
            },
            ".cm-line": { display: "block", padding: "0", minHeight: "1.625em" },
            ".cm-cursor": { borderLeft: "2px solid #854d0e !important" },
            ".cm-cursorLayer": { zIndex: "1000 !important", opacity: "1 !important" },
            ".cm-placeholder": { color: "#a8a29e", fontStyle: "italic" },
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

      // 精准聚焦与定位
      requestAnimationFrame(() => {
        if (!viewRef.current) return;
        viewRef.current.focus();
        if (initialClickCoords) {
          const pos = viewRef.current.posAtCoords(initialClickCoords);
          if (pos !== null) {
            viewRef.current.dispatch({
              selection: { anchor: pos, head: pos },
              scrollIntoView: true
            });
          }
        }
      });
    } else if (!isFocused && viewRef.current) {
      // 退出编辑模式：销毁实例节省算力
      viewRef.current.destroy();
      viewRef.current = null;
    }
  }, [isFocused]);

  // 同步外部 Value 变化
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
      className={cn(
        "w-full h-full min-h-[1.625em] flex items-start cursor-text",
        textAlignClass,
        className
      )}
      onMouseDown={(e) => {
        if (!isFocused && onFocus) {
          // 捕获点击瞬时坐标并开启编辑
          onFocus();
        }
      }}
      style={{ height: isFocused ? height : 'auto', minHeight }}
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

import React, { useEffect, useRef } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';

interface MarkdownInlineEditorProps {
  value: string;
  originalValue?: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  height?: string;
  minHeight?: string;
}

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
          attributes: { style: "color: #2563eb; text-decoration: underline; cursor: pointer;" },
          class: "cm-md-link-active"
        }));
        builder.add(start + 1 + label.length, end, Decoration.replace({}));
      } else {
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({ class: "text-primary font-bold" }));
      }
    }
    return builder.finish();
  }
}, { decorations: v => v.decorations });

const externalLinkHandler = EditorView.domEventHandlers({
  mousedown: (event, view) => {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;
    const doc = view.state.doc.toString();
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(doc)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const url = match[2];
      if (pos >= start && pos <= end) {
          const selection = view.state.selection.main;
          const isCursorInside = (selection.from >= start && selection.from <= end);
          if (!isCursorInside || event.ctrlKey || event.metaKey) {
              window.open(url, '_blank');
              return true;
          }
      }
    }
    return false;
  }
});

const MarkdownInlineEditor = ({ value, onChange, readOnly = false, className = '', placeholder = '', height = 'auto', minHeight = '32px' }: MarkdownInlineEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    
    // Safety check to avoid double layers
    if (editorRef.current.querySelector('.cm-editor')) {
        editorRef.current.innerHTML = '';
    }

    const state = EditorState.create({
      doc: value || '',
      extensions: [
        markdown({ base: markdownLanguage }),
        markdownConcealPlugin,
        externalLinkHandler,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          "&": { height, minHeight, fontSize: "14px", backgroundColor: "transparent" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": { padding: "4px 0px", fontFamily: "inherit" },
          ".cm-line": { padding: "0" },
          ".cm-scroller": { fontFamily: "inherit", overflow: height === 'auto' ? 'hidden' : 'auto' },
          ".cm-gutters": { display: "none" },
          ".cm-placeholder": { color: "#aaa" }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        placeholder ? cmPlaceholder(placeholder) : [],
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    return () => { view.destroy(); };
  }, [readOnly, placeholder, height, minHeight]); 

  // Controlled component sync: ONLY sync if external value differs significantly
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value || '' }
      });
    }
  }, [value]);

  return <div ref={editorRef} className={`w-full h-full ${className}`} />;
};

export default MarkdownInlineEditor;

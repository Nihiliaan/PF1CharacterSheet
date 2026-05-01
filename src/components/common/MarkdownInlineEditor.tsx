import React, { useEffect, useRef } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language';

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

/**
 * Custom Link Widget to make links clickable even when they are part of a text block
 */
class LinkWidget extends WidgetType {
  constructor(readonly label: string, readonly url: string) {
    super();
  }
  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.label;
    span.className = 'cm-md-link-text text-primary underline cursor-pointer hover:text-primary/80 transition-colors';
    span.title = this.url;
    return span;
  }
}

/**
 * The Conceal Extension for Markdown Links
 * It hides [ ] and (url) when the cursor is not within the range.
 */
const markdownConcealPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.getDecorations(view);
  }

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
      
      const isCursorInside = (selection.from >= start && selection.from <= end) || 
                             (selection.to >= start && selection.to <= end);

      console.log(`[MarkdownEditor] Link match found: "${label}" at [${start}, ${end}]. isCursorInside: ${isCursorInside}`);

      if (!isCursorInside) {
        // 1. Hide [ (MUST BE FIRST)
        builder.add(start, start + 1, Decoration.replace({}));
        
        // 2. Style Label (MUST BE SECOND)
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({
          attributes: { style: "color: #2563eb; text-decoration: underline; cursor: pointer;" },
          class: "cm-md-link-active"
        }));
        
        // 3. Hide ](url) (MUST BE THIRD)
        builder.add(start + 1 + label.length, end, Decoration.replace({}));
      } else {
        // Just style the label when expanded so user knows it's the specific link part
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({
          class: "text-primary font-bold"
        }));
      }
    }

    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});

/**
 * Handle high-priority click to open links
 */
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
          
          // In collapsed mode, click is always a jump. 
          // In expanded mode, Ctrl/Cmd + Click is a jump.
          if (!isCursorInside || event.ctrlKey || event.metaKey) {
              window.open(url, '_blank');
              return true;
          }
      }
    }
    return false;
  }
});

const MarkdownInlineEditor = ({ value, originalValue, onChange, readOnly = false, className = '', placeholder = '', height = 'auto', minHeight = '32px' }: MarkdownInlineEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isChanged = originalValue !== undefined && value !== originalValue;

  useEffect(() => {
    if (!editorRef.current) return;
    console.log('[MarkdownEditor] Mounting component. Initial value:', value);

    const state = EditorState.create({
      doc: value || '',
// ... (rest of the extensions)
      extensions: [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        markdownConcealPlugin,
        externalLinkHandler,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          "&": {
            height: height,
            minHeight: minHeight,
            fontSize: "14px",
            backgroundColor: "transparent",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-content": {
            padding: "4px 0px",
            fontFamily: "inherit",
          },
          ".cm-scroller": {
            fontFamily: "inherit",
            overflow: height === 'auto' ? 'hidden' : 'auto',
          },
          ".cm-line": {
              padding: "0",
          },
          ".cm-gutters": {
            display: "none"
          },
          ".cm-placeholder": {
              color: "#aaa"
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newVal = update.state.doc.toString();
            console.log('[MarkdownEditor] Value changed:', newVal);
            onChange(newVal);
          }
        }),
        placeholder ? EditorView.placeholder(placeholder) : [],
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      console.log('[MarkdownEditor] Unmounting component');
      view.destroy();
    };
  }, [readOnly, placeholder, height, minHeight]); 

  // Sync value if changed from outside
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value || '' }
      });
    }
  }, [value]);

  return (
    <div 
      className={`relative w-full transition-colors rounded ${isChanged ? 'bg-amber-100/40' : ''} ${className}`}
    >
      <div ref={editorRef} className="w-full h-full" />
      {isChanged && (
        <div className="absolute right-0 top-0 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm z-10" />
      )}
    </div>
  );
};

export default MarkdownInlineEditor;

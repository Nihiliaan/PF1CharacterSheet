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
    
    // Regex for [label](url)
    const regex = /\[(.*?)\]\((.*?)\)/g;
    let match;

    while ((match = regex.exec(doc)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const label = match[1];
      const url = match[2];
      
      const isCursorInside = selection.from >= start && selection.to <= end;

      if (!isCursorInside) {
        // Hide the [
        builder.add(start, start + 1, Decoration.replace({}));
        // Hide the ](url)
        builder.add(start + 1 + label.length, end, Decoration.replace({}));
        // Style the label part
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({
          class: 'text-primary underline cursor-pointer hover:text-primary/80 transition-colors'
        }));
      } else {
        // Just highlight the label part even when expanded
        builder.add(start + 1, start + 1 + label.length, Decoration.mark({
          class: 'text-primary'
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
    const regex = /\[(.*?)\]\((.*?)\)/g;
    let match;

    while ((match = regex.exec(doc)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const url = match[2];

      if (pos >= start && pos <= end) {
        // If it's a click on a link, and the selection is NOT currently inside (it's collapsed)
        // or just generally if it's a click, we can choose to open it.
        // To be safe, we check if the view is focused. If not, click opens link.
        // If focused, we check if they clicked the label part.
        const selection = view.state.selection.main;
        const isCursorInside = selection.from >= start && selection.to <= end;

        if (!isCursorInside || event.ctrlKey || event.metaKey) {
            window.open(url, '_blank');
            return true; // Prevent editor from focusing/moving cursor if we opened the link
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

    const state = EditorState.create({
      doc: value,
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
          ".cm-content": {
            padding: "4px 8px",
            fontFamily: "inherit",
          },
          ".cm-scroller": {
            fontFamily: "inherit",
            overflow: height === 'auto' ? 'hidden' : 'auto',
          },
          "&.cm-focused": {
            outline: "none"
          },
          ".cm-gutters": {
            display: "none"
          },
          ".cm-activeLine": {
              backgroundColor: "transparent"
          },
          ".cm-placeholder": {
              color: "#d1d5db"
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
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
      view.destroy();
    };
  }, [readOnly, placeholder]); // Only re-create on major changes. Value is handled via update.

  // Sync value if changed from outside
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      });
    }
  }, [value]);

  return (
    <div 
      className={`relative w-full transition-colors rounded ${isChanged ? 'bg-amber-100/40 border-amber-300 ring-1 ring-amber-300/30' : 'bg-transparent'} ${className}`}
    >
      <div ref={editorRef} className="w-full h-full" />
      {isChanged && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm z-10" />
      )}
    </div>
  );
};

export default MarkdownInlineEditor;

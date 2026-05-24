import React, { useEffect, useRef } from 'react';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, RangeSetBuilder, Annotation } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';

// Custom annotation to distinguish programmatic updates from user input
const programmaticUpdate = Annotation.define<boolean>();

interface MarkdownInlineEditorProps {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  singleLine?: boolean;
  transactionFilter?: (tr: any) => boolean;
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

const MarkdownInlineEditor = ({
  value,
  onChange,
  onBlur,
  autoFocus = false,
  readOnly = false,
  className = '',
  placeholder = '',
  height = 'auto',
  minHeight = '24px',
  singleLine = false,
  transactionFilter
}: MarkdownInlineEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const onBlurRef = useRef(onBlur);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

  // Handle autoFocus
  useEffect(() => {
    if (autoFocus && viewRef.current && !viewRef.current.hasFocus) {
        viewRef.current.focus();
    }
  }, [autoFocus]);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const transactionFilterRef = useRef(transactionFilter);
  useEffect(() => { transactionFilterRef.current = transactionFilter; }, [transactionFilter]);

  // Initial mount
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: String(value ?? ''),
      extensions: [
        markdown({ base: markdownLanguage }),
        markdownConcealPlugin,
        externalLinkHandler,
        EditorView.domEventHandlers({
          blur: () => {
            if (onBlurRef.current) onBlurRef.current();
          }
        }),
        EditorState.transactionFilter.of(tr => {
            if (tr.docChanged) {
                if (tr.annotation(programmaticUpdate)) return tr;
                const newDocString = tr.newDoc.toString();
                if (singleLine && newDocString.includes('\n')) return [];
                if (transactionFilterRef.current && !transactionFilterRef.current(tr)) return [];
            }
            return tr;
        }),
        singleLine ? [] : EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          "&": { height, minHeight, fontSize: "inherit", backgroundColor: "transparent" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
              padding: "0px",
              fontFamily: "inherit",
              lineHeight: "inherit",
              whiteSpace: singleLine ? "nowrap" : "pre-wrap"
          },
          ".cm-line": { padding: "0" },
          ".cm-scroller": {
              fontFamily: "inherit",
              lineHeight: "inherit",
              overflowX: singleLine ? "auto" : "hidden",
              overflowY: height === 'auto' ? 'hidden' : 'auto',
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" }
          },
          ".cm-gutters": { display: "none" },
          ".cm-placeholder": { color: "#aaa" },
          "&.cm-focused .cm-placeholder": { display: "none" }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !update.transactions.some(tr => tr.annotation(programmaticUpdate))) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        placeholder ? cmPlaceholder(placeholder) : [],
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
        view.destroy();
        viewRef.current = null;
    };
  }, [readOnly, placeholder, singleLine]);

  // Sync value from props
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const safeValue = typeof value === 'string' ? value : String(value ?? '');
    const currentValue = view.state.doc.toString();

    if (safeValue !== currentValue) {
      // Defer the dispatch to avoid conflicts with ongoing transactions
      const transaction = view.state.update({
        changes: { from: 0, to: view.state.doc.length, insert: safeValue },
        annotations: [programmaticUpdate.of(true)]
      });

      // Use requestAnimationFrame to ensure we are outside of the update listener cycle
      requestAnimationFrame(() => {
          if (viewRef.current && !viewRef.current.contentDOM.isConnected) return;
          try {
            view.dispatch(transaction);
          } catch (e) {
            // If the dispatch still fails with decompose, it's a core CodeMirror issue
            // potentially related to document state corruption.
            // In that case, we fall back to a full view recreation if necessary,
            // but let's try this deferral first.
          }
      });
    }
  }, [value]);

  const handleContainerClick = () => {
    if (viewRef.current && !viewRef.current.hasFocus) {
        viewRef.current.focus();
    }
  };

  return (
    <div
        ref={editorRef}
        className={`w-full h-full cursor-text ${className}`}
        onClick={handleContainerClick}
    />
  );
};

export default MarkdownInlineEditor;

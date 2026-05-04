import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

interface MarkdownInlineEditorProps {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  singleLine?: boolean;
}

const MarkdownInlineEditor = ({ 
  value, 
  onChange,
  onFocus,
  onBlur,
  readOnly = false, 
  className = '', 
  placeholder = '', 
  height = 'auto', 
  minHeight = '24px',
  singleLine = false,
}: MarkdownInlineEditorProps) => {

  // 组件样式自定义
  const customTheme = EditorView.theme({
    "&": { 
      height, 
      minHeight, 
      fontSize: "14px", 
      backgroundColor: "transparent" 
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { 
        padding: "0px", 
        fontFamily: "inherit",
        whiteSpace: singleLine ? "nowrap" : "pre-wrap"
    },
    ".cm-line": { padding: "0" },
    ".cm-scroller": { 
        fontFamily: "inherit", 
        overflowX: singleLine ? "auto" : "hidden",
        overflowY: height === 'auto' ? 'hidden' : 'auto',
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" }
    },
    ".cm-gutters": { display: "none" },
    ".cm-placeholder": { color: "#aaa" }
  });

  return (
    <div className={`w-full h-full cursor-text ${className}`}>
      <CodeMirror
        value={value || ''}
        height={height}
        minHeight={minHeight}
        readOnly={readOnly}
        placeholder={placeholder}
        onCreateEditor={(view) => {
          // 如果需要单行模式，可以在此进行更底层的拦截
          // 这里我们主要依赖 CSS 和 basicSetup
        }}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          syntaxHighlighting: true,
          bracketMatching: true,
          autocompletion: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
        }}
        extensions={[
          markdown({ base: markdownLanguage }),
          customTheme,
          singleLine ? EditorView.lineWrapping.of(false) : EditorView.lineWrapping
        ]}
        onChange={(val) => onChange(val)}
        onFocus={onFocus}
        onBlur={onBlur}
        theme="none" // 使用我们自定义的 customTheme 扩展
      />
    </div>
  );
};

export default MarkdownInlineEditor;

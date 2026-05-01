import React from 'react';
import MarkdownInlineEditor from './MarkdownInlineEditor';

const AutoResizeTextarea = ({ value, originalValue, onChange, className = '', placeholder = '', readOnly = false, height = 'auto', minHeight = '32px' }: { value: string; originalValue?: string; onChange: (v: string) => void; className?: string; placeholder?: string; readOnly?: boolean; height?: string; minHeight?: string }) => {
  const isChanged = originalValue !== undefined && value !== originalValue;

  return (
    <div className={`relative w-full ${isChanged ? 'bg-amber-100/40' : ''} transition-colors rounded min-h-[32px]`}>
      <MarkdownInlineEditor
        value={value}
        originalValue={originalValue}
        onChange={onChange}
        readOnly={readOnly}
        className={className}
        placeholder={placeholder}
        height={height}
        minHeight={minHeight}
      />
      {isChanged && (
        <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm z-10" />
      )}
    </div>
  );
};

export default AutoResizeTextarea;

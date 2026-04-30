import React from 'react';

const AutoResizeTextarea = ({ value, originalValue, onChange, className = '', placeholder = '', readOnly = false }: { value: string; originalValue?: string; onChange: (v: string) => void; className?: string; placeholder?: string; readOnly?: boolean }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isChanged = originalValue !== undefined && value !== originalValue;

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className={`relative w-full ${isChanged ? 'bg-amber-100/40' : ''} transition-colors rounded`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 text-sm outline-none focus:border-stone-400 overflow-hidden resize-none ${className} ${readOnly ? 'cursor-default border-transparent bg-transparent' : ''} ${isChanged ? '!bg-transparent border-amber-300 ring-1 ring-amber-300/30' : ''}`}
        placeholder={placeholder}
        rows={1}
      />
      {isChanged && (
        <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
};

export default AutoResizeTextarea;

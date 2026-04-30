import React from 'react';

const InlineInput = ({ label, value, originalValue, onChange, placeholder = '', className = '', readOnly = false }: { label: string; value: string; originalValue?: string; onChange: (v: string) => void; placeholder?: string; className?: string; readOnly?: boolean }) => {
  const isChanged = originalValue !== undefined && value !== originalValue;
  return (
    <div className={`flex flex-col gap-0.5 focus-within:ring-1 focus-within:ring-primary rounded p-1 transition-all ${isChanged ? 'bg-amber-100/70 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-white/50 border-transparent hover:border-stone-200'} border ${className}`}>
      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
        {label}
        {isChanged && <span className="text-amber-600 font-black animate-pulse">●</span>}
      </label>
      <input
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`bg-transparent border-b border-stone-300 focus:border-stone-800 transition-colors outline-none pb-0.5 w-full text-sm font-medium text-ink ${readOnly ? 'cursor-default' : ''}`}
      />
    </div>
  );
};

export default InlineInput;

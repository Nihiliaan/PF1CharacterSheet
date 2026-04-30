import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const Section = ({ id, title, children, className = '' }: { id?: string; title: string; children: React.ReactNode; className?: string }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className={`scroll-mt-12 mb-8 ${className}`}>
      <div 
        className="flex items-center mb-4 cursor-pointer select-none group" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-stone-400 group-hover:text-primary transition-colors mr-2 flex-shrink-0">
          {isOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
        </div>
        <h2 className="text-xl font-serif font-bold text-ink flex-shrink-0 pr-4 group-hover:text-primary transition-colors">{title}</h2>
        <div className="h-px bg-stone-300 flex-1"></div>
      </div>
      {isOpen && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200">
          {children}
        </div>
      )}
    </section>
  );
};

export default Section;

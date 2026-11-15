import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const Section = ({ id, title, children, className = '' }: { id?: string; title: string; children: React.ReactNode; className?: string }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => {
    setIsOpen(!isOpen);
    // 折叠/展开改变区块高度与外层 min-content 需求，通知 EditorPanes 重算整体缩放
    window.dispatchEvent(new Event('pf1:min-change'));
  };

  return (
    <section id={id} className={`scroll-mt-12 mb-5 ${className}`}>
      <div
        className="flex items-center mb-2.5 cursor-pointer select-none group"
        onClick={toggle}
      >
        <div className="text-stone-400 group-hover:text-primary transition-colors mr-2 flex-shrink-0">
          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        <h2 className="text-lg font-serif font-bold text-ink flex-shrink-0 pr-4 group-hover:text-primary transition-colors">{title}</h2>
        <div className="h-px bg-stone-300 flex-1"></div>
      </div>
      {isOpen && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-200">
          {children}
        </div>
      )}
    </section>
  );
};

export default Section;

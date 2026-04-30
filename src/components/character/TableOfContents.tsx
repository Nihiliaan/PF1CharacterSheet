import React from 'react';

const SECTIONS = [
  { id: 'basic-info', label: '基本信息' },
  { id: 'story', label: '背景故事' },
  { id: 'attributes', label: '属性与战技' },
  { id: 'attacks', label: '攻击' },
  { id: 'defenses', label: '防御' },
  { id: 'racial-traits', label: '种族特性' },
  { id: 'traits', label: '背景特性' },
  { id: 'class-features', label: '职业特性' },
  { id: 'feats', label: '专长' },
  { id: 'spells', label: '法术与类法术能力' },
  { id: 'skills', label: '技能加点' },
  { id: 'equipment', label: '装备与物品' },
  { id: 'additional-data', label: '附加数据' }
];

export default function TableOfContents() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 py-8 hidden md:block group w-[2.5rem] hover:w-[12rem] transition-all duration-300 overflow-hidden">
      <div className="relative flex flex-col justify-between h-[70vh] min-h-[400px] pl-3">
        {/* The vertical line */}
        <div className="absolute left-[18px] top-1.5 bottom-1.5 w-0.5 bg-stone-300 drop-shadow-sm transition-colors pointer-events-none rounded-full" />
        
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => scrollTo(sec.id)}
            className="flex items-center gap-3 relative group/item"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-stone-300 border-[3px] border-paper group-hover/item:border-white group-hover/item:bg-primary group-hover/item:scale-125 transition-all shadow-sm z-10 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-all font-sans whitespace-nowrap text-sm font-bold text-stone-500 drop-shadow-sm group-hover/item:text-primary -translate-x-2 group-hover:translate-x-0 duration-200 px-2 py-0.5 rounded cursor-pointer pointer-events-none group-hover:pointer-events-auto">
              {sec.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

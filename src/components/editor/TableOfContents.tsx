import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 编辑器目录滑条（TOC）。
 * 固定在屏幕右侧垂直居中（避免遮挡左侧资源管理器侧栏），
 * 悬停整条展开显示各区块标签，点击平滑滚动到对应区块。
 */
export default function TableOfContents() {
  const { t } = useTranslation();

  const sections = [
    { id: 'basic-info', label: t('editor.sections.basic') },
    { id: 'story', label: t('editor.sections.story') },
    { id: 'attributes', label: t('editor.sections.attributes') },
    { id: 'attacks', label: t('editor.sections.attacks') },
    { id: 'defenses', label: t('editor.sections.defenses') },
    { id: 'racial-traits', label: t('editor.sections.racial_traits') },
    { id: 'traits', label: t('editor.sections.traits') },
    { id: 'class-features', label: t('editor.sections.class_features') },
    { id: 'feats', label: t('editor.sections.feats') },
    { id: 'spells', label: t('editor.sections.spells') },
    { id: 'skills', label: t('editor.sections.skills') },
    { id: 'equipment', label: t('editor.sections.equipment') },
    { id: 'additional-data', label: t('editor.sections.additional') },
    { id: 'pfs', label: t('editor.sections.pfs') }
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 py-8 hidden md:block group w-[2.5rem] hover:w-[12rem] transition-all duration-300 overflow-hidden">
      <div className="relative flex flex-col justify-between h-[70vh] min-h-[400px] pr-3">
        {/* The vertical line */}
        <div className="absolute right-[18px] top-1.5 bottom-1.5 w-0.5 bg-stone-300 drop-shadow-sm transition-colors pointer-events-none rounded-full" />

        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => scrollTo(sec.id)}
            className="flex flex-row-reverse items-center gap-3 relative group/item"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-stone-300 border-[3px] border-paper group-hover/item:border-white group-hover/item:bg-primary group-hover/item:scale-125 transition-all shadow-sm z-10 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-all font-sans whitespace-nowrap text-sm font-bold text-stone-500 drop-shadow-sm group-hover/item:text-primary translate-x-2 group-hover:translate-x-0 duration-200 px-2 py-0.5 rounded cursor-pointer pointer-events-none group-hover:pointer-events-auto">
              {sec.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

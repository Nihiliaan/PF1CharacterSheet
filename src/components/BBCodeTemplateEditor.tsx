import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../contexts/CharacterContext';
import { BBCODE_SYNTAX_GUIDE, BBCODE_DATA_TREE, BBCodeTreeItem } from '../constants/bbcodeHelp';
import { DEFAULT_BBCODE_TEMPLATE } from '../constants';

const TreeItem = ({ item, level = 0, defaultOpen = false }: { item: BBCodeTreeItem; level?: number; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || level < 1); // 默认展开第一层
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-2 py-1 hover:bg-stone-100 rounded px-2 transition-colors group cursor-pointer"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="w-4 flex items-center justify-center text-stone-400">
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <div className="w-1 h-1 bg-stone-300 rounded-full" />
          )}
        </div>
        <code className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
          {item.key}
        </code>
        {item.isSoA && (
          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase tracking-tighter">SoA</span>
        )}
        <span className="text-[11px] text-stone-500 truncate">{item.desc}</span>
      </div>

      {hasChildren && (
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {item.children?.map((child) => (
            <TreeItem key={child.key} item={child} level={level + 1} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default function BBCodeTemplateEditor() {
  const { t } = useTranslation();
  const { bbcodeTemplate, setBbcodeTemplate, setToast } = useCharacter();

  useEffect(() => {
    (window as any).__resetBBCodeTemplate = () => {
      setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
      localStorage.removeItem('bbcode_template');
      setToast({ message: t('editor.bbcode.reset_success'), type: 'success' });
    };
    return () => {
      delete (window as any).__resetBBCodeTemplate;
    };
  }, [setBbcodeTemplate, setToast, t]);

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-24 pb-20">

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
          <div className="p-2 bg-stone-100 border-b border-stone-200">
            <p className="text-xs text-stone-500 italic pl-2">{t('editor.bbcode.content_label')}</p>
          </div>
          <textarea
            value={bbcodeTemplate}
            onChange={(e) => setBbcodeTemplate(e.target.value)}
            className="flex-1 w-full p-4 outline-none resize-none font-mono text-sm leading-relaxed text-stone-700"
            spellCheck={false}
          />
        </div>

        <div className="mt-8 bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-800 mb-6 text-base border-b pb-2">{t('editor.bbcode.var_ref')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Syntax Guide */}
            <div>
              <h4 className="text-xs font-bold text-amber-700 mb-4 uppercase tracking-widest border-l-2 border-amber-600 pl-2">
                {t('editor.bbcode.syntax_title')}
              </h4>
              <div className="space-y-4">
                {BBCODE_SYNTAX_GUIDE.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <code className="text-xs font-bold text-amber-800 bg-amber-50 self-start px-1 rounded">{item.code}</code>
                    <p className="text-[11px] text-stone-600 leading-tight">{item.desc}</p>
                    {item.example && (
                      <code className="text-[10px] text-stone-400 italic mt-0.5">{item.example}</code>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Tree */}
            <div>
              <h4 className="text-xs font-bold text-indigo-700 mb-4 uppercase tracking-widest border-l-2 border-indigo-600 pl-2">
                数据结构参考
              </h4>
              <div className="bg-stone-50 rounded-lg border border-stone-100 p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                {BBCODE_DATA_TREE.map((item) => (
                  <TreeItem key={item.key} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * BBCode 模板编辑器（纯编辑区）。
 * 无工具条：文件操作（保存/另存为/导入默认/分享/复制）在文档标签的右键菜单；
 * 实时预览已解绑为独立的预览标签页；变量参考弹窗由模板标签右键菜单触发。
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../contexts/CharacterContext';
import { useUI } from '../contexts/UIContext';
import { BBCODE_SYNTAX_GUIDE, BBCODE_DATA_TREE, BBCodeTreeItem } from '../constants/bbcodeHelp';

const TreeItem = ({ item, level = 0, defaultOpen = false }: { item: BBCodeTreeItem; level?: number; defaultOpen?: boolean; key?: any }) => {
  const { t } = useTranslation();
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
        <span className="text-[11px] text-stone-500 truncate">{t(item.descKey)}</span>
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
  const { bbcodeTemplate, setBbcodeTemplate, isReadOnly } = useCharacter();
  const { bbcodeHelpOpen, setBbcodeHelpOpen } = useUI();

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 字符数信息条 */}
      <div className="shrink-0 p-2 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center px-4">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('editor.bbcode.content_label')}</span>
        <span className="text-[10px] font-mono text-stone-400">{bbcodeTemplate.length} {t('editor.bbcode.chars')}</span>
      </div>
      <textarea
        value={bbcodeTemplate}
        onChange={(e) => setBbcodeTemplate(e.target.value)}
        readOnly={isReadOnly}
        className={`flex-1 w-full p-6 outline-none resize-none font-mono text-sm leading-relaxed text-stone-700 custom-scrollbar ${isReadOnly ? 'bg-stone-50/50' : ''}`}
        spellCheck={false}
        placeholder={t('editor.bbcode.editor_placeholder')}
      />

      {/* 变量参考 / 语法帮助弹窗（触发点：模板标签右键菜单） */}
      <AnimatePresence>
        {bbcodeHelpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setBbcodeHelpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                  <h3 className="text-lg font-bold text-stone-800">{t('editor.bbcode.var_ref')}</h3>
                  <p className="text-xs text-stone-500 mt-1">{t('editor.bbcode.help_subtitle')}</p>
                </div>
                <button
                  onClick={() => setBbcodeHelpOpen(false)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Syntax Guide */}
                  <div>
                    <h4 className="text-xs font-bold text-amber-700 mb-6 uppercase tracking-widest border-l-4 border-amber-500 pl-3">
                      {t('editor.bbcode.syntax_title')}
                    </h4>
                    <div className="space-y-6">
                      {BBCODE_SYNTAX_GUIDE.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-amber-100 bg-amber-50/30">
                          <code className="text-xs font-bold text-amber-800 bg-amber-100 self-start px-2 py-1 rounded border border-amber-200">{item.code}</code>
                          <p className="text-[12px] text-stone-600 leading-relaxed font-medium">{t(item.descKey)}</p>
                          {item.example && (
                            <div className="mt-1">
                              <span className="text-[10px] text-stone-400 uppercase font-bold">{t('editor.bbcode.example')}</span>
                              <code className="block text-[11px] text-stone-500 italic bg-white/50 p-1.5 rounded border border-stone-100 mt-1 font-mono break-all">{item.example}</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Data Tree */}
                  <div>
                    <h4 className="text-xs font-bold text-indigo-700 mb-6 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
                      {t('editor.bbcode.var_ref')}
                    </h4>
                    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 min-h-[400px]">
                      {BBCODE_DATA_TREE.map((item) => (
                        <TreeItem key={item.key} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50/50 text-center">
                <button
                  onClick={() => setBbcodeHelpOpen(false)}
                  className="px-8 py-2 bg-stone-800 text-white rounded-lg font-bold text-sm hover:bg-stone-700 transition-all"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

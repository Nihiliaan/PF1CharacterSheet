import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, HelpCircle, Copy, Eye, Code, X, GripVertical, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../contexts/CharacterContext';
import { useUI } from '../contexts/UIContext';
import { BBCODE_SYNTAX_GUIDE, BBCODE_DATA_TREE, BBCodeTreeItem } from '../constants/bbcodeHelp';
import { generateBBCode } from '../utils/bbcodeExporter';
import BBCodePreview from './common/BBCodePreview';

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
  const { data: characterData, computed, bbcodeTemplate, setBbcodeTemplate, isReadOnly } = useCharacter();
  const { setToast } = useUI();
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  
  // Resizable split-pane state
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const onResize = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    
    // Constraints
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [onResize, stopResizing]);

  // 计算即时预览内容
  const previewContent = useMemo(() => {
    if (!characterData || !bbcodeTemplate) return '';
    return generateBBCode(characterData, bbcodeTemplate, t, { computed, data: characterData });
  }, [characterData, computed, bbcodeTemplate, t]);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
    setToast({ message: t('editor.bbcode.copy_success'), type: 'success' });
  };

  const handleDevSync = async () => {
    try {
      const response = await fetch('/api/dev/sync-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'template', content: bbcodeTemplate })
      });
      if (response.ok) {
        setToast({ message: "开发者同步：默认模板已更新至源码", type: 'success' });
      } else {
        throw new Error("同步失败");
      }
    } catch (e) {
      setToast({ message: "开发者同步失败：请确保项目在开发模式下运行", type: 'error' });
    }
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
      {/* Header Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-stone-200 z-10 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
            <Code size={16} className="text-primary" />
            {t('editor.bbcode.title')}
          </h2>
          
          <div className="h-6 w-px bg-stone-200 mx-2 hidden sm:block" />
          
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button 
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'edit' ? 'bg-white shadow-sm text-primary' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Code size={14} />
              <span className="hidden sm:inline">{t('editor.bbcode.view_edit')}</span>
            </button>
            <button 
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'split' ? 'bg-white shadow-sm text-primary' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <div className="flex gap-0.5">
                <div className="w-1.5 h-3 bg-current opacity-50 rounded-sm" />
                <div className="w-1.5 h-3 bg-current opacity-50 rounded-sm" />
              </div>
              <span className="hidden sm:inline">{t('editor.bbcode.view_split')}</span>
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Eye size={14} />
              <span className="hidden sm:inline">{t('editor.bbcode.view_preview')}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-primary hover:bg-stone-100 rounded-lg transition-all"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">{t('common.help')}</span>
          </button>
          
          {isLocalhost && (
            <button 
              onClick={handleDevSync}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-all"
              title="将当前模板保存为项目默认模板"
            >
              <Save size={16} />
              <span className="hidden sm:inline">同步至源码</span>
            </button>
          )}

          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-primary text-white hover:brightness-110 rounded-lg shadow-sm transition-all"
          >
            <Copy size={16} />
            <span>{t('editor.bbcode.copy_bbcode')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="flex-1 mt-14 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div 
            style={{ width: viewMode === 'split' ? `${leftWidth}%` : '100%' }}
            className={`flex flex-col bg-white border-r border-stone-200 transition-[width] duration-75 ease-out`}
          >
            <div className="p-2 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center px-4">
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
          </div>
        )}

        {/* Draggable Divider */}
        {viewMode === 'split' && (
          <div 
            onMouseDown={startResizing}
            className="w-1.5 bg-stone-200 hover:bg-primary/50 transition-colors cursor-col-resize flex items-center justify-center group z-10"
          >
            <div className="w-0.5 h-8 bg-stone-400 group-hover:bg-white rounded-full transition-colors" />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div 
            style={{ width: viewMode === 'split' ? `${100 - leftWidth}%` : '100%' }}
            className={`flex flex-col bg-stone-50 transition-[width] duration-75 ease-out`}
          >
            <div className="p-2 bg-stone-50/50 border-b border-stone-200 flex justify-between items-center px-4">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('editor.bbcode.live_preview')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 min-h-full">
                <BBCodePreview bbcode={previewContent} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowHelp(false)}
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
                  onClick={() => setShowHelp(false)}
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
                  onClick={() => setShowHelp(false)}
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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  HelpCircle, 
  Copy, 
  Eye, 
  Code, 
  X, 
  Save, 
  RotateCcw, 
  Plus, 
  Download, 
  Sparkles,
  Check,
  ZoomIn,
  ZoomOut,
  Layers,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../contexts/CharacterContext';
import { useUI } from '../contexts/UIContext';
import { BBCODE_DATA_TREE, BBCodeTreeItem } from '../constants/bbcodeHelp';
import { SVG_HELPERS_GUIDE } from '../constants/svgTemplateHelp';
import { getAllTemplates, getTemplateById, saveCustomTemplate, deleteCustomTemplate } from '../templates/templateRegistry';
import { renderTemplate } from '../templates/templateEngine';
import { TemplateDefinition } from '../templates/types';
import { getRenderUrl } from '../services/cardUploadService';

const TreeItem = ({ item, level = 0, defaultOpen = false, onInsert }: { item: BBCodeTreeItem; level?: number; defaultOpen?: boolean; onInsert?: (key: string) => void; key?: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen || level < 1);
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInsert?.(item.key);
          }}
          title="点击将变量插入编辑器"
          className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors font-mono"
        >
          {item.key}
        </button>
        {item.isSoA && (
          <span className="text-[9px] bg-stone-200 text-stone-700 px-1 rounded font-bold uppercase tracking-tighter">SoA</span>
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
            <TreeItem key={child.key} item={child} level={level + 1} onInsert={onInsert} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default function SvgTemplateEditor() {
  const { t } = useTranslation();
  const { data: characterData, computed, isReadOnly } = useCharacter();
  const { setToast } = useUI();

  // 模板列表与选中状态
  const [templates, setTemplates] = useState<TemplateDefinition[]>(() => 
    getAllTemplates().filter(tpl => tpl.type === 'svg')
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('svg-badge');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [originalSource, setOriginalSource] = useState<string>('');

  // 视图与布局状态
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [zoom, setZoom] = useState<number>(1);
  const [bgMode, setBgMode] = useState<'checkerboard' | 'dark' | 'light'>('checkerboard');
  const [showHelp, setShowHelp] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');

  // 分栏拖拽
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshTemplates = useCallback(() => {
    const list = getAllTemplates().filter(tpl => tpl.type === 'svg');
    setTemplates(list);
    return list;
  }, []);

  // 切换模板加载源码
  useEffect(() => {
    const target = getTemplateById(selectedTemplateId) || templates[0];
    if (target) {
      setSourceCode(target.source);
      setOriginalSource(target.source);
    }
  }, [selectedTemplateId]);

  const currentTemplate = useMemo(() => {
    return getTemplateById(selectedTemplateId) || templates[0];
  }, [selectedTemplateId, templates]);

  const isDirty = sourceCode !== originalSource;

  // 分栏调整事件
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

  // 实时编译预览
  const { renderedSvg, compileError } = useMemo(() => {
    if (!characterData || !sourceCode) return { renderedSvg: '', compileError: null };
    try {
      const virtualTpl: TemplateDefinition = {
        ...currentTemplate,
        source: sourceCode
      };
      const res = renderTemplate(characterData, virtualTpl, {
        t,
        characterContext: { computed }
      });
      return { renderedSvg: res.content, compileError: null };
    } catch (e: any) {
      return { renderedSvg: '', compileError: e.message || String(e) };
    }
  }, [characterData, computed, sourceCode, currentTemplate, t]);

  // 插入变量至文本光标处
  const handleInsertVariable = (varKey: string) => {
    const el = textareaRef.current;
    const insertText = `{{${varKey}}}`;
    if (!el) {
      setSourceCode(prev => prev + insertText);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextCode = sourceCode.substring(0, start) + insertText + sourceCode.substring(end);
    setSourceCode(nextCode);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 0);
  };

  // 保存自定义模板
  const handleSave = () => {
    if (!currentTemplate) return;
    saveCustomTemplate({
      ...currentTemplate,
      source: sourceCode
    });
    setOriginalSource(sourceCode);
    refreshTemplates();
    setToast({ message: `已保存对模板 "${currentTemplate.name}" 的修改`, type: 'success' });
  };

  // 另存为新模板
  const handleSaveAs = () => {
    if (!newTemplateId.trim() || !newTemplateName.trim()) {
      setToast({ message: '模板 ID 与名称不能为空', type: 'error' });
      return;
    }
    const safeId = newTemplateId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newTpl: TemplateDefinition = {
      id: safeId.startsWith('svg-') ? safeId : `svg-${safeId}`,
      name: newTemplateName.trim(),
      type: 'svg',
      extension: 'svg',
      mimeType: 'image/svg+xml',
      description: '用户自定义 SVG 模板',
      source: sourceCode,
      isCustom: true
    };
    saveCustomTemplate(newTpl);
    const updated = refreshTemplates();
    setSelectedTemplateId(newTpl.id);
    setOriginalSource(sourceCode);
    setShowSaveAsModal(false);
    setNewTemplateName('');
    setNewTemplateId('');
    setToast({ message: `成功创建新模板: ${newTpl.name} (${newTpl.id})`, type: 'success' });
  };

  // 重置回原始
  const handleReset = () => {
    setSourceCode(originalSource);
  };

  // 本地开发同步至源码
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const handleDevSync = async () => {
    try {
      const response = await fetch('/api/dev/sync-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'svgt', id: currentTemplate.id, content: sourceCode })
      });
      if (response.ok) {
        setOriginalSource(sourceCode);
        setToast({ message: `开发者同步：模板 "${currentTemplate.id}" 已保存至本地 .svgt 源码`, type: 'success' });
      } else {
        throw new Error("同步失败");
      }
    } catch (e) {
      setToast({ message: "开发者同步失败：请确保项目在开发模式下运行", type: 'error' });
    }
  };

  // 下载本模板 .svgt
  const handleDownload = () => {
    const filename = `${currentTemplate.id}.svgt`;
    const blob = new Blob([sourceCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 复制外链代码
  const handleCopyForumCode = () => {
    const url = getRenderUrl(characterData.id || 'default', currentTemplate.id, 'svg', 'query');
    const bbcode = `[img]${url}[/img]`;
    navigator.clipboard.writeText(bbcode);
    setToast({ message: '已复制论坛嵌入代码: [img]' + url + '[/img]', type: 'success' });
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
      {/* Header Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-stone-200 z-10 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-600" />
            <h2 className="text-sm font-bold font-serif text-stone-800 hidden sm:inline">
              SVG 模板工坊 (.svgt)
            </h2>
          </div>

          <div className="h-5 w-px bg-stone-200 mx-1" />

          {/* Template Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 outline-none transition-colors cursor-pointer max-w-[200px] truncate"
            >
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setNewTemplateId(`svg-custom-${Date.now().toString().slice(-4)}`);
                setNewTemplateName('新自定图鉴卡');
                setShowSaveAsModal(true);
              }}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
              title="另存为新自定义模板"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="h-5 w-px bg-stone-200 mx-1 hidden md:block" />

          {/* View Modes */}
          <div className="hidden md:flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button 
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'edit' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Code size={13} />
              <span>编辑</span>
            </button>
            <button 
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'split' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Layers size={13} />
              <span>分栏</span>
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'preview' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Eye size={13} />
              <span>预览</span>
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-800 rounded-lg transition-colors"
              title="放弃修改并还原"
            >
              <RotateCcw size={14} />
              <span className="hidden lg:inline">还原</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-stone-200 transition-colors"
          >
            <HelpCircle size={15} className="text-amber-600" />
            <span className="hidden sm:inline">变量参考</span>
          </button>

          {isLocalhost && (
            <button
              onClick={handleDevSync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
              title="直接将当前模板代码保存覆盖至本地源码文件"
            >
              <Save size={14} />
              <span className="hidden sm:inline">同步源码</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="下载模板源码 (.svgt)"
          >
            <Download size={16} />
          </button>

          <button
            onClick={handleCopyForumCode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-stone-800 text-white hover:bg-stone-900 rounded-lg shadow-sm transition-all"
            title="复制嵌入苹果园论坛的 [img] 外部直链代码"
          >
            <Copy size={14} />
            <span>复制外链代码</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div ref={containerRef} className="flex-1 mt-14 flex overflow-hidden">
        {/* Left Pane: Code Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div 
            style={{ width: viewMode === 'split' ? `${leftWidth}%` : '100%' }}
            className="flex flex-col bg-white border-r border-stone-200 transition-[width] duration-75 ease-out"
          >
            <div className="p-2.5 bg-stone-50/80 border-b border-stone-100 flex justify-between items-center px-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  SVG 模板源码 (.svgt)
                </span>
                {isDirty && (
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                    已修改
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-stone-400">{sourceCode.length} 字符</span>
            </div>

            <textarea
              ref={textareaRef}
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              readOnly={isReadOnly}
              spellCheck={false}
              className="flex-1 w-full p-4 sm:p-6 outline-none resize-none font-mono text-xs leading-relaxed text-stone-800 custom-scrollbar bg-stone-50/20"
              placeholder="在此编写 SVG 结构与 Handlebars 插值语法..."
            />
          </div>
        )}

        {/* Resizable Divider */}
        {viewMode === 'split' && (
          <div 
            onMouseDown={startResizing}
            className="w-1.5 bg-stone-200 hover:bg-amber-500/50 transition-colors cursor-col-resize flex items-center justify-center group z-10"
          >
            <div className="w-0.5 h-8 bg-stone-400 group-hover:bg-white rounded-full transition-colors" />
          </div>
        )}

        {/* Right Pane: Live SVG Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div 
            style={{ width: viewMode === 'split' ? `${100 - leftWidth}%` : '100%' }}
            className="flex flex-col bg-stone-100/50 transition-[width] duration-75 ease-out"
          >
            {/* Preview Toolbar */}
            <div className="p-2.5 bg-stone-50 border-b border-stone-200 flex justify-between items-center px-4">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                <Eye size={12} />
                <span>实时矢量渲染 (LIVE PREVIEW)</span>
              </span>

              <div className="flex items-center gap-2">
                {/* Background mode switch */}
                <div className="flex bg-stone-200/70 p-0.5 rounded-md text-[10px] font-medium text-stone-600">
                  <button
                    onClick={() => setBgMode('checkerboard')}
                    className={`px-2 py-0.5 rounded ${bgMode === 'checkerboard' ? 'bg-white shadow-xs text-stone-800' : ''}`}
                    title="透明棋盘格背景"
                  >
                    棋盘
                  </button>
                  <button
                    onClick={() => setBgMode('light')}
                    className={`px-2 py-0.5 rounded ${bgMode === 'light' ? 'bg-white shadow-xs text-stone-800' : ''}`}
                    title="纯白底色"
                  >
                    白底
                  </button>
                  <button
                    onClick={() => setBgMode('dark')}
                    className={`px-2 py-0.5 rounded ${bgMode === 'dark' ? 'bg-white shadow-xs text-stone-800' : ''}`}
                    title="深黑底色"
                  >
                    黑底
                  </button>
                </div>

                <div className="h-4 w-px bg-stone-300" />

                {/* Zoom controls */}
                <div className="flex items-center gap-1 text-xs text-stone-600">
                  <button 
                    onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                    className="p-1 hover:bg-stone-200 rounded"
                    title="缩小"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="font-mono text-[11px] w-9 text-center">{Math.round(zoom * 100)}%</span>
                  <button 
                    onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
                    className="p-1 hover:bg-stone-200 rounded"
                    title="放大"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Viewport */}
            <div className="flex-1 overflow-auto p-6 sm:p-10 flex items-center justify-center relative custom-scrollbar">
              {compileError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs max-w-lg shadow-sm">
                  <div className="font-bold mb-1">模板编译报错：</div>
                  <pre className="font-mono whitespace-pre-wrap">{compileError}</pre>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.1s ease-out'
                  }}
                  className={`p-6 rounded-2xl shadow-lg border border-stone-200/80 ${
                    bgMode === 'checkerboard' 
                      ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-stone-50' 
                      : bgMode === 'dark' ? 'bg-stone-900 border-stone-800' : 'bg-white'
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save As Modal */}
      <AnimatePresence>
        {showSaveAsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-stone-200">
              <h3 className="text-base font-bold text-stone-800 mb-1">另存为新自定义模板</h3>
              <p className="text-xs text-stone-500 mb-4">创建一套具有独立 ID 的专属 SVG 卡片模板</p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">模板名称</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="例如：战役专属图鉴卡"
                    className="w-full text-xs px-3 py-2 border rounded-lg outline-none focus:border-stone-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">模板唯一标识符 (templateId)</label>
                  <input
                    type="text"
                    value={newTemplateId}
                    onChange={e => setNewTemplateId(e.target.value)}
                    placeholder="svg-my-template"
                    className="w-full text-xs font-mono px-3 py-2 border rounded-lg outline-none focus:border-stone-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveAsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveAs}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  确认保存
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Variable & Helper Help Modal */}
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
                  <h3 className="text-lg font-bold text-stone-800">SVG 模板语法与变量字典</h3>
                  <p className="text-xs text-stone-500 mt-1">点击任意变量代码即可快速插入当前编辑器光标位置</p>
                </div>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SVG Special Helpers Guide */}
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 mb-4 uppercase tracking-widest border-l-4 border-amber-500 pl-3">
                      SVG 常用运算与格式化函数
                    </h4>
                    <div className="space-y-4">
                      {SVG_HELPERS_GUIDE.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl border border-amber-100 bg-amber-50/40">
                          <code className="text-xs font-bold text-amber-900 bg-amber-100/80 self-start px-2 py-0.5 rounded font-mono">
                            {item.code}
                          </code>
                          <p className="text-[12px] text-stone-700 leading-relaxed font-medium">
                            {item.desc}
                          </p>
                          <div className="text-[10px] text-stone-400 font-mono bg-white p-1.5 rounded border border-amber-100/80">
                            示例：{item.example}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Character Data Tree */}
                  <div>
                    <h4 className="text-xs font-bold text-indigo-800 mb-4 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
                      人物卡可用数据树 (点击插入)
                    </h4>
                    <div className="bg-stone-50 rounded-xl border border-stone-200 p-3 min-h-[400px] max-h-[520px] overflow-y-auto custom-scrollbar">
                      {BBCODE_DATA_TREE.map((item) => (
                        <TreeItem key={item.key} item={item} onInsert={handleInsertVariable} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50/50 text-center">
                <button 
                  onClick={() => setShowHelp(false)}
                  className="px-8 py-2 bg-stone-800 text-white rounded-lg font-bold text-xs hover:bg-stone-700 transition-all"
                >
                  关闭参考
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

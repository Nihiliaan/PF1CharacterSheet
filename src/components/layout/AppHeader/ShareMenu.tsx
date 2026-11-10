/**
 * AppHeader 子组件：编辑器视图下的"分享"下拉菜单。
 * 包含论坛卡片导出 / 复制 BBCode / 果园同步 / 在线分享 / .pf1 导出等操作项。
 * 纯展示组件：开关状态、悬停回调与各操作回调均由容器 AppHeader.tsx 通过 props 传入。
 */
import { motion, AnimatePresence } from 'motion/react';
import { Share2, ChevronDown, Sparkles, Copy, Globe, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type React from 'react';

interface ShareMenuProps {
  /** 挂在外层 relative 容器上的 ref，用于容器内点击外部关闭逻辑 */
  menuRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** 执行操作后关闭菜单 */
  onClose: () => void;
  isReadOnly: boolean;
  onShowCardExport: () => void;
  onExportBBCode: () => void;
  onShowForumSync: () => void;
  onShare: () => void;
  onExport: () => void;
}

export default function ShareMenu({
  menuRef,
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  onClose,
  isReadOnly,
  onShowCardExport,
  onExportBBCode,
  onShowForumSync,
  onShare,
  onExport
}: ShareMenuProps) {
  const { t } = useTranslation();
  return (
    <div
      className="relative"
      ref={menuRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isOpen ? 'bg-stone-600 text-white shadow-inner' : 'bg-stone-700 hover:bg-stone-600 text-stone-100'
        }`}
        title="分享与导出"
      >
        <Share2 size={16} />
        <span>分享</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute left-0 mt-2 w-52 bg-white border border-stone-200 rounded-xl shadow-xl z-[70] py-1 text-stone-800"
          >
            <button
              onClick={() => {
                onShowCardExport();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-amber-50 text-amber-900 text-left transition-colors cursor-pointer"
            >
              <Sparkles size={15} className="text-amber-600" />
              <span>论坛卡片与外链 (.svgt/.bbc)</span>
            </button>

            <button
              onClick={() => {
                onExportBBCode();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors cursor-pointer"
            >
              <Copy size={15} className="text-stone-500" />
              <span>复制 BBCode</span>
            </button>

            <button
              onClick={() => {
                onShowForumSync();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-amber-800 text-left transition-colors cursor-pointer"
            >
              <Globe size={15} className="text-amber-700" />
              <span>{t('editor.forum_sync.btn_header', '果园同步')}</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={() => {
                  onShare();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors cursor-pointer"
              >
                <Share2 size={15} className="text-stone-500" />
                <span>{t('common.share')} (在线链接)</span>
              </button>
            )}

            <div className="h-px bg-stone-100 my-1" />

            <button
              onClick={() => {
                onExport();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors cursor-pointer"
            >
              <Download size={15} className="text-stone-500" />
              <span>{t('common.export')} (.pf1)</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

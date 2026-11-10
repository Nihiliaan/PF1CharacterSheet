/**
 * AppHeader 子组件：编辑器视图下的"文件"下拉菜单。
 * 包含新建 / 保存 / 另存为 / 放弃修改等操作项。
 * 纯展示组件：开关状态、悬停回调与各操作回调均由容器 AppHeader.tsx 通过 props 传入。
 */
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronDown, FilePlus, Save, Copy, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type React from 'react';

interface FileMenuProps {
  /** 挂在外层 relative 容器上的 ref，用于容器内点击外部关闭逻辑 */
  menuRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** 执行操作后关闭菜单 */
  onClose: () => void;
  isReadOnly: boolean;
  isSaving: boolean;
  isDirty: boolean;
  /** 设置项：是否启用本地自动缓存（决定"放弃修改"项是否显示） */
  enableLocalAutoCache: boolean;
  onNew: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRevert: () => void;
}

export default function FileMenu({
  menuRef,
  isOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  onClose,
  isReadOnly,
  isSaving,
  isDirty,
  enableLocalAutoCache,
  onNew,
  onSave,
  onSaveAs,
  onRevert
}: FileMenuProps) {
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
        title="文件操作"
      >
        <FileText size={16} />
        <span>文件</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute left-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-xl z-[70] py-1 text-stone-800"
          >
            <button
              onClick={() => {
                onNew();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors cursor-pointer"
            >
              <FilePlus size={15} className="text-stone-500" />
              <span>{t('common.new')}</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={() => {
                  onSave();
                  onClose();
                }}
                disabled={isSaving}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Save size={15} className="text-emerald-600" />
                  <span>{isSaving ? t('common.saving') : t('common.save')}</span>
                </div>
                {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
              </button>
            )}

            <button
              onClick={() => {
                onSaveAs();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-stone-100 text-stone-700 text-left transition-colors cursor-pointer"
            >
              <Copy size={15} className="text-stone-500" />
              <span>{t('common.save_as')}</span>
            </button>

            {enableLocalAutoCache && isDirty && (
              <>
                <div className="h-px bg-stone-100 my-1" />
                <button
                  onClick={() => {
                    onRevert();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-rose-50 text-rose-600 text-left transition-colors cursor-pointer"
                >
                  <RotateCcw size={15} className="text-rose-600" />
                  <span>放弃修改并重新载入</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

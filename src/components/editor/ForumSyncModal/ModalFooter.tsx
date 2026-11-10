/**
 * 弹窗底部操作栏：油猴助手脚本安装入口、关闭按钮与一键定点同步按钮
 */
import React from 'react';
import { DownloadCloud, RefreshCw } from 'lucide-react';
import { ForumBindingItem } from '../../../schema/types';

interface ModalFooterProps {
  t: any;
  isSyncing: boolean;
  localBindings: ForumBindingItem[];
  onClose: () => void;
  onTriggerSync: () => void;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ t, isSyncing, localBindings, onClose, onTriggerSync }) => {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-stone-200">
      <a
        href="/scripts/pf1-cross-site-sync-helper.user.js"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-stone-500 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
      >
        <DownloadCloud size={12} />
        <span>安装/更新油猴助手脚本 (v1.4.0)</span>
      </a>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
        >
          {t('common.cancel', '关闭')}
        </button>
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing || localBindings.filter(b => b.msgId > 0).length === 0}
          className="px-4 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
          <span>
            {isSyncing ? '正在批量定点同步...' : t('editor.forum_sync.sync_now_btn', '一键定点同步')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ModalFooter;

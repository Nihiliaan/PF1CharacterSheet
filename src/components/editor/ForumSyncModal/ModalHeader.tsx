/**
 * 论坛同步弹窗头部：标题图标、双锚点说明文字与关闭按钮
 */
import React from 'react';
import { Globe, X } from 'lucide-react';

interface ModalHeaderProps {
  t: any;
  characterId: string;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ t, characterId, onClose }) => {
  return (
    <div className="flex items-center justify-between pb-2.5 border-b border-stone-200">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
          <Globe size={16} />
        </div>
        <div>
          <h3 className="font-bold text-stone-900 text-sm">
            {t('editor.forum_sync.modal_title', '纯美苹果园帖子自动化定点同步')}
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.2">
            基于天然 ID <code className="bg-stone-100 px-1 py-0.2 rounded text-amber-900 font-mono">[anchor={characterId}-start]</code> 与 <code className="bg-stone-100 px-1 py-0.2 rounded text-amber-900 font-mono">[anchor={characterId}-end]</code> 定点更新
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
      >
        <X size={17} />
      </button>
    </div>
  );
};

export default ModalHeader;

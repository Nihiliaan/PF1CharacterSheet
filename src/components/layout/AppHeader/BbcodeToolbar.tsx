/**
 * AppHeader 子组件：BBCode 模板编辑器视图下的动作条。
 * 包含新建 / 保存 / 另存为 / 分享 / 导入默认模板等按钮。
 * 纯展示组件：回调由容器 AppHeader.tsx 通过 props 传入。
 */
import { FilePlus, Save, Copy, Share2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BbcodeToolbarProps {
  isReadOnly: boolean;
  onNewTemplate: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onShare: () => void;
  onImportDefault: () => void;
}

export default function BbcodeToolbar({
  isReadOnly,
  onNewTemplate,
  onSave,
  onSaveAs,
  onShare,
  onImportDefault
}: BbcodeToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onNewTemplate}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
      >
        <FilePlus size={16} />
        <span className="hidden sm:inline">{t('common.new')}</span>
      </button>

      {!isReadOnly && (
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
        >
          <Save size={16} />
          <span className="hidden sm:inline">{t('common.save')}</span>
        </button>
      )}

      <button
        onClick={onSaveAs}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
      >
        <Copy size={16} />
        <span className="hidden sm:inline">{t('editor.bbcode.save_as')}</span>
      </button>

      {!isReadOnly && (
        <>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">{t('common.share')}</span>
          </button>

          <button
            onClick={onImportDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">{t('common.import_default')}</span>
          </button>
        </>
      )}
    </div>
  );
}

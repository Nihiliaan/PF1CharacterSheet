/**
 * AppHeader 子组件：GM 视图下的动作条。
 * 包含"返回编辑"与"导出"两个按钮。
 * 纯展示组件：回调由容器 AppHeader.tsx 通过 props 传入。
 */
import { ArrowLeft, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GmViewToolbarProps {
  /** 返回编辑器视图 */
  onBackToEditor: () => void;
  onExport: () => void;
}

export default function GmViewToolbar({ onBackToEditor, onExport }: GmViewToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBackToEditor}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
        title={t('common.switch_to_editor', '返回编辑')}
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">{t('common.switch_to_editor', '返回编辑')}</span>
      </button>

      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
        title={t('common.export')}
      >
        <Download size={16} />
        <span className="hidden sm:inline">{t('common.export')}</span>
      </button>
    </div>
  );
}

// 文件职责：PFS 模块——未启用 PFS 模式时显示的引导面板（含“启用 PFS”按钮）
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Award } from 'lucide-react';

interface PfsEnablePanelProps {
  onEnable: () => void;
}

const PfsEnablePanel: React.FC<PfsEnablePanelProps> = ({ onEnable }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-inner">
          <Shield size={24} />
        </div>
        <div>
          <h4 className="font-bold text-stone-800 text-base">{t('editor.pfs.title')}</h4>
          <p className="text-sm text-stone-500 mt-0.5">{t('editor.pfs.enable_pfs_desc')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEnable}
        className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded shadow transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
      >
        <Award size={16} />
        {t('editor.pfs.enable_pfs')}
      </button>
    </div>
  );
};

export default PfsEnablePanel;

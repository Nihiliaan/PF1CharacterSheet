// 文件职责：PFS 模块——未安装油猴（Tampermonkey）脚本时的安装引导模态框
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, DownloadCloud } from 'lucide-react';

interface PfsHelperModalProps {
  onClose: () => void;
}

const PfsHelperModal: React.FC<PfsHelperModalProps> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span>{t('editor.pfs.tampermonkey_missing_title')}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          {t('editor.pfs.tampermonkey_missing_desc')}
        </p>

        <div className="p-3 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700 leading-relaxed flex flex-col gap-2">
          <p className="font-semibold text-stone-800">安装步骤：</p>
          <ol className="list-decimal pl-4 space-y-1 text-stone-600">
            <li>安装 Tampermonkey（油猴）或 Violentmonkey 浏览器扩展；</li>
            <li>新建用户脚本，粘贴项目根目录下 <code className="bg-stone-200 px-1 py-0.5 rounded text-amber-900 font-mono">scripts/pf1-cross-site-sync-helper.user.js</code> 代码；</li>
            <li>保存脚本并在当前浏览器登录 Paizo 官网，重新点击同步即可。</li>
          </ol>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
          >
            {t('editor.pfs.btn_cancel')}
          </button>
          <a
            href="/scripts/pf1-cross-site-sync-helper.user.js"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <DownloadCloud size={14} />
            <span>{t('editor.pfs.one_click_install')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PfsHelperModal;

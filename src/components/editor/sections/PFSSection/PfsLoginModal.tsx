// 文件职责：PFS 模块——同步时未登录 Paizo 官网的引导模态框
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, X, ExternalLink } from 'lucide-react';

interface PfsLoginModalProps {
  onClose: () => void;
  onRetry: () => void;
}

const PfsLoginModal: React.FC<PfsLoginModalProps> = ({ onClose, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
            <LogIn size={18} className="text-amber-600" />
            <span>{t('editor.pfs.login_modal_title')}</span>
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
          {t('editor.pfs.login_modal_desc')}
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded border border-stone-300"
          >
            {t('common.cancel')}
          </button>
          <a
            href="https://paizo.com/organizedPlay/myAccount"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded shadow-xs"
          >
            <span>{t('editor.pfs.go_to_login')}</span>
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded shadow-xs"
          >
            {t('editor.pfs.retry_after_login')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PfsLoginModal;

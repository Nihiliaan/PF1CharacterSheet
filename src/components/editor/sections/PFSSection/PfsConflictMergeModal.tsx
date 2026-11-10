// 文件职责：PFS 模块——官网同步记录单与本地数据冲突时的合并策略确认模态框
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { PfsConflictData, PfsMergeStrategy } from './shared';

interface PfsConflictMergeModalProps {
  conflictData: PfsConflictData;
  mergeStrategy: PfsMergeStrategy;
  onStrategyChange: (strategy: PfsMergeStrategy) => void;
  onClose: () => void;
  onApply: () => void;
}

const PfsConflictMergeModal: React.FC<PfsConflictMergeModalProps> = ({
  conflictData,
  mergeStrategy,
  onStrategyChange,
  onClose,
  onApply
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span>{t('editor.pfs.conflict_modal_title')}</span>
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
          {t('editor.pfs.conflict_summary', {
            incoming: conflictData.incoming.length,
            local: (conflictData.local.scenario || []).length
          })}
        </p>

        <div className="flex flex-col gap-3 my-2">
          {/* 策略 1：智能增量合并 */}
          <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
            mergeStrategy === 'incremental' ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' : 'border-stone-200 hover:bg-stone-50'
          }`}>
            <input
              type="radio"
              name="mergeStrategy"
              checked={mergeStrategy === 'incremental'}
              onChange={() => onStrategyChange('incremental')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-stone-900">{t('editor.pfs.merge_strategy_incremental')}</span>
              <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_incremental_desc')}</span>
            </div>
          </label>

          {/* 策略 2：全量覆盖 */}
          <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
            mergeStrategy === 'overwrite' ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500' : 'border-stone-200 hover:bg-stone-50'
          }`}>
            <input
              type="radio"
              name="mergeStrategy"
              checked={mergeStrategy === 'overwrite'}
              onChange={() => onStrategyChange('overwrite')}
              className="mt-1 text-red-600 focus:ring-red-500"
            />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-red-800">{t('editor.pfs.merge_strategy_overwrite')}</span>
              <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_overwrite_desc')}</span>
            </div>
          </label>

          {/* 策略 3：纯末尾追加 */}
          <label className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
            mergeStrategy === 'append' ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' : 'border-stone-200 hover:bg-stone-50'
          }`}>
            <input
              type="radio"
              name="mergeStrategy"
              checked={mergeStrategy === 'append'}
              onChange={() => onStrategyChange('append')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-stone-900">{t('editor.pfs.merge_strategy_append')}</span>
              <span className="text-stone-500 mt-0.5">{t('editor.pfs.merge_strategy_append_desc')}</span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
          >
            {t('editor.pfs.btn_cancel')}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors shadow-xs cursor-pointer"
          >
            {t('editor.pfs.btn_confirm_merge')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PfsConflictMergeModal;

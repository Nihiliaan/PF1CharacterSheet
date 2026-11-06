import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, PlusCircle, RefreshCw, CheckSquare, Square, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseEquipmentText, EquipmentParseMode, ParsedEquipmentItem } from '../../utils/equipmentBatchParser';

interface EquipmentBatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagName: string;
  onImport: (items: ParsedEquipmentItem[], strategy: 'append' | 'replace') => void;
}

export const EquipmentBatchImportModal: React.FC<EquipmentBatchImportModalProps> = ({
  isOpen,
  onClose,
  bagName,
  onImport
}) => {
  const { t } = useTranslation();

  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<EquipmentParseMode>('auto');
  const [strategy, setStrategy] = useState<'append' | 'replace'>('append');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 实时解析
  const parseResult = useMemo(() => {
    return parseEquipmentText(rawText, mode);
  }, [rawText, mode]);

  // 当解析出的 items 数量改变时，重置全部选中
  React.useEffect(() => {
    setSelectedIndices(new Set(parseResult.items.map((_, i) => i)));
  }, [parseResult.items]);

  // 获取用户勾选的有效列表
  const selectedItems = useMemo(() => {
    return parseResult.items.filter((_, i) => selectedIndices.has(i));
  }, [parseResult.items, selectedIndices]);

  // 统计数值
  const summary = useMemo(() => {
    let totalCost = 0;
    let totalWeight = 0;
    selectedItems.forEach(item => {
      const q = item.quantity > 0 ? item.quantity : 1;
      totalCost += (item.cost || 0) * q;
      totalWeight += (item.weight || 0) * q;
    });
    return {
      count: selectedItems.length,
      cost: Math.round(totalCost * 100) / 100,
      weight: Math.round(totalWeight * 100) / 100
    };
  }, [selectedItems]);

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === parseResult.items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parseResult.items.map((_, i) => i)));
    }
  };

  const handleToggleRow = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;
    onImport(selectedItems, strategy);
    onClose();
  };

  const getModeLabel = (m: EquipmentParseMode) => {
    switch (m) {
      case 'tsv': return t('editor.items.batch_import_mode_tsv');
      case 'csv': return t('editor.items.batch_import_mode_csv');
      case 'space': return t('editor.items.batch_import_mode_space');
      case 'bbcode': return t('editor.items.batch_import_mode_bbcode');
      default: return t('editor.items.batch_import_mode_auto');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-stone-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                  {t('editor.items.batch_import_title')}
                  <span className="text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-normal">
                    {bagName}
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('editor.items.batch_import_subtitle', '从 Excel 复制、CSV、空格分列或果园 BBCode 表格中快速解析并导入装备数据')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="px-6 py-3 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-stone-700 flex items-center gap-1.5">
                {t('editor.items.batch_import_mode')}:
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as EquipmentParseMode)}
                className="bg-white border border-stone-300 rounded px-2.5 py-1 text-stone-800 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="auto">{t('editor.items.batch_import_mode_auto')}</option>
                <option value="tsv">{t('editor.items.batch_import_mode_tsv')}</option>
                <option value="csv">{t('editor.items.batch_import_mode_csv')}</option>
                <option value="space">{t('editor.items.batch_import_mode_space')}</option>
                <option value="bbcode">{t('editor.items.batch_import_mode_bbcode')}</option>
              </select>

              {mode === 'auto' && rawText.trim() && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 text-[11px] font-medium">
                  <Sparkles size={12} />
                  <span>{t('editor.items.batch_import_detected', { mode: getModeLabel(parseResult.detectedMode) })}</span>
                </div>
              )}
            </div>

            {/* 导入策略 */}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-stone-700">{t('editor.items.batch_import_strategy')}:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                <input
                  type="radio"
                  name="import-strategy"
                  value="append"
                  checked={strategy === 'append'}
                  onChange={() => setStrategy('append')}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>{t('editor.items.batch_import_strategy_append')}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                <input
                  type="radio"
                  name="import-strategy"
                  value="replace"
                  checked={strategy === 'replace'}
                  onChange={() => setStrategy('replace')}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-red-600 font-medium">{t('editor.items.batch_import_strategy_replace')}</span>
              </label>
            </div>
          </div>

          {/* Body: Split View */}
          <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[360px]">
            {/* Left: Input Textarea */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700">
                  {t('editor.items.batch_import_input_label')}
                </label>
                {rawText && (
                  <button
                    onClick={() => setRawText('')}
                    className="text-[11px] text-stone-400 hover:text-stone-700 underline"
                  >
                    {t('editor.items.batch_import_clear')}
                  </button>
                )}
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={t('editor.items.batch_import_input_placeholder')}
                className="w-full flex-1 min-h-[280px] p-3 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all leading-relaxed"
                spellCheck={false}
              />
              <div className="mt-2 text-[11px] text-stone-500 leading-tight">
                💡 {t('editor.items.batch_import_tip', '支持识别如“弩矢（20）”等括号数量，价格自动转换 sp/cp/pp，重量自动识别分数(如 1/2磅)。')}
              </div>
            </div>

            {/* Right: Real-time Preview Table */}
            <div className="flex flex-col h-full border border-stone-200 rounded-lg bg-stone-50/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-800">
                    {t('editor.items.batch_import_preview')}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold">
                    {t('editor.items.batch_import_preview_count', { count: parseResult.items.length })}
                  </span>
                </div>
                {parseResult.items.length > 0 && (
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-medium text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    {selectedIndices.size === parseResult.items.length ? (
                      <>
                        <Square size={13} />
                        {t('editor.items.batch_import_deselect_all')}
                      </>
                    ) : (
                      <>
                        <CheckSquare size={13} />
                        {t('editor.items.batch_import_select_all')}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-y-auto max-h-[320px] bg-white">
                {parseResult.items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-400">
                    <AlertCircle size={32} className="mb-2 opacity-50 text-stone-300" />
                    <p className="text-xs">{t('editor.items.batch_import_preview_empty')}</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-stone-100 text-stone-600 font-semibold sticky top-0 border-b border-stone-200">
                      <tr>
                        <th className="w-8 px-2 py-1.5 text-center">#</th>
                        <th className="px-2 py-1.5">{t('editor.items.batch_import_col_item')}</th>
                        <th className="w-14 px-2 py-1.5 text-center">{t('editor.items.batch_import_col_qty')}</th>
                        <th className="w-16 px-2 py-1.5 text-right">{t('editor.items.batch_import_col_cost')}</th>
                        <th className="w-16 px-2 py-1.5 text-right">{t('editor.items.batch_import_col_weight')}</th>
                        <th className="px-2 py-1.5">{t('editor.items.batch_import_col_notes')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parseResult.items.map((row, idx) => {
                        const isSelected = selectedIndices.has(idx);
                        return (
                          <tr
                            key={idx}
                            onClick={() => handleToggleRow(idx)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'opacity-40 hover:opacity-75 bg-stone-50/50'
                            }`}
                          >
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // 由 tr onClick 处理
                                className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3 pointer-events-none"
                              />
                            </td>
                            <td className="px-2 py-1.5 font-medium text-stone-800 truncate max-w-[120px]">
                              {row.item}
                            </td>
                            <td className="px-2 py-1.5 text-center font-mono text-stone-700">
                              {row.quantity}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-stone-700">
                              {row.cost}
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-stone-700">
                              {row.weight}
                            </td>
                            <td className="px-2 py-1.5 text-stone-500 truncate max-w-[140px]">
                              {row.notes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
            <div className="text-xs text-stone-600">
              {parseResult.items.length > 0 && (
                <span>
                  {t('editor.items.batch_import_summary', {
                    count: summary.count,
                    cost: summary.cost,
                    weight: summary.weight
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedItems.length === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                  selectedItems.length === 0
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
                }`}
              >
                <PlusCircle size={15} />
                <span>
                  {strategy === 'replace'
                    ? t('editor.items.batch_import_confirm_replace', '覆盖导入')
                    : t('editor.items.batch_import_confirm_append', '追加导入')}
                  ({selectedItems.length})
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default EquipmentBatchImportModal;

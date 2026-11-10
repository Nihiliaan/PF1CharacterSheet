// 文件职责：PFS 模块——跑团编年史记录单 (Chronicles) 动态表格，含只读锁定切换、油猴脚本安装入口与官网同步按钮
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scroll, Lock, Unlock, ExternalLink, DownloadCloud } from 'lucide-react';
import DynamicTable from '../../../common/DynamicTable';
import { cn } from '../../../../lib/utils';

interface PfsChroniclesTableProps {
  data: Record<string, any>;
  originalData?: Record<string, any>;
  isChroniclesUnlocked: boolean;
  onToggleUnlock: () => void;
  isSyncing: boolean;
  onSync: () => void;
  rowActionMode: 'drag' | 'delete';
  onRowActionModeToggle: () => void;
  onRowDragStart: (index: number, e: any) => void;
  onRowDragOver: (index: number, e: any) => void;
  onRowDrop: (index: number, e: any) => void;
  onChange: (data: Record<string, any>) => void;
}

const PfsChroniclesTable: React.FC<PfsChroniclesTableProps> = ({
  data,
  originalData,
  isChroniclesUnlocked,
  onToggleUnlock,
  isSyncing,
  onSync,
  rowActionMode,
  onRowActionModeToggle,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  onChange
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
          <Scroll size={16} className="text-amber-700" />
          <span>{t('editor.pfs.chronicles_title')}</span>
        </h4>
        <div className="flex items-center gap-2">
          {/* 表格只读锁定 / 解锁编辑切换按钮 */}
          <button
            type="button"
            onClick={onToggleUnlock}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer",
              isChroniclesUnlocked
                ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
            )}
            title={isChroniclesUnlocked ? "点击锁定表格以保护数据免受误改" : "点击解锁以手动编辑字段或添加新行"}
          >
            {isChroniclesUnlocked ? <Unlock size={13} className="text-amber-700" /> : <Lock size={13} className="text-stone-500" />}
            <span>{isChroniclesUnlocked ? t('editor.pfs.lock_chronicles', '锁定保护') : t('editor.pfs.unlock_chronicles', '解锁编辑')}</span>
          </button>
          {/* 一键在油猴中安装/更新脚本入口 */}
          <a
            href="/scripts/pf1-cross-site-sync-helper.user.js"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-amber-900 bg-white hover:bg-amber-50 border border-stone-300 rounded shadow-xs transition-colors cursor-pointer"
            title="点击一键在浏览器油猴插件中安装或更新同步助手脚本"
          >
            <ExternalLink size={13} className="text-amber-700" />
            <span>{t('editor.pfs.install_userscript')}</span>
          </a>
          {/* 从官网同步记录单按钮 */}
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded shadow-xs transition-colors cursor-pointer"
            title="通过油猴脚本直接从 Paizo 官网抓取并导入本角色跑团记录"
          >
            <DownloadCloud size={14} className={isSyncing ? "animate-bounce" : ""} />
            <span>{isSyncing ? t('editor.pfs.syncing_from_paizo') : t('editor.pfs.sync_from_paizo')}</span>
          </button>
        </div>
      </div>

      <DynamicTable
        path="pfs.chronicles"
        data={data}
        originalData={originalData}
        onChange={onChange}
        readonlyColumns={isChroniclesUnlocked ? [] : ['date', 'scenario', 'gm', 'event', 'faction', 'prestige', 'notes']}
        fixedRows={!isChroniclesUnlocked}
        rowDraggable={isChroniclesUnlocked}
        rowActionMode={rowActionMode}
        onRowActionModeToggle={onRowActionModeToggle}
        onRowDragStart={onRowDragStart}
        onRowDragOver={onRowDragOver}
        onRowDrop={onRowDrop}
      />
    </div>
  );
};

export default PfsChroniclesTable;

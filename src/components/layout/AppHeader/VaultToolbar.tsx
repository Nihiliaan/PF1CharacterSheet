/**
 * AppHeader 子组件：保险库视图下的工具栏。
 * 包含可展开的搜索框、导入下拉菜单（本地文件/文件夹/剪贴板/云端）、云备份、
 * 新建文件夹以及网格/列表视图切换。
 * 纯展示组件：状态与回调由容器 AppHeader.tsx 通过 props 传入。
 */
import React from 'react';
import { motion } from 'motion/react';
import {
  Search, Download, HardDrive, Folder, Check, Grid, List as ListIcon,
  CloudUpload, FolderPlus, RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VaultToolbarProps {
  /** 搜索输入框的 ref（焦点延迟逻辑在容器中，ref 由容器持有） */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  isSearchExpanded: boolean;
  /** 点击搜索图标：切换展开态，展开时延迟聚焦输入框 */
  onToggleSearch: () => void;
  /** 输入框失焦：搜索词为空时收起 */
  onSearchBlur: () => void;
  onImportFromClipboard: () => void;
  onBrowseDrive: () => void;
  onBrowseDriveRoot: () => void;
  onCloudRestore: () => void;
  onCloudBackup: () => void;
  isSyncingDrive: boolean;
  onCreateFolder: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function VaultToolbar({
  searchInputRef,
  search,
  onSearchChange,
  isSearchExpanded,
  onToggleSearch,
  onSearchBlur,
  onImportFromClipboard,
  onBrowseDrive,
  onBrowseDriveRoot,
  onCloudRestore,
  onCloudBackup,
  isSyncingDrive,
  onCreateFolder,
  viewMode,
  onViewModeChange
}: VaultToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center h-8">
        <motion.div
          initial={false}
          animate={{
            width: isSearchExpanded || search ? 150 : 32,
            backgroundColor: isSearchExpanded || search ? 'rgba(68, 64, 60, 0.5)' : 'transparent'
          }}
          className="flex items-center rounded-lg border border-transparent focus-within:border-stone-600 focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden"
        >
          <button
            onClick={onToggleSearch}
            className={`p-2 flex-shrink-0 transition-colors ${isSearchExpanded || search ? 'text-stone-400' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
          >
            <Search size={16} />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onBlur={onSearchBlur}
            className="w-full bg-transparent border-none outline-none text-xs text-stone-100 pr-3"
            style={{ display: isSearchExpanded || search ? 'block' : 'none' }}
          />
        </motion.div>
      </div>

      <div className="h-6 w-px bg-stone-600 mx-1"></div>

      <div className="relative group">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors text-xs font-bold"
        >
          <Download size={16} /> {t('common.import')}
        </button>
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-stone-200 shadow-xl rounded-xl py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <button
            onClick={() => document.getElementById('local-import-input')?.click()}
            className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <HardDrive size={14} /> {t('common.local_file')}
          </button>
          <button
            onClick={() => document.getElementById('local-folder-import-input')?.click()}
            className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <Folder size={14} /> {t('common.local_folder')}
          </button>
          <button
            onClick={onImportFromClipboard}
            className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <Check size={14} /> {t('common.clipboard_content')}
          </button>
          <div className="h-px bg-stone-100 my-1"></div>
          <button
            onClick={onBrowseDrive}
            className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-primary"
          >
            <Search size={14} /> {t('common.browse_cloud_backup')}
          </button>
          <button
            onClick={onBrowseDriveRoot}
            className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-indigo-600"
          >
            <Grid size={14} /> {t('common.browse_all_cloud_files')}
          </button>
          <button
            onClick={onCloudRestore}
            className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <RotateCcw size={14} /> {t('common.cloud_restore')}
          </button>
        </div>
      </div>

      <button
        onClick={onCloudBackup}
        disabled={isSyncingDrive}
        className={`p-2 rounded-lg transition-all ${
          isSyncingDrive
          ? 'text-blue-400 animate-pulse'
          : 'text-stone-400 hover:bg-stone-700 hover:text-blue-400'
        }`}
        title={t('common.cloud_backup')}
      >
        <CloudUpload size={18} />
      </button>

      <button
        onClick={onCreateFolder}
        className="p-2 text-stone-400 hover:bg-stone-700 hover:text-white rounded-lg transition-colors"
        title={t('common.new_folder')}
      >
        <FolderPlus size={18} />
      </button>

      <div className="flex bg-stone-700 rounded-lg p-0.5 ml-1">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-stone-400 hover:text-white'}`}
        >
          <Grid size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-stone-400 hover:text-white'}`}
        >
          <ListIcon size={14} />
        </button>
      </div>
    </div>
  );
}

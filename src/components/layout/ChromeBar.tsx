/**
 * 应用外壳的浏览器式路径条 + 工具条（ChromeBar）。
 * 位于标签栏下方，浅色两行：
 *  - 第一行（路径条）：面包屑 + 云同步状态胶囊，常驻；
 *  - 第二行（工具条）：按当前视图条件渲染各视图自己的工具栏，属于"标签页内部"；
 *    无工具栏的视图（about / settings / svg-template）不渲染该行（高度不留白）。
 * 职责：持有全部状态（文件/分享菜单、搜索、模态框等）与业务回调（自原 AppHeader 迁入，逻辑零变更）。
 * 全局入口（视图导航 / 语言切换 / 账号）已移至 FloatingBall 悬浮球。
 */
import ForumSyncModal from '../editor/ForumSyncModal';
import CardExportModal from '../export/CardExportModal';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Save, Sparkles, Swords } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useVault } from '../../contexts/VaultContext';

import HeaderBreadcrumb from './AppHeader/HeaderBreadcrumb';
import FileMenu from './AppHeader/FileMenu';
import ShareMenu from './AppHeader/ShareMenu';
import GmViewToolbar from './AppHeader/GmViewToolbar';
import VaultToolbar from './AppHeader/VaultToolbar';
import SyncStatusCapsule from './AppHeader/SyncStatusCapsule';

export default function ChromeBar() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showForumSyncModal, setShowForumSyncModal] = useState(false);
  const [showCardExportModal, setShowCardExportModal] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const fileCloseTimeout = useRef<NodeJS.Timeout | null>(null);
  const shareCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  // 文件 / 分享两个下拉菜单的悬停互斥与 200ms 延迟关闭（与原 AppHeader 一致）
  const handleFileMouseEnter = () => {
    if (fileCloseTimeout.current) clearTimeout(fileCloseTimeout.current);
    if (shareCloseTimeout.current) clearTimeout(shareCloseTimeout.current);
    setIsShareMenuOpen(false);
    setIsFileMenuOpen(true);
  };

  const handleFileMouseLeave = () => {
    fileCloseTimeout.current = setTimeout(() => {
      setIsFileMenuOpen(false);
    }, 200);
  };

  const handleShareMouseEnter = () => {
    if (fileCloseTimeout.current) clearTimeout(fileCloseTimeout.current);
    if (shareCloseTimeout.current) clearTimeout(shareCloseTimeout.current);
    setIsFileMenuOpen(false);
    setIsShareMenuOpen(true);
  };

  const handleShareMouseLeave = () => {
    shareCloseTimeout.current = setTimeout(() => {
      setIsShareMenuOpen(false);
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    view,
    setView,
    setToast,
  } = useUI();

  const {
    currentFolderId,
    setCurrentFolderId,
    folders,
    search,
    setSearch,
    viewMode,
    setViewMode,
    createFolder,
    refreshCharacterList,
    importFromClipboard
  } = useVault();

  const {
    data,
    isReadOnly,
    isSaving,
    syncStatus,
    isDirty,
    isTemplateDirty,
    handleSave,
    handleSaveAs,
    handleShare,
    handleExport,
    handleExportBBCode,
    handleRevertChanges,
    handleNew,
    openCharacterTab,
    currentCharacterId,
    currentTemplateId,
    bbcodeTemplate,
    updateExistingTemplate,
    saveAsTemplate,
    getItemPath,
    setShowAIModal,
    // 从 CharacterContext 获取 Drive 相关
    handleBrowseDrive,
    handleBrowseDriveRoot,
    handleCloudBackup,
    handleCloudRestore,
    isSyncingDrive
  } = useCharacter();

  useEffect(() => {
    return () => {
      if (fileCloseTimeout.current) clearTimeout(fileCloseTimeout.current);
      if (shareCloseTimeout.current) clearTimeout(shareCloseTimeout.current);
    };
  }, []);

  const currentPath = useMemo(() => {
    if (view === 'svg-template') {
      return 'SVG 模板工坊 (.svgt)';
    }

    if (view === 'new-tab') {
      return '新建标签页';
    }

    if (view === 'bbcode-template') {
      if (!currentTemplateId) return t('common.new_template');
      const path = getItemPath(currentTemplateId);
      if (path) return path;
      if (syncStatus === 'syncing') return t('common.loading');
      return t('common.bbcode_editor');
    }

    if (!currentCharacterId) {
      return t('common.new_character');
    }

    const path = getItemPath(currentCharacterId);
    if (path) return path;

    const charName = data.basic?.name?.trim();
    if (charName) return charName;

    if (syncStatus === 'syncing') {
      return t('common.loading');
    }

    return t('common.unnamed_character');
  }, [view, currentTemplateId, currentCharacterId, getItemPath, syncStatus, data.basic?.name, t]);

  const isCurrentDirty = view === 'bbcode-template' ? isTemplateDirty : isDirty;
  const displayPath = currentPath + (isCurrentDirty ? '*' : '') + (isReadOnly ? ` (${t('common.read_only')})` : '');

  const breadcrumbs = (() => {
    let p = [];
    let curId = currentFolderId;
    while (curId) {
      const f = folders.find(folder => folder.id === curId);
      if (f) {
        p.unshift(f);
        curId = f.parentId;
      } else break;
    }
    return p;
  })();

  const handleCreateFolder = async () => {
    const name = window.prompt(t('common.new_folder'), t('common.new_folder'));
    if (name && name.trim()) {
      const trimmedName = name.trim();
      try {
        await createFolder(trimmedName, currentFolderId);
        refreshCharacterList();
      } catch (e: any) {
        alert(e.message || t('common.failed_to_create_folder'));
      }
    }
  };

  // 有工具栏的视图才渲染第二行（高度不留白）
  // 注：bbcode-template 的工具条已统一进 BBCodeTemplateEditor 页面内部（含文件操作）
  const hasToolbar = view === 'editor' || view === 'gm-view' || view === 'vault';

  return (
    <div className="shrink-0 bg-stone-50 border-b border-stone-200 text-stone-800">
      {/* 第一行：路径条（面包屑 + 云同步状态），常驻 */}
      <div className="flex items-center justify-between gap-4 px-4 py-1.5">
        <div className="flex items-center min-w-0">
          <HeaderBreadcrumb
            view={view}
            breadcrumbs={breadcrumbs}
            currentPath={currentPath}
            displayPath={displayPath}
            onSelectFolder={setCurrentFolderId}
          />
        </div>
        <div className="flex items-center shrink-0">
          <SyncStatusCapsule syncStatus={syncStatus} />
        </div>
      </div>

      {/* 第二行：工具条（按视图条件渲染，属于"标签页内部"） */}
      {hasToolbar && (
        <div className="flex items-center px-4 pb-2 flex-wrap gap-y-1">
          {view === 'editor' && (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              {/* 文件下拉菜单（菜单簇靠右，避免下拉面板遮挡左侧资源管理器） */}
              <FileMenu
                menuRef={fileMenuRef}
                isOpen={isFileMenuOpen}
                onToggle={() => {
                  setIsFileMenuOpen(!isFileMenuOpen);
                  setIsShareMenuOpen(false);
                }}
                onMouseEnter={handleFileMouseEnter}
                onMouseLeave={handleFileMouseLeave}
                onClose={() => setIsFileMenuOpen(false)}
                isReadOnly={isReadOnly}
                isSaving={isSaving}
                isDirty={isDirty}
                enableLocalAutoCache={settings.storage.enableLocalAutoCache}
                onNew={handleNew}
                onSave={handleSave}
                onSaveAs={handleSaveAs}
                onRevert={handleRevertChanges}
              />

              {/* 分享与导出下拉菜单 */}
              <ShareMenu
                menuRef={shareMenuRef}
                isOpen={isShareMenuOpen}
                onToggle={() => {
                  setIsShareMenuOpen(!isShareMenuOpen);
                  setIsFileMenuOpen(false);
                }}
                onMouseEnter={handleShareMouseEnter}
                onMouseLeave={handleShareMouseLeave}
                onClose={() => setIsShareMenuOpen(false)}
                isReadOnly={isReadOnly}
                onShowCardExport={() => setShowCardExportModal(true)}
                onExportBBCode={handleExportBBCode}
                onShowForumSync={() => setShowForumSyncModal(true)}
                onShare={handleShare}
                onExport={handleExport}
              />

              {/* 快捷保存图标按钮（Ctrl+S 行为提示保留） */}
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isDirty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      : 'text-stone-500 hover:bg-stone-200 hover:text-stone-900'
                  } disabled:opacity-50`}
                  title={`${isSaving ? t('common.saving') : t('common.save')} (Ctrl+S)`}
                >
                  <Save size={16} />
                </button>
              )}

              {/* AI 识别 - 纯图标替代 */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowAIModal(true)}
                  className="p-2 rounded-full text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-xs cursor-pointer"
                  title={t('common.ai_identify', 'AI 识别导入')}
                >
                  <Sparkles size={16} />
                </button>
              )}

              {/* GM 紧凑数据卡入口（点击后进入 GM 视图） */}
              <button
                onClick={() => setView('gm-view')}
                className="p-2 rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors shadow-xs cursor-pointer"
                title={t('common.gm_view', 'GM 紧凑数据卡')}
              >
                <Swords size={16} />
              </button>
            </div>
          )}

          {view === 'gm-view' && (
            <GmViewToolbar
              // 返回编辑：直接打开/激活人物卡标签，避免视图与活动标签不一致
              onBackToEditor={() => openCharacterTab()}
              onExport={handleExport}
            />
          )}

          {view === 'vault' && (
            <VaultToolbar
              searchInputRef={searchInputRef}
              search={search}
              onSearchChange={setSearch}
              isSearchExpanded={isSearchExpanded}
              onToggleSearch={() => {
                setIsSearchExpanded(!isSearchExpanded);
                if (!isSearchExpanded) {
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }}
              onSearchBlur={() => {
                if (!search) setIsSearchExpanded(false);
              }}
              onImportFromClipboard={importFromClipboard}
              onBrowseDrive={handleBrowseDrive}
              onBrowseDriveRoot={handleBrowseDriveRoot}
              onCloudRestore={handleCloudRestore}
              onCloudBackup={handleCloudBackup}
              isSyncingDrive={isSyncingDrive}
              onCreateFolder={handleCreateFolder}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </div>
      )}

      <ForumSyncModal isOpen={showForumSyncModal} onClose={() => setShowForumSyncModal(false)} />
      <CardExportModal isOpen={showCardExportModal} onClose={() => setShowCardExportModal(false)} />
    </div>
  );
}

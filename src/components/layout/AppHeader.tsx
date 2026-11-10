/**
 * 应用顶栏容器组件（AppHeader）。
 * 职责：持有全部状态（导航/文件/分享菜单、搜索、模态框等）与业务回调，
 * 负责顶栏整体布局编排；具体 UI 块拆分在同目录 AppHeader/ 子组件中，
 * 全部通过 props 传入数据与回调（不含状态上提/下沉，行为与拆分前一致）。
 */
import ForumSyncModal from '../editor/ForumSyncModal';
import CardExportModal from '../export/CardExportModal';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid, FileText, Copy, Info, Save, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { googleProvider } from '../../lib/firebase';

import { useUI, ViewType } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_BBCODE_TEMPLATE } from '../../constants';

import HeaderNav from './AppHeader/HeaderNav';
import HeaderBreadcrumb from './AppHeader/HeaderBreadcrumb';
import FileMenu from './AppHeader/FileMenu';
import ShareMenu from './AppHeader/ShareMenu';
import GmViewToolbar from './AppHeader/GmViewToolbar';
import BbcodeToolbar from './AppHeader/BbcodeToolbar';
import VaultToolbar from './AppHeader/VaultToolbar';
import SyncStatusCapsule from './AppHeader/SyncStatusCapsule';
import HeaderAccountArea from './AppHeader/HeaderAccountArea';
import type { NavItem, RecentCharacterItem } from './AppHeader/shared';

export default function AppHeader() {
  const { t } = useTranslation();
  const { user, handleLogin } = useAuth();
  const { settings } = useSettings();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showForumSyncModal, setShowForumSyncModal] = useState(false);
  const [showCardExportModal, setShowCardExportModal] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const fileCloseTimeout = useRef<NodeJS.Timeout | null>(null);
  const shareCloseTimeout = useRef<NodeJS.Timeout | null>(null);

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
  const navCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleNavMouseEnter = () => {
    if (navCloseTimeout.current) clearTimeout(navCloseTimeout.current);
    setIsNavOpen(true);
  };

  const handleNavMouseLeave = () => {
    navCloseTimeout.current = setTimeout(() => {
      setIsNavOpen(false);
    }, 300);
  };

  const {
    view,
    setView,
    setToast,
    recentCharacterIds,
    removeFromRecent,
    isHeaderVisible,
    setIsHeaderVisible,
    isHeaderPinned,
    setIsHeaderPinned
  } = useUI();

  const {
    myCharacters,
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

  const recentCharacters = useMemo<RecentCharacterItem[]>(() => {
    return recentCharacterIds.map(id => {
      const found = myCharacters?.find((c: any) => c.id === id);
      if (found) {
        const data = found.data || {};
        return {
          id,
          name: data.basic?.name || found.name || '未命名',
          avatar: found.isTemplate ? 'https://ui-avatars.com/api/?name=T&background=6366f1&color=fff' : (data.basic?.avatars?.url?.[0] || ''),
          classes: data.basic?.classes || found.classes || '',
        };
      }
      return { id, name: id, avatar: '', classes: '' };
    });
  }, [recentCharacterIds, myCharacters]);

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
    currentCharacterId,
    currentTemplateId,
    bbcodeTemplate,
    updateExistingTemplate,
    saveAsTemplate,
    setBbcodeTemplate,
    selectCharacter,
    setData,
    setCurrentCharacterId,
    setCurrentTemplateId,
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
      if (navCloseTimeout.current) clearTimeout(navCloseTimeout.current);
      if (fileCloseTimeout.current) clearTimeout(fileCloseTimeout.current);
      if (shareCloseTimeout.current) clearTimeout(shareCloseTimeout.current);
    };
  }, []);

  const navItems = [
    { id: 'editor', label: t('common.character_editor'), icon: <LayoutGrid size={16} /> },
    { id: 'gm-view', label: t('common.gm_view'), icon: <FileText size={16} /> },
    { id: 'svg-template', label: 'SVG 模板工坊', icon: <Sparkles size={16} /> },
    { id: 'bbcode-template', label: t('common.bbcode_editor'), icon: <Copy size={16} /> },
    { id: 'vault', label: t('common.vault'), icon: <LayoutGrid size={16} />, hidden: !user },
    { id: 'about', label: t('common.about'), icon: <Info size={16} /> },
  ].filter(item => !item.hidden);

  const currentNavItem = navItems.find(item => item.id === view) || navItems[0];

  const currentPath = useMemo(() => {
    if (view === 'svg-template') {
      return 'SVG 模板工坊 (.svgt)';
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

  const handleBBCodeSave = async () => {
    if (currentTemplateId) {
      await updateExistingTemplate(currentTemplateId, bbcodeTemplate);
    } else {
      const name = window.prompt(t('editor.bbcode.prompt_name'), t('editor.bbcode.default_name'));
      if (name) {
        await saveAsTemplate(name, bbcodeTemplate);
      }
    }
  };

  const handleBBCodeSaveAs = async () => {
    const name = window.prompt(t('editor.bbcode.prompt_name'), t('editor.bbcode.default_name'));
    if (name) {
      await saveAsTemplate(name, bbcodeTemplate);
    }
  };

  const handleImportDefault = () => {
    if (window.confirm(t('editor.bbcode.confirm_reset'))) {
      setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
      setToast({ message: t('editor.bbcode.reset_success'), type: 'success' });
    }
  };

  const handleNewTemplate = () => {
    if (isTemplateDirty && !window.confirm(t('editor.bbcode.confirm_new_template'))) {
      return;
    }
    setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
    setCurrentTemplateId(null);
  };

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

  return (
    <motion.header
      initial={false}
      animate={{
        y: (isHeaderVisible || isHeaderPinned) ? 0 : -100,
        opacity: (isHeaderVisible || isHeaderPinned) ? 1 : 0.8
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      onMouseEnter={() => setIsHeaderVisible(true)}
      onMouseLeave={() => !isHeaderPinned && setIsHeaderVisible(false)}
      className="bg-stone-800 text-stone-100 px-4 py-3 fixed top-0 left-0 right-0 z-[65] shadow-md flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        {/* Navigation Dropdown */}
        <HeaderNav
          navRef={navRef}
          isNavOpen={isNavOpen}
          onToggle={() => setIsNavOpen(!isNavOpen)}
          onMouseEnter={handleNavMouseEnter}
          onMouseLeave={handleNavMouseLeave}
          navItems={navItems}
          currentNavItem={currentNavItem}
          view={view}
          onSelectView={(id) => {
            setView(id as ViewType);
            setIsNavOpen(false);
          }}
        />

        {/* Path/Breadcrumb Display */}
        <HeaderBreadcrumb
          view={view}
          breadcrumbs={breadcrumbs}
          currentPath={currentPath}
          displayPath={displayPath}
          onSelectFolder={setCurrentFolderId}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {view === 'editor' && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 文件下拉菜单 */}
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

            {/* 快捷保存图标按钮 */}
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isDirty
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    : 'text-stone-400 hover:bg-stone-700 hover:text-white'
                } disabled:opacity-50`}
                title={`${isSaving ? t('common.saving') : t('common.save')} (Ctrl+S)`}
              >
                <Save size={16} />
              </button>
            )}

            {/* AI 识别 - 纯图标替代，参照设置按钮风格 */}
            {!isReadOnly && (
              <button
                onClick={() => setShowAIModal(true)}
                className="p-2 rounded-full text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-800 border border-indigo-700/60 transition-colors shadow-xs cursor-pointer"
                title={t('common.ai_identify', 'AI 识别导入')}
              >
                <Sparkles size={16} />
              </button>
            )}
          </div>
        )}

        {view === 'gm-view' && (
          <GmViewToolbar
            onBackToEditor={() => setView('editor')}
            onExport={handleExport}
          />
        )}

        {view === 'bbcode-template' && (
          <BbcodeToolbar
            isReadOnly={isReadOnly}
            onNewTemplate={handleNewTemplate}
            onSave={handleBBCodeSave}
            onSaveAs={handleBBCodeSaveAs}
            onShare={handleShare}
            onImportDefault={handleImportDefault}
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

        {/* Sync Status Capsule */}
        <SyncStatusCapsule syncStatus={syncStatus} />

        <div className="h-6 w-px bg-stone-600 mx-1"></div>

        <HeaderAccountArea
          user={user}
          onLogin={() => handleLogin(googleProvider)}
          isHeaderPinned={isHeaderPinned}
          onTogglePin={() => setIsHeaderPinned(!isHeaderPinned)}
          view={view}
          setView={setView}
          recentCharacters={recentCharacters}
          currentCharacterId={currentCharacterId}
          currentTemplateId={currentTemplateId}
          onSelectCharacter={selectCharacter}
          onRemoveRecent={removeFromRecent}
        />
      </div>
      <ForumSyncModal isOpen={showForumSyncModal} onClose={() => setShowForumSyncModal(false)} />
      <CardExportModal isOpen={showCardExportModal} onClose={() => setShowCardExportModal(false)} />
    </motion.header>
  );
}

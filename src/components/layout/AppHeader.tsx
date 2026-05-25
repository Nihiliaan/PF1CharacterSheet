import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, Save, Share2, Download, Copy, FilePlus, Sparkles, Plus, Pin, User, Languages, 
  ChevronDown, Info, RotateCcw, X, Search, HardDrive, Folder, Check, CloudUpload, Grid, List as ListIcon,
  FolderPlus, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AccountMenu from '../account/AccountMenu';
import { googleProvider } from '../../lib/firebase';
import { logout } from '../../services/authService';

import { useUI, ViewType } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCharacterAI } from '../../contexts/hooks/useCharacterAI';
import { DEFAULT_BBCODE_TEMPLATE } from '../../constants';

export default function AppHeader() {
  const { t, i18n } = useTranslation();
  const { user, handleLogin, handleLogout } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
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
    recentCharacters,
    removeFromRecent,
    isHeaderVisible,
    setIsHeaderVisible,
    isHeaderPinned,
    setIsHeaderPinned
  } = useUI();

  const {
    isReadOnly,
    isSaving,
    isDirty,
    isTemplateDirty,
    handleSave,
    handleSaveAs,
    handleShare,
    handleExport,
    handleExportBBCode,
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
    importFromClipboard,
    onPaste // Although not needed for import, good to keep context synced
  } = useVault();

  const toggleLanguage = () => {
    const current = i18n.language;
    let next = 'zh';
    if (current.startsWith('zh-TW') || current.startsWith('zh-HK')) {
      next = 'en';
    } else if (current.startsWith('zh')) {
      next = 'zh-TW';
    } else {
      next = 'zh';
    }
    i18n.changeLanguage(next);
  };

  const getLanguageLabel = () => {
    const lng = i18n.language;
    if (lng.startsWith('zh-TW') || lng.startsWith('zh-HK')) return '繁体';
    if (lng.startsWith('zh')) return '简体';
    return 'EN';
  };

  const getLanguageTitle = () => {
    const lng = i18n.language;
    if (lng.startsWith('zh-TW') || lng.startsWith('zh-HK')) return '切换至英文 / Switch to English';
    if (lng.startsWith('zh')) return '切换至繁体 / Switch to Traditional';
    return 'Switch to Chinese / 切换至中文';
  };

  useEffect(() => {
    return () => {
      if (navCloseTimeout.current) clearTimeout(navCloseTimeout.current);
    };
  }, []);

  const navItems = [
    { id: 'editor', label: t('common.character_editor'), icon: <LayoutGrid size={16} /> },
    { id: 'bbcode-template', label: t('common.bbcode_editor'), icon: <Copy size={16} /> },
    { id: 'vault', label: t('common.vault'), icon: <LayoutGrid size={16} />, hidden: !user },
    { id: 'about', label: t('common.about'), icon: <Info size={16} /> },
  ].filter(item => !item.hidden);

  const currentNavItem = navItems.find(item => item.id === view) || navItems[0];

  const currentPath = view === 'bbcode-template' 
    ? (getItemPath(currentTemplateId) || t('common.new_template'))
    : (getItemPath(currentCharacterId) || t('common.new_character'));
  
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
      (window as any).__resetBBCodeTemplate?.();
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
        <div 
          className="relative" 
          ref={navRef}
          onMouseEnter={handleNavMouseEnter}
          onMouseLeave={handleNavMouseLeave}
        >
          <button 
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors group"
          >
            <div className="bg-primary p-1 rounded">
              {React.cloneElement(currentNavItem.icon as React.ReactElement, { size: 16, className: "text-white" })}
            </div>
            <span className="font-bold text-sm hidden sm:inline">{currentNavItem.label}</span>
            <ChevronDown size={14} className={`text-stone-400 group-hover:text-white transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl z-[70] py-1"
              >
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id as ViewType);
                      setIsNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${view === item.id ? 'bg-primary/5 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    <div className={view === item.id ? 'text-primary' : 'text-stone-400'}>
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Path/Breadcrumb Display */}
        <div className="h-6 w-px bg-stone-600 hidden md:block"></div>
        {view === 'vault' ? (
          <div className="hidden md:flex items-center gap-2 text-stone-400 text-xs font-medium">
             <button 
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <User size={14} /> {t('common.vault')}
              </button>
              {breadcrumbs.map(f => (
                <React.Fragment key={f.id}>
                  <ChevronRight size={12} className="text-stone-600" />
                  <button 
                    onClick={() => setCurrentFolderId(f.id)}
                    className="hover:text-white transition-colors"
                  >
                    {f.name}
                  </button>
                </React.Fragment>
              ))}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-stone-400 text-xs font-medium max-w-[300px] truncate">
            <span className="truncate" title={currentPath}>{displayPath}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {view === 'editor' && (
          <>
            {!isReadOnly && (
              <>
                <button 
                  onClick={() => setShowAIModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
                >
                  <Sparkles size={16} />
                  <span className="hidden sm:inline">{t('common.ai_identify')}</span>
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">{isSaving ? t('common.saving') : t('common.save')}</span>
                </button>
              </>
            )}

            <button 
              onClick={handleSaveAs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">{t('common.save_as')}</span>
            </button>

            {!isReadOnly && (
              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">{t('common.share')}</span>
              </button>
            )}

            <button 
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              title={t('common.export')}
            >
              <Download size={16} />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </button>

            <button 
              onClick={handleExportBBCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              title="BBCode"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">BBCode</span>
            </button>

            <button 
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
            >
              <FilePlus size={16} />
              <span className="hidden sm:inline">{t('common.new')}</span>
            </button>
          </>
        )}

        {view === 'bbcode-template' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleNewTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
            >
              <FilePlus size={16} />
              <span className="hidden sm:inline">{t('common.new')}</span>
            </button>

            {!isReadOnly && (
              <button 
                onClick={handleBBCodeSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              >
                <Save size={16} />
                <span className="hidden sm:inline">{t('common.save')}</span>
              </button>
            )}

            <button 
              onClick={handleBBCodeSaveAs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">{t('editor.bbcode.save_as')}</span>
            </button>

            {!isReadOnly && (
              <>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">{t('common.share')}</span>
                </button>

                <button 
                  onClick={handleImportDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
                >
                  <RotateCcw size={16} />
                  <span className="hidden sm:inline">{t('common.import_default')}</span>
                </button>
              </>
            )}
          </div>
        )}

        {view === 'vault' && (
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
                  onClick={() => {
                    setIsSearchExpanded(!isSearchExpanded);
                    if (!isSearchExpanded) {
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }
                  }}
                  className={`p-2 flex-shrink-0 transition-colors ${isSearchExpanded || search ? 'text-stone-400' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
                >
                  <Search size={16} />
                </button>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search) setIsSearchExpanded(false);
                  }}
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
                  onClick={importFromClipboard}
                  className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  <Check size={14} /> {t('common.clipboard_content')}
                </button>
                <div className="h-px bg-stone-100 my-1"></div>
                <button 
                  onClick={handleBrowseDrive}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-primary"
                >
                  <Search size={14} /> {t('common.browse_cloud_backup')}
                </button>
                <button 
                  onClick={handleBrowseDriveRoot}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-indigo-600"
                >
                  <Grid size={14} /> {t('common.browse_all_cloud_files')}
                </button>
                <button 
                  onClick={handleCloudRestore}
                  className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  <RotateCcw size={14} /> {t('common.cloud_restore')}
                </button>
              </div>
            </div>

            <button 
              onClick={handleCloudBackup}
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
              onClick={handleCreateFolder}
              className="p-2 text-stone-400 hover:bg-stone-700 hover:text-white rounded-lg transition-colors"
              title={t('common.new_folder')}
            >
              <FolderPlus size={18} />
            </button>

            <div className="flex bg-stone-700 rounded-lg p-0.5 ml-1">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-stone-400 hover:text-white'}`}
              >
                <Grid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-stone-400 hover:text-white'}`}
              >
                <ListIcon size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-stone-600 mx-1"></div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="p-2 text-stone-400 hover:bg-stone-700 hover:text-white rounded-full transition-colors flex items-center gap-1"
            title={getLanguageTitle()}
          >
            <Languages size={16} />
            <span className="text-[10px] font-bold uppercase">{getLanguageLabel()}</span>
          </button>

          <button
            onClick={() => setIsHeaderPinned(!isHeaderPinned)}
            className={`p-2 rounded-full transition-colors ${isHeaderPinned ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
            title={isHeaderPinned ? t('common.pinned') : t('common.unpinned')}
          >
            <motion.div
              animate={{ rotate: isHeaderPinned ? -90 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Pin size={16} className="rotate-135" />
            </motion.div>
          </button>

          {user ? (
            <AccountMenu 
              user={user} 
              view={view} 
              setView={setView} 
              recentCharacters={recentCharacters}
              currentCharacterId={currentCharacterId}
              currentTemplateId={currentTemplateId}
              confirmNavigation={(a: any) => a()}
              onSelect={selectCharacter}
              onRemoveRecent={removeFromRecent}
              onLogout={logout}
            />
          ) : (
            <button 
              onClick={() => handleLogin(googleProvider)}
              className="px-3 py-1.5 bg-white text-stone-800 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-stone-100 transition-colors ml-1"
            >
              <User size={14} /> {t('common.login')}
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

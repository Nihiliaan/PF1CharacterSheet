import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutGrid, Save, Share2, Download, Copy, FilePlus, Sparkles, Plus, Pin, User, Languages 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import AccountMenu from '../character/AccountMenu';
import { googleProvider } from '../../lib/firebase';
import { logout } from '../../services/authService';

import { useCharacter } from '../../contexts/CharacterContext';

interface AppHeaderProps {
  isHeaderVisible: boolean;
  setIsHeaderVisible: (visible: boolean) => void;
  isHeaderPinned: boolean;
  setIsHeaderPinned: (pinned: boolean) => void;
}

export default function AppHeader({
  isHeaderVisible,
  setIsHeaderVisible,
  isHeaderPinned,
  setIsHeaderPinned
}: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const {
    view,
    setView,
    user,
    recentCharacters,
    removeFromRecent,
    handleLogin,
    handleLogout,
    isReadOnly,
    isSaving,
    handleSave,
    handleShare,
    handleExport,
    handleExportBBCode,
    handleNew,
    currentDocumentId,
    selectCharacter,
    setShowAIModal
  } = useCharacter();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const confirmNavigation = (action: () => void) => {
    action(); 
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
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setView('editor')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-primary p-1.5 rounded rotate-3">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold leading-none tracking-tight">
              {t('common.app_name')} <span className="text-stone-400 font-sans text-xs font-normal">{t('common.app_subtitle')}</span>
            </h1>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {view === 'editor' ? (
          <>
            {!isReadOnly && (
              <>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">{isSaving ? t('common.saving') : t('common.save')}</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">{t('common.share')}</span>
                </button>
              </>
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
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">{t('common.ai_identify')}</span>
            </button>
            <button 
              onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            {t('common.create_new')}
          </button>
          </div>
        )}

        <div className="h-6 w-px bg-stone-600 mx-1"></div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="p-2 text-stone-400 hover:bg-stone-700 hover:text-white rounded-full transition-colors flex items-center gap-1"
            title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}
          >
            <Languages size={16} />
            <span className="text-[10px] font-bold uppercase">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
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
              currentDocumentId={currentDocumentId}
              confirmNavigation={confirmNavigation}
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

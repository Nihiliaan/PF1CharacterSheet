import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutGrid, Save, Share2, Download, Copy, FilePlus, Sparkles, Plus, Pin, User 
} from 'lucide-react';
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
    currentCharacterId,
    selectCharacter,
    setShowAIModal
  } = useCharacter();

  const confirmNavigation = (action: () => void) => {
    // We can move this logic to context too, but for now let's keep it here or call a context helper
    // Actually, context's handleNew already does this if we pass the callback.
    // For general navigation (view change), we might need a context helper.
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
            <h1 className="text-lg font-serif font-bold leading-none tracking-tight">人物卡管理系统 <span className="text-stone-400 font-sans text-xs font-normal">Character Manager</span></h1>
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
                  <span className="hidden sm:inline">{isSaving ? '正在保存...' : '保存'}</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">分享</span>
                </button>
              </>
            )}

            <button 
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              title="导出为 JSON"
            >
              <Download size={16} />
              <span className="hidden sm:inline">导出</span>
            </button>

            <button 
              onClick={handleExportBBCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              title="导出为 BBCode 并复制到剪贴板"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">BBCode</span>
            </button>

            <button 
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
            >
              <FilePlus size={16} />
              <span className="hidden sm:inline">新建</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">AI 识别</span>
            </button>
            <button 
              onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            创建新角色
          </button>
          </div>
        )}

        <div className="h-6 w-px bg-stone-600 mx-1"></div>

        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsHeaderPinned(!isHeaderPinned)}
              className={`p-2 rounded-full transition-colors ${isHeaderPinned ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
              title={isHeaderPinned ? "取消固定顶部栏" : "固定顶部栏"}
            >
              <motion.div
                animate={{ rotate: isHeaderPinned ? -90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Pin size={16} className="rotate-135" />
              </motion.div>
            </button>

            <AccountMenu 
              user={user} 
              view={view} 
              setView={setView} 
              recentCharacters={recentCharacters}
              currentCharacterId={currentCharacterId}
              confirmNavigation={confirmNavigation}
              onSelect={selectCharacter}
              onRemoveRecent={removeFromRecent}
              onLogout={logout}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHeaderPinned(!isHeaderPinned)}
              className={`p-2 rounded-full transition-colors ${isHeaderPinned ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
              title={isHeaderPinned ? "取消固定顶部栏" : "固定顶部栏"}
            >
              <motion.div
                animate={{ rotate: isHeaderPinned ? -90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Pin size={16} className="rotate-135" />
              </motion.div>
            </button>
            <button 
              onClick={() => handleLogin(googleProvider)}
              className="px-3 py-1.5 bg-white text-stone-800 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-stone-100 transition-colors"
            >
              <User size={14} /> 登录
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { googleProvider } from './lib/firebase';

// Components
import BBCodeTemplateEditor from './components/BBCodeTemplateEditor';
import VaultContent from './components/character/VaultContent';
import AccountSettings from './components/character/AccountSettings';

// Layout & Editor Components
import AppHeader from './components/layout/AppHeader';
import AppFooter from './components/layout/AppFooter';
import AppOverlays from './components/layout/AppOverlays';
import CharacterEditor from './components/editor/CharacterEditor';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { VaultProvider, useVault } from './contexts/VaultContext';
import { CharacterProvider, useCharacter } from './contexts/CharacterContext';

export default function App() {
  console.log('>>> [APP] HELLO WORLD - VERSION 0.1 <<<');
  return (
    <AuthProvider>
      <UIProvider>
        <VaultProvider>
          <CharacterProvider>
            <AppContent />
          </CharacterProvider>
        </VaultProvider>
      </UIProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const {
    view,
    isHeaderPinned,
    setIsHeaderVisible,
  } = useUI();

  const { handleNew } = useCharacter();

  const {
    user,
    handleLogin
  } = useAuth();

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-ink selection:bg-primary/20 flex flex-col h-screen overflow-hidden relative">
      <div className="fixed top-0 left-0 right-0 h-[36px] z-[60] pointer-events-auto" onMouseEnter={() => setIsHeaderVisible(true)} />

      <AppHeader />

      <AppOverlays />

      <motion.div 
        animate={{ height: isHeaderPinned ? 56 : 0, opacity: isHeaderPinned ? 1 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="shrink-0 overflow-hidden"
      />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'editor' && <CharacterEditor user={user} />}

          {view === 'vault' && (
            <motion.div key="vault" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-hidden">
              {user ? (
                <VaultContent user={user} onAdd={handleNew} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-50">
                  <User size={64} className="text-stone-300 mb-6" />
                  <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">未检测到登录状态</h2>
                  <button onClick={() => handleLogin(googleProvider)} className="px-8 py-3 bg-stone-800 text-white rounded-lg font-bold shadow-xl flex items-center gap-3">{t('common.login')}</button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-hidden">
              {user ? (
                <AccountSettings />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-stone-50">
                  <ShieldCheck size={64} className="text-stone-300 mb-4" />
                  <p className="text-stone-500 mt-2">请先登录</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'bbcode-template' && (
            <motion.div key="bbcode-template" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-hidden">
              <BBCodeTemplateEditor />
            </motion.div>
          )}

          {view === 'about' && (
            <motion.div key="about" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 p-8 mt-8">
                <h1 className="text-3xl font-serif font-bold mb-4">关于本系统</h1>
                <p className="text-stone-600 leading-relaxed mb-4">
                  人物卡管理系统是一个专为 PF1 跑团玩家设计的工具，旨在提供便捷的角色数据管理与 BBCode 导出功能。
                </p>
                <p className="text-stone-500 text-sm italic">
                  内容稍后填写...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AppFooter user={user} />
      <GlobalSavingOverlay />
    </div>
  );
}

function GlobalSavingOverlay() {
  const { t } = useTranslation();
  const { isSaving } = useCharacter();
  if (!isSaving) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
       <div className="bg-white p-4 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-200">
          <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-stone-800 underline decoration-stone-200 underline-offset-4">{t('common.saving')}</span>
       </div>
    </div>
  );
}

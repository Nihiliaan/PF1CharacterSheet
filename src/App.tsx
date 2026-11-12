import React, { useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { googleProvider } from './lib/firebase';

// Lazy-loaded Views (Code Splitting)
const SvgTemplateEditor = lazy(() => import('./components/SvgTemplateEditor'));
const VaultContent = lazy(() => import('./components/vault/VaultContent'));
const SettingsCenter = lazy(() => import('./components/settings/SettingsCenter'));

// Eager Components
import EditorPanes from './components/editor/EditorPanes';
import FloatingBall from './components/layout/FloatingBall';
import ExplorerSidebar from './components/layout/ExplorerSidebar';
import AppOverlays from './components/layout/AppOverlays';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { VaultProvider, useVault } from './contexts/VaultContext';
import { CharacterProvider, useCharacter } from './contexts/CharacterContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { listenForOpenRequests } from './utils/tabHandoff';

const ViewLoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center bg-stone-50/50">
    <div className="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <UIProvider>
          <VaultProvider>
            <CharacterProvider>
              <AppContent />
            </CharacterProvider>
          </VaultProvider>
        </UIProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('common.app_title');
  }, [t, i18n.language]);
  const {
    view,
  } = useUI();

  const { handleNew, selectCharacter, handleSave } = useCharacter();

  // 监听其他标签页转交来的打开请求：以新选项卡方式打开文档并聚焦本窗口
  useEffect(() => {
    const cleanup = listenForOpenRequests(docId => {
      Promise.resolve(selectCharacter(docId, true, true)).catch(console.error);
      window.focus();
    });
    return cleanup;
  }, [selectCharacter]);

  // 全局 Ctrl+S / Cmd+S：保存当前编辑中的人物卡（工具栏快捷按钮的 title 一直承诺了这个快捷键）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (view === 'editor') {
          Promise.resolve(handleSave()).catch(console.error);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleSave]);

  const {
    user,
    handleLogin
  } = useAuth();

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-ink selection:bg-primary/20 flex h-screen overflow-hidden relative">
      <AppOverlays />

      {/* 左侧常驻资源管理器（VS Code 式：全高贴顶，含打开的编辑器与档案库树） */}
      <ExplorerSidebar />

      {/* 右侧：分栏编辑器 或 全屏视图（档案库网格/SVG工坊/设置/关于） */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {(view === 'editor' || view === 'new-tab') && <EditorPanes />}

          {view === 'vault' && (
            <motion.div key="vault" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-hidden">
              {user ? (
                <Suspense fallback={<ViewLoadingFallback />}>
                  <VaultContent user={user} onAdd={handleNew} />
                </Suspense>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-50">
                  <User size={64} className="text-stone-300 mb-6" />
                  <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">{t('common.not_logged_in')}</h2>
                  <button onClick={() => handleLogin(googleProvider)} className="px-8 py-3 bg-stone-800 text-white rounded-lg font-bold shadow-xl flex items-center gap-3">{t('common.login')}</button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full overflow-hidden">
              <Suspense fallback={<ViewLoadingFallback />}>
                <SettingsCenter />
              </Suspense>
            </motion.div>
          )}

          {view === 'svg-template' && (
            <motion.div key="svg-template" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-hidden">
              <Suspense fallback={<ViewLoadingFallback />}>
                <SvgTemplateEditor />
              </Suspense>
            </motion.div>
          )}

          {view === 'about' && (
            <motion.div key="about" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-2xl mx-auto space-y-8 mt-8 pb-12">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
                  <h1 className="text-3xl font-serif font-bold mb-6 text-stone-900">{t('about.title')}</h1>
                  <div className="prose prose-stone max-w-none">
                    <p className="text-lg text-stone-700 leading-relaxed mb-6 font-medium">
                      {t('about.description')}
                    </p>
                    
                    <h2 className="text-xl font-bold text-stone-800 mb-3 border-b border-stone-100 pb-2">{t('about.philosophy_title')}</h2>
                    <p className="text-stone-600 mb-6 leading-relaxed">
                      {t('about.philosophy_content')}
                    </p>

                    <h2 className="text-xl font-bold text-stone-800 mb-3 border-b border-stone-100 pb-2">{t('about.features_title')}</h2>
                    <ul className="space-y-3 mb-8">
                      {(t('about.features_list', { returnObjects: true }) as string[]).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-stone-600">
                          <span className="text-stone-400 mt-1">✦</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="pt-6 border-t border-stone-100 text-center">
                      <p className="text-stone-400 text-sm italic font-serif">
                        {t('about.footer')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

      {/* 悬浮球：固定右侧的全局控制入口（视图导航 / 语言 / 设置 / 账号） */}
      <FloatingBall />

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

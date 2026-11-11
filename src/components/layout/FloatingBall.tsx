/**
 * 悬浮球（FloatingBall）：固定在右侧的全局控制入口。
 * 收起态：40px 深色圆形球（登录头像，未登录为 User 图标）；
 * 点击展开：白色圆角卡片面板（右对齐），内容分三组：
 *  - 视图入口：人物卡编辑器 / GM 视图 / BBCode 编辑器 / 关于（带当前视图高亮）；
 *  - 全局：语言切换（三语循环）+ 系统设置；
 *  - 账号：最近打开的人物卡（含删除记录）、退出登录 / 登录按钮。
 * 状态全部自取 Context；展开交互为简单点击开合（点击外部关闭）。
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LayoutGrid, FileText, Copy, Info, Languages, Settings, LogOut, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { googleProvider } from '../../lib/firebase';
import { logout } from '../../services/authService';

import { useUI } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';
import MarkdownPreview from '../common/MarkdownPreview';
import type { RecentCharacterItem } from './AppHeader/shared';

export default function FloatingBall() {
  const { t, i18n } = useTranslation();
  const { user, handleLogin } = useAuth();
  const { view, setView, recentCharacterIds, removeFromRecent } = useUI();
  const { openCharacterTab, openTemplateTab, selectCharacter } = useCharacter();
  const { myCharacters } = useVault();

  const [isOpen, setIsOpen] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);

  // 点击面板外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ballRef.current && !ballRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 最近打开的人物卡（自原 AppHeader / AccountMenu 迁入）
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

  const displayRecent = recentCharacters.slice(0, 5);

  // 语言切换：简体 → 繁体 → 英文 → 简体 三语循环（自原 HeaderAccountArea 迁入）
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

  // 视图入口项的统一点击处理：执行动作后收起面板
  const withClose = (action: () => void) => () => {
    action();
    setIsOpen(false);
  };

  // 视图入口按钮的通用样式（当前视图高亮）
  const viewBtnClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
      active ? 'bg-primary/10 text-primary font-bold' : 'text-stone-700 hover:bg-stone-100'
    }`;
  const viewIconClass = (active: boolean) => (active ? 'text-primary' : 'text-stone-400');

  return (
    <div className="fixed right-4 top-[88px] z-[80]" ref={ballRef}>
      {/* 收起态：圆形悬浮球（登录头像 / 未登录 User 图标） */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-10 h-10 rounded-full bg-stone-800 text-white shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-white/70 hover:bg-stone-700 transition-colors cursor-pointer"
        title={user?.displayName || t('common.login')}
      >
        {user ? (
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
            alt="avatar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User size={18} />
        )}
      </button>

      {/* 展开态：全局控制面板（白色圆角卡，右对齐） */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-xl py-1 z-[90] max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar"
          >
            {/* —— 视图入口 —— */}
            <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t('common.views', '视图')}
            </div>
            <button
              onClick={withClose(() => openCharacterTab())}
              className={viewBtnClass(view === 'editor')}
            >
              <LayoutGrid size={16} className={viewIconClass(view === 'editor')} />
              <span>{t('common.character_editor')}</span>
            </button>

            <button
              onClick={withClose(() => setView('gm-view'))}
              className={viewBtnClass(view === 'gm-view')}
            >
              <FileText size={16} className={viewIconClass(view === 'gm-view')} />
              <span>{t('common.gm_view')}</span>
            </button>

            <button
              onClick={withClose(() => openTemplateTab(false))}
              className={viewBtnClass(view === 'bbcode-template')}
            >
              <Copy size={16} className={viewIconClass(view === 'bbcode-template')} />
              <span>{t('common.bbcode_editor')}</span>
            </button>

            <button
              onClick={withClose(() => setView('about'))}
              className={viewBtnClass(view === 'about')}
            >
              <Info size={16} className={viewIconClass(view === 'about')} />
              <span>{t('common.about')}</span>
            </button>

            {/* —— 全局 —— */}
            <div className="h-px bg-stone-100 my-1" />
            <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t('common.global', '全局')}
            </div>
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
              title={getLanguageTitle()}
            >
              <Languages size={16} className="text-stone-400" />
              <span className="flex-1 text-left">Language</span>
              <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                {getLanguageLabel()}
              </span>
            </button>

            <button
              onClick={withClose(() => setView('settings'))}
              className={viewBtnClass(view === 'settings')}
            >
              <Settings size={16} className={viewIconClass(view === 'settings')} />
              <span>{t('common.settings')}</span>
            </button>

            {/* —— 账号 —— */}
            <div className="h-px bg-stone-100 my-1" />
            <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t('common.account', '账号')}
            </div>

            {user ? (
              <>
                {/* 最近打开的人物卡（原 AccountMenu 最近列表迁移，含删除记录按钮） */}
                <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-stone-500">
                  <RotateCcw size={13} className="text-stone-400" />
                  <span>{t('common.recent_characters')}</span>
                </div>
                <div className="pb-1">
                  {displayRecent.length === 0 ? (
                    <div className="px-4 py-2 text-xs text-stone-400 italic text-center">
                      {t('common.no_recent')}
                    </div>
                  ) : (
                    displayRecent.map((char: RecentCharacterItem) => (
                      <div key={char.id} className="relative group/item">
                        <button
                          onClick={withClose(() => selectCharacter(char.id, true))}
                          className="w-full flex items-center gap-3 px-4 py-1.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors text-left pr-12"
                        >
                          <img
                            src={char.avatar || `https://ui-avatars.com/api/?name=${char.name}`}
                            className="w-8 h-8 rounded-lg object-cover bg-stone-100 border border-stone-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <MarkdownPreview text={char.name} className="font-bold truncate text-stone-800 block text-sm" />
                            <MarkdownPreview text={char.classes || t('common.unknown_class')} className="text-[10px] text-stone-400 truncate tracking-tight block" />
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromRecent(char.id); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all rounded-md hover:bg-rose-50"
                          title={t('common.delete_record')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="h-px bg-stone-100 my-1" />
                <button
                  onClick={withClose(() => { logout(); })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} />
                  <span>{t('common.logout')}</span>
                </button>
              </>
            ) : (
              <div className="px-4 py-2">
                <button
                  onClick={withClose(() => handleLogin(googleProvider))}
                  className="w-full px-3 py-2 bg-stone-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
                >
                  <User size={14} /> {t('common.login')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

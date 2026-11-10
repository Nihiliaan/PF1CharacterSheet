/**
 * AppHeader 子组件：顶栏右侧工具区。
 * 包含语言切换、固定顶栏、系统设置按钮，以及账号菜单（已登录）或登录按钮（未登录）。
 * 语言切换的辅助函数随本块从容器迁入；其余状态与回调由容器 AppHeader.tsx 通过 props 传入。
 */
import { motion } from 'motion/react';
import { Languages, Pin, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AccountMenu from '../../account/AccountMenu';
import { logout } from '../../../services/authService';
import type { User as FirebaseUser } from 'firebase/auth';
import type { ViewType } from '../../../contexts/UIContext';
import type { RecentCharacterItem } from './shared';

interface HeaderAccountAreaProps {
  user: FirebaseUser | null;
  /** 使用 Google 登录（provider 由容器闭包持有） */
  onLogin: () => void;
  isHeaderPinned: boolean;
  onTogglePin: () => void;
  view: ViewType;
  setView: (view: ViewType) => void;
  recentCharacters: RecentCharacterItem[];
  currentCharacterId: string | null;
  currentTemplateId: string | null;
  onSelectCharacter: (id: string, skipDirtyCheck?: boolean) => Promise<void>;
  onRemoveRecent: (id: string) => void;
}

export default function HeaderAccountArea({
  user,
  onLogin,
  isHeaderPinned,
  onTogglePin,
  view,
  setView,
  recentCharacters,
  currentCharacterId,
  currentTemplateId,
  onSelectCharacter,
  onRemoveRecent
}: HeaderAccountAreaProps) {
  const { t, i18n } = useTranslation();

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

  return (
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
        onClick={onTogglePin}
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

      {/* Settings Button */}
      <button
        onClick={() => setView('settings')}
        className={`p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-primary text-white shadow-xs' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
        title="系统设置"
      >
        <Settings size={16} />
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
          onSelect={onSelectCharacter}
          onRemoveRecent={onRemoveRecent}
          onLogout={logout}
        />
      ) : (
        <button
          onClick={onLogin}
          className="px-3 py-1.5 bg-white text-stone-800 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-stone-100 transition-colors ml-1"
        >
          <User size={14} /> {t('common.login')}
        </button>
      )}
    </div>
  );
}

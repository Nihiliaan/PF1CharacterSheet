/**
 * 悬浮球（FloatingBall）：屏幕右侧的全局控制入口。
 * - 可拖动：按住球体自由拖动，松开后水平方向吸附至屏幕右缘，垂直位置记忆（localStorage）
 * - 点击（未拖动）展开面板：语言切换 / 设置 / 关于 / 退出登录（未登录为登录按钮）
 * - 面板锚定球体，球位于屏幕下半部时向上展开
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Info, Languages, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { googleProvider } from '../../lib/firebase';
import { logout } from '../../services/authService';

import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';

const KEY_TOP = 'pf1_ball_top';
const BALL_MARGIN = 16;
const BALL_SIZE = 40;

export default function FloatingBall() {
  const { t, i18n } = useTranslation();
  const { user, handleLogin } = useAuth();
  const { view, setView } = useUI();

  const [isOpen, setIsOpen] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);

  // 垂直位置（水平方向恒吸附右缘）；拖拽中的临时坐标单独存放
  const [top, setTop] = useState(() => {
    const saved = Number(localStorage.getItem(KEY_TOP));
    const maxTop = (typeof window !== 'undefined' ? window.innerHeight : 800) - BALL_SIZE - 8;
    return saved >= 8 && saved <= maxTop ? saved : 88;
  });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef(top);
  posRef.current = top;
  const movedRef = useRef(false);

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

  // 拖动球体：自由移动，松开后水平吸附右缘、垂直位置持久化；位移超过 4px 视为拖动而非点击
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = posRef.current;
    movedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - startY) > 4 || Math.abs(ev.clientX - startX) > 4) {
        movedRef.current = true;
      }
      if (!movedRef.current) return;
      const maxY = window.innerHeight - BALL_SIZE - 8;
      setDragPos({
        x: Math.min(window.innerWidth - BALL_SIZE - 8, Math.max(8, ev.clientX - BALL_SIZE / 2)),
        y: Math.min(maxY, Math.max(8, startTop + (ev.clientY - startY))),
      });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragPos(null);
      if (movedRef.current) {
        // 靠右吸附：水平归位；垂直位置取拖拽终点并持久化
        const maxY = window.innerHeight - BALL_SIZE - 8;
        const nextTop = Math.min(maxY, Math.max(8, startTop + (ev.clientY - startY)));
        setTop(nextTop);
        localStorage.setItem(KEY_TOP, String(nextTop));
      } else {
        // 视为点击：开合面板
        setIsOpen(o => !o);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // 语言切换：简体 → 繁体 → 英文 → 简体 三语循环
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

  // 菜单项统一点击处理：执行动作后收起面板
  const withClose = (action: () => void) => () => {
    action();
    setIsOpen(false);
  };

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
      active ? 'bg-primary/10 text-primary font-bold' : 'text-stone-700 hover:bg-stone-100'
    }`;
  const iconClass = (active: boolean) => (active ? 'text-primary' : 'text-stone-400');

  // 球位于屏幕下半部时面板向上展开
  const openUpward = top > window.innerHeight / 2;

  return (
    <div
      ref={ballRef}
      className="fixed z-[80]"
      style={dragPos ? { left: dragPos.x, top: dragPos.y } : { right: BALL_MARGIN, top }}
    >
      {/* 收起态：圆形悬浮球（登录头像 / 未登录 User 图标）；可拖动，点击开合 */}
      <button
        onPointerDown={startDrag}
        className={`w-10 h-10 rounded-full bg-stone-800 text-white shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-white/70 hover:bg-stone-700 transition-colors ${
          dragPos ? 'cursor-grabbing scale-105' : 'cursor-grab'
        }`}
        title={user?.displayName || t('common.login')}
      >
        {user ? (
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
            alt="avatar"
            className="w-full h-full object-cover pointer-events-none"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <User size={18} className="pointer-events-none" />
        )}
      </button>

      {/* 展开态：全局控制面板（白卡，锚定球体，下半屏向上展开） */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.96 }}
            className={`absolute right-0 w-56 bg-white border border-stone-200 rounded-xl shadow-xl py-1 z-[90] ${
              openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
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

            <button onClick={withClose(() => setView('settings'))} className={itemClass(view === 'settings')}>
              <Settings size={16} className={iconClass(view === 'settings')} />
              <span>{t('common.settings')}</span>
            </button>

            <button onClick={withClose(() => setView('about'))} className={itemClass(view === 'about')}>
              <Info size={16} className={iconClass(view === 'about')} />
              <span>{t('common.about')}</span>
            </button>

            <div className="h-px bg-stone-100 my-1" />

            {user ? (
              <button
                onClick={withClose(() => { logout(); })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                <span>{t('common.logout')}</span>
              </button>
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

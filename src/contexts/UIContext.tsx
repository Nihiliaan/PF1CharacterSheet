import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

export type ViewType = 'editor' | 'vault' | 'settings' | 'bbcode-template' | 'svg-template' | 'about' | 'new-tab';

interface UIContextType {
  // Navigation
  view: ViewType;
  setView: (view: ViewType) => void;
  /** GM 紧凑数据卡模式：人物卡编辑器内的显示模式开关（工具条保持原位） */
  gmCompactMode: boolean;
  setGmCompactMode: (mode: boolean) => void;

  // Toast
  /** 显示全局通知（底层由 sonner 渲染，支持堆叠） */
  setToast: (toast: { message: string; type?: 'success' | 'error' | 'info' } | null) => void;

  // Confirm Modal
  confirmModal: { title: string, onConfirm: () => void, onSecondaryConfirm?: () => void, onCancel?: () => void } | null;
  setConfirmModal: (modal: { title: string, onConfirm: () => void, onSecondaryConfirm?: () => void, onCancel?: () => void } | null) => void;

  // Header state
  isHeaderPinned: boolean;
  setIsHeaderPinned: (pinned: boolean) => void;
  isHeaderVisible: boolean;
  setIsHeaderVisible: (visible: boolean) => void;

  // Recent Characters
  recentCharacterIds: string[];
  addToRecent: (char: any) => void;
  removeFromRecent: (id: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setViewState] = useState<ViewType>('editor');
  // Toast：API 保持不变（调用方零改动），渲染交给 sonner（支持堆叠/动画/自动消失）
  const setToast = useCallback((t: { message: string; type?: 'success' | 'error' | 'info' } | null) => {
    if (!t) return;
    if (t.type === 'success') sonnerToast.success(t.message);
    else if (t.type === 'error') sonnerToast.error(t.message);
    else sonnerToast.info(t.message);
  }, []);
  const [confirmModal, setConfirmModal] = useState<{ title: string, onConfirm: () => void, onSecondaryConfirm?: () => void, onCancel?: () => void } | null>(null);

  const [isHeaderPinned, setIsHeaderPinnedState] = useState(() => localStorage.getItem('header_pinned') !== 'false');
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  const [recentCharacterIds, setRecentCharacterIds] = useState<string[]>([]);
  // GM 紧凑数据卡模式：人物卡编辑器内的显示模式开关（非独立视图，工具条保持原位）
  const [gmCompactMode, setGmCompactMode] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('header_pinned', String(isHeaderPinned));
  }, [isHeaderPinned]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_character_ids') || localStorage.getItem('recent_characters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const ids = parsed.map((item: any) => typeof item === 'string' ? item : item.id).filter(Boolean);
          setRecentCharacterIds(ids);
        }
      } catch (e) { console.error("[UIContext] Failed to parse recent character ids:", e); }
    }
  }, []);

  const setView = (v: ViewType) => setViewState(v);

  const setIsHeaderPinned = (v: boolean) => setIsHeaderPinnedState(v);

  const addToRecent = (char: any) => {
    const id = typeof char === 'string' ? char : char?.id;
    if (!id) return;
    setRecentCharacterIds(prev => {
      const filtered = prev.filter(i => i !== id);
      const next = [id, ...filtered].slice(0, 10);
      localStorage.setItem('recent_character_ids', JSON.stringify(next));
      return next;
    });
  };

  const removeFromRecent = (id: string) => {
    setRecentCharacterIds(prev => {
      const next = prev.filter(i => i !== id);
      localStorage.setItem('recent_character_ids', JSON.stringify(next));
      return next;
    });
  };

  const value: UIContextType = {
    view, setView,
    gmCompactMode, setGmCompactMode,
    setToast,
    confirmModal, setConfirmModal,
    isHeaderPinned, setIsHeaderPinned,
    isHeaderVisible, setIsHeaderVisible,
    recentCharacterIds, addToRecent, removeFromRecent
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

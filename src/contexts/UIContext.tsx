import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewType = 'editor' | 'vault' | 'settings' | 'bbcode-template' | 'about';

interface UIContextType {
  // Navigation
  view: ViewType;
  setView: (view: ViewType) => void;

  // Toast
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  setToast: (toast: { message: string; type?: 'success' | 'error' | 'info' } | null) => void;

  // Confirm Modal
  confirmModal: { title: string, onConfirm: () => void, onSecondaryConfirm?: () => void } | null;
  setConfirmModal: (modal: { title: string, onConfirm: () => void, onSecondaryConfirm?: () => void } | null) => void;

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
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string, onConfirm: () => void, onSecondaryConfirm?: () => void } | null>(null);

  const [isHeaderPinned, setIsHeaderPinnedState] = useState(() => localStorage.getItem('header_pinned') !== 'false');
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  const [recentCharacterIds, setRecentCharacterIds] = useState<string[]>([]);

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
    toast, setToast,
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

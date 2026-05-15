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
  recentCharacters: any[];
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

  const [recentCharacters, setRecentCharacters] = useState<any[]>([]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('header_pinned', String(isHeaderPinned));
  }, [isHeaderPinned]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_characters');
    if (saved) {
      try { setRecentCharacters(JSON.parse(saved)); }
      catch (e) { console.error("Recent chars load failed", e); }
    }
  }, []);

  const setView = (v: ViewType) => setViewState(v);

  const setIsHeaderPinned = (v: boolean) => setIsHeaderPinnedState(v);

  const addToRecent = (char: any) => {
    if (!char || !char.id) return;
    setRecentCharacters(prev => {
      const filtered = prev.filter(p => p.id !== char.id);
      const data = char.data || {};
      const name = data.basic?.name || char.name || '未命名';
      const newItem = {
        id: char.id,
        name: name,
        avatar: char.isTemplate ? 'https://ui-avatars.com/api/?name=T&background=6366f1&color=fff' : (data.basic?.avatars?.url?.[0] || ''),
        classes: data.basic?.classes || char.classes || '',
        data: data
      };
      const next = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem('recent_characters', JSON.stringify(next));
      return next;
    });
  };

  const removeFromRecent = (id: string) => {
    setRecentCharacters(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('recent_characters', JSON.stringify(next));
      return next;
    });
  };

  const value: UIContextType = {
    view, setView,
    toast, setToast,
    confirmModal, setConfirmModal,
    isHeaderPinned, setIsHeaderPinned,
    isHeaderVisible, setIsHeaderVisible,
    recentCharacters, addToRecent, removeFromRecent
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

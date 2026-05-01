import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, githubProvider, discordProvider } from '../lib/firebase';
import { loginWithProvider, logout as authLogout, linkAccount, unlinkProvider } from '../services/authService';
import { CharacterData, FolderMetadata, CharacterMetadata } from '../types';
import { DEFAULT_DATA } from '../constants';
import { getDriveAccessToken, ensureFolder as ensureFolderDrive, uploadOrUpdateFile, listDriveFiles, getFileContent, findPF1Root } from '../services/googleDriveService';
import { getMyCharacters, getFolders, saveCharacter as saveCharacterService, getCharacterById, deleteCharacter as deleteCharacterService, deleteFolder as deleteFolderService, renameItem as renameItemService, moveCharacter as moveCharacterService, moveFolder as moveFolderService, createFolder as createFolderService, copyCharacter as copyCharacterService, ensureLocalFolder as ensureLocalFolderService, saveLink } from '../services/characterService';
import { extractCharacterFromText } from '../services/aiService';
import { generateBBCode } from '../utils/bbcodeExporter';
import { DEFAULT_BBCODE_TEMPLATE } from '../components/BBCodeTemplateEditor';

interface CharacterContextType {
  // State
  data: CharacterData;
  setData: React.Dispatch<React.SetStateAction<CharacterData>>;
  lastSavedData: CharacterData;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  currentCharacterId: string | null;
  setCurrentCharacterId: (id: string | null) => void;
  isSaving: boolean;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  confirmModal: { title: string, onConfirm: () => void, onSecondaryConfirm?: () => void } | null;
  setConfirmModal: (modal: any) => void;
  tableActionMode: 'drag' | 'delete';
  toggleTableActionMode: () => void;
  dragEnabledFor: string | null;
  setDragEnabledFor: (id: string | null) => void;

  // Vault State
  myCharacters: any[];
  folders: any[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  refreshCharacterList: () => Promise<void>;

  // Actions
  updateBasic: (key: string, val: any) => void;
  updateDefenses: (key: string, val: any) => void;
  addBag: () => void;
  removeBag: (id: string) => void;
  updateBagName: (id: string, name: string) => void;
  toggleBagWeight: (id: string, ignoreWeight: boolean) => void;
  updateBagItems: (id: string, items: any[]) => void;

  addMagicBlock: (type: 'text' | 'table') => void;
  updateMagicBlock: (id: string, updates: any) => void;
  removeMagicBlock: (id: string) => void;

  addAdditionalBlock: (type: 'text' | 'table' | 'image') => void;
  updateAdditionalBlock: (id: string, updates: any) => void;
  removeAdditionalBlock: (id: string) => void;

  // Auth State
  user: FirebaseUser | null;
  handleLogin: (provider: any) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleLinkAccount: (provider: any) => Promise<void>;
  handleUnlinkProvider: (providerId: string) => Promise<void>;

  // View & Navigation
  view: 'editor' | 'vault' | 'settings' | 'bbcode-template';
  setView: (view: 'editor' | 'vault' | 'settings' | 'bbcode-template') => void;
  recentCharacters: any[];
  addToRecent: (char: any) => void;
  removeFromRecent: (id: string) => void;

  // Header UI State
  isHeaderPinned: boolean;
  setIsHeaderPinned: (pinned: boolean) => void;
  isHeaderVisible: boolean;
  setIsHeaderVisible: (visible: boolean) => void;

  // AI Configuration
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (show: boolean) => void;
  aiInputText: string;
  setAiInputText: (text: string) => void;

  // AI State
  showAIModal: boolean;
  setShowAIModal: (val: boolean) => void;
  handleAIExtract: (inputText?: string, apiKey?: string) => Promise<void>;
  isAILoading: boolean;
  aiStatusMsg: string;

  // Persistence & Global
  // Drive & Vault State
  driveModal: { isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null;
  setDriveModal: (val: any) => void;
  isSyncingDrive: boolean;

  // Handlers
  handleBrowseDrive: () => Promise<void>;
  navigateDrive: (folderId: string, folderName: string) => Promise<void>;
  navigateToPathIndex: (index: number) => Promise<void>;
  importFromDrive: (item: any) => Promise<void>;
  handleCloudBackup: () => Promise<void>;
  handleCloudRestore: () => Promise<void>;

  moveCharacter: (id: string, targetId: string | null) => Promise<void>;
  moveFolder: (id: string, targetId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  renameItem: (id: string, type: 'character' | 'folder', newName: string) => Promise<void>;
  copyCharacter: (id: string) => Promise<void>;
  ensureLocalFolder: (name: string, parentId: string | null, userId: string) => Promise<string>;

  saveCharacter: (data: CharacterData, id?: string | null, folderId?: string | null) => Promise<string | undefined>;
  handleSave: () => Promise<string | undefined>;
  handleNew: (confirmNavigation: (cb: () => void) => void) => void;
  handleShare: () => void;
  handleExport: () => void;
  handleExportBBCode: () => void;
  selectCharacter: (id: string, skipDirtyCheck?: boolean) => Promise<void>;
  loadSharedCharacter: (id: string) => Promise<void>;

  // Drag & Drop
  handleTableItemDragStart: (listKey: string, itemIndex: number, e: React.DragEvent) => void;
  handleTableItemDragOver: (listKey: string, targetItemIndex: number, e: React.DragEvent) => void;
  handleTableItemDrop: (listKey: string, targetItemIndex: number, e: React.DragEvent) => void;
  handleBagDragStart: (e: React.DragEvent, index: number) => void;
  handleBagDragOver: (e: React.DragEvent, targetIndex: number) => void;
  handleBagDrop: (e: React.DragEvent, dropIndex: number) => void;
  handleItemDragStart: (bagId: string, itemIndex: number, e: React.DragEvent) => void;
  handleItemDragOver: (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => void;
  handleItemDrop: (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => void;
  handleDrop: (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => void;

  // Toast State
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  setToast: (val: any) => void;

  // Helpers
  isDirty: boolean;

  // BBCode Templates
  bbcodeTemplate: string;
  setBbcodeTemplate: (template: string) => void;
  saveAsTemplate: (name: string, content: string) => Promise<void>;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (!context) throw new Error('useCharacter must be used within a CharacterProvider');
  return context;
};

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [view, setViewState] = useState<'editor' | 'vault' | 'settings' | 'bbcode-template'>('editor');

  // Header UI State
  const [isHeaderPinned, setIsHeaderPinnedState] = useState(() => localStorage.getItem('header_pinned') === 'true');
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  // Recent Characters
  const [recentCharacters, setRecentCharacters] = useState<any[]>([]);

  // AI Configuration
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('user_gemini_api_key'));
  const [aiInputText, setAiInputText] = useState('');

  // BBCode Templates
  const [bbcodeTemplate, setBbcodeTemplate] = useState(() => localStorage.getItem('bbcode_template') || '');

  // Initial Sync Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      try {
        // 1. Initial Character Load from URL
        const urlParams = new URLSearchParams(window.location.search);
        let charId = urlParams.get('id');
        
        // If no ID in URL, try to get the most recent one from local storage
        if (!charId) {
          const saved = localStorage.getItem('recent_characters');
          if (saved) {
            try {
              const recent = JSON.parse(saved);
              if (Array.isArray(recent) && recent.length > 0) {
                charId = recent[0].id;
              }
            } catch (e) {
              console.error("Failed to parse recent characters", e);
            }
          }
        }

        if (charId) {
          const char = await getCharacterById(charId);
          if (char) {
            if (char.isLink && char.targetId) {
              const targetChar = await getCharacterById(char.targetId);
              if (targetChar) {
                setData(targetChar.data);
                setLastSavedData(JSON.parse(JSON.stringify(targetChar.data)));
                setCurrentCharacterId(targetChar.id);
                setIsReadOnly(targetChar.ownerId !== u?.uid);
                setViewState('editor');
                addToRecent(targetChar);

                // Update URL to match loaded character
                const url = new URL(window.location.href);
                url.searchParams.set('id', targetChar.id);
                window.history.replaceState({}, '', url.toString());
              }
            } else {
              setData(char.data);
              setLastSavedData(JSON.parse(JSON.stringify(char.data)));
              setCurrentCharacterId(char.id);
              setIsReadOnly(char.ownerId !== u?.uid);
              setViewState('editor');
              addToRecent(char);

              // Update URL to match loaded character
              const url = new URL(window.location.href);
              url.searchParams.set('id', char.id);
              window.history.replaceState({}, '', url.toString());

              // Auto-save link if it's someone else's character and we are logged in
              if (u && char.ownerId !== u.uid) {
                try {
                  const folderId = await ensureLocalFolderService('来自分享', null, u.uid);
                  const existingChars = await getMyCharacters();
                  const existingLink = existingChars?.find(c => c.isLink && c.targetId === char.id);
                  if (!existingLink) {
                    await saveLink(char, folderId);
                  }
                } catch (e) {
                  console.error("Failed to save shared link on initial load:", e);
                }
              }
            }
          }
        }

        // 2. Initial List Refresh (if logged in)
        if (u) {
          await ensureLocalFolderService('来自分享', null, u.uid);
          refreshCharacterList();
        }
      } catch (error) {
        console.error("Initial sync/load failed:", error);
      } finally {
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshCharacterList();
    }
  }, [user]);

  const handleLogin = async (provider: any) => {
    try {
      await loginWithProvider(provider);
      setToast({ message: "登录成功！", type: 'success' });
    } catch (e: any) {
      setToast({ message: "登录失败: " + e.message, type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      setToast({ message: "已退出登录" });
    } catch (e: any) {
      setToast({ message: "退出失败", type: 'error' });
    }
  };

  const handleLinkAccount = async (provider: any) => {
    try {
      await linkAccount(provider);
      setToast({ message: "账号绑定成功" });
    } catch (e: any) {
      if (e.code === 'auth/credential-already-in-use') {
        setToast({ message: "该账号已被其他用户绑定", type: 'error' });
      } else {
        setToast({ message: "绑定失败: " + e.message, type: 'error' });
      }
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    try {
      await unlinkProvider(providerId);
      setToast({ message: "账号解绑成功" });
    } catch (e: any) {
      setToast({ message: "解绑失败: " + e.message, type: 'error' });
    }
  };

  // View & Recent logic
  useEffect(() => {
    localStorage.setItem('header_pinned', String(isHeaderPinned));
  }, [isHeaderPinned]);

  useEffect(() => {
    localStorage.setItem('user_gemini_api_key', userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_characters');
    if (saved) {
      try { setRecentCharacters(JSON.parse(saved)); }
      catch (e) { console.error("Recent chars load failed", e); }
    }
  }, []);

  const setView = (v: any) => {
    setViewState(v);
  };

  const setIsHeaderPinned = (v: boolean) => {
    setIsHeaderPinnedState(v);
  };

  const addToRecent = (char: any) => {
    if (!char || !char.id) return;
    setRecentCharacters(prev => {
      const filtered = prev.filter(p => p.id !== char.id);
      const name = char.name || char.data?.basic?.name || '未命名';
      const newItem = {
        id: char.id,
        name: name,
        avatar: char.avatar || char.data?.basic?.avatars?.[0]?.url || '',
        classes: char.classes || char.data?.basic?.classes || '',
        data: char.data
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

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const [data, setData] = useState<CharacterData>(DEFAULT_DATA);
  const [lastSavedData, setLastSavedData] = useState<CharacterData>(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ title: string, onConfirm: () => void, onSecondaryConfirm?: () => void } | null>(null);
  const [tableActionMode, setTableActionMode] = useState<'drag' | 'delete'>('drag');
  const [dragEnabledFor, setDragEnabledFor] = useState<string | null>(null);

  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  // Refs for Drag & Drop
  const draggedTableItem = useRef<{ listKey: string, itemIndex: number } | null>(null);
  const draggedBagIndex = useRef<number | null>(null);
  const draggedItem = useRef<{ bagId: string, itemIndex: number } | null>(null);
  const draggedBlockId = useRef<string | null>(null);

  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) return false;
    }
    return true;
  };

  useEffect(() => {
    setIsDirty(!isEqual(data, lastSavedData));
  }, [data, lastSavedData]);

  const refreshCharacterList = async () => {
    try {
      const [list, folderList] = await Promise.all([
        getMyCharacters(),
        getFolders()
      ]);
      setMyCharacters(list || []);
      setFolders(folderList || []);
    } catch (e) {
      setToast({ message: "刷新数据失败，请检查连接", type: 'error' });
    }
  };

  const toggleTableActionMode = () => setTableActionMode(p => p === 'drag' ? 'delete' : 'drag');

  const updateBasic = useCallback((key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => ({ ...p, basic: { ...p.basic, [key]: val } }));
  }, [isReadOnly]);

  const updateDefenses = useCallback((key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => ({ ...p, defenses: { ...p.defenses, [key]: val } }));
  }, [isReadOnly]);

  const addBag = () => {
    setData(p => ({
      ...p,
      equipmentBags: [...p.equipmentBags, { id: 'bag-' + Math.random(), name: '新背包 (New Bag)', ignoreWeight: false, items: [] }]
    }));
  };

  const removeBag = (id: string) => {
    setData(p => ({ ...p, equipmentBags: p.equipmentBags.filter(b => b.id !== id) }));
  };

  const updateBagName = (id: string, name: string) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, name } : b)
    }));
  };

  const toggleBagWeight = (id: string, ignoreWeight: boolean) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, ignoreWeight } : b)
    }));
  };

  const updateBagItems = (id: string, items: any[]) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, items } : b)
    }));
  };

  const handleSaveInternal = async (saveData: CharacterData, id?: string | null, folderId?: string | null) => {
    if (!user) {
      setToast({ message: "请先登录后再保存", type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const newId = await saveCharacterService(saveData, id || undefined, folderId);
      if (newId) {
        // If we are saving the current character OR creating a new one (id is null/undefined)
        if (!id || id === currentCharacterId) {
          setCurrentCharacterId(newId);
          setLastSavedData(JSON.parse(JSON.stringify(saveData)));

          // Update URL
          const url = new URL(window.location.href);
          url.searchParams.set('id', newId);
          window.history.replaceState({}, '', url.toString());
        }

        addToRecent({ id: newId, name: saveData.basic.name, data: saveData });
        await refreshCharacterList();
        setToast({ message: id ? "人物卡保存成功！" : "已创建并保存新人物卡" });
        return newId;
      }
    } catch (e: any) {
      setToast({ message: "保存失败: " + e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    return await handleSaveInternal(data, currentCharacterId, currentFolderId);
  };

  const performCreateNew = async () => {
    const newData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    
    if (user) {
      setToast({ message: "正在创建新角色..." });
      try {
        const newId = await saveCharacterService(newData, undefined, currentFolderId);
        if (newId) {
          await refreshCharacterList();
          await selectCharacter(newId, true);
          setToast({ message: "已创建并打开新人物卡" });
        }
      } catch (e: any) {
        setToast({ message: "创建新角色失败", type: 'error' });
      }
    } else {
      setData(newData);
      setLastSavedData(JSON.parse(JSON.stringify(newData)));
      setCurrentCharacterId(null);
      setIsReadOnly(false);
      
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
      setViewState('editor');
    }
  };

  const handleNew = async () => {
    if (isDirty) {
      setConfirmModal({
        title: "确定要新建角色吗？是否保存当前修改？",
        onConfirm: () => performCreateNew(),
        onSecondaryConfirm: async () => {
          await handleSave();
          await performCreateNew();
        }
      });
    } else {
      await performCreateNew();
    }
  };

  const selectCharacter = async (idOrChar: string | any, skipDirtyCheck: boolean = false) => {
    const performSelect = async () => {
      if (typeof idOrChar === 'object' && idOrChar !== null && idOrChar.id) {
        if (idOrChar.isLink && idOrChar.targetId) {
          await loadSharedCharacter(idOrChar.targetId);
          return;
        }
        const char = idOrChar;
        setData(char.data);
        setLastSavedData(JSON.parse(JSON.stringify(char.data)));
        setCurrentCharacterId(char.id);
        setIsReadOnly(char.ownerId !== user?.uid);
        
        if (char.isTemplate) {
          setBbcodeTemplate(char.data.content);
          setViewState('bbcode-template');
          return;
        }

        setViewState('editor');
        addToRecent(char);
        
        const url = new URL(window.location.href);
        url.searchParams.set('id', char.id);
        window.history.replaceState({}, '', url.toString());
        return;
      }

      const id = idOrChar as string;
      setToast({ message: "正在加载人物资料..." });
      try {
        const char = await getCharacterById(id);
        if (char) {
          if (char.isLink && char.targetId) {
            await loadSharedCharacter(char.targetId);
            return;
          }
          setData(char.data);
          setLastSavedData(JSON.parse(JSON.stringify(char.data)));
          setCurrentCharacterId(char.id);
          setIsReadOnly(char.ownerId !== user?.uid);
          
          if (char.isTemplate) {
            setBbcodeTemplate(char.data.content);
            setViewState('bbcode-template');
            return;
          }

          setViewState('editor');
          addToRecent(char);
          
          const url = new URL(window.location.href);
          url.searchParams.set('id', id);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {
        setToast({ message: "加载失败", type: 'error' });
      }
    };

    if (isDirty && !skipDirtyCheck) {
      setConfirmModal({
        title: "是否保存当前修改后再打开新角色？",
        onConfirm: () => performSelect(),
        onSecondaryConfirm: async () => {
          await handleSave();
          await performSelect();
        }
      });
    } else {
      await performSelect();
    }
  };

  const loadSharedCharacter = async (id: string) => {
    setIsReadOnly(true);
    try {
      const char = await getCharacterById(id);
      if (char) {
        setData(char.data);
        setLastSavedData(JSON.parse(JSON.stringify(char.data)));
        setCurrentCharacterId(char.id);
        setViewState('editor');
        
        const url = new URL(window.location.href);
        url.searchParams.set('id', char.id);
        window.history.replaceState({}, '', url.toString());
        
        addToRecent(char);
        if (user && char.ownerId === user.uid) {
          setIsReadOnly(false);
        } else if (user) {
          try {
            const folderId = await ensureLocalFolderService('来自分享', null, user.uid);
            const existingChars = await getMyCharacters();
            const existingLink = existingChars?.find(c => c.isLink && c.targetId === char.id);
            if (!existingLink) {
              await saveLink(char, folderId);
              await refreshCharacterList();
            }
          } catch (e) {
            console.error("Failed to save shared link:", e);
          }
        }
      }
    } catch (e) {
      setToast({ message: "加载分享内容失败", type: 'error' });
    }
  };

  // Drag & Drop Handlers (Ported from App.tsx)
  const handleTableItemDragStart = (listKey: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedTableItem.current = { listKey, itemIndex };
    e.stopPropagation();
  };

  const handleTableItemDragOver = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentDrag = draggedTableItem.current;
    if (currentDrag !== null && currentDrag.listKey === listKey) {
      const sourceItemIndex = currentDrag.itemIndex;
      if (sourceItemIndex !== targetItemIndex) {
        setData(p => {
          const newList = [...(p as any)[listKey]];
          const [item] = newList.splice(sourceItemIndex, 1);
          if (item !== undefined) {
            newList.splice(targetItemIndex, 0, item);
          }
          return { ...p, [listKey]: newList };
        });
        draggedTableItem.current = { listKey, itemIndex: targetItemIndex };
      }
    }
  };

  const handleTableItemDrop = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedTableItem.current = null;
  };

  const handleBagDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedBagIndex.current = index;
  };

  const handleBagDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sourceIndex = draggedBagIndex.current;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      setData(p => {
        const newBags = [...p.equipmentBags];
        const [moved] = newBags.splice(sourceIndex, 1);
        if (moved !== undefined) {
          newBags.splice(targetIndex, 0, moved);
        }
        return { ...p, equipmentBags: newBags };
      });
      draggedBagIndex.current = targetIndex;
    }
  };

  const handleBagDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem.current !== null) {
      const currentDrag = draggedItem.current;
      const sourceBag = data.equipmentBags.find(b => b.id === currentDrag.bagId);
      if (sourceBag) {
        const targetBag = data.equipmentBags[dropIndex];
        if (sourceBag.id !== targetBag.id) {
          const item = sourceBag.items[currentDrag.itemIndex];
          if (item !== undefined) {
            const newBags = data.equipmentBags.map(b => {
              if (b.id === sourceBag.id) {
                return { ...b, items: b.items.filter((_, i) => i !== currentDrag.itemIndex) };
              }
              if (b.id === targetBag.id) {
                return { ...b, items: [...b.items, item] };
              }
              return b;
            });
            setData(p => ({ ...p, equipmentBags: newBags }));
          }
        }
      }
    }
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  const handleItemDragStart = (bagId: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedItem.current = { bagId, itemIndex };
    e.stopPropagation();
  };

  const handleItemDragOver = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentDrag = draggedItem.current;
    if (currentDrag !== null) {
      const { bagId: sourceBagId, itemIndex: sourceItemIndex } = currentDrag;
      if (sourceBagId !== targetBagId || sourceItemIndex !== targetItemIndex) {
        setData(p => {
          const newBags = [...p.equipmentBags];
          const sBagIdx = newBags.findIndex(b => b.id === sourceBagId);
          const tBagIdx = newBags.findIndex(b => b.id === targetBagId);
          if (sBagIdx !== -1 && tBagIdx !== -1) {
            newBags[sBagIdx] = { ...newBags[sBagIdx], items: [...newBags[sBagIdx].items] };
            if (sBagIdx !== tBagIdx) {
              newBags[tBagIdx] = { ...newBags[tBagIdx], items: [...newBags[tBagIdx].items] };
            }
            const [item] = newBags[sBagIdx].items.splice(sourceItemIndex, 1);
            if (item !== undefined) {
              newBags[tBagIdx].items.splice(targetItemIndex, 0, item);
            }
            return { ...p, equipmentBags: newBags };
          }
          return p;
        });
        draggedItem.current = { bagId: targetBagId, itemIndex: targetItemIndex };
      }
    }
  };

  const handleItemDrop = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  const addAdditionalBlock = (type: 'text' | 'table' | 'image') => {
    const newBlock = {
      id: 'add-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : type === 'table' ? '自定表格' : '附加图片',
      content: '',
      url: '',
      columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
      tableData: []
    };
    setData(p => ({ ...p, additionalData: [...p.additionalData, newBlock] }));
  };

  const updateAdditionalBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      additionalData: p.additionalData.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeAdditionalBlock = (id: string) => {
    setData(p => ({ ...p, additionalData: p.additionalData.filter(b => b.id !== id) }));
  };

  const addMagicBlock = (type: 'text' | 'table') => {
    const newBlock = {
      id: 'magic-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : '类别名(e.g已知法术)',
      content: '',
      columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
      tableData: []
    };
    setData(p => ({ ...p, magicBlocks: [...(p.magicBlocks || []), newBlock] }));
  };

  const updateMagicBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      magicBlocks: p.magicBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeMagicBlock = (id: string) => {
    setData(p => ({ ...p, magicBlocks: p.magicBlocks.filter(b => b.id !== id) }));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedBlockId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sourceId = draggedBlockId.current;
    if (sourceId && sourceId !== targetId) {
      setData(p => {
        const arr = [...p[listName]];
        const fromIndex = arr.findIndex(b => b.id === sourceId);
        const toIndex = arr.findIndex(b => b.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return p;
        const [movedBlock] = arr.splice(fromIndex, 1);
        if (movedBlock !== undefined) {
          arr.splice(toIndex, 0, movedBlock);
        }
        return { ...p, [listName]: arr };
      });
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    draggedBlockId.current = null;
  };

  const saveAsTemplate = async (name: string, content: string) => {
    if (!user) {
      setToast({ message: "请先登录", type: 'error' });
      return;
    }
    try {
      const templateFolderId = await ensureLocalFolderService('模板', null, user.uid);
      await saveCharacterService({ content }, undefined, templateFolderId, true);
      await refreshCharacterList();
      setToast({ message: "模板已保存在档案库的「模板」文件夹中", type: 'success' });
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  };

  // Helpers

  const handleShare = () => {
    if (!currentCharacterId) {
      setToast({ message: "请先保存人物卡后再分享", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentCharacterId}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！他人访问此链接将只能查看无法修改。" });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.basic.name || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBBCode = () => {
    const tmpl = localStorage.getItem('bbcode_template') || DEFAULT_BBCODE_TEMPLATE;
    const bbcode = generateBBCode(data, tmpl);
    navigator.clipboard.writeText(bbcode);
    setToast({ message: "BBCode 已复制到剪贴板！可以直接到跑团论坛粘贴。" });
  };

  const showAIModalRef = useRef(showAIModal);
  useEffect(() => {
    showAIModalRef.current = showAIModal;
  }, [showAIModal]);

  const [aiStatusMsg, setAiStatusMsg] = useState('');

  const handleAIExtract = async (inputText?: string, apiKey?: string) => {
    const textToProcess = (typeof inputText === 'string' ? inputText : aiInputText) || '';
    const keyToUse = (typeof apiKey === 'string' ? apiKey : userApiKey) || '';

    if (!textToProcess.trim()) {
      setToast({ message: "请输入待处理的文本", type: 'info' });
      return;
    }
    if (!keyToUse.trim()) {
      setToast({ message: "请在设置中输入 Gemini API Key", type: 'error' });
      setShowApiKeyInput(true);
      return;
    }

    setIsAILoading(true);
    setAiStatusMsg('正在启动神识扫描...');
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI 响应超时，请检查网络连接或 API Key 是否正确。如果是初次使用，可能由于网络环境需要较长时间，或请确保您可以正常访问 Google 服务。")), 90000)
      );
      
      setAiStatusMsg('正在传输数据至 Gemini...');
      const extractionPromise = (async () => {
        const result = await extractCharacterFromText(textToProcess, keyToUse);
        setAiStatusMsg('接收到神识反馈，正在解析结构...');
        return result;
      })();

      const extracted = await Promise.race([
        extractionPromise,
        timeoutPromise
      ]) as any;

      if (!showAIModalRef.current) return;

      setAiStatusMsg('正在同步至跑团卡系统...');
      const mergedData = {
        ...DEFAULT_DATA,
        ...extracted,
        basic: { ...DEFAULT_DATA.basic, ...(extracted.basic || {}) },
        defenses: { ...DEFAULT_DATA.defenses, ...(extracted.defenses || {}) }
      };

      if (extracted.attributes && Array.isArray(extracted.attributes)) {
        const newAttributes = JSON.parse(JSON.stringify(DEFAULT_DATA.attributes));
        extracted.attributes.forEach((extAttr: any) => {
          const idx = newAttributes.findIndex((a: any) => a.name === extAttr.name || (extAttr.name && extAttr.name.includes(a.name)));
          if (idx !== -1) {
            newAttributes[idx] = { ...newAttributes[idx], ...extAttr };
          }
        });
        mergedData.attributes = newAttributes;
      }

      const listFields = ['meleeAttacks', 'rangedAttacks', 'skills', 'feats', 'classFeatures', 'racialTraits', 'backgroundTraits'];
      listFields.forEach(field => {
        if (extracted[field] && Array.isArray(extracted[field])) {
          mergedData[field] = extracted[field];
        } else {
          mergedData[field] = (DEFAULT_DATA as any)[field] || [];
        }
      });

      if (extracted.magicBlocks && Array.isArray(extracted.magicBlocks)) {
        mergedData.magicBlocks = extracted.magicBlocks.map((block: any) => ({
          id: 'mb-' + Math.random().toString(36).substr(2, 9),
          title: block.title || '特殊能力',
          type: block.type || 'text',
          content: block.content || '',
          columns: block.columns || [{ key: 'col1', label: '信息' }],
          tableData: block.tableData || []
        }));
      }

      if (extracted.equipmentBags && Array.isArray(extracted.equipmentBags)) {
        mergedData.equipmentBags = extracted.equipmentBags.map((bag: any) => ({
          id: 'bag-' + Math.random().toString(36).substr(2, 9),
          name: bag.name || '身上',
          ignoreWeight: false,
          items: (bag.items || []).map((item: any) => ({
            item: item.item || '',
            quantity: item.quantity || '1',
            cost: item.cost || '',
            weight: item.weight || '',
          }))
        }));
      }

      setData(mergedData);
      setToast({ message: "AI 识别并填写成功！" });
      setView('editor');
      setCurrentCharacterId(null);
      setShowAIModal(false);
      setAiInputText('');
    } catch (e: any) {
      console.error("AI Extraction Error:", e);
      if (showAIModalRef.current) {
        setToast({ message: "AI 识别失败: " + (e.message || "未能从回复中提取有效数据"), type: 'error' });
      }
    } finally {
      setIsAILoading(false);
      setAiStatusMsg('');
    }
  };

  const [driveModal, setDriveModal] = useState<{ isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleBrowseDrive = async () => {
    if (!user) return;
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      setToast({ message: "请通过 Google 账号登录以使用此功能", type: 'error' });
      return;
    }
    setToast({ message: "正在连接 Google 云端硬盘..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");
      const pf1RootId = await findPF1Root(token);
      if (!pf1RootId) {
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }
      const items = await listDriveFiles(token, pf1RootId);
      setDriveModal({
        isOpen: true,
        currentPath: [{ id: pf1RootId, name: 'PF1CharacterSheet' }],
        items
      });
    } catch (e: any) {
      setToast({ message: "连接失败: " + e.message, type: 'error' });
    }
  };

  const navigateDrive = async (folderId: string, folderName: string) => {
    if (!driveModal) return;
    try {
      const token = await getDriveAccessToken();
      const items = await listDriveFiles(token, folderId);
      setDriveModal({
        ...driveModal,
        currentPath: [...driveModal.currentPath, { id: folderId, name: folderName }],
        items
      });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const navigateToPathIndex = async (index: number) => {
    if (!driveModal) return;
    try {
      const token = await getDriveAccessToken();
      const target = driveModal.currentPath[index];
      const items = await listDriveFiles(token, target.id);
      setDriveModal({
        ...driveModal,
        currentPath: driveModal.currentPath.slice(0, index + 1),
        items
      });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const importFromDrive = async (item: any) => {
    if (!item || !driveModal) return;
    setToast({ message: `正在从云端读取: ${item.name}...` });
    try {
      const token = await getDriveAccessToken();
      let count = 0;
      const targetFolderId = currentFolderId;

      const processItem = async (driveItem: any, targetId: string | null) => {
        if (driveItem.mimeType === 'application/vnd.google-apps.folder') {
          const newLocalId = await ensureLocalFolderService(driveItem.name, targetId, user!.uid);
          const children = await listDriveFiles(token, driveItem.id);
          for (const child of children) {
            await processItem(child, newLocalId);
          }
        } else if (driveItem.name.endsWith('.json')) {
          const content = await getFileContent(token, driveItem.id);
          if (content._isLink && content._targetId) {
             const fakeTargetChar = { id: content._targetId, data: content };
             await saveLink(fakeTargetChar, targetId);
             count++;
          } else if (content.basic && content.attributes) {
            const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || driveItem.name.replace('.json', '') } };
            await handleSaveInternal(finalData, undefined, targetId);
            count++;
          }
        }
      };

      await processItem(item, targetFolderId);
      await refreshCharacterList();
      setToast({ message: `导入成功！共导入 ${count} 个人物卡` });
      setDriveModal(null);
    } catch (e: any) {
      setToast({ message: "导入失败: " + e.message, type: 'error' });
    }
  };

  const handleCloudBackup = async () => {
    if (!user) return;
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      setToast({ message: "请通过 Google 账号登录以使用同步功能", type: 'error' });
      return;
    }

    setIsSyncingDrive(true);
    setToast({ message: "正在备份到 Google 云端硬盘..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");
      const rootFolderId = await ensureFolderDrive(token, "PF1CharacterSheet");
      const driveFolderMap: Record<string, string> = { 'root': rootFolderId };

      const sortedFoldersList = [...folders].sort((a, b) => {
        const getDepth = (id: string | null): number => {
          if (!id) return 0;
          const f = folders.find(f => f.id === id);
          return 1 + getDepth(f?.parentId || null);
        };
        return getDepth(a.parentId) - getDepth(b.parentId);
      });

      for (const folder of sortedFoldersList) {
        const parentDriveId = driveFolderMap[folder.parentId || 'root'];
        const driveId = await ensureFolderDrive(token, folder.name, parentDriveId);
        driveFolderMap[folder.id] = driveId;
      }

      await Promise.all(myCharacters.map(async char => {
        const parentDriveId = driveFolderMap[char.folderId || 'root'] || rootFolderId;
        const rawName = char.name || '未命名角色';
        const rawClasses = char.data?.basic?.classes || '人物卡';
        const fileName = `${rawName.replace(/[\\/:*?"<>|]/g, '_')}_${String(rawClasses).replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)}_${char.id.slice(-6)}.json`;
        let dataToSave = char.data;
        if (char.isLink) {
          dataToSave = { ...char.data, _isLink: true, _targetId: char.targetId };
        }
        await uploadOrUpdateFile(token, fileName, dataToSave, parentDriveId);
      }));

      setToast({ message: "备份成功！所有数据已同步至 PF1CharacterSheet 文件夹" });
    } catch (e: any) {
      console.error(e);
      setToast({ message: `备份失败: ${e.message}`, type: 'error' });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!user) return;
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      setToast({ message: "请通过 Google 账号登录以使用此功能", type: 'error' });
      return;
    }

    setToast({ message: "正在从云端备份还原数据..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");
      const pf1RootId = await findPF1Root(token);
      if (!pf1RootId) {
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }

      let importCount = 0;
      const processDriveFolder = async (driveFolderId: string, localParentId: string | null) => {
        const items = await listDriveFiles(token, driveFolderId);
        for (const item of items) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            const newLocalFolderId = await ensureLocalFolderService(item.name, localParentId, user!.uid);
            await processDriveFolder(item.id, newLocalFolderId);
          } else if (item.name.endsWith('.json')) {
            try {
              const content = await getFileContent(token, item.id);
              if (content._isLink && content._targetId) {
                const fakeTargetChar = { id: content._targetId, data: content };
                await saveLink(fakeTargetChar, localParentId);
                importCount++;
              } else if (content.basic && content.attributes) {
                const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || item.name.split('_')[0].replace('.json', '') } };
                await handleSaveInternal(finalData, undefined, localParentId);
                importCount++;
              }
            } catch (e) {
              console.warn(`Failed to restore file ${item.name}`, e);
            }
          }
        }
      };

      await processDriveFolder(pf1RootId, currentFolderId);
      await refreshCharacterList();
      setToast({ message: `还原成功！共恢复 ${importCount} 个人物卡` });
    } catch (e: any) {
      setToast({ message: "还原失败: " + e.message, type: 'error' });
    }
  };

  // Service Wrappers
  const moveCharacter = async (id: string, targetId: string | null) => {
    await moveCharacterService(id, targetId);
    await refreshCharacterList();
  };

  const moveFolder = async (id: string, targetId: string | null) => {
    await moveFolderService(id, targetId);
    await refreshCharacterList();
  };

  const createFolder = async (name: string, parentId: string | null) => {
    if (!user) return;
    await createFolderService(name, parentId);
    await refreshCharacterList();
  };

  const deleteFolder = async (id: string) => {
    await deleteFolderService(id);
    await refreshCharacterList();
  };

  const deleteCharacter = async (id: string) => {
    await deleteCharacterService(id);
    await refreshCharacterList();
  };

  const renameItem = async (id: string, type: 'character' | 'folder', newName: string) => {
    await renameItemService(id, type, newName);
    await refreshCharacterList();
  };

  const copyCharacter = async (id: string) => {
    await copyCharacterService(id);
    await refreshCharacterList();
  };

  const ensureLocalFolder = async (name: string, parentId: string | null, userId: string): Promise<string> => {
    const id = await ensureLocalFolderService(name, parentId, userId);
    await refreshCharacterList();
    return id;
  };

  const value: CharacterContextType = {
    data, setData, lastSavedData, isReadOnly, setIsReadOnly, currentCharacterId, setCurrentCharacterId, isSaving,
    isSyncing, setIsSyncing, confirmModal, setConfirmModal,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    myCharacters, folders, currentFolderId, setCurrentFolderId, refreshCharacterList,
    updateBasic, updateDefenses, addBag, removeBag, updateBagName, toggleBagWeight, updateBagItems,
    addMagicBlock, updateMagicBlock, removeMagicBlock,
    addAdditionalBlock, updateAdditionalBlock, removeAdditionalBlock,
    handleAIExtract,
    handleSave, handleNew, handleShare, handleExport, handleExportBBCode, selectCharacter, loadSharedCharacter,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop,
    isDirty,
    // Toast
    toast, setToast,
    // AI configuration
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput, aiInputText, setAiInputText,
    // AI
    showAIModal, setShowAIModal, isAILoading, aiStatusMsg,
    // Auth & View
    user, handleLogin, handleLogout, handleLinkAccount, handleUnlinkProvider,
    view, setView, recentCharacters, addToRecent, removeFromRecent,
    bbcodeTemplate, setBbcodeTemplate, saveAsTemplate,
    isHeaderPinned, setIsHeaderPinned, isHeaderVisible, setIsHeaderVisible,
    // Drive & Vault
    driveModal, setDriveModal, isSyncingDrive, handleBrowseDrive, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore,
    moveCharacter, moveFolder, createFolder, deleteFolder, deleteCharacter, renameItem, copyCharacter, ensureLocalFolder,
    saveCharacter: handleSaveInternal
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

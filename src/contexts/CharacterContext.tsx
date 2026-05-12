import { produce } from 'immer';
import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { auth, googleProvider, githubProvider, discordProvider } from '../lib/firebase';
import { CharacterData, FolderMetadata, CharacterMetadata } from '../types';
import { DEFAULT_DATA } from '../constants';
import { getMyCharacters, getFolders, saveCharacter as saveCharacterService, getCharacterById, deleteCharacter as deleteCharacterService, deleteFolder as deleteFolderService, renameItem as renameItemService, moveCharacter as moveCharacterService, moveFolder as moveFolderService, createFolder as createFolderService, copyCharacter as copyCharacterService, ensureLocalFolder as ensureLocalFolderService, saveLink } from '../services/characterService';
import { driveSyncService } from '../services/driveSyncService';
import { extractCharacterFromText, transformAIData } from '../services/aiService';
import { dataUpdateService } from '../services/dataUpdateService';
import { useCharacterDnD } from '../hooks/useCharacterDnD';
import { generateBBCode } from '../utils/bbcodeExporter';
import { DEFAULT_BBCODE_TEMPLATE } from '../components/BBCodeTemplateEditor';
import { getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../utils/calculations';

interface CharacterContextType {
  // State
  data: CharacterData;
  setData: React.Dispatch<React.SetStateAction<CharacterData>>;
  computed: any; // Derived/Calculated data
  lastSavedData: CharacterData;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  currentDocumentId: string | null;
  setCurrentDocumentId: (id: string | null) => void;
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

  addMagicBlock: (type: 'text' | 'table' | 'spell', spellTemplate?: 'sla' | 'spontaneous' | 'prepared') => void;
  updateMagicBlock: (id: string, updates: any) => void;
  removeMagicBlock: (id: string) => void;

  addAdditionalBlock: (type: 'text' | 'table' | 'image') => void;
  updateAdditionalBlock: (id: string, updates: any) => void;
  removeAdditionalBlock: (id: string) => void;

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
  updateExistingTemplate: (id: string, content: string) => Promise<void>;
  
  // Storage info
  getItemPath: (charId: string | null) => string;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (!context) throw new Error('useCharacter must be used within a CharacterProvider');
  return context;
};

// Securely merge loaded data with defaults to handle schema updates
const mergeWithDefault = (data: any, defaults: any): any => {
  if (typeof data !== 'object' || data === null) return JSON.parse(JSON.stringify(defaults));
  const result = { ...data };
  for (const key in defaults) {
    if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
      result[key] = mergeWithDefault(data[key], defaults[key]);
    } else if (result[key] === undefined) {
      result[key] = JSON.parse(JSON.stringify(defaults[key]));
    }
  }
  return result;
};

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setViewState] = useState<'editor' | 'vault' | 'settings' | 'bbcode-template'>('editor');

  // Header UI State
  const [isHeaderPinned, setIsHeaderPinnedState] = useState(() => localStorage.getItem('header_pinned') !== 'false');
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
    // Initial Character Load from URL
    const loadInitial = async () => {
      try {
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
          try {
            const char = await getCharacterById(charId);
            if (!char || !char.data) throw new Error("Character not found or data is missing");

            if (char.isLink && char.targetId) {
              const targetChar = await getCharacterById(char.targetId);
              if (!targetChar || !targetChar.data) throw new Error("Linked target character not found or data is missing");

              // Validate and merge with defaults
              const merged = mergeWithDefault(targetChar.data, DEFAULT_DATA);

              setData(merged);
              setLastSavedData(JSON.parse(JSON.stringify(merged)));
              setCurrentDocumentId(targetChar.id);
              setIsReadOnly(targetChar.ownerId !== user?.uid);
              setViewState('editor');
              addToRecent(targetChar);

              const url = new URL(window.location.href);
              url.searchParams.set('id', targetChar.id);
              window.history.replaceState({}, '', url.toString());
            } else if (char.isTemplate) {
              if (typeof char.data.content !== 'string') throw new Error("Template content is missing or invalid");
              setBbcodeTemplate(char.data.content);
              setViewState('bbcode-template');
              setCurrentDocumentId(char.id);
              setIsReadOnly(char.ownerId !== user?.uid);
              addToRecent(char);
            } else {
              // Validate and merge with defaults
              const merged = mergeWithDefault(char.data, DEFAULT_DATA);

              setData(merged);
              setLastSavedData(JSON.parse(JSON.stringify(merged)));
              setCurrentDocumentId(char.id);
              setIsReadOnly(char.ownerId !== user?.uid);
              setViewState('editor');
              addToRecent(char);

              const url = new URL(window.location.href);
              url.searchParams.set('id', char.id);
              window.history.replaceState({}, '', url.toString());

              if (user && char.ownerId !== user.uid) {
                try {
                  const folderId = await ensureLocalFolderService('来自分享', null, user.uid);
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
          } catch (e: any) {
            console.error("Error loading auto-opened character:", e);
            setToast({ message: "人物卡数据损坏或读取失败，已为您打开新卡。", type: 'error' });
            await performCreateNew();
          }
        }

        // Initial List Refresh (if logged in)
        if (user) {
          await ensureLocalFolderService('来自分享', null, user.uid);
          refreshCharacterList();
        }
      } catch (error) {
        console.error("Initial sync/load failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    loadInitial();
  }, [user]); // Re-run when user changes to handle shared links and list refresh

  useEffect(() => {
    if (user) {
      refreshCharacterList();
    }
  }, [user]);

  // Auth logic moved to AuthContext

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
        avatar: char.isTemplate ? 'https://ui-avatars.com/api/?name=T&background=6366f1&color=fff' : (char.avatar || char.data?.basic?.avatars?.[0]?.url || ''),
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
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
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

  // Computed / Derived State
  const computed = useMemo(() => {
    const modifiers = getAttributeModifiers(data);
    return {
      modifiers,
      totalCost: calculateTotalCost(data),
      totalWeight: calculateTotalWeightNum(data),
      encumbrance: getComputedEncumbrance(data),
      // Future derived stats can be added here
    };
  }, [data]);

  // Drag & Drop Logic via Custom Hook
  const {
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop
  } = useCharacterDnD(data, setData);

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
    setData(p => dataUpdateService.updateField(p, 'basic', key, val));
  }, [isReadOnly]);

  const updateDefenses = useCallback((key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => dataUpdateService.updateField(p, 'defenses', key, val));
  }, [isReadOnly]);

  const addBag = () => setData(p => dataUpdateService.addBag(p));

  const removeBag = (id: string) => setData(p => dataUpdateService.removeBag(p, id));

  const updateBagName = (id: string, name: string) => setData(p => dataUpdateService.updateBag(p, id, { name }));

  const toggleBagWeight = (id: string, ignoreWeight: boolean) => setData(p => dataUpdateService.updateBag(p, id, { ignoreWeight }));

  const updateBagItems = (id: string, items: any[]) => setData(p => dataUpdateService.updateBag(p, id, { items }));

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
        if (!id || id === currentDocumentId) {
          setCurrentDocumentId(newId);
          setLastSavedData(JSON.parse(JSON.stringify(saveData)));

          // Update URL
          const url = new URL(window.location.href);
          url.searchParams.set('id', newId);
          window.history.replaceState({}, '', url.toString());
        }

        addToRecent({ id: newId, name: saveData?.basic?.name || '未命名人物', data: saveData });
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
    return await handleSaveInternal(data, currentDocumentId, currentFolderId);
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
      setCurrentDocumentId(null);
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
      try {
        if (typeof idOrChar === 'object' && idOrChar !== null && idOrChar.id) {
          if (idOrChar.isLink && idOrChar.targetId) {
            await loadSharedCharacter(idOrChar.targetId);
            return;
          }
          const char = idOrChar;
          
          if (char.isTemplate) {
            if (!char.data || typeof char.data.content !== 'string') throw new Error("Invalid template data");
            setBbcodeTemplate(char.data.content);
            setViewState('bbcode-template');
            setCurrentDocumentId(char.id);
            return;
          }

          // Merge with defaults to ensure all fields exist
          const merged = mergeWithDefault(char.data, DEFAULT_DATA);

          setData(merged);
          setLastSavedData(JSON.parse(JSON.stringify(merged)));
          setCurrentDocumentId(char.id);
          setIsReadOnly(char.ownerId !== user?.uid);
          
          setViewState('editor');
          addToRecent(char);
          
          const url = new URL(window.location.href);
          url.searchParams.set('id', char.id);
          window.history.replaceState({}, '', url.toString());
          return;
        }

        const id = idOrChar as string;
        setToast({ message: "正在加载人物资料..." });
        const char = await getCharacterById(id);
        
        if (!char || !char.data) throw new Error("Character not found or data missing");

        if (char.isLink && char.targetId) {
          await loadSharedCharacter(char.targetId);
          return;
        }
        
        if (char.isTemplate) {
          if (typeof char.data.content !== 'string') throw new Error("Invalid template data");
          setBbcodeTemplate(char.data.content);
          setViewState('bbcode-template');
          setCurrentDocumentId(char.id);
          return;
        }

        // Merge with defaults to ensure all fields exist
        const merged = mergeWithDefault(char.data, DEFAULT_DATA);

        setData(merged);
        setLastSavedData(JSON.parse(JSON.stringify(merged)));
        setCurrentDocumentId(char.id);
        setIsReadOnly(char.ownerId !== user?.uid);
        
        setViewState('editor');
        addToRecent(char);
        
        const url = new URL(window.location.href);
        url.searchParams.set('id', id);
        window.history.replaceState({}, '', url.toString());
      } catch (e: any) {
        console.error("Error selecting character:", e);
        setToast({ message: "人物卡加载失败: 数据已损坏或文件无法读取", type: 'error' });
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
        if (char.isTemplate) {
          setBbcodeTemplate(char.data.content);
          setViewState('bbcode-template');
        } else {
          const merged = mergeWithDefault(char.data, DEFAULT_DATA);
          setData(merged);
          setLastSavedData(JSON.parse(JSON.stringify(merged)));
          setCurrentDocumentId(char.id);
          setViewState('editor');
        }

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

  // Drag & Drop Handlers removed - now in useCharacterDnD hook

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

  const addMagicBlock = (type: 'text' | 'table' | 'spell', spellTemplate?: 'sla' | 'spontaneous' | 'prepared') => {
    let newBlock: any;
    
    if (type === 'spell' && spellTemplate) {
      newBlock = {
        id: 'magic-' + Math.random(),
        type: 'spell',
        spellTemplate,
        title: spellTemplate === 'sla' ? '类法术能力' : (spellTemplate === 'spontaneous' ? '自发施法' : '准备施法'),
        casterLevel: '',
        concentration: '',
        notes: '',
        baseLevel: 0,
        tableData: spellTemplate === 'sla' ? [{ uses: '', spell_name: '' }] : [{}] // Default one empty row
      };
      
      if (spellTemplate === 'sla') {
        newBlock.columns = [
          { key: 'uses', label: '每日次数', width: '15%' },
          { key: 'spell_name', label: '法术', width: '85%' }
        ];
      } else if (spellTemplate === 'spontaneous') {
        newBlock.columns = [
          { key: 'level', label: '环位', width: '10%' },
          { key: 'uses', label: '每日次数', width: '20%' },
          { key: 'spell_name', label: '法术', width: '70%' }
        ];
      } else if (spellTemplate === 'prepared') {
        newBlock.columns = [
          { key: 'level', label: '环位', width: '10%' },
          { key: 'spell_name', label: '法术', width: '90%' }
        ];
      }
    } else {
      newBlock = {
        id: 'magic-' + Math.random(),
        type,
        title: type === 'text' ? '自定文本' : '类别名(e.g已知法术)',
        content: '',
        columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
        tableData: []
      };
    }
    
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

  // Drag & Drop Handlers for blocks removed - now in useCharacterDnD hook

  const saveAsTemplate = async (name: string, content: string) => {
    if (!user) {
      setToast({ message: "请先登录", type: 'error' });
      return;
    }
    try {
      const templateFolderId = await ensureLocalFolderService('模板', null, user.uid);
      await saveCharacterService({ content, name }, undefined, templateFolderId, true);
      await refreshCharacterList();
      setToast({ message: "模板已保存在档案库的「模板」文件夹中", type: 'success' });
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  };

  const updateExistingTemplate = async (id: string, content: string) => {
    if (!user) {
      setToast({ message: "请先登录", type: 'error' });
      return;
    }
    try {
      setIsSaving(true);
      await saveCharacterService({ content }, id, undefined, true);
      setToast({ message: "模板文件已更新", type: 'success' });
    } catch (e) {
      setToast({ message: "更新模板失败", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers

  const handleShare = () => {
    if (!currentDocumentId) {
      setToast({ message: "请先打开一个人物卡或模板", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentDocumentId}`;
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
    const bbcode = generateBBCode(data, tmpl, t);
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
        setTimeout(() => reject(new Error("AI 响应超时，请检查网络连接或 API Key 是否正确。")), 90000)
      );

      setAiStatusMsg('正在传输数据至 Gemini...');
      const extractionPromise = extractCharacterFromText(textToProcess, keyToUse);

      const extracted = await Promise.race([extractionPromise, timeoutPromise]) as any;

      if (!showAIModalRef.current) return;

      setAiStatusMsg('正在同步至跑团卡系统...');
      const mergedData = transformAIData(extracted);

      setData(mergedData);
      setToast({ message: "AI 识别并填写成功！" });
      setView('editor');
      setCurrentDocumentId(null);
      setShowAIModal(false);
      setAiInputText('');
    } catch (e: any) {
      console.error("AI Extraction Error:", e);
      if (showAIModalRef.current) {
        setToast({ message: "AI 识别失败: " + (e.message || "未能提取有效数据"), type: 'error' });
      }
    } finally {
      setIsAILoading(false);
      setAiStatusMsg('');
    }
  };

  const [driveModal, setDriveModal] = useState<{ isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleBrowseDrive = async () => {
    setToast({ message: "正在连接 Google 云端硬盘..." });
    try {
      const result = await driveSyncService.browseDrive(user);
      if (result.needsFolder) {
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }
      setDriveModal({ isOpen: true, currentPath: result.currentPath!, items: result.items! });
    } catch (e: any) {
      setToast({ message: "连接失败: " + e.message, type: 'error' });
    }
  };

  const navigateDrive = async (folderId: string, folderName: string) => {
    if (!driveModal) return;
    try {
      const result = await driveSyncService.navigate(folderId, folderName, driveModal.currentPath);
      setDriveModal({ ...driveModal, currentPath: result.currentPath, items: result.items });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const navigateToPathIndex = async (index: number) => {
    if (!driveModal) return;
    try {
      const target = driveModal.currentPath[index];
      const result = await driveSyncService.navigate(target.id, target.name, driveModal.currentPath.slice(0, index));
      setDriveModal({ ...driveModal, currentPath: result.currentPath, items: result.items });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const importFromDrive = async (item: any) => {
    if (!item || !driveModal || !user) return;
    setToast({ message: `正在从云端读取: ${item.name}...` });
    try {
      const count = await driveSyncService.importItems(item, user, currentFolderId);
      await refreshCharacterList();
      setToast({ message: `导入成功！共导入 ${count} 个人物卡` });
      setDriveModal(null);
    } catch (e: any) {
      setToast({ message: "导入失败: " + e.message, type: 'error' });
    }
  };

  const handleCloudBackup = async () => {
    if (!user) return;
    setIsSyncingDrive(true);
    setToast({ message: "正在备份到 Google 云端硬盘..." });
    try {
      await driveSyncService.backupToCloud(user, myCharacters, folders);
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
    setToast({ message: "正在从云端备份还原数据..." });
    try {
      const count = await driveSyncService.restoreFromCloud(user, currentFolderId);
      await refreshCharacterList();
      setToast({ message: `还原成功！共恢复 ${count} 个人物卡` });
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

  const getItemPath = (charId: string | null): string => {
    if (!charId) return "";
    const char = myCharacters.find(c => c.id === charId);
    if (!char) return "";

    const resolvePath = (folderId: string | null | undefined): string => {
      if (!folderId) return "档案库";
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return "档案库";
      return resolvePath(folder.parentId) + " / " + folder.name;
    };

    return resolvePath(char.folderId) + " / " + char.name;
  };

  const value: CharacterContextType = {
    data, setData, computed, lastSavedData, isReadOnly, setIsReadOnly, currentDocumentId, setCurrentDocumentId, isSaving,
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
    // View
    view, setView, recentCharacters, addToRecent, removeFromRecent,
    bbcodeTemplate, setBbcodeTemplate, saveAsTemplate, updateExistingTemplate,
    getItemPath,
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

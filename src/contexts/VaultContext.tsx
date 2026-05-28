import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import {
  getMyCharacters,
  getFolders,
  deleteCharacter as deleteCharacterService,
  deleteFolder as deleteFolderService,
  renameItem as renameItemService,
  moveCharacter as moveCharacterService,
  moveFolder as moveFolderService,
  createFolder as createFolderService,
  copyCharacter as copyCharacterService,
  ensureLocalFolder as ensureLocalFolderService,
  saveCharacter as saveCharacterService
} from '../services/characterService';

interface VaultContextType {
  myCharacters: any[];
  folders: any[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  refreshCharacterList: () => Promise<void>;

  tableActionMode: 'drag' | 'delete';
  toggleTableActionMode: () => void;
  dragEnabledFor: string | null;
  setDragEnabledFor: (id: string | null) => void;

  moveCharacter: (id: string, targetId: string | null) => Promise<void>;
  moveFolder: (id: string, targetId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  renameItem: (id: string, type: 'character' | 'folder', newName: string) => Promise<void>;
  copyCharacter: (id: string) => Promise<void>;
  ensureLocalFolder: (name: string, parentId: string | null, userId: string) => Promise<string>;
  getItemPath: (charId: string | null) => string;

  // Clipboard functionality
  importFromClipboard: () => Promise<void>;
  cutItems: string[];
  onCut: (ids: string[]) => void;
  onPaste: (targetFolderId: string | null) => Promise<void>;
  clearClipboard: () => void;

  search: string;
  setSearch: (s: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within a VaultProvider');
  return context;
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setToast } = useUI();

  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [tableActionMode, setTableActionMode] = useState<'drag' | 'delete'>('drag');
  const [dragEnabledFor, setDragEnabledFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Clipboard state
  const [cutItems, setCutItems] = useState<string[]>([]);

  const refreshCharacterList = useCallback(async () => {
    try {
      const [list, folderList] = await Promise.all([
        getMyCharacters(),
        getFolders()
      ]);
      setMyCharacters([...(list || [])]);
      setFolders([...(folderList || [])]);
    } catch (e) {
      setToast({ message: "刷新数据失败，请检查连接", type: 'error' });
    }
  }, [setToast]);

  const toggleTableActionMode = () => setTableActionMode(p => p === 'drag' ? 'delete' : 'drag');

  const moveCharacter = async (id: string, targetId: string | null) => {
    await moveCharacterService(id, targetId);
    await refreshCharacterList();
  };

  const moveFolder = async (id: string, targetId: string | null) => {
    await moveFolderService(id, targetId);
    await refreshCharacterList();
  };

  const onCut = (ids: string[]) => {
    setCutItems(ids);
    setToast({ message: `已剪切 ${ids.length} 个项目` });
  };

  const clearClipboard = () => setCutItems([]);

  const importFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const content = JSON.parse(text);
      
      // Determine type based on content
      const isTemplate = !!content.content && !content.basic;

      if (isTemplate) {
        await saveCharacterService({ 
           content: content.content, 
           name: content.name || "从剪贴板导入的模板" 
        }, undefined, currentFolderId, true);
      } else {
        if (!content.basic || !content.attributes) throw new Error("无效的人物卡格式");
        
        // 彻底剥离元数据，确保作为新文档创建
        const { id, ownerId, targetId, folderId: oldFolderId, ...cleanData } = content;
        const finalData = { ...cleanData };

        if (finalData.basic?.avatars && Array.isArray(finalData.basic.avatars)) {
          finalData.basic.avatars = {
            url: finalData.basic.avatars.map((a: any) => a.url || ''),
            note: finalData.basic.avatars.map((a: any) => a.note || '')
          };
        }
        finalData.basic = {
          ...finalData.basic,
          name: finalData.basic?.name || "剪贴板导入"
        };
        await saveCharacterService(finalData, undefined, currentFolderId, false);
      }
      
      await refreshCharacterList();
      setToast({ message: "剪贴板导入成功！" });
    } catch (e: any) {
      setToast({ message: "剪贴板导入失败: " + e.message, type: 'error' });
    }
  };

  const onPaste = async (targetFolderId: string | null) => {
    if (cutItems.length === 0) return;
    
    try {
      setToast({ message: "正在移动项目..." });
      await Promise.all(cutItems.map(async id => {
        const isFolder = folders.some(f => f.id === id);
        if (isFolder) {
          // Check if target is same or child (prevent infinite loop)
          if (id === targetFolderId) return;
          await moveFolder(id, targetFolderId);
        } else {
          await moveCharacter(id, targetFolderId);
        }
      }));
      setCutItems([]);
      await refreshCharacterList();
      setToast({ message: "粘贴成功" });
    } catch (e) {
      setToast({ message: "粘贴失败", type: 'error' });
    }
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

  const value: VaultContextType = {
    myCharacters, folders, currentFolderId, setCurrentFolderId, refreshCharacterList,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    moveCharacter, moveFolder, createFolder, deleteFolder, deleteCharacter, renameItem, copyCharacter, ensureLocalFolder,
    getItemPath,
    importFromClipboard,
    cutItems, onCut, onPaste, clearClipboard,
    search, setSearch, viewMode, setViewMode
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
};

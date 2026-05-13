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
  ensureLocalFolder as ensureLocalFolderService
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

  const refreshCharacterList = useCallback(async () => {
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
    getItemPath
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
};

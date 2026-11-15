import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useVaultSync } from './hooks/useVaultSync';

interface VaultContextType {
  myCharacters: any[];
  folders: any[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  refreshCharacterList: () => Promise<void>;

  /** 后台同步中（flush 队列进行时为 true） */
  isVaultSyncing: boolean;
  /** 等待同步到服务器的操作数 */
  pendingSyncCount: number;
  /** 手动触发积压操作重试 */
  retryVaultSync: () => Promise<void>;

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

/**
 * 档案库目录结构上下文（本地优先）：
 * 数据与目录操作均由 useVaultSync 提供——本地缓存实时显示 + pendingOps 队列后台静默同步。
 * 本文件只保留 UI 侧状态（当前目录 / 剪贴板 / 搜索 / 视图模式）与组装。
 */
export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setToast } = useUI();

  const vault = useVaultSync();
  const {
    folders, myCharacters,
    isSyncing, pendingCount, flushPendingOps,
    refreshCharacterList,
    createFolder, createDocumentFromData,
    moveCharacter, moveFolder, renameItem, deleteCharacter, deleteFolder, copyCharacter, ensureLocalFolder,
  } = vault;

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  // 登录/登出/切换账号时复位当前目录（目录数据由 useVaultSync 按账号切换）
  useEffect(() => { setCurrentFolderId(null); }, [user?.uid]);

  const [tableActionMode, setTableActionMode] = useState<'drag' | 'delete'>('drag');
  const [dragEnabledFor, setDragEnabledFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Clipboard state
  const [cutItems, setCutItems] = useState<string[]>([]);

  const toggleTableActionMode = () => setTableActionMode(p => p === 'drag' ? 'delete' : 'drag');

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
        // 模板导入到独立的 templates 集合
        await createDocumentFromData(
          { content: content.content, name: content.name || '从剪贴板导入的模板' },
          currentFolderId, true, '从剪贴板导入的模板'
        );
      } else {
        if (!content.basic || !content.attributes) throw new Error('无效的人物卡格式');

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
          name: finalData.basic?.name || '剪贴板导入'
        };
        await createDocumentFromData(finalData, currentFolderId, false, '剪贴板导入');
      }

      setToast({ message: '剪贴板导入成功！' });
    } catch (e: any) {
      setToast({ message: '剪贴板导入失败: ' + e.message, type: 'error' });
    }
  };

  const onPaste = async (targetFolderId: string | null) => {
    if (cutItems.length === 0) return;

    try {
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
      setToast({ message: '粘贴成功' });
    } catch (e) {
      setToast({ message: '粘贴失败', type: 'error' });
    }
  };

  const getItemPath = (charId: string | null): string => {
    if (!charId) return '';
    const char = myCharacters.find(c => c.id === charId);
    if (!char) return '';

    const resolvePath = (folderId: string | null | undefined): string => {
      if (!folderId) return '档案库';
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return '档案库';
      return resolvePath(folder.parentId) + ' / ' + folder.name;
    };

    return resolvePath(char.folderId) + ' / ' + char.name;
  };

  const value: VaultContextType = {
    myCharacters, folders, currentFolderId, setCurrentFolderId, refreshCharacterList,
    isVaultSyncing: isSyncing,
    pendingSyncCount: pendingCount,
    retryVaultSync: () => flushPendingOps({ notify: true }),
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

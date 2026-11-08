import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useVault } from './VaultContext';
import { useCharacterDnD } from './hooks/useCharacterDnD';
import { useCharacterActions } from './hooks/useCharacterActions';
import { useCharacterPersistence } from './hooks/useCharacterPersistence';
import { useCharacterAI } from './hooks/useCharacterAI';
import { useDriveSync } from './hooks/useDriveSync';
import { CharacterData } from '../schema/types';
import { DEFAULT_DATA, DEFAULT_BBCODE_TEMPLATE } from '../constants/index';
import { getCharacterBBCode } from '../utils/bbcodeExporter';
import { getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../utils/calculations';
import { saveCharacter as saveCharacterService } from '../services/characterService';
import { useSettings } from './SettingsContext';
import { ensureLocalFolder as ensureLocalFolderService } from '../services/characterService';

export type ComputedCharacterData = {
  modifiers: ReturnType<typeof getAttributeModifiers>;
  totalCost: ReturnType<typeof calculateTotalCost>;
  totalWeight: ReturnType<typeof calculateTotalWeightNum>;
  encumbrance: ReturnType<typeof getComputedEncumbrance>;
};

interface CharacterContextType {
  // State
  data: CharacterData;
  setData: React.Dispatch<React.SetStateAction<CharacterData>>;
  computed: ComputedCharacterData;
  lastSavedData: CharacterData;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  currentCharacterId: string | null;
  setCurrentCharacterId: (id: string | null) => void;
  currentTemplateId: string | null;
  setCurrentTemplateId: (id: string | null) => void;
  isSaving: boolean;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline';
  isDirty: boolean;
  isTemplateDirty: boolean;
  tableActionMode: 'drag' | 'delete';
  toggleTableActionMode: () => void;
  dragEnabledFor: string | null;
  setDragEnabledFor: (id: string | null) => void;

  // Actions
  update: (path: string, val: any) => void;
  addBag: () => void;
  removeBag: (id: string) => void;
  addMagicBlock: (type: 'text' | 'table' | 'spell', spellType?: number) => void;
  removeMagicBlock: (id: string) => void;
  addAdditionalBlock: (type: 'text' | 'table' | 'image') => void;
  removeAdditionalBlock: (id: string) => void;

  // Persistence
  saveCharacter: (data: CharacterData, id?: string | null, folderId?: string | null) => Promise<string | undefined>;
  handleSave: () => Promise<string | undefined>;
  handleSaveAs: () => Promise<void>;
  handleNew: () => void;
  handleShare: () => void;
  handleExport: () => void;
  handleExportBBCode: () => void;
  handleRevertChanges: () => void;
  selectCharacter: (id: string, skipDirtyCheck?: boolean) => Promise<void>;
  loadSharedCharacter: (id: string) => Promise<void>;

  // AI
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (show: boolean) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  availableModels: any[];
  isFetchingModels: boolean;
  fetchAvailableModels: (apiKey?: string) => Promise<void>;
  aiInputText: string;
  setAiInputText: (text: string) => void;
  showAIModal: boolean;
  setShowAIModal: (show: boolean) => void;
  isAILoading: boolean;
  aiStatusMsg: string;
  handleAIExtract: (inputText?: string, apiKey?: string) => Promise<void>;

  // Drive Sync
  driveModal: { isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null;
  setDriveModal: (modal: any) => void;
  isSyncingDrive: boolean;
  handleBrowseDrive: () => Promise<void>;
  handleBrowseDriveRoot: () => Promise<void>;
  navigateDrive: (folderId: string, folderName: string) => Promise<void>;
  navigateToPathIndex: (index: number) => Promise<void>;
  importFromDrive: (item: any) => Promise<void>;
  handleCloudBackup: () => Promise<void>;
  handleCloudRestore: () => Promise<void>;

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

  // Templates
  bbcodeTemplate: string;
  setBbcodeTemplate: (template: string) => void;
  saveAsTemplate: (name: string, content: string) => Promise<void>;
  updateExistingTemplate: (id: string, content: string) => Promise<void>;
  getItemPath: (charId: string | null) => string;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (!context) throw new Error('useCharacter must be used within a CharacterProvider');
  return context;
};

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ui = useUI();
  const { setView, setToast, setConfirmModal, addToRecent } = ui;
  const { refreshCharacterList, currentFolderId, setCurrentFolderId, tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor, getItemPath } = useVault();
  const { settings } = useSettings();

  const [data, setData] = useState<CharacterData>(DEFAULT_DATA);
  const [lastSavedData, setLastSavedData] = useState<CharacterData>(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);
  const [bbcodeTemplate, setBbcodeTemplate] = useState(() => localStorage.getItem('bbcode_template') || '');
  const [lastSavedTemplate, setLastSavedTemplate] = useState(localStorage.getItem('bbcode_template') || '');

  useEffect(() => {
    localStorage.setItem('bbcode_template', bbcodeTemplate);
    setIsTemplateDirty(bbcodeTemplate !== lastSavedTemplate);
  }, [bbcodeTemplate, lastSavedTemplate]);

  const computed: ComputedCharacterData = useMemo(() => {
    const modifiers = getAttributeModifiers(data);
    return {
      modifiers,
      totalCost: calculateTotalCost(data),
      totalWeight: calculateTotalWeightNum(data),
      encumbrance: getComputedEncumbrance(data),
    };
  }, [data]);

  // 优化：仅在数据真正变化时进行深比较，且增加简单的长度初步判断
  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
    
    // 基础类型/结构快速判断
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      const valA = a[key];
      const valB = b[key];
      
      // 优化：对于基本类型直接比较
      if (typeof valA !== 'object' || valA === null) {
        if (valA !== valB) return false;
      } else {
        if (!isEqual(valA, valB)) return false;
      }
    }
    return true;
  };

  // 使用 useEffect 但增加性能防护：如果数据引用没变（Immer 保证了这一点），setIsDirty 不会触发频繁计算
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDirty(!isEqual(data, lastSavedData));
    }, 500); // 增加 500ms 防抖，避免输入时每下按键都触发全量比较
    return () => clearTimeout(timer);
  }, [data, lastSavedData]);

  // 开启本地缓存时：有修改自动防抖写入本地草稿（记录 baseUpdatedAt 以便冲突比对）
  useEffect(() => {
    if (!settings.storage.enableLocalAutoCache) return;
    if (isDirty) {
      const timer = setTimeout(() => {
        try {
          const draftKey = `pf1_char_draft_${currentCharacterId || 'new_character'}`;
          const baseUpdatedAt = activeDocRef.current?.updatedAt?.toMillis?.() || (typeof activeDocRef.current?.updatedAt === 'number' ? activeDocRef.current?.updatedAt : 0);
          const draftPayload = {
            data,
            baseUpdatedAt,
            draftSavedAt: Date.now()
          };
          localStorage.setItem(draftKey, JSON.stringify(draftPayload));
        } catch (e) {
          console.error('Failed to write draft to localStorage:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data, isDirty, currentCharacterId, settings.storage.enableLocalAutoCache]);

  // 监听浏览器刷新与关闭：未开启本地缓存时提醒保存，开启后不打扰
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !settings.storage.enableLocalAutoCache) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, settings.storage.enableLocalAutoCache]);

  // 放弃修改重新载入
  const handleRevertChanges = useCallback(() => {
    setConfirmModal({
      title: "确定要放弃当前所有未保存修改并重新载入吗？本地缓存的修改将丢失。",
      onConfirm: () => {
        const draftKey = `pf1_char_draft_${currentCharacterId || 'new_character'}`;
        localStorage.removeItem(draftKey);
        setData(JSON.parse(JSON.stringify(lastSavedData)));
        setIsDirty(false);
        setToast({ message: "已放弃修改，重置为上次保存的状态", type: 'info' });
      }
    });
  }, [setConfirmModal, currentCharacterId, lastSavedData, setToast]);

  const {
    isSaving,
    syncStatus,
    handleSave,
    handleSaveAs,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter,
    activeDocRef
  } = useCharacterPersistence(
    user, data, setData, lastSavedData, setLastSavedData,
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isReadOnly, setIsReadOnly, setIsSyncing,
    setToast, setConfirmModal, setView, addToRecent, refreshCharacterList,
    currentFolderId, setCurrentFolderId, isDirty, setBbcodeTemplate, setLastSavedTemplate, computed
  );

  const {
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, handleBrowseDriveRoot, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  } = useDriveSync();

  // 综合只读保护：权限只读 或 正在后台同步数据时，必须激活只读保护锁
  const isSyncingActive = isSyncing || syncStatus === 'syncing' || isSyncingDrive;
  const effectiveReadOnly = isReadOnly || isSyncingActive;

  const {
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop
  } = useCharacterDnD(data, setData, effectiveReadOnly);

  const {
    update, addBag, removeBag,
    addMagicBlock, removeMagicBlock,
    addAdditionalBlock, removeAdditionalBlock
  } = useCharacterActions(effectiveReadOnly, setData);

  const {
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiModel, setAiModel, availableModels, isFetchingModels, fetchAvailableModels,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract
  } = useCharacterAI(setData, setCurrentCharacterId);

  const handleShare = useCallback(() => {
    const id = ui.view === 'bbcode-template' ? currentTemplateId : currentCharacterId;
    if (!id) {
      setToast({ message: "请先打开一个人物卡或模板", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！" });
  }, [ui.view, currentTemplateId, currentCharacterId, setToast]);

  const handleExport = useCallback(() => {
    const isTemplate = ui.view === 'bbcode-template';
    const ext = isTemplate ? '.bbc' : '.pf1';
    
    // Try to get filename from current document id
    let filename = (isTemplate ? 'template' : (data.basic?.name || 'character')) + ext;

    const exportData = isTemplate ? { content: bbcodeTemplate, name: 'template' } : data;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [ui.view, data, bbcodeTemplate]);

  const handleExportBBCode = useCallback(() => {
    const bbcode = getCharacterBBCode(data, computed, t);
    navigator.clipboard.writeText(bbcode);
    setToast({ message: "BBCode 已复制到剪贴板！" });
  }, [data, computed, t, setToast]);

  const saveAsTemplate = useCallback(async (name: string, content: string) => {
    if (!user) return setToast({ message: "请先登录", type: 'error' });
    try {
      const templateFolderId = await ensureLocalFolderService('模板', null, user.uid);
      const newId = await saveCharacterService({ content, name }, undefined, templateFolderId, true);
      if (newId) {
        setLastSavedTemplate(content);
        setCurrentTemplateId(newId);
        setToast({ message: "模板已保存", type: 'success' });
        Promise.resolve(refreshCharacterList()).catch(console.error);
      }
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  }, [user, setToast, setCurrentTemplateId, refreshCharacterList]);

  const updateExistingTemplate = useCallback(async (id: string, content: string) => {
    if (!user) return;
    try {
      await saveCharacterService({ content }, id, undefined, true);
      setLastSavedTemplate(content);
      setToast({ message: "模板已更新", type: 'success' });
    } catch (e) {
      setToast({ message: "更新模板失败", type: 'error' });
    }
  }, [user, setToast]);

  const value: CharacterContextType = useMemo(() => ({
    data, setData, computed, lastSavedData, isReadOnly: effectiveReadOnly, setIsReadOnly, 
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isSaving,
    isSyncing, setIsSyncing, syncStatus, isDirty, isTemplateDirty,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    update, addBag, removeBag,
    addMagicBlock, removeMagicBlock,
    addAdditionalBlock, removeAdditionalBlock,
    handleSave, handleSaveAs, handleNew, handleShare, handleExport, handleExportBBCode, handleRevertChanges, selectCharacter, loadSharedCharacter,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop,
    bbcodeTemplate, setBbcodeTemplate, saveAsTemplate, updateExistingTemplate,
    saveCharacter: handleSaveInternal,
    // AI
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiModel, setAiModel, availableModels, isFetchingModels, fetchAvailableModels,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract,
    // Drive Sync
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, handleBrowseDriveRoot, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore,
    getItemPath
  }), [
    data, setData, computed, lastSavedData, effectiveReadOnly, setIsReadOnly,
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isSaving,
    isSyncing, setIsSyncing, syncStatus, isDirty, isTemplateDirty,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    update, addBag, removeBag,
    addMagicBlock, removeMagicBlock,
    addAdditionalBlock, removeAdditionalBlock,
    handleSave, handleSaveAs, handleNew, handleShare, handleExport, handleExportBBCode, handleRevertChanges, selectCharacter, loadSharedCharacter,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop,
    bbcodeTemplate, setBbcodeTemplate, saveAsTemplate, updateExistingTemplate,
    handleSaveInternal,
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiModel, setAiModel, availableModels, isFetchingModels, fetchAvailableModels,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract,
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, handleBrowseDriveRoot, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore,
    getItemPath
  ]);

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

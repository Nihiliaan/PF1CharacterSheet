import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useVault } from './VaultContext';
import { useCharacterDnD } from '../hooks/useCharacterDnD';
import { useCharacterActions } from '../hooks/useCharacterActions';
import { useCharacterPersistence } from '../hooks/useCharacterPersistence';
import { useCharacterAI } from '../hooks/useCharacterAI';
import { useDriveSync } from '../hooks/useDriveSync';
import { CharacterData } from '../types';
import { DEFAULT_DATA } from '../constants';
import { generateBBCode } from '../utils/bbcodeExporter';
import { DEFAULT_BBCODE_TEMPLATE } from '../components/BBCodeTemplateEditor';
import { getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from '../utils/calculations';
import { saveCharacter as saveCharacterService } from '../services/characterService';
import { ensureLocalFolder as ensureLocalFolderService } from '../services/characterService';

interface CharacterContextType {
  // State
  data: CharacterData;
  setData: React.Dispatch<React.SetStateAction<CharacterData>>;
  computed: any;
  lastSavedData: CharacterData;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  currentDocumentId: string | null;
  setCurrentDocumentId: (id: string | null) => void;
  isSaving: boolean;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  isDirty: boolean;
  tableActionMode: 'drag' | 'delete';
  toggleTableActionMode: () => void;
  dragEnabledFor: string | null;
  setDragEnabledFor: (id: string | null) => void;

  // Actions
  updateBasic: (key: string, val: any) => void;
  updateDefenses: (key: string, val: any) => void;
  addBag: () => void;
  removeBag: (id: string) => void;
  updateBagName: (id: string, name: string) => void;
  toggleBagWeight: (id: string, ignoreWeight: boolean) => void;
  updateBagItems: (id: string, items: any[]) => void;
  addMagicBlock: (type: 'text' | 'table' | 'spell', spellType?: number) => void;
  updateMagicBlock: (id: string, updates: any) => void;
  removeMagicBlock: (id: string) => void;
  addAdditionalBlock: (type: 'text' | 'table' | 'image') => void;
  updateAdditionalBlock: (id: string, updates: any) => void;
  removeAdditionalBlock: (id: string) => void;

  // Persistence
  saveCharacter: (data: CharacterData, id?: string | null, folderId?: string | null) => Promise<string | undefined>;
  handleSave: () => Promise<string | undefined>;
  handleNew: () => void;
  handleShare: () => void;
  handleExport: () => void;
  handleExportBBCode: () => void;
  selectCharacter: (id: string, skipDirtyCheck?: boolean) => Promise<void>;
  loadSharedCharacter: (id: string) => Promise<void>;

  // AI
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (show: boolean) => void;
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
  const { setView, setToast, setConfirmModal, addToRecent } = useUI();
  const { refreshCharacterList, currentFolderId, tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor, getItemPath } = useVault();

  const [data, setData] = useState<CharacterData>(DEFAULT_DATA);
  const [lastSavedData, setLastSavedData] = useState<CharacterData>(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [bbcodeTemplate, setBbcodeTemplate] = useState(() => localStorage.getItem('bbcode_template') || '');

  useEffect(() => {
    localStorage.setItem('bbcode_template', bbcodeTemplate);
  }, [bbcodeTemplate]);

  const computed = useMemo(() => {
    const modifiers = getAttributeModifiers(data);
    return {
      modifiers,
      totalCost: calculateTotalCost(data),
      totalWeight: calculateTotalWeightNum(data),
      encumbrance: getComputedEncumbrance(data),
    };
  }, [data]);

  const {
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop
  } = useCharacterDnD(data, setData);

  const {
    updateBasic, updateDefenses, addBag, removeBag, updateBagName, toggleBagWeight, updateBagItems,
    addMagicBlock, updateMagicBlock, removeMagicBlock,
    addAdditionalBlock, updateAdditionalBlock, removeAdditionalBlock
  } = useCharacterActions(isReadOnly, setData);

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

  const {
    isSaving,
    handleSave,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter
  } = useCharacterPersistence(
    user, data, setData, lastSavedData, setLastSavedData,
    currentDocumentId, setCurrentDocumentId, setIsReadOnly, setIsSyncing,
    setToast, setConfirmModal, setView, addToRecent, refreshCharacterList,
    currentFolderId, isDirty, setBbcodeTemplate
  );

  const {
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract
  } = useCharacterAI(setData, setCurrentDocumentId);

  const {
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  } = useDriveSync();

  const handleShare = () => {
    if (!currentDocumentId) {
      setToast({ message: "请先打开一个人物卡或模板", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentDocumentId}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！" });
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
    const bbcode = generateBBCode(data, tmpl, t, { computed, data });
    navigator.clipboard.writeText(bbcode);
    setToast({ message: "BBCode 已复制到剪贴板！" });
  };

  const saveAsTemplate = async (name: string, content: string) => {
    if (!user) return setToast({ message: "请先登录", type: 'error' });
    try {
      const templateFolderId = await ensureLocalFolderService('模板', null, user.uid);
      await saveCharacterService({ content, name }, undefined, templateFolderId, true);
      await refreshCharacterList();
      setToast({ message: "模板已保存", type: 'success' });
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  };

  const updateExistingTemplate = async (id: string, content: string) => {
    if (!user) return;
    try {
      await saveCharacterService({ content }, id, undefined, true);
      setToast({ message: "模板已更新", type: 'success' });
    } catch (e) {
      setToast({ message: "更新模板失败", type: 'error' });
    }
  };

  const value: CharacterContextType = {
    data, setData, computed, lastSavedData, isReadOnly, setIsReadOnly, currentDocumentId, setCurrentDocumentId, isSaving,
    isSyncing, setIsSyncing, isDirty,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    updateBasic, updateDefenses, addBag, removeBag, updateBagName, toggleBagWeight, updateBagItems,
    addMagicBlock, updateMagicBlock, removeMagicBlock,
    addAdditionalBlock, updateAdditionalBlock, removeAdditionalBlock,
    handleSave, handleNew, handleShare, handleExport, handleExportBBCode, selectCharacter, loadSharedCharacter,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop,
    bbcodeTemplate, setBbcodeTemplate, saveAsTemplate, updateExistingTemplate,
    saveCharacter: handleSaveInternal,
    // AI
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract,
    // Drive Sync
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore,
    getItemPath
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

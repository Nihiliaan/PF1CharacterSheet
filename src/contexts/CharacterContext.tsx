import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import { generateBBCode } from '../utils/bbcodeExporter';
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
  currentCharacterId: string | null;
  setCurrentCharacterId: (id: string | null) => void;
  currentTemplateId: string | null;
  setCurrentTemplateId: (id: string | null) => void;
  isSaving: boolean;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
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
  const ui = useUI();
  const { setView, setToast, setConfirmModal, addToRecent } = ui;
  const { refreshCharacterList, currentFolderId, setCurrentFolderId, tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor, getItemPath } = useVault();

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
    update, addBag, removeBag,
    addMagicBlock, removeMagicBlock,
    addAdditionalBlock, removeAdditionalBlock
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
    handleSaveAs,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter
  } = useCharacterPersistence(
    user, data, setData, lastSavedData, setLastSavedData,
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isReadOnly, setIsReadOnly, setIsSyncing,
    setToast, setConfirmModal, setView, addToRecent, refreshCharacterList,
    currentFolderId, setCurrentFolderId, isDirty, setBbcodeTemplate, setLastSavedTemplate
  );

  const {
    userApiKey, setUserApiKey, showApiKeyInput, setShowApiKeyInput,
    aiInputText, setAiInputText, showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg, handleAIExtract
  } = useCharacterAI(setData, setCurrentCharacterId);

  const {
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  } = useDriveSync();

  const handleShare = () => {
    const id = ui.view === 'bbcode-template' ? currentTemplateId : currentCharacterId;
    if (!id) {
      setToast({ message: "请先打开一个人物卡或模板", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！" });
  };

  const handleExport = () => {
    const isTemplate = ui.view === 'bbcode-template';
    const ext = isTemplate ? '.bbc' : '.pf1';
    
    // Try to get filename from current document id
    let filename = '';
    // Since we don't have access to VaultContext easily here without potential circular deps 
    // (though in App.tsx it's fine), we'll use character name as fallback.
    filename = (isTemplate ? 'template' : (data.basic?.name || 'character')) + ext;

    const exportData = isTemplate ? { content: bbcodeTemplate, name: 'template' } : data;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
      const newId = await saveCharacterService({ content, name }, undefined, templateFolderId, true);
      if (newId) {
        setLastSavedTemplate(content);
        setCurrentTemplateId(newId);
        await refreshCharacterList();
        setToast({ message: "模板已保存", type: 'success' });
      }
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  };

  const updateExistingTemplate = async (id: string, content: string) => {
    if (!user) return;
    try {
      await saveCharacterService({ content }, id, undefined, true);
      setLastSavedTemplate(content);
      setToast({ message: "模板已更新", type: 'success' });
    } catch (e) {
      setToast({ message: "更新模板失败", type: 'error' });
    }
  };

  const value: CharacterContextType = {
    data, setData, computed, lastSavedData, isReadOnly, setIsReadOnly, 
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isSaving,
    isSyncing, setIsSyncing, isDirty, isTemplateDirty,
    tableActionMode, toggleTableActionMode, dragEnabledFor, setDragEnabledFor,
    update, addBag, removeBag,
    addMagicBlock, removeMagicBlock,
    addAdditionalBlock, removeAdditionalBlock,
    handleSave, handleSaveAs, handleNew, handleShare, handleExport, handleExportBBCode, selectCharacter, loadSharedCharacter,
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

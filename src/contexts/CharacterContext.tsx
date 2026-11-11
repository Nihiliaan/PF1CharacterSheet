import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { saveTemplate, saveTemplateMigrating } from '../services/templateService';
import { KEY_LAST_TEMP } from './hooks/useCharacterPersistence';

export type ComputedCharacterData = {
  modifiers: ReturnType<typeof getAttributeModifiers>;
  totalCost: ReturnType<typeof calculateTotalCost>;
  totalWeight: ReturnType<typeof calculateTotalWeightNum>;
  encumbrance: ReturnType<typeof getComputedEncumbrance>;
};

/**
 * 编辑器选项卡：一个已打开的人物卡或 BBCode 模板。
 * 采用"快照交换"模型——同一时刻只有活动选项卡的状态存在 live state 中，
 * 其余选项卡在切换走时把 live 状态暂存为快照，切回时整份换入。
 * 因此持久化 hook（保存/冲突检测/草稿）感知不到多文档的存在，行为与单文档时代完全一致。
 */
export interface EditorTab {
  /** 稳定唯一键：首次登记时的 docId（另存为/迁移只更新 docId，key 不变） */
  key: string;
  /** Firestore 文档 ID（未保存的新卡为 null） */
  docId: string | null;
  kind: 'character' | 'template' | 'chooser';
  title: string;
  /** 切换走时暂存的未保存标记（活动选项卡的脏状态由 live 状态实时计算） */
  dirty: boolean;
}

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
  /** 打开文档：idOrChar 可为文档 id 或完整文档对象；shouldSwitchView 控制是否切换到对应视图 */
  selectCharacter: (idOrChar: string | any, skipDirtyCheck?: boolean, shouldSwitchView?: boolean) => Promise<void>;
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

  // Editor Tabs（编辑器选项卡）
  tabs: EditorTab[];
  activeTabKey: string | null;
  /** 活动选项卡的实时标题（人物卡取 basic.name，模板取文档名） */
  activeTabTitle: string;
  switchTab: (key: string) => Promise<void>;
  closeTab: (key: string) => void;
  /** 打开人物卡编辑器（激活最近的人物卡标签或新建空白卡标签） */
  openCharacterTab: () => void;
  /** 打开 BBCode 模板编辑器（forceNew=true 时强制新开未命名模板标签） */
  openTemplateTab: (forceNew?: boolean) => void;
  /** 新建一个"新建标签页"（chooser 伪标签，页面内呈现新建人物卡/模板/最近文件选项） */
  openChooserTab: () => void;
  /** 把当前 chooser 标签就地改造成空白的人物卡/模板标签（新建标签页上的选择动作） */
  convertChooserTab: (kind: 'character' | 'template') => void;
  /** 从"新建标签页"打开一个最近文档：关闭 chooser 标签并按常规流程打开该文档 */
  openDocFromChooser: (id: string) => void;
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

  // ===== 编辑器选项卡层（快照交换模型）=====
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  // 快照与 refs 不参与渲染，用 ref 持有
  const snapshotsRef = useRef<Map<string, {
    data: CharacterData;
    lastSavedData: CharacterData;
    bbcodeTemplate: string;
    lastSavedTemplate: string;
    isReadOnly: boolean;
    activeDoc: any;
  }>>(new Map());
  const tabsRef = useRef<EditorTab[]>([]);
  tabsRef.current = tabs;
  const activeTabKeyRef = useRef<string | null>(null);
  activeTabKeyRef.current = activeTabKey;
  const currentCharacterIdRef = useRef<string | null>(null);
  currentCharacterIdRef.current = currentCharacterId;
  const currentTemplateIdRef = useRef<string | null>(null);
  currentTemplateIdRef.current = currentTemplateId;

  // 选项卡列表持久化：只保存已落库的文档（docId 非空），未保存的新卡不入册
  useEffect(() => {
    const persisted = tabs
      .filter(t => t.docId)
      .map(({ key, docId, kind, title }) => ({ key, docId, kind, title }));
    try {
      localStorage.setItem('pf1_open_tabs', JSON.stringify(persisted));
    } catch (e) {
      console.error('Failed to persist open tabs:', e);
    }
  }, [tabs]);

  /** 文档渲染进 live 状态（= 打开了一个文档）：创建或激活对应选项卡 */
  const handleOpenDocument = useCallback((docId: string, kind: 'character' | 'template', title?: string) => {
    const existing = tabsRef.current.find(t => t.docId === docId);
    if (existing) {
      // 已登记：修正类型（URL 直达时 kind 是猜测的）并激活
      setTabs(prev => prev.map(t => t.key === existing.key ? { ...t, kind, title: title || t.title } : t));
      setActiveTabKey(existing.key);
      return;
    }
    setTabs(prev => prev.some(t => t.docId === docId)
      ? prev
      : [...prev, { key: docId, docId, kind, title: title || (kind === 'character' ? '人物卡' : '模板'), dirty: false }]);
    setActiveTabKey(docId);
  }, []);

  /** 保存导致活动文档 id 变化（另存为 / 迁移 / 首次保存）：就地更新活动选项卡的 docId，key 不变 */
  const handleSaveDocument = useCallback((docId: string, kind: 'character' | 'template') => {
    const ak = activeTabKeyRef.current;
    if (!ak) return;
    setTabs(prev => prev.map(t => (t.key === ak && t.kind === kind) ? { ...t, docId } : t));
  }, []);

  /** 启动时恢复持久化的选项卡列表（仅登记，不加载内容；切换到时按需加载） */
  const handleRestoreTabs = useCallback((restored: { key: string; docId: string; kind: 'character' | 'template'; title?: string }[]) => {
    setTabs(prev => {
      if (prev.length) return prev;
      return restored.map(t => ({ key: t.key, docId: t.docId, kind: t.kind, title: t.title || '', dirty: false }));
    });
  }, []);

  /** 把一份未保存内容写入本地草稿（人物卡沿用 pf1_char_draft_*，模板用 pf1_tpl_draft_*） */
  const writeDraftForDoc = useCallback((
    docId: string,
    payload: { kind: 'character' | 'template'; data?: CharacterData; content?: string; activeDoc?: any }
  ) => {
    try {
      if (payload.kind === 'character') {
        const activeDoc = payload.activeDoc;
        const baseUpdatedAt = activeDoc?.updatedAt?.toMillis?.() || (typeof activeDoc?.updatedAt === 'number' ? activeDoc?.updatedAt : 0);
        localStorage.setItem(`pf1_char_draft_${docId}`, JSON.stringify({
          data: payload.data, baseUpdatedAt, draftSavedAt: Date.now()
        }));
      } else {
        localStorage.setItem(`pf1_tpl_draft_${docId}`, JSON.stringify({
          content: payload.content, draftSavedAt: Date.now()
        }));
      }
    } catch (e) {
      console.error('Failed to write draft to localStorage:', e);
    }
  }, []);

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

  // 监听浏览器刷新与关闭：未开启本地缓存时提醒保存；开启后不打扰，且同步落盘活动文档的最新草稿
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty && !isTemplateDirty) return;
      if (!settings.storage.enableLocalAutoCache) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      // 防抖写入可能还没跑，关闭前同步落盘一次（localStorage 同步写，beforeunload 里可靠）
      const active = tabsRef.current.find(t => t.key === activeTabKeyRef.current);
      if (active?.kind === 'template') {
        if (isTemplateDirty && currentTemplateId) {
          writeDraftForDoc(currentTemplateId, { kind: 'template', content: bbcodeTemplate });
        }
      } else if (isDirty && currentCharacterId) {
        writeDraftForDoc(currentCharacterId, { kind: 'character', data, activeDoc: activeDocRef.current });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isTemplateDirty, settings.storage.enableLocalAutoCache, currentCharacterId, currentTemplateId, bbcodeTemplate, data, writeDraftForDoc]);

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
  } = useCharacterPersistence({
    data, setData, lastSavedData, setLastSavedData,
    currentCharacterId, setCurrentCharacterId,
    currentTemplateId, setCurrentTemplateId,
    isReadOnly, setIsReadOnly, setIsSyncing,
    isDirty, setBbcodeTemplate, setLastSavedTemplate, computed,
    onOpenDocument: handleOpenDocument,
    onSaveDocument: handleSaveDocument,
    onRestoreTabs: handleRestoreTabs
  });

  const {
    driveModal, setDriveModal, isSyncingDrive,
    handleBrowseDrive, handleBrowseDriveRoot, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  } = useDriveSync();

  // ===== 选项卡切换：快照交换 =====

  /** 把当前活动选项卡的 live 状态暂存为快照（脏状态无损保留） */
  const stashActiveSnapshot = useCallback(() => {
    const key = activeTabKeyRef.current;
    if (!key) return;
    snapshotsRef.current.set(key, {
      data, lastSavedData, bbcodeTemplate, lastSavedTemplate, isReadOnly, activeDoc: activeDocRef.current
    });
    // 快照同时落盘：意外关闭浏览器后重开应用，切换到该标签页时可自动恢复未保存内容
    const tab = tabsRef.current.find(t => t.key === key);
    const liveDirty = isDirty || isTemplateDirty;
    if (tab?.docId && liveDirty && settings.storage.enableLocalAutoCache) {
      writeDraftForDoc(tab.docId, tab.kind === 'character'
        ? { kind: 'character', data, activeDoc: activeDocRef.current }
        : { kind: 'template', content: bbcodeTemplate });
    }
  }, [data, lastSavedData, bbcodeTemplate, lastSavedTemplate, isReadOnly, isDirty, isTemplateDirty, activeDocRef, settings.storage.enableLocalAutoCache, writeDraftForDoc]);

  /** 把快照整份换入 live 状态，并同步文档标识 / 视图 / URL */
  const applySnapshot = useCallback((snap: {
    data: CharacterData; lastSavedData: CharacterData; bbcodeTemplate: string;
    lastSavedTemplate: string; isReadOnly: boolean; activeDoc: any;
  }, tab: EditorTab) => {
    setData(snap.data);
    setLastSavedData(snap.lastSavedData);
    setBbcodeTemplate(snap.bbcodeTemplate);
    setLastSavedTemplate(snap.lastSavedTemplate);
    setIsReadOnly(snap.isReadOnly);
    activeDocRef.current = snap.activeDoc;
    if (tab.kind === 'character') {
      setCurrentCharacterId(tab.docId);
      setCurrentTemplateId(null);
    } else {
      setCurrentTemplateId(tab.docId);
      setCurrentCharacterId(null);
    }
    setView(tab.kind === 'character' ? 'editor' : 'bbcode-template');
    const url = new URL(window.location.href);
    if (tab.docId) url.searchParams.set('id', tab.docId);
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef]);

  const switchTab = useCallback(async (key: string) => {
    const tab = tabsRef.current.find(t => t.key === key);
    if (!tab) return;
    if (key === activeTabKeyRef.current) {
      // 已是该标签（可能正停留在档案库等其他视图）：仅切回对应视图
      setView(tab.kind === 'chooser' ? 'new-tab' : (tab.kind === 'character' ? 'editor' : 'bbcode-template'));
      return;
    }
    // 1. 暂存当前活动 tab 的 live 状态与脏标记
    stashActiveSnapshot();
    const liveDirty = isDirty || isTemplateDirty;
    const prevKey = activeTabKeyRef.current;
    setTabs(prev => prev.map(t => t.key === prevKey ? { ...t, dirty: liveDirty } : t));
    // 2. 激活目标 tab
    setActiveTabKey(key);
    // 3. 有快照 → 整份换入；无快照（本会话首次激活）→ 走正常加载
    const snap = snapshotsRef.current.get(key);
    if (snap) {
      applySnapshot(snap, tab);
    } else {
      await selectCharacter(tab.docId, true, true);
      // 加载失败（文档已删除等）：live 状态未变，撤销激活并移除失效 tab
      if (currentCharacterIdRef.current !== tab.docId && currentTemplateIdRef.current !== tab.docId) {
        snapshotsRef.current.delete(key);
        setTabs(prev => prev.filter(t => t.key !== key));
        setActiveTabKey(prevKey);
      }
    }
  }, [stashActiveSnapshot, isDirty, isTemplateDirty, selectCharacter, applySnapshot]);

  const closeTab = useCallback((key: string) => {
    const tab = tabsRef.current.find(t => t.key === key);
    if (!tab) return;
    const isActive = key === activeTabKeyRef.current;
    const tabDirty = isActive ? (isDirty || isTemplateDirty) : tab.dirty;
    const performClose = () => {
      snapshotsRef.current.delete(key);
      // 丢弃即删草稿（保存后关闭的情形已由 afterSave 清过，重复删除无害）
      if (tab.docId) {
        localStorage.removeItem(`pf1_char_draft_${tab.docId}`);
        localStorage.removeItem(`pf1_tpl_draft_${tab.docId}`);
      }
      const idx = tabsRef.current.findIndex(t => t.key === key);
      const remaining = tabsRef.current.filter(t => t.key !== key);
      if (!isActive) {
        setTabs(remaining);
        return;
      }
      const neighbor = remaining.length ? remaining[Math.min(idx, remaining.length - 1)] : null;
      setTabs(remaining);
      if (neighbor) {
        setActiveTabKey(neighbor.key);
        const snap = snapshotsRef.current.get(neighbor.key);
        if (snap) {
          applySnapshot(snap, neighbor);
        } else {
          // 邻居从未在本会话加载过：走正常加载
          selectCharacter(neighbor.docId, true, true);
        }
      } else {
        // 关闭最后一个选项卡：重置为全新空白人物卡
        const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA));
        setData(fresh);
        setLastSavedData(JSON.parse(JSON.stringify(fresh)));
        setCurrentCharacterId(null);
        setCurrentTemplateId(null);
        setIsReadOnly(false);
        activeDocRef.current = null;
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        window.history.replaceState({}, '', url.toString());
        setView('editor');
        setTabs([{ key: 'new-character', docId: null, kind: 'character', title: '新人物卡', dirty: false }]);
        setActiveTabKey('new-character');
      }
    };
    if (tabDirty) {
      setConfirmModal({
        title: "该标签页有未保存的修改，关闭后未保存的内容将丢失。",
        onConfirm: performClose,
        onSecondaryConfirm: async () => {
          await handleSave();
          performClose();
        }
      });
    } else {
      performClose();
    }
  }, [isDirty, isTemplateDirty, applySnapshot, selectCharacter, activeDocRef, handleSave]);

  // 活动选项卡的实时标题（人物卡取 basic.name，模板取文档名并去掉 .bbc 后缀）
  const activeTabTitle = useMemo(() => {
    const active = tabs.find(t => t.key === activeTabKey);
    if (active?.kind === 'chooser') return active.title || '新建标签页';
    if (active?.kind === 'template') {
      return (activeDocRef.current?.name || active.title || '').replace(/\.bbc$/i, '') || '未命名模板';
    }
    return data?.basic?.name || active?.title || '未命名人物';
  }, [tabs, activeTabKey, data]);

  /** 以"新选项卡"方式打开文档：先把当前活动 tab 的 live 状态暂存，再走正常加载 */
  const openDocumentAsTab = useCallback((idOrChar: string | any, skipDirtyCheck = false, shouldSwitchView = true) => {
    // 已打开且有快照的文档（可能含未保存修改）：直接切回去，避免重新加载覆盖修改
    const docId = typeof idOrChar === 'string' ? idOrChar : idOrChar?.id;
    if (docId) {
      const existing = tabsRef.current.find(t => t.docId === docId);
      if (existing && snapshotsRef.current.has(existing.key)) {
        return switchTab(existing.key);
      }
    }
    stashActiveSnapshot();
    const ak = activeTabKeyRef.current;
    if (ak) {
      const liveDirty = isDirty || isTemplateDirty;
      setTabs(prev => prev.map(t => t.key === ak ? { ...t, dirty: liveDirty } : t));
    }
    return selectCharacter(idOrChar, skipDirtyCheck, shouldSwitchView);
  }, [selectCharacter, stashActiveSnapshot, isDirty, isTemplateDirty, switchTab]);

  /** 暂存当前活动标签的 live 状态并更新其脏标记（打开其他标签前的公共步骤） */
  const stashAndMarkDirty = useCallback(() => {
    stashActiveSnapshot();
    const ak = activeTabKeyRef.current;
    if (ak) {
      const liveDirty = isDirty || isTemplateDirty;
      setTabs(prev => prev.map(t => t.key === ak ? { ...t, dirty: liveDirty } : t));
    }
  }, [stashActiveSnapshot, isDirty, isTemplateDirty]);

  /** 新建一个"未命名"伪标签（docId=null）：人物卡为空白卡，模板用默认模板内容 */
  const createUntitledTab = useCallback((kind: 'character' | 'template') => {
    if (kind === 'character') {
      const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA));
      setData(fresh);
      setLastSavedData(JSON.parse(JSON.stringify(fresh)));
    } else {
      setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
      setLastSavedTemplate(DEFAULT_BBCODE_TEMPLATE);
    }
    setCurrentCharacterId(null);
    setCurrentTemplateId(null);
    setIsReadOnly(false);
    activeDocRef.current = null;
    const key = `new-${kind}-${Date.now()}`;
    setTabs(prev => [...prev, { key, docId: null, kind, title: kind === 'character' ? '新人物卡' : '未命名模板', dirty: false }]);
    setActiveTabKey(key);
    setView(kind === 'character' ? 'editor' : 'bbcode-template');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef]);

  /** 激活同类标签的最近一个；若它已是活动标签（可能正停留在其他视图）则仅切回编辑视图 */
  const activateLastTabOfKind = useCallback((kind: 'character' | 'template'): boolean => {
    const sameKind = tabsRef.current.filter(t => t.kind === kind);
    if (!sameKind.length) return false;
    const target = sameKind[sameKind.length - 1];
    if (target.key === activeTabKeyRef.current) {
      setView(kind === 'character' ? 'editor' : 'bbcode-template');
    } else {
      switchTab(target.key);
    }
    return true;
  }, [switchTab]);

  /** 打开人物卡编辑器（头像菜单入口）：激活最近的人物卡标签，没有则新建空白人物卡标签 */
  const openCharacterTab = useCallback(() => {
    stashAndMarkDirty();
    if (!activateLastTabOfKind('character')) {
      createUntitledTab('character');
    }
  }, [stashAndMarkDirty, activateLastTabOfKind, createUntitledTab]);

  /**
   * 打开 BBCode 模板编辑器（保证一定以选项卡形式呈现）。
   * - forceNew=false（头像菜单入口）：已有模板标签则激活最近的一个，否则新建"未命名模板"
   * - forceNew=true（工具栏"新建模板"按钮）：总是新开一个未命名模板标签
   * 新建的伪标签 docId 为 null，首次保存后由 onSaveDocument 就地绑定真实 id。
   */
  const openTemplateTab = useCallback((forceNew: boolean = false) => {
    stashAndMarkDirty();
    if (!forceNew && activateLastTabOfKind('template')) return;
    createUntitledTab('template');
  }, [stashAndMarkDirty, activateLastTabOfKind, createUntitledTab]);

  /** 总是新建一个空白伪标签（不激活已有的） */
  const newBlankTab = useCallback((kind: 'character' | 'template') => {
    stashAndMarkDirty();
    createUntitledTab(kind);
  }, [stashAndMarkDirty, createUntitledTab]);

  /** 新建一个"新建标签页"（chooser 伪标签）：点击"+"瞬间开标签，页面内呈现选项 */
  const openChooserTab = useCallback(() => {
    stashAndMarkDirty();
    const key = `chooser-${Date.now()}`;
    setTabs(prev => [...prev, { key, docId: null, kind: 'chooser', title: '新建标签页', dirty: false }]);
    setActiveTabKey(key);
    setView('new-tab');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [stashAndMarkDirty]);

  /** 把当前 chooser 标签就地改造成空白的人物卡/模板标签（新建标签页上的选择动作，浏览器同页跳转语义） */
  const convertChooserTab = useCallback((kind: 'character' | 'template') => {
    if (kind === 'character') {
      const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA));
      setData(fresh);
      setLastSavedData(JSON.parse(JSON.stringify(fresh)));
    } else {
      setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
      setLastSavedTemplate(DEFAULT_BBCODE_TEMPLATE);
    }
    setCurrentCharacterId(null);
    setCurrentTemplateId(null);
    setIsReadOnly(false);
    activeDocRef.current = null;
    const ak = activeTabKeyRef.current;
    if (ak) {
      setTabs(prev => prev.map(t => t.key === ak
        ? { ...t, kind, title: kind === 'character' ? '新人物卡' : '未命名模板', dirty: false }
        : t));
    }
    setView(kind === 'character' ? 'editor' : 'bbcode-template');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef]);

  /** 从"新建标签页"打开一个最近文档：先关闭 chooser 标签，再按常规流程打开该文档（生成正常文档标签） */
  const openDocFromChooser = useCallback((id: string) => {
    const ak = activeTabKeyRef.current;
    if (ak) {
      snapshotsRef.current.delete(ak);
      setTabs(prev => prev.filter(t => t.key !== ak));
    }
    selectCharacter(id, true, true);
  }, [selectCharacter]);

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
      // 模板存入独立的 templates 集合（不再作为特殊人物卡写入 characters）
      const newId = await saveTemplate({ content, name }, null, templateFolderId);
      if (newId) {
        setLastSavedTemplate(content);
        setCurrentTemplateId(newId);
        // 活动选项卡就地绑定新模板 id（key 不变）
        handleSaveDocument(newId, 'template');
        setToast({ message: "模板已保存", type: 'success' });
        Promise.resolve(refreshCharacterList()).catch(console.error);
      }
    } catch (e) {
      setToast({ message: "保存模板失败", type: 'error' });
    }
  }, [user, setToast, setCurrentTemplateId, refreshCharacterList, handleSaveDocument]);

  const updateExistingTemplate = useCallback(async (id: string, content: string) => {
    if (!user) return;
    try {
      // 旧模板（characters 集合遗留文档）保存时自动迁移到 templates 集合并清理旧文档
      const newId = await saveTemplateMigrating({ content }, id, undefined);
      setLastSavedTemplate(content);
      // 迁移会生成新文档 ID，同步"当前激活模板"指针
      if (newId && newId !== id) {
        setCurrentTemplateId(newId);
        localStorage.setItem(KEY_LAST_TEMP, newId);
      }
      // 模板迁移会换 id：活动选项卡就地更新 docId（key 不变）
      handleSaveDocument(newId || id, 'template');
      setToast({ message: "模板已更新", type: 'success' });
      Promise.resolve(refreshCharacterList()).catch(console.error);
    } catch (e) {
      setToast({ message: "更新模板失败", type: 'error' });
    }
  }, [user, setToast, setCurrentTemplateId, refreshCharacterList, handleSaveDocument]);

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
    handleSave, handleSaveAs, handleNew, handleShare, handleExport, handleExportBBCode, handleRevertChanges,
    selectCharacter: openDocumentAsTab,
    loadSharedCharacter: (id: string) => openDocumentAsTab(id, true, true),
    tabs, activeTabKey, activeTabTitle, switchTab, closeTab, openCharacterTab, openTemplateTab, openChooserTab, convertChooserTab, openDocFromChooser,
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
    getItemPath,
    openDocumentAsTab, openCharacterTab, openTemplateTab, openChooserTab, convertChooserTab, openDocFromChooser, tabs, activeTabKey, activeTabTitle, switchTab, closeTab
  ]);

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

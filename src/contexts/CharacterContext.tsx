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
  kind: 'character' | 'template' | 'chooser' | 'preview';
  title: string;
  /** 切换走时暂存的未保存标记（活动选项卡的脏状态由 live 状态实时计算） */
  dirty: boolean;
}

/** 编辑器分栏（VS Code 式）：每栏有自己的标签序列与活动标签 */
export interface EditorPane {
  id: string;
  tabKeys: string[];
  activeTabKey: string | null;
}

/** 某个标签被暂存时的完整 live 状态快照 */
export interface TabSnapshot {
  data: CharacterData;
  lastSavedData: CharacterData;
  bbcodeTemplate: string;
  lastSavedTemplate: string;
  isReadOnly: boolean;
  activeDoc: any;
}

export interface CharacterContextType {
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
  closeTab: (key: string, opts?: { skipConfirm?: boolean }) => void;
  /** 删除文档后关闭其标签（跳过确认） */
  closeTabsByDocIds: (docIds: string[]) => void;
  /** 打开人物卡编辑器（激活最近的人物卡标签或新建空白卡标签） */
  openCharacterTab: () => void;
  /** 打开 BBCode 模板编辑器（forceNew=true 时强制新开未命名模板标签） */
  openTemplateTab: (forceNew?: boolean) => void;
  /** 新建一个"新建标签页"（chooser 伪标签，页面内呈现新建人物卡/模板/最近文件选项） */
  openChooserTab: (targetPaneId?: string) => void;
  /** 把当前 chooser 标签就地改造成空白的人物卡/模板标签（新建标签页上的选择动作） */
  convertChooserTab: (kind: 'character' | 'template' | 'preview', targetKey?: string) => void;
  /** 打开预览标签页（newPane=true 时在新建分栏中打开）；预览实时渲染当前编辑中的模板内容 */
  openPreviewTab: (newPane?: boolean) => void;
  /** 从"新建标签页"打开一个最近文档：关闭 chooser 标签并按常规流程打开该文档 */
  openDocFromChooser: (id: string, targetKey?: string) => void;

  // Editor Panes（分栏：VS Code 式向右拆分，标签可在栏间拖拽）
  panes: EditorPane[];
  focusedPaneId: string;
  /** 在标签栏右侧新增一栏（以"新建标签页"开场，上限 4 栏） */
  addPane: () => void;
  /** 把标签移动到目标分栏（拖拽放置），源栏空了会自动剪除 */
  moveTabToPane: (tabKey: string, paneId: string) => void;
  /** 聚焦某个分栏（点击未聚焦分栏时，live 状态切换到其活动文档） */
  focusPane: (paneId: string) => void;
  /** 读取某标签被暂存时的 live 快照（供未聚焦分栏只读渲染） */
  getTabSnapshot: (tabKey: string) => TabSnapshot | null;
}

export const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

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
  /** 标签标题净化：非字符串/空/对象残影统一回退到类型默认名 */
  const sanitizeTabTitle = (title: unknown, kind: string): string => {
    const s = typeof title === 'string' ? title.trim() : '';
    if (!s || s === '{}' || s === '[object Object]') {
      return kind === 'character' ? '人物卡' : kind === 'preview' ? '预览' : '未命名模板';
    }
    return s;
  };

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

  // ===== 分栏（panes）状态 =====
  const [panes, setPanes] = useState<EditorPane[]>([{ id: 'pane-1', tabKeys: [], activeTabKey: null }]);
  const [focusedPaneId, setFocusedPaneId] = useState('pane-1');
  const panesRef = useRef<EditorPane[]>([]);
  panesRef.current = panes;
  const focusedPaneIdRef = useRef(focusedPaneId);
  focusedPaneIdRef.current = focusedPaneId;
  /** openDocFromChooser 的"原位顶替"标记：新文档标签顶替 chooser 标签（保持其分栏与位置） */
  const pendingReplaceKeyRef = useRef<string | null>(null);

  // 分栏持久化
  useEffect(() => {
    try {
      localStorage.setItem('pf1_panes', JSON.stringify(panes));
      localStorage.setItem('pf1_focused_pane', focusedPaneId);
    } catch (e) {
      console.error('Failed to persist panes:', e);
    }
  }, [panes, focusedPaneId]);

  // ===== 分栏簿记辅助 =====
  /** 从分栏列表中移除某标签（返回新列表；栏空则剪除，但保底不返回空列表） */
  const removeTabFromPanes = (list: EditorPane[], key: string): EditorPane[] => {
    let next = list.map(p => {
      if (!p.tabKeys.includes(key)) return p;
      const remaining = p.tabKeys.filter(k => k !== key);
      return { ...p, tabKeys: remaining, activeTabKey: p.activeTabKey === key ? (remaining[remaining.length - 1] ?? null) : p.activeTabKey };
    });
    const nonEmpty = next.filter(p => p.tabKeys.length > 0);
    return nonEmpty.length ? nonEmpty : list;
  };

  /** 把标签挂入聚焦分栏（若已在某栏则激活该栏）；返回其最终所在分栏 id */
  const assignTabToFocusedPane = useCallback((tabKey: string): string => {
    const existingPane = panesRef.current.find(p => p.tabKeys.includes(tabKey));
    if (existingPane) {
      setFocusedPaneId(existingPane.id);
      setPanes(prev => prev.map(p => p.id === existingPane.id ? { ...p, activeTabKey: tabKey } : p));
      return existingPane.id;
    }
    const fpId = focusedPaneIdRef.current;
    const fp = panesRef.current.find(p => p.id === fpId) || panesRef.current[0];
    if (!fp) {
      setPanes([{ id: 'pane-1', tabKeys: [tabKey], activeTabKey: tabKey }]);
      setFocusedPaneId('pane-1');
      return 'pane-1';
    }
    setPanes(prev => prev.map(p => p.id === fp.id ? { ...p, tabKeys: [...p.tabKeys, tabKey], activeTabKey: tabKey } : p));
    return fp.id;
  }, []);

  // 选项卡列表持久化：只保存已落库的文档（docId 非空），未保存的新卡不入册
  useEffect(() => {
    const persisted = tabs
      .filter(t => t.docId)
      .map(({ key, docId, kind, title }) => ({ key, docId, kind, title: typeof title === 'string' ? title : '' }));
    try {
      localStorage.setItem('pf1_open_tabs', JSON.stringify(persisted));
    } catch (e) {
      console.error('Failed to persist open tabs:', e);
    }
  }, [tabs]);

  /** 文档渲染进 live 状态（= 打开了一个文档）：创建或激活对应选项卡，并挂入聚焦分栏 */
  const handleOpenDocument = useCallback((docId: string, kind: 'character' | 'template', title?: string) => {
    const replaceKey = pendingReplaceKeyRef.current;
    const existing = tabsRef.current.find(t => t.docId === docId);
    if (existing) {
      // 已登记：修正类型（URL 直达时 kind 是猜测的）并激活
      setTabs(prev => prev.map(t => t.key === existing.key ? { ...t, kind, title: title || t.title } : t));
      setActiveTabKey(existing.key);
      // 聚焦其所在分栏
      const pane = panesRef.current.find(p => p.tabKeys.includes(existing.key));
      if (pane) setFocusedPaneId(pane.id);
      if (replaceKey && replaceKey !== existing.key) {
        // chooser 顶替目标已存在于其它分栏：移除 chooser 标签
        pendingReplaceKeyRef.current = null;
        setTabs(prev => prev.filter(t => t.key !== replaceKey));
        setPanes(prev => removeTabFromPanes(prev, replaceKey));
      }
      return;
    }
    if (replaceKey) {
      // 原位顶替：新文档标签就地取代 chooser 标签（保持其分栏与位置）
      pendingReplaceKeyRef.current = null;
      setTabs(prev => prev.map(t => t.key === replaceKey
        ? { key: docId, docId, kind, title: title || (kind === 'character' ? '人物卡' : '模板'), dirty: false }
        : t));
      setPanes(prev => prev.map(p => p.tabKeys.includes(replaceKey)
        ? { ...p, tabKeys: p.tabKeys.map(k => (k === replaceKey ? docId : k)), activeTabKey: p.activeTabKey === replaceKey ? docId : p.activeTabKey }
        : p));
      setActiveTabKey(docId);
      return;
    }
    setTabs(prev => prev.some(t => t.docId === docId)
      ? prev
      : [...prev, { key: docId, docId, kind, title: sanitizeTabTitle(title, kind), dirty: false }]);
    setActiveTabKey(docId);
    // 挂入聚焦分栏
    const fpId = focusedPaneIdRef.current;
    const fp = panesRef.current.find(p => p.id === fpId) || panesRef.current[0];
    if (fp) {
      setPanes(prev => prev.map(p => p.id === fp.id ? { ...p, tabKeys: [...p.tabKeys, docId], activeTabKey: docId } : p));
    } else {
      setPanes([{ id: 'pane-1', tabKeys: [docId], activeTabKey: docId }]);
      setFocusedPaneId('pane-1');
    }
  }, []);

  /** 保存导致活动文档 id 变化（另存为 / 迁移 / 首次保存）：就地更新活动选项卡的 docId，key 不变 */
  const handleSaveDocument = useCallback((docId: string, kind: 'character' | 'template') => {
    const ak = activeTabKeyRef.current;
    if (!ak) return;
    setTabs(prev => prev.map(t => (t.key === ak && t.kind === kind) ? { ...t, docId } : t));
  }, []);

  /** 启动时恢复持久化的选项卡列表与分栏结构（仅登记，不加载内容；切换到时按需加载） */
  const handleRestoreTabs = useCallback((restored: { key: string; docId: string; kind: 'character' | 'template'; title?: string }[]) => {
    setTabs(prev => {
      if (prev.length) return prev;
      return restored.map(t => ({ key: t.key, docId: t.docId, kind: t.kind, title: sanitizeTabTitle(t.title, t.kind), dirty: false }));
    });
    setPanes(prev => {
      // StrictMode 双跑 / 已有结构时跳过
      if (prev.some(p => p.tabKeys.length > 0)) return prev;
      const keys = new Set(restored.map(t => t.key));
      let restoredPanes: EditorPane[] = [];
      let restoredFocus = 'pane-1';
      try {
        const stored = JSON.parse(localStorage.getItem('pf1_panes') || '[]') as EditorPane[];
        restoredPanes = stored
          .map(p => ({ ...p, tabKeys: (p.tabKeys || []).filter(k => keys.has(k)) }))
          .filter(p => p.tabKeys.length > 0);
        const storedFocus = localStorage.getItem('pf1_focused_pane');
        if (storedFocus && restoredPanes.some(p => p.id === storedFocus)) restoredFocus = storedFocus;
      } catch { /* 忽略损坏数据 */ }
      // 未被任何分栏收录的标签补进第一栏
      const missing = restored.filter(t => !restoredPanes.some(p => p.tabKeys.includes(t.key))).map(t => t.key);
      if (!restoredPanes.length) {
        restoredPanes = [{ id: 'pane-1', tabKeys: restored.map(t => t.key), activeTabKey: restored[0]?.key ?? null }];
      } else if (missing.length) {
        restoredPanes = restoredPanes.map((p, i) => i === 0 ? { ...p, tabKeys: [...p.tabKeys, ...missing] } : p);
      }
      if (!restoredPanes.some(p => p.id === restoredFocus)) restoredFocus = restoredPanes[0].id;
      return restoredPanes;
    });
    setFocusedPaneId(prev => {
      try {
        const stored = localStorage.getItem('pf1_focused_pane');
        if (stored) return stored;
      } catch { /* ignore */ }
      return prev;
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
    // chooser（新建标签页）没有文档状态：不暂存，否则会把上一个文档的残留 live 数据
    // 错误地挂到 chooser 的 key 下，之后切回时 applySnapshot 会弹出错误的编辑器
    const activeTab = tabsRef.current.find(t => t.key === key);
    if (activeTab?.kind === 'chooser' || activeTab?.kind === 'preview') return;
    snapshotsRef.current.set(key, {
      data, lastSavedData, bbcodeTemplate, lastSavedTemplate, isReadOnly, activeDoc: activeDocRef.current
    });
    // 快照同时落盘：意外关闭浏览器后重开应用，切换到该标签页时可自动恢复未保存内容
    const tab = activeTab;
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
    // chooser/preview 永远不应该走快照换入（防御：若有残留快照也只切视图，避免弹出错误编辑器）
    setView(tab.kind === 'chooser' ? 'new-tab' : 'editor');
    const url = new URL(window.location.href);
    if (tab.docId) url.searchParams.set('id', tab.docId);
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef]);

  const switchTab = useCallback(async (key: string) => {
    const tab = tabsRef.current.find(t => t.key === key);
    if (!tab) return;
    if (key === activeTabKeyRef.current) {
      // 已是该标签（可能正停留在档案库等其他视图）：仅切回对应视图
      setView(tab.kind === 'chooser' ? 'new-tab' : 'editor');
      return;
    }
    // 1. 暂存当前活动 tab 的 live 状态与脏标记（chooser 无文档状态，跳过）
    const prevTab = tabsRef.current.find(t => t.key === activeTabKeyRef.current);
    const prevIsChooser = prevTab?.kind === 'chooser';
    if (!prevIsChooser) stashActiveSnapshot();
    const liveDirty = isDirty || isTemplateDirty;
    const prevKey = activeTabKeyRef.current;
    if (!prevIsChooser) {
      setTabs(prev => prev.map(t => t.key === prevKey ? { ...t, dirty: liveDirty } : t));
    }
    // 2. 激活目标 tab，并聚焦其所在分栏
    setActiveTabKey(key);
    const targetPane = panesRef.current.find(p => p.tabKeys.includes(key));
    if (targetPane) {
      setFocusedPaneId(targetPane.id);
      setPanes(prev => prev.map(p => p.id === targetPane.id ? { ...p, activeTabKey: key } : p));
    }
    // 3. chooser → 切视图即可（并清理可能被污染的残留快照）；
    //    有快照 → 整份换入；无快照（本会话首次激活）→ 走正常加载
    if (tab.kind === 'chooser' || tab.kind === 'preview') {
      snapshotsRef.current.delete(key);
      setView(tab.kind === 'chooser' ? 'new-tab' : 'editor');
      return;
    }
    const snap = snapshotsRef.current.get(key);
    if (snap) {
      applySnapshot(snap, tab);
    } else {
      await selectCharacter(tab.docId, true, true);
      // 加载失败（文档已删除等）：live 状态未变，撤销激活并移除失效 tab
      if (currentCharacterIdRef.current !== tab.docId && currentTemplateIdRef.current !== tab.docId) {
        snapshotsRef.current.delete(key);
        setTabs(prev => prev.filter(t => t.key !== key));
        setPanes(prev => removeTabFromPanes(prev, key));
        setActiveTabKey(prevKey);
        const prevPane = panesRef.current.find(p => p.tabKeys.includes(prevKey));
        if (prevPane) setFocusedPaneId(prevPane.id);
      }
    }
  }, [stashActiveSnapshot, isDirty, isTemplateDirty, selectCharacter, applySnapshot]);

  /** 激活某个标签到 live 状态（有快照换入、无快照走加载、chooser/preview 仅切视图） */
  const restoreTabLive = useCallback((tab: EditorTab) => {
    if (tab.kind === 'chooser') { setView('new-tab'); return; }
    if (tab.kind === 'preview') { setView('editor'); return; }
    const snap = snapshotsRef.current.get(tab.key);
    if (snap) {
      applySnapshot(snap, tab);
    } else {
      selectCharacter(tab.docId, true, true);
    }
  }, [applySnapshot, selectCharacter]);
  const closeTab = useCallback((key: string, opts?: { skipConfirm?: boolean }) => {
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
      const paneIdx = panesRef.current.findIndex(p => p.tabKeys.includes(key));
      const ownerPane = panesRef.current[paneIdx];
      // 分栏簿记：从所属栏移除；栏空则剪除；聚焦栏被剪除时聚焦转移到相邻栏
      let nextPanes = panesRef.current.map(p => {
        if (!p.tabKeys.includes(key)) return p;
        const remaining = p.tabKeys.filter(k => k !== key);
        return { ...p, tabKeys: remaining, activeTabKey: p.activeTabKey === key ? (remaining[remaining.length - 1] ?? null) : p.activeTabKey };
      });
      const nonEmpty = nextPanes.filter(p => p.tabKeys.length > 0);
      const remainingTabs = tabsRef.current.filter(t => t.key !== key);
      if (nonEmpty.length === 0) {
        // 全部关完：呈现新建标签页（不自动新建人物卡）
        const chooserKey = `chooser-${Date.now()}`;
        setTabs([{ key: chooserKey, docId: null, kind: 'chooser', title: '新建标签页', dirty: false }]);
        setPanes([{ id: 'pane-1', tabKeys: [chooserKey], activeTabKey: chooserKey }]);
        setFocusedPaneId('pane-1');
        setActiveTabKey(chooserKey);
        setView('new-tab');
        return;
      }
      let focusedNext = focusedPaneIdRef.current;
      let nextActiveTab: string | null = activeTabKeyRef.current;
      if (ownerPane && ownerPane.tabKeys.length - 1 <= 0) {
        // 该栏被剪除
        nextPanes = nonEmpty;
        if (focusedNext === ownerPane.id) {
          const neighbor = nonEmpty[Math.min(paneIdx, nonEmpty.length - 1)];
          focusedNext = neighbor.id;
          nextActiveTab = neighbor.activeTabKey ?? neighbor.tabKeys[neighbor.tabKeys.length - 1] ?? null;
        }
      } else if (isActive && ownerPane) {
        // 关闭的是聚焦栏的活动标签：该栏活动标签已顺延为 remaining 最后一个
        const p = nextPanes.find(pp => pp.id === ownerPane.id);
        nextActiveTab = p?.activeTabKey ?? nextActiveTab;
      }
      setPanes(nextPanes);
      setFocusedPaneId(focusedNext);
      setTabs(remainingTabs);
      if (isActive) {
        if (nextActiveTab && nextActiveTab !== key) {
          setActiveTabKey(nextActiveTab);
          const nt = remainingTabs.find(t => t.key === nextActiveTab);
          if (nt) {
            if (nt.kind === 'chooser') {
              setView('new-tab');
            } else {
              const snap = snapshotsRef.current.get(nextActiveTab);
              if (snap) {
                applySnapshot(snap, nt);
              } else {
                // 该标签从未在本会话加载过：走正常加载
                selectCharacter(nextActiveTab, true, true);
              }
            }
          }
        }
      }
    };
    if (tabDirty && !opts?.skipConfirm) {
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

  /** 删除文档后关闭对应标签（跳过未保存确认；若全部关完则重置为空白人物卡） */
  const closeTabsByDocIds = useCallback((docIds: string[]) => {
    const idSet = new Set(docIds);
    if (!idSet.size) return;
    const doomed = tabsRef.current.filter(t => t.docId && idSet.has(t.docId));
    if (!doomed.length) return;
    doomed.forEach(t => {
      snapshotsRef.current.delete(t.key);
      if (t.docId) {
        localStorage.removeItem(`pf1_char_draft_${t.docId}`);
        localStorage.removeItem(`pf1_tpl_draft_${t.docId}`);
      }
    });
    const wasActive = doomed.some(t => t.key === activeTabKeyRef.current);
    setTabs(prev => prev.filter(t => !(t.docId && idSet.has(t.docId))));
    // 分栏簿记：移除标签并剪除空栏；活动标签被删时同栏顺延
    let nextPanes = panesRef.current.map(p => ({
      ...p,
      tabKeys: p.tabKeys.filter(k => {
        const t = tabsRef.current.find(tt => tt.key === k);
        return !(t?.docId && idSet.has(t.docId));
      }),
    })).map(p => ({ ...p, activeTabKey: p.tabKeys.includes(p.activeTabKey ?? '') ? p.activeTabKey : (p.tabKeys[p.tabKeys.length - 1] ?? null) }));
    const nonEmpty = nextPanes.filter(p => p.tabKeys.length > 0);
    if (nonEmpty.length === 0) {
      // 全部关完：呈现新建标签页（不自动新建人物卡）
      const chooserKey = `chooser-${Date.now()}`;
      setTabs([{ key: chooserKey, docId: null, kind: 'chooser', title: '新建标签页', dirty: false }]);
      setPanes([{ id: 'pane-1', tabKeys: [chooserKey], activeTabKey: chooserKey }]);
      setFocusedPaneId('pane-1');
      setActiveTabKey(chooserKey);
      setView('new-tab');
      return;
    }
    if (!nonEmpty.some(p => p.id === focusedPaneIdRef.current)) {
      setFocusedPaneId(nonEmpty[0].id);
    }
    setPanes(nonEmpty);
    if (wasActive) {
      const fp = nonEmpty.find(p => p.id === focusedPaneIdRef.current) || nonEmpty[0];
      const nk = fp.activeTabKey ?? fp.tabKeys[fp.tabKeys.length - 1] ?? null;
      const nt = nk ? tabsRef.current.find(tt => tt.key === nk) : null;
      if (nt) {
        setActiveTabKey(nk);
        restoreTabLive(nt);
      }
    }
  }, [restoreTabLive, setData, setLastSavedData, setCurrentCharacterId, setCurrentTemplateId, setIsReadOnly, setView, activeDocRef]);


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
    assignTabToFocusedPane(key);
    setView('editor');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef, assignTabToFocusedPane]);

  /** 激活同类标签的最近一个；若它已是活动标签（可能正停留在其他视图）则仅切回编辑视图 */
  const activateLastTabOfKind = useCallback((kind: 'character' | 'template'): boolean => {
    const sameKind = tabsRef.current.filter(t => t.kind === kind);
    if (!sameKind.length) return false;
    const target = sameKind[sameKind.length - 1];
    if (target.key === activeTabKeyRef.current) {
      setView('editor');
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

  /** 新建一个"新建标签页"（chooser 伪标签）：点击"+"瞬间开标签，页面内呈现选项。
   *  targetPaneId：指定落入的分栏（缺省为当前聚焦分栏）。 */
  const openChooserTab = useCallback((targetPaneId?: string) => {
    stashAndMarkDirty();
    const key = `chooser-${Date.now()}`;
    setTabs(prev => [...prev, { key, docId: null, kind: 'chooser', title: '新建标签页', dirty: false }]);
    setActiveTabKey(key);
    const target = targetPaneId ?? focusedPaneIdRef.current;
    const tp = panesRef.current.find(p => p.id === target);
    if (tp) {
      setFocusedPaneId(tp.id);
      setPanes(prev => prev.map(p => p.id === tp.id ? { ...p, tabKeys: [...p.tabKeys, key], activeTabKey: key } : p));
    } else {
      assignTabToFocusedPane(key);
    }
    setView('new-tab');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [stashAndMarkDirty, assignTabToFocusedPane]);

  /** 把 chooser 标签就地改造成空白的人物卡/模板标签（新建标签页上的选择动作，浏览器同页跳转语义）。
   *  targetKey：未聚焦分栏的 chooser 需显式指定要改造的标签 key；缺省为当前活动标签。 */
  const convertChooserTab = useCallback((kind: 'character' | 'template' | 'preview', targetKey?: string) => {
    const chooserKey = targetKey ?? activeTabKeyRef.current;
    if (!chooserKey) return;
    const isFocused = chooserKey === activeTabKeyRef.current;
    if (!isFocused) {
      // 未聚焦的 chooser：先把当前 live 暂存回其所属标签，再聚焦 chooser
      stashActiveSnapshot();
      const pane = panesRef.current.find(p => p.tabKeys.includes(chooserKey));
      if (pane) {
        setFocusedPaneId(pane.id);
        setPanes(prev => prev.map(p => p.id === pane.id ? { ...p, activeTabKey: chooserKey } : p));
      }
      setActiveTabKey(chooserKey);
    }
    // 重置 live 为空白内容（preview 无文档状态，跳过）
    if (kind === 'preview') {
      // 预览标签不需要文档状态
    } else if (kind === 'character') {
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
    // 就地改造标签记录
    setTabs(prev => prev.map(t => t.key === chooserKey
      ? { ...t, kind, title: kind === 'preview' ? '预览' : (kind === 'character' ? '新人物卡' : '未命名模板'), dirty: false }
      : t));
    setView('editor');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [activeDocRef, stashActiveSnapshot]);

  /** 从"新建标签页"打开一个最近文档：chooser 标签被新文档标签原位顶替（保持其分栏与位置）。
   *  targetKey：未聚焦分栏的 chooser 需显式指定其标签 key；缺省为当前活动标签。 */
  const openDocFromChooser = useCallback((id: string, targetKey?: string) => {
    const chooserKey = targetKey ?? activeTabKeyRef.current;
    const atab = tabsRef.current.find(t => t.key === chooserKey);
    if (atab?.kind === 'chooser') {
      pendingReplaceKeyRef.current = chooserKey;
      snapshotsRef.current.delete(chooserKey);
    }
    // 目标文档已在其它分栏打开：直接聚焦它（chooser 由 handleOpenDocument 清理）
    const existing = tabsRef.current.find(t => t.docId === id);
    if (existing && existing.key !== chooserKey) {
      pendingReplaceKeyRef.current = null;
      switchTab(existing.key);
      return;
    }
    selectCharacter(id, true, true);
  }, [selectCharacter, switchTab]);

  /** 在标签栏右侧新增一栏（以"新建标签页"开场），并聚焦它；上限 4 栏 */
  /** 打开预览标签页：实时渲染当前编辑中的 BBCode 模板内容。
   *  newPane=true 时在新分栏中打开（预览窗格与编辑器解绑的关键入口）。 */
  const openPreviewTab = useCallback((newPane?: boolean) => {
    stashAndMarkDirty();
    const key = `preview-${Date.now()}`;
    setTabs(prev => [...prev, { key, docId: null, kind: 'preview', title: '预览', dirty: false }]);
    if (newPane) {
      const paneId = `pane-${Date.now()}`;
      setPanes(prev => [...prev, { id: paneId, tabKeys: [key], activeTabKey: key }]);
      setFocusedPaneId(paneId);
    } else {
      assignTabToFocusedPane(key);
    }
    setView('editor');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [stashAndMarkDirty, assignTabToFocusedPane]);

  const addPane = useCallback(() => {
    if (panesRef.current.length >= 4) return;
    stashAndMarkDirty();
    const paneId = `pane-${Date.now()}`;
    const chooserKey = `chooser-${Date.now()}`;
    setTabs(prev => [...prev, { key: chooserKey, docId: null, kind: 'chooser', title: '新建标签页', dirty: false }]);
    setPanes(prev => [...prev, { id: paneId, tabKeys: [chooserKey], activeTabKey: chooserKey }]);
    setActiveTabKey(chooserKey);
    setFocusedPaneId(paneId);
    setView('new-tab');
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  }, [stashAndMarkDirty]);

  /** 把标签移动到目标分栏（拖拽放置）；源栏空了自动剪除，目标栏激活该标签 */
  const moveTabToPane = useCallback((tabKey: string, targetPaneId: string) => {
    const source = panesRef.current.find(p => p.tabKeys.includes(tabKey));
    const target = panesRef.current.find(p => p.id === targetPaneId);
    if (!source || !target || source.id === targetPaneId) return;
    let next = panesRef.current.map(p => {
      if (p.id === source.id) {
        const remaining = p.tabKeys.filter(k => k !== tabKey);
        return { ...p, tabKeys: remaining, activeTabKey: p.activeTabKey === tabKey ? (remaining[remaining.length - 1] ?? null) : p.activeTabKey };
      }
      if (p.id === targetPaneId) {
        return { ...p, tabKeys: [...p.tabKeys, tabKey], activeTabKey: tabKey };
      }
      return p;
    });
    const nonEmpty = next.filter(p => p.tabKeys.length > 0);
    if (nonEmpty.length !== next.length) next = nonEmpty.length ? nonEmpty : next;
    setPanes(next);
    // 移动的是全局活动标签：聚焦跟随到目标栏
    if (tabKey === activeTabKeyRef.current) setFocusedPaneId(targetPaneId);
  }, []);

  /** 聚焦某个分栏：live 状态切换到其活动文档（未聚焦分栏为只读快照渲染） */
  const focusPane = useCallback((paneId: string) => {
    if (paneId === focusedPaneIdRef.current) return;
    const pane = panesRef.current.find(p => p.id === paneId);
    if (!pane) return;
    const tabKey = pane.activeTabKey ?? pane.tabKeys[pane.tabKeys.length - 1] ?? null;
    if (!tabKey) {
      setFocusedPaneId(paneId);
      return;
    }
    switchTab(tabKey);
  }, [switchTab]);

  /** 读取某标签被暂存时的 live 快照（供未聚焦分栏只读渲染） */
  const getTabSnapshot = useCallback((tabKey: string) => {
    return snapshotsRef.current.get(tabKey) ?? null;
  }, []);

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
    // 以聚焦标签的类型判断（分栏模式下模板标签的视图是 'editor'）
    const focusedTab = tabs.find(t => t.key === activeTabKey);
    const id = focusedTab?.kind === 'template' ? currentTemplateId : currentCharacterId;
    if (!id) {
      setToast({ message: "请先打开一个人物卡或模板", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！" });
  }, [tabs, activeTabKey, currentTemplateId, currentCharacterId, setToast]);

  const handleExport = useCallback(() => {
    const focusedTab = tabs.find(t => t.key === activeTabKey);
    const isTemplate = focusedTab?.kind === 'template';
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
  }, [tabs, activeTabKey, data, bbcodeTemplate]);

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
    tabs, activeTabKey, activeTabTitle, switchTab, closeTab, closeTabsByDocIds, openCharacterTab, openTemplateTab, openChooserTab, convertChooserTab, openDocFromChooser, openPreviewTab,
    panes, focusedPaneId, addPane, moveTabToPane, focusPane, getTabSnapshot,
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
    openDocumentAsTab, openCharacterTab, openTemplateTab, openChooserTab, convertChooserTab, openDocFromChooser, openPreviewTab, closeTabsByDocIds,
    tabs, activeTabKey, activeTabTitle, switchTab, closeTab,
    panes, focusedPaneId, addPane, moveTabToPane, focusPane, getTabSnapshot
  ]);

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

/**
 * 左侧常驻资源管理器侧栏（VS Code 风格）。
 * 两个可折叠区块：
 *  1. 打开的编辑器 —— 当前文档标签列表（点击激活、X 关闭、未保存圆点）
 *  2. 档案库 —— react-arborist 虚拟化文件树（点击文档即以标签页打开；
 *     右键菜单/拖拽/删除等业务与档案库网格共享 useVaultExplorer 业务层）
 * 外壳支持拖拽调宽、折叠成细条（宽度与折叠状态持久化到 localStorage）。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, RefreshCw, ChevronDown, ChevronRight,
  FileText, Braces, Link2, Folder, FolderOpen, X, CloudUpload, Grid3x3, Sparkles
} from 'lucide-react';
import { Tree, type NodeRendererProps } from 'react-arborist';
import { createDragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';
import { useVaultExplorer, type VaultDragItem, type VaultMenuTarget } from '../../contexts/hooks/useVaultExplorer';
import ContextMenu from '../common/ContextMenu';
import Dialog from '../common/Dialog';
import { buildTabMenuItems } from '../editor/tabMenuItems';

const KEY_WIDTH = 'pf1_sidebar_width';
const KEY_COLLAPSED = 'pf1_sidebar_collapsed';
const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const ROW_HEIGHT = 26;

// arborist 内部自带 react-dnd Provider；用模块级单例 manager 共享同一个 HTML5 backend，
// 避免 StrictMode 双挂载 / Fast Refresh 重挂载触发 "Cannot have two HTML5 backends"
const treeDndManager = createDragDropManager(HTML5Backend, undefined, {}, false);

interface ArborNode {
  id: string;
  name: string;
  isFolder: boolean;
  /** 文档的真实 Firestore id（文件夹为 'folder-' 前缀的合成 id） */
  docId?: string;
  /** 节点所在父文件夹的 id（根级为 null）；供"拖到展开区域"判定落点 */
  parentFolderId?: string | null;
  isTemplate?: boolean;
  isLink?: boolean;
  children?: ArborNode[];
}

interface SidebarContextMenu {
  x: number;
  y: number;
  target: VaultMenuTarget;
}

export default function ExplorerSidebar() {
  const { tabs, activeTabKey, panes, focusedPaneId, switchTab, closeTab, activeTabTitle, isDirty, isTemplateDirty } = useCharacter();
  // 完整上下文：供「打开的编辑器」右键菜单构建器使用（与标签条同一份菜单）
  const characterCtx = useCharacter();
  const { view, setView, setForumSyncOpen, gmCompactMode, setGmCompactMode, setBbcodeHelpOpen, setToast } = useUI();
  const { t } = useTranslation();
  const {
    myCharacters, folders, currentFolderId, setCurrentFolderId, refreshCharacterList,
    isVaultSyncing, pendingSyncCount, retryVaultSync,
  } = useVault();
  const { user } = useAuth();

  // 档案库共享业务层（拖拽协议/移动/打开/删除/菜单/统一弹窗）
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIdRef = useRef<string | null>(null);
  const explorer = useVaultExplorer({
    surface: 'tree',
    onOpenFolder: (id) => setCurrentFolderId(id),
    onFolderCreated: (parentId) => {
      // 新建子文件夹后自动展开其父文件夹
      if (parentId) setExpandedFolders(prev => new Set(prev).add(parentId));
    },
    // 多选语义：右键项在选区内时删除/剪切整组
    getDeleteIds: (id) => selectedIds.includes(id) ? selectedIds : [id],
    getCutIds: (id) => selectedIds.includes(id) ? selectedIds : [id],
    // Alt+点击 / 右键「打开到侧边」（对齐 VS Code）
    onOpenToSide: (id) => characterCtx.openDocToSide(id),
  });
  const {
    DND_MIME, encodeDragPayload, parseDropPayload, isDragPayload,
    moveItemsToFolder, openDoc, buildMenu, dialog, closeDialog,
    requestRename, deleteItems, onCut, onPaste,
  } = explorer;

  // 当前活动标签对应的文档 id（用于树中高亮正在编辑的文档）
  const activeDocId = useMemo(() => {
    return tabs.find(t => t.key === activeTabKey)?.docId ?? null;
  }, [tabs, activeTabKey]);

  // 返回聚焦文档对应的编辑视图（快速入口的"再点一次"行为）
  const backToFocusedView = () => {
    const activeTab = tabs.find(t => t.key === activeTabKey);
    setView('editor');
  };

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(KEY_COLLAPSED) === '1');
  const [width, setWidth] = useState(() => {
    const w = Number(localStorage.getItem(KEY_WIDTH));
    return w >= MIN_WIDTH && w <= MAX_WIDTH ? w : 240;
  });
  const widthRef = useRef(width);
  widthRef.current = width;

  const [openEditorsExpanded, setOpenEditorsExpanded] = useState(true);
  const [vaultExpanded, setVaultExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // 拖拽悬停高亮的文件夹
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<SidebarContextMenu | null>(null);
  // 「打开的编辑器」行的右键菜单（对齐 VS Code：切换/打开到侧边/复制路径/关闭组）
  const [openEditorMenu, setOpenEditorMenu] = useState<{ x: number; y: number; key: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(KEY_COLLAPSED, collapsed ? '1' : '0');
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem(KEY_WIDTH, String(width));
  }, [width]);

  // 拖拽调宽
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    const onMove = (ev: MouseEvent) => {
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ===== 档案库视图进入文件夹时：自动展开其祖先链并滚动定位 =====
  const treeRef = useRef<any>(null);
  useEffect(() => {
    if (!currentFolderId) return;
    setExpandedFolders(prev => {
      const parentMap = new Map(folders.map((f: any) => [f.id, (f.parentId ?? null) as string | null]));
      const chain: string[] = [];
      let cur: string | null = currentFolderId;
      let guard = 0;
      while (cur && guard++ < 10) {
        chain.push(cur);
        cur = parentMap.get(cur) ?? null;
      }
      const next = new Set(prev);
      chain.forEach(id => next.add(id));
      return next;
    });
  }, [currentFolderId, folders]);

  // 展开后滚动定位到当前文件夹（arborist 虚拟滚动需要显式滚动）
  useEffect(() => {
    if (!currentFolderId) return;
    const timer = setTimeout(() => {
      try { treeRef.current?.scrollTo?.(`folder-${currentFolderId}`); } catch { /* 目标不可见时忽略 */ }
    }, 60);
    return () => clearTimeout(timer);
  }, [currentFolderId, expandedFolders]);

  // ===== 单一高亮：文件夹与文档共用一个高亮位（同一时刻只有一个高亮项）=====
  const [highlight, setHighlight] = useState<{ kind: 'folder' | 'doc'; id: string } | null>(null);
  // 树行点击文件夹时设置，使 currentFolderId 联动 effect 不覆盖显式点击的高亮
  const folderNavRef = useRef<string | null>(null);

  // 切换编辑标签 / 打开文档 → 高亮该文档，并同步树选区（对齐 VS Code explorer.autoReveal
  // 默认行为："Files will be revealed and selected"——展开祖先、滚动定位由下方既有 effect 完成）
  useEffect(() => {
    if (activeDocId) {
      setHighlight({ kind: 'doc', id: activeDocId });
      setSelectedIds([activeDocId]);
    }
  }, [activeDocId]);

  // 当前目录变化（网格导航 / 打开文档联动）→ 高亮对应文件夹；
  // 若是打开文档带来的联动（文档就在该目录内），保持文档高亮。
  // 仅在 currentFolderId 真正变化时执行：切换标签（activeDocId 变化）不在此列，
  // 否则旧浏览目录的高亮会覆盖刚点选/激活的文档行
  const lastSyncedFolderIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (currentFolderId === lastSyncedFolderIdRef.current) return;
    lastSyncedFolderIdRef.current = currentFolderId;
    if (!currentFolderId) return;
    if (folderNavRef.current === currentFolderId) {
      folderNavRef.current = null;
      setHighlight({ kind: 'folder', id: currentFolderId });
      return;
    }
    const activeChar = myCharacters.find(c => c.id === activeDocId);
    if (activeChar && (activeChar.folderId ?? null) === currentFolderId) {
      setHighlight({ kind: 'doc', id: activeChar.id });
    } else {
      setHighlight({ kind: 'folder', id: currentFolderId });
    }
  }, [currentFolderId, myCharacters, activeDocId]);

  // 高亮文档时自动展开其祖先链，保证高亮行可见
  useEffect(() => {
    if (highlight?.kind !== 'doc') return;
    const char = myCharacters.find(c => c.id === highlight.id);
    let cur = char?.folderId ?? null;
    let guard = 0;
    while (cur && guard++ < 10) {
      try { treeRef.current?.open?.(`folder-${cur}`); } catch { /* 树未挂载时忽略 */ }
      cur = folders.find(f => f.id === cur)?.parentId ?? null;
    }
  }, [highlight, myCharacters, folders]);

  // 树视口尺寸（arborist 虚拟化需要显式宽高）
  const treeWrapRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = treeWrapRef.current;
    if (!el || !vaultExpanded || collapsed) return;
    // 挂载/重开时同步测量一次：RO 回调依赖渲染步，Chrome 对后台标签页会冻结渲染管线，
    // 若只在 observe 后等回调，后台挂载的页面树会一直空白
    setTreeSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setTreeSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vaultExpanded, collapsed, width]);

  // ===== arborist 树数据 =====
  const treeData = useMemo<ArborNode[]>(() => {
    // 文件树显示文件名（与档案库网格一致）；文件名与角色名已解耦，不回退到角色名
    const docName = (doc: any) =>
      doc.isTemplate
        ? (doc.name || '未命名模板').replace(/\.bbc$/i, '')
        : (doc.name || '未命名文件').replace(/\.(pf1|lnk)$/i, '');
    const docNodes = (parentId: string | null): ArborNode[] =>
      myCharacters
        .filter(c => (c.folderId ?? null) === parentId)
        .map(doc => ({
          id: doc.id,
          name: docName(doc),
          isFolder: false,
          docId: doc.id,
          parentFolderId: parentId,
          isTemplate: !!doc.isTemplate,
          isLink: !!doc.targetId,
        }));
    const folderNodes = (parentId: string | null): ArborNode[] =>
      folders
        .filter(f => (f.parentId ?? null) === parentId)
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
        .map(folder => ({
          id: `folder-${folder.id}`,
          name: folder.name || '未命名文件夹',
          isFolder: true,
          docId: folder.id,
          parentFolderId: parentId,
          children: [
            ...folderNodes(folder.id),
            ...docNodes(folder.id),
          ],
        }));
    return [...folderNodes(null), ...docNodes(null)];
  }, [folders, myCharacters]);

  // 树数据的扁平序（shift 范围选择用）
  const flatOrder = useMemo(() => {
    const out: string[] = [];
    const walk = (nodes: ArborNode[]) => {
      for (const n of nodes) {
        out.push(n.docId!);
        if (n.children) walk(n.children);
      }
    };
    walk(treeData);
    return out;
  }, [treeData]);
  const folderIdSet = useMemo(() => new Set(folders.map((f: any) => f.id)), [folders]);

  // 选区自愈：条目被删除/移动后从选区移除
  useEffect(() => {
    setSelectedIds(prev => {
      const next = prev.filter(id => myCharacters.some(c => c.id === id) || folders.some((f: any) => f.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [myCharacters, folders]);

  // 树行渲染（arborist 虚拟化；拖拽走共享业务层的原生协议，禁用其内部 DnD）
  const renderRow = ({ node, style }: NodeRendererProps<ArborNode>) => {
    const data = node.data;
    const isFolder = data.isFolder;
    // 单一高亮：文件夹与文档共用一个高亮位
    const active = highlight?.kind === (isFolder ? 'folder' : 'doc') && highlight.id === data.docId;
    const isSelected = selectedIds.includes(data.docId!);
    // 落点：文件夹行 = 自身；文档行 = 其父文件夹（即"拖到展开区域即可放入"）
    const dropTargetFolderId = isFolder ? data.docId! : (data.parentFolderId ?? null);
    const isDragOver = isFolder && dragOverFolderId === data.docId;
    const Icon = isFolder
      ? (node.isOpen ? FolderOpen : Folder)
      : (data.isLink ? Link2 : (data.isTemplate ? Braces : FileText));
    return (
      <div
        style={style}
        data-tree-row
        draggable
        onDragStart={e => {
          // 拖出：行在多选区内时整组拖出（与网格多选拖拽语义一致）
          const payload: VaultDragItem[] = isSelected && selectedIds.length > 1
            ? selectedIds.map(sid => ({ id: sid, type: folderIdSet.has(sid) ? 'folder' : 'character' }))
            : [{ id: data.docId!, type: isFolder ? 'folder' : 'character' }];
          e.dataTransfer.setData(DND_MIME, encodeDragPayload(payload));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={e => {
          if (isFolder && isDragPayload(e)) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(data.docId!);
            return;
          }
          // 拖到展开文件夹内的子行（文档行）：高亮其父文件夹，落点 = 父文件夹
          if (data.parentFolderId && isDragPayload(e)) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(data.parentFolderId);
          }
        }}
        onDragLeave={() => {
          if (isFolder) setDragOverFolderId(prev => (prev === data.docId ? null : prev));
          else setDragOverFolderId(prev => (prev && prev === data.parentFolderId ? null : prev));
        }}
        onDrop={e => {
          if (!dropTargetFolderId) return; // 根级文档行：冒泡到树的空白处理（落回根目录）
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(null);
          const items = parseDropPayload(e);
          if (items.length) moveItemsToFolder(items, dropTargetFolderId);
        }}
        onClick={e => {
          const id = data.docId!;
          // Ctrl/Cmd 点击：切换选中（不触发打开）
          if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
            lastSelectedIdRef.current = id;
            return;
          }
          // Shift 点击：与上次点击项之间的范围选择
          if (e.shiftKey && lastSelectedIdRef.current) {
            const a = flatOrder.indexOf(lastSelectedIdRef.current);
            const b = flatOrder.indexOf(id);
            if (a >= 0 && b >= 0) {
              const [s, t] = a < b ? [a, b] : [b, a];
              setSelectedIds(flatOrder.slice(s, t + 1));
              return;
            }
          }
          // 普通点击：单选 + 原有打开行为
          setSelectedIds([id]);
          lastSelectedIdRef.current = id;
          if (isFolder) {
            // 点击文件夹：展开 + 联动档案库网格显示该文件夹
            folderNavRef.current = id;
            setHighlight({ kind: 'folder', id });
            node.toggle();
            setCurrentFolderId(id);
          } else {
            setHighlight({ kind: 'doc', id });
            // Alt+点击 = 打开到侧边新分栏（对齐 VS Code Side by side editing）
            if (e.altKey) {
              characterCtx.openDocToSide(id);
              return;
            }
            openDoc(id);
          }
        }}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            x: e.clientX, y: e.clientY,
            target: { kind: isFolder ? 'folder' : 'doc', id: data.docId!, name: data.name },
          });
        }}
        title={isFolder ? data.name : (data.isTemplate ? '模板' : (data.isLink ? '链接（只读）' : '人物卡'))}
        className={`group flex items-center gap-1.5 px-2 cursor-pointer text-xs select-none transition-colors h-full ${
          isDragOver
            ? 'bg-primary/20 ring-1 ring-inset ring-primary/50'
            : active
              ? // 焦点行（锚点/活动文档）：选中底色 + 外框（对齐 VS Code activeSelection + focusOutline）
                'bg-stone-200 text-stone-800 ring-1 ring-inset ring-primary/50'
              : isSelected
                ? // 非焦点选中行：纯底色（对齐 VS Code inactiveSelection）
                  'bg-stone-200 text-stone-800'
                : 'text-stone-600 hover:bg-stone-200/60'
        }`}
      >
        {isFolder ? (
          node.isOpen ? <ChevronDown size={12} className="text-stone-400 shrink-0" /> : <ChevronRight size={12} className="text-stone-400 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon
          size={13}
          className={`shrink-0 ${isFolder ? 'text-amber-500' : (data.isTemplate ? 'text-indigo-400' : 'text-stone-400')}`}
        />
        <span className={`flex-1 min-w-0 truncate ${data.isLink ? 'italic' : ''}`}>{data.name}</span>
        {data.isLink && <span className="text-[9px] text-stone-400 shrink-0">链接</span>}
      </div>
    );
  };

  // ===== 右键菜单：统一走共享业务层 =====
  const menuItemsFor = (target: SidebarContextMenu['target']) => buildMenu(target);

  // 「打开的编辑器」行右键菜单：与标签条同一份统一构建器（与聚焦/激活无关）
  const openEditorMenuItems = (tabKey: string) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab) return [];
    return buildTabMenuItems({
      tab,
      ctx: characterCtx,
      ui: { setForumSyncOpen, gmCompactMode, setGmCompactMode, setBbcodeHelpOpen, setToast, t },
      liveDirty,
    });
  };

  // ===== 折叠态：细条 =====
  if (collapsed) {
    return (
      <div className="shrink-0 w-9 h-full bg-stone-50 border-r border-stone-200 flex flex-col items-center py-2 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          title="展开资源管理器"
          className="p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="w-6 h-px bg-stone-200" />
        <button
          onClick={() => setOpenEditorsExpanded(o => !o)}
          title={`打开的编辑器（${tabs.length}）`}
          className={`p-1.5 rounded-md text-xs font-bold transition-colors ${openEditorsExpanded ? 'text-primary bg-primary/10' : 'text-stone-500 hover:bg-stone-200'}`}
        >
          {tabs.length}
        </button>
      </div>
    );
  }

  const liveDirty = isDirty || isTemplateDirty;

  // ===== 键盘导航（对齐 VS Code：↑↓ 移动选区、→← 展开/折叠、Enter 打开、Ctrl+Enter 打开到侧边、
  //       F2 重命名、Delete 删除、Ctrl+X 剪切、Ctrl+V 粘贴；无回收站，Delete 直接走确认弹窗）=====
  const onTreeKeyDown = (e: React.KeyboardEvent) => {
    const tree = treeRef.current;
    const visible = tree?.visibleNodes ?? [];
    if (!visible.length) return;
    const anchorId = selectedIds[selectedIds.length - 1] ?? lastSelectedIdRef.current ?? activeDocId ?? visible[0].data.docId!;
    const at = Math.max(0, visible.findIndex(n => n.data.docId === anchorId));
    const cur = visible[at];
    const pick = (n: typeof cur) => {
      setSelectedIds([n.data.docId!]);
      lastSelectedIdRef.current = n.data.docId!;
      setHighlight(n.data.isFolder ? { kind: 'folder', id: n.data.docId! } : { kind: 'doc', id: n.data.docId! });
      void tree?.scrollTo(n.id);
    };
    switch (e.key) {
      case 'ArrowDown': {
        const next = visible[Math.min(visible.length - 1, at + 1)];
        if (next && next !== cur) pick(next);
        e.preventDefault();
        return;
      }
      case 'ArrowUp': {
        const prev = visible[Math.max(0, at - 1)];
        if (prev && prev !== cur) pick(prev);
        e.preventDefault();
        return;
      }
      case 'ArrowRight': {
        if (cur.data.isFolder && !cur.isOpen) tree?.open(cur.id);
        else {
          const next = visible[Math.min(visible.length - 1, at + 1)];
          if (next && next !== cur) pick(next);
        }
        e.preventDefault();
        return;
      }
      case 'ArrowLeft': {
        if (cur.data.isFolder && cur.isOpen) tree?.close(cur.id);
        else if (cur.parent && cur.parent.level >= 0) pick(cur.parent);
        else {
          const prev = visible[Math.max(0, at - 1)];
          if (prev && prev !== cur) pick(prev);
        }
        e.preventDefault();
        return;
      }
      case 'Enter': {
        const id = cur.data.docId!;
        if (cur.data.isFolder) tree?.toggle(cur.id);
        else if (e.ctrlKey || e.metaKey) characterCtx.openDocToSide(id);
        else openDoc(id);
        e.preventDefault();
        return;
      }
      case 'F2': {
        requestRename(cur.data.docId!, cur.data.isFolder ? 'folder' : 'character', cur.data.name);
        e.preventDefault();
        return;
      }
      case 'Delete': {
        const scope = selectedIds.includes(cur.data.docId!) ? selectedIds : [cur.data.docId!];
        void deleteItems(scope);
        e.preventDefault();
        return;
      }
      default: {
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === 'x') {
          onCut(selectedIds.includes(cur.data.docId!) ? selectedIds : [cur.data.docId!]);
          e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && k === 'v') {
          const target = cur.data.isFolder ? cur.data.docId! : (myCharacters.find(c => c.id === cur.data.docId)?.folderId ?? null);
          void onPaste(target).catch(console.error);
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div
      className="relative shrink-0 h-full bg-stone-50 border-r border-stone-200 flex flex-col select-none"
      style={{ width }}
    >
      {/* 侧栏标题行 */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-stone-200">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">资源管理器</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => Promise.resolve(refreshCharacterList()).catch(console.error)}
            title={pendingSyncCount > 0 ? `刷新档案库（${pendingSyncCount} 项更改待同步）` : '刷新档案库'}
            className="relative p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <RefreshCw size={13} className={isVaultSyncing ? 'animate-spin' : ''} />
            {pendingSyncCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-[14px] text-center"
              >
                {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
              </span>
            )}
          </button>
          {pendingSyncCount > 0 && (
            <button
              onClick={() => Promise.resolve(retryVaultSync()).catch(console.error)}
              title="立即重试同步待处理的更改"
              className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors"
            >
              <CloudUpload size={13} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            title="折叠侧栏"
            className="p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* 快速视图入口（档案库网格 / SVG 工坊） */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-stone-200">
        <button
          onClick={() => { if (view === 'vault') backToFocusedView(); else setView('vault'); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-bold transition-colors ${
            view === 'vault' ? 'bg-primary/10 text-primary' : 'text-stone-500 hover:bg-stone-200'
          }`}
          title="档案库（网格视图）"
        >
          <Grid3x3 size={12} /> 档案库
        </button>
        <button
          onClick={() => { if (view === 'svg-template') backToFocusedView(); else setView('svg-template'); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-bold transition-colors ${
            view === 'svg-template' ? 'bg-primary/10 text-primary' : 'text-stone-500 hover:bg-stone-200'
          }`}
          title="SVG 模板工坊"
        >
          <Sparkles size={12} /> SVG 工坊
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 区块一：打开的编辑器 */}
        <button
          onClick={() => setOpenEditorsExpanded(o => !o)}
          className="shrink-0 w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-200/60 transition-colors"
        >
          {openEditorsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          打开的编辑器
        </button>
        {openEditorsExpanded && (
          <div className="shrink-0 pb-1 max-h-48 overflow-y-auto custom-scrollbar">
            {tabs.length === 0 && (
              <div className="px-4 py-1.5 text-xs text-stone-400 italic">暂无打开的标签页</div>
            )}
            {/* 按分栏分组显示（对标 VS Code 的打开的编辑器分组） */}
            {panes.map((pane, paneIdx) => (
              <div key={pane.id}>
                {/* 单栏时无需栏号区分，仅多栏显示 */}
                {panes.length > 1 && (
                  <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold text-stone-400">
                    第{paneIdx + 1}栏
                  </div>
                )}
                {pane.tabKeys.map(key => {
                  const tab = tabs.find(t => t.key === key);
                  if (!tab) return null;
                  const active = view !== 'vault' && view !== 'svg-template' && tab.key === activeTabKey;
                  const fallbackTitle = tab.kind === 'character' ? '人物卡' : '未命名模板';
              const title = active ? activeTabTitle : ((typeof tab.title === 'string' && tab.title.trim() && tab.title.trim() !== '{}' && tab.title.trim() !== '[object Object]') ? tab.title : fallbackTitle);
                  const dirty = active ? liveDirty : tab.dirty;
                  const Icon = tab.kind === 'character' ? FileText : Braces;
                  return (
                    <div
                      key={tab.key}
                      onClick={() => switchTab(tab.key)}
                      onContextMenu={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenEditorMenu({ x: e.clientX, y: e.clientY, key: tab.key });
                      }}
                      className={`group flex items-center gap-1.5 px-2 py-1 cursor-pointer text-xs transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-stone-600 hover:bg-stone-200/60'
                      }`}
                    >
                      <Icon size={13} className={active ? 'text-primary' : 'text-stone-400'} />
                      <span className="flex-1 min-w-0 truncate">{title}</span>
                      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="有未保存的修改" />}
                      <span
                        onClick={e => { e.stopPropagation(); closeTab(tab.key); }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-300 text-stone-500"
                        title="关闭标签页"
                      >
                        <X size={12} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* 区块二：档案库树 */}
        <button
          onClick={() => setVaultExpanded(o => !o)}
          className="shrink-0 w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-200/60 transition-colors border-t border-stone-200 mt-1"
        >
          {vaultExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          档案库
        </button>
        <div
          ref={treeWrapRef}
          tabIndex={0}
          onKeyDown={onTreeKeyDown}
          className="flex-1 min-h-0 outline-none"
          onDragOver={e => {
            if (!isDragPayload(e)) return;
            e.preventDefault();
            // 空白区域 = 根目录落点，清除行高亮
            setDragOverFolderId(null);
          }}
          onDrop={e => {
            // 拖到树的空白处 = 移动到根目录
            if (!isDragPayload(e)) return;
            e.preventDefault();
            const items = parseDropPayload(e);
            if (items.length) moveItemsToFolder(items, null);
          }}
          onClick={e => {
            // 点击空白处：清空多选
            const target = e.target as HTMLElement;
            if (!target.closest('[data-tree-row]')) setSelectedIds([]);
          }}
          onContextMenu={e => {
            // 空白处右键：背景菜单
            const target = e.target as HTMLElement;
            if (target.closest('[data-tree-row]')) return;
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'background' } });
          }}
        >
          {user && vaultExpanded && treeSize.h > 0 && treeSize.w > 0 && (
            <Tree
              ref={treeRef}
              data={treeData}
              openByDefault={false}
              rowHeight={ROW_HEIGHT}
              indent={12}
              width={treeSize.w}
              height={treeSize.h}
              dndManager={treeDndManager}
              disableMultiSelection
              disableDrag
              className="h-full"
            >
              {renderRow}
            </Tree>
          )}
          {user && vaultExpanded && treeData.length === 0 && (
            <div className="px-4 py-2 text-xs text-stone-400 italic">档案库为空</div>
          )}
          {!user && (
            <div className="px-4 py-2 text-xs text-stone-400 italic">登录后可浏览档案库</div>
          )}
        </div>
      </div>

      {/* 拖拽调宽手柄 */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-10"
        title="拖拽调整宽度"
      />

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItemsFor(contextMenu.target)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 打开的编辑器：行右键菜单 */}
      {openEditorMenu && (
        <ContextMenu
          x={openEditorMenu.x}
          y={openEditorMenu.y}
          items={openEditorMenuItems(openEditorMenu.key)}
          onClose={() => setOpenEditorMenu(null)}
        />
      )}

      {/* 统一业务弹窗（重命名/新建文件夹/删除确认） */}
      {dialog && (
        <Dialog
          type={dialog.type}
          title={dialog.title}
          defaultValue={dialog.defaultValue}
          confirmLabel={dialog.confirmLabel}
          confirmClassName={dialog.confirmClassName}
          onConfirm={(val) => { dialog.onConfirm(val); closeDialog(); }}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
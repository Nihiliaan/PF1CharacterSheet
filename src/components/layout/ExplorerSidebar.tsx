/**
 * 左侧常驻资源管理器侧栏（VS Code 风格）。
 * 两个可折叠区块：
 *  1. 打开的编辑器 —— 当前文档标签列表（点击激活、X 关闭、未保存圆点）
 *  2. 档案库 —— react-arborist 虚拟化文件树（点击文档即以标签页打开；
 *     右键菜单支持打开/重命名/剪切/粘贴/删除；支持与档案库视图之间的原生 HTML5 双向拖拽）
 * 外壳支持拖拽调宽、折叠成细条（宽度与折叠状态持久化到 localStorage）。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, RefreshCw, ChevronDown, ChevronRight,
  FileText, Braces, Link2, Folder, FolderOpen, X, FolderPlus, Scissors, ClipboardPaste, Pencil, Trash2, ExternalLink
} from 'lucide-react';
import { Tree, type NodeRendererProps } from 'react-arborist';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';
import ContextMenu from '../common/ContextMenu';

const KEY_WIDTH = 'pf1_sidebar_width';
const KEY_COLLAPSED = 'pf1_sidebar_collapsed';
const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const ROW_HEIGHT = 26;
/** 与 VaultContent 拖拽共用的原生 dataTransfer 协议 */
const DND_MIME = 'text/plain';

interface ArborNode {
  id: string;
  name: string;
  isFolder: boolean;
  /** 文档的真实 Firestore id（文件夹为 'folder-' 前缀的合成 id） */
  docId?: string;
  isTemplate?: boolean;
  isLink?: boolean;
  children?: ArborNode[];
}

interface DragPayload {
  id: string;
  type: 'character' | 'folder';
}

interface SidebarContextMenu {
  x: number;
  y: number;
  target: { type: 'folder' | 'doc' | 'background'; id: string | null; name: string };
}

export default function ExplorerSidebar() {
  const { tabs, activeTabKey, switchTab, closeTab, activeTabTitle, isDirty, isTemplateDirty, selectCharacter, openCharacterTab } = useCharacter();
  const { view, setView, setConfirmModal } = useUI();
  const {
    myCharacters, folders, currentFolderId, setCurrentFolderId, refreshCharacterList,
    moveCharacter, moveFolder, renameItem, deleteCharacter, deleteFolder, createFolder,
    cutItems, onCut, onPaste,
  } = useVault();
  const { user } = useAuth();
  const { setToast } = useUI();

  // 当前活动标签对应的文档 id（用于树中高亮正在编辑的文档）
  const activeDocId = useMemo(() => {
    return tabs.find(t => t.key === activeTabKey)?.docId ?? null;
  }, [tabs, activeTabKey]);

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

  // 树视口尺寸（arborist 虚拟化需要显式宽高）
  const treeWrapRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = treeWrapRef.current;
    if (!el || !vaultExpanded || collapsed) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setTreeSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vaultExpanded, collapsed, width]);

  // ===== arborist 树数据 =====
  const treeData = useMemo<ArborNode[]>(() => {
    const docName = (doc: any) =>
      doc.isTemplate
        ? (doc.name || '未命名模板').replace(/\.bbc$/i, '')
        : (doc.data?.basic?.name || doc.name || '未命名人物');
    const docNodes = (parentId: string | null): ArborNode[] =>
      myCharacters
        .filter(c => (c.folderId ?? null) === parentId)
        .map(doc => ({
          id: doc.id,
          name: docName(doc),
          isFolder: false,
          docId: doc.id,
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
          children: [
            ...folderNodes(folder.id),
            ...docNodes(folder.id),
          ],
        }));
    return [...folderNodes(null), ...docNodes(null)];
  }, [folders, myCharacters]);

  // ===== 拖拽（原生 HTML5 协议，与档案库视图互通）=====
  const parseDropPayload = (e: React.DragEvent): DragPayload[] => {
    const raw = e.dataTransfer?.getData(DND_MIME);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p.type === 'multiple' && Array.isArray(p.ids)) {
          // 多选拖拽：根据 folders 成员关系判断各项类型
          return p.ids.map((id: string) => ({
            id,
            type: folders.some((f: any) => f.id === id) ? 'folder' : 'character',
          }));
        }
        return [{ id: p.id, type: p.type === 'folder' ? 'folder' : 'character' }];
      } catch { /* 忽略无法解析的负载 */ }
    }
    return [];
  };

  const moveItemsToFolder = async (items: DragPayload[], targetFolderId: string | null) => {
    const targets = items.filter(it => it.id !== targetFolderId);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map(async it => {
        if (it.type === 'folder') await moveFolder(it.id, targetFolderId);
        else await moveCharacter(it.id, targetFolderId);
      }));
      setToast({ message: `已移动 ${targets.length} 项`, type: 'success' });
    } catch (e: any) {
      setToast({ message: '移动失败：' + (e?.message || '未知错误'), type: 'error' });
    }
  };

  const hasPayload = (e: React.DragEvent) => e.dataTransfer?.types?.includes(DND_MIME);

  // 树行渲染（arborist 虚拟化；拖拽走原生协议，禁用其内部 DnD）
  const renderRow = ({ node, style }: NodeRendererProps<ArborNode>) => {
    const data = node.data;
    const isFolder = data.isFolder;
    const active = isFolder
      ? currentFolderId === data.docId
      : view !== 'vault' && view !== 'svg-template' && data.docId === activeDocId;
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
          // 拖出：向档案库视图提供与 VaultContent 一致的协议
          e.dataTransfer.setData(DND_MIME, JSON.stringify(
            isFolder ? { id: data.docId, type: 'folder' } : { id: data.docId, type: 'character' }
          ));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={e => {
          if (isFolder && hasPayload(e)) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(data.docId!);
          }
        }}
        onDragLeave={() => { if (isFolder) setDragOverFolderId(prev => (prev === data.docId ? null : prev)); }}
        onDrop={e => {
          if (!isFolder) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(null);
          const items = parseDropPayload(e);
          if (items.length) moveItemsToFolder(items, data.docId!);
        }}
        onClick={() => {
          if (isFolder) node.toggle();
          else selectCharacter(data.docId!, true, true);
        }}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            x: e.clientX, y: e.clientY,
            target: { type: isFolder ? 'folder' : 'doc', id: data.docId!, name: data.name },
          });
        }}
        title={isFolder ? data.name : (data.isTemplate ? '模板' : (data.isLink ? '链接（只读）' : '人物卡'))}
        className={`group flex items-center gap-1.5 px-2 cursor-pointer text-xs select-none transition-colors h-full ${
          isDragOver
            ? 'bg-primary/20 ring-1 ring-inset ring-primary/50'
            : (active ? 'bg-primary/10 text-primary font-bold' : 'text-stone-600 hover:bg-stone-200/60')
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

  // ===== 右键菜单动作 =====
  const renameTarget = (type: 'folder' | 'character', id: string, currentName: string) => {
    const name = window.prompt('重命名', currentName);
    if (name && name.trim() && name.trim() !== currentName) {
      Promise.resolve(renameItem(id, type, name.trim()))
        .then(() => setToast({ message: '已重命名', type: 'success' }))
        .catch((e: any) => setToast({ message: '重命名失败：' + (e?.message || ''), type: 'error' }));
    }
  };

  const deleteTarget = (type: 'folder' | 'character', id: string, name: string) => {
    setConfirmModal({
      title: `确定删除「${name}」吗？该操作不可撤销。`,
      onConfirm: () => {
        Promise.resolve(type === 'folder' ? deleteFolder(id) : deleteCharacter(id))
          .then(() => setToast({ message: '已删除', type: 'success' }))
          .catch((e: any) => setToast({ message: '删除失败：' + (e?.message || ''), type: 'error' }));
      }
    });
  };

  const createSubFolder = (parentId: string | null) => {
    const name = window.prompt('新建文件夹', '新建文件夹');
    if (name && name.trim()) {
      Promise.resolve(createFolder(name.trim(), parentId))
        .then(() => {
          if (parentId) setExpandedFolders(prev => new Set(prev).add(parentId));
          setToast({ message: '文件夹已创建', type: 'success' });
        })
        .catch((e: any) => setToast({ message: '创建失败：' + (e?.message || ''), type: 'error' }));
    }
  };

  const menuItemsFor = (target: SidebarContextMenu['target']) => {
    if (target.type === 'folder') {
      return [
        { label: '在档案库中打开', icon: ExternalLink, onClick: () => { setCurrentFolderId(target.id); setView('vault'); } },
        { label: '新建子文件夹', icon: FolderPlus, onClick: () => createSubFolder(target.id) },
        { label: '剪切', icon: Scissors, onClick: () => onCut([target.id!]) },
        { label: '粘贴到此处', icon: ClipboardPaste, onClick: () => Promise.resolve(onPaste(target.id)).catch(console.error) },
        { label: '重命名', icon: Pencil, onClick: () => renameTarget('folder', target.id!, target.name) },
        { label: '删除', icon: Trash2, danger: true, onClick: () => deleteTarget('folder', target.id!, target.name) },
      ];
    }
    if (target.type === 'doc') {
      return [
        { label: '打开', icon: ExternalLink, onClick: () => selectCharacter(target.id!, true, true) },
        { label: '剪切', icon: Scissors, onClick: () => onCut([target.id!]) },
        { label: '重命名', icon: Pencil, onClick: () => renameTarget('character', target.id!, target.name) },
        { label: '删除', icon: Trash2, danger: true, onClick: () => deleteTarget('character', target.id!, target.name) },
      ];
    }
    // 背景：新建文件夹 / 粘贴到根目录
    return [
      { label: '新建文件夹', icon: FolderPlus, onClick: () => createSubFolder(null) },
      { label: '粘贴到根目录', icon: ClipboardPaste, onClick: () => Promise.resolve(onPaste(null)).catch(console.error) },
      { label: '打开人物卡编辑器', icon: FileText, onClick: () => openCharacterTab() },
    ];
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
            title="刷新档案库"
            className="p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="折叠侧栏"
            className="p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
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
            {tabs.map(tab => {
              const active = view !== 'vault' && view !== 'svg-template' && tab.key === activeTabKey;
              const title = active ? activeTabTitle : (tab.title || (tab.kind === 'character' ? '人物卡' : '模板'));
              const dirty = active ? liveDirty : tab.dirty;
              const Icon = tab.kind === 'character' ? FileText : Braces;
              return (
                <div
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
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
          className="flex-1 min-h-0"
          onDragOver={e => { if (hasPayload(e)) e.preventDefault(); }}
          onDrop={e => {
            // 拖到树的空白处 = 移动到根目录
            if (!hasPayload(e)) return;
            e.preventDefault();
            const items = parseDropPayload(e);
            if (items.length) moveItemsToFolder(items, null);
          }}
          onContextMenu={e => {
            // 空白处右键：背景菜单
            const target = e.target as HTMLElement;
            if (target.closest('[data-tree-row]')) return;
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'background', id: null, name: '根目录' } });
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
    </div>
  );
}

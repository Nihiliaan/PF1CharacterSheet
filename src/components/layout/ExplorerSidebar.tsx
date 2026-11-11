/**
 * 左侧常驻资源管理器侧栏（VS Code 风格）。
 * 两个可折叠区块：
 *  1. 打开的编辑器 —— 当前文档标签列表（点击激活、X 关闭、未保存圆点）
 *  2. 档案库 —— react-arborist 虚拟化文件树（文件夹/人物卡/模板层级导航，
 *     点击文档即以标签页打开；支持拖拽移动到文件夹，接线 VaultContext.moveCharacter/moveFolder）
 * 外壳支持拖拽调宽、折叠成细条（宽度与折叠状态持久化到 localStorage）。
 * 深浅色遵循浏览器式外壳的浅色主题。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, RefreshCw, ChevronDown, ChevronRight,
  FileText, Braces, Link2, Folder, FolderOpen, X
} from 'lucide-react';
import { Tree, type NodeRendererProps, type MoveHandler } from 'react-arborist';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';
import { useAuth } from '../../contexts/AuthContext';

const KEY_WIDTH = 'pf1_sidebar_width';
const KEY_COLLAPSED = 'pf1_sidebar_collapsed';
const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const ROW_HEIGHT = 26;

// ===== arborist 树节点数据 =====
interface ArborNode {
  id: string;
  name: string;
  isFolder: boolean;
  /** 文档的真实 Firestore id（文件夹为 'folder-' 前缀的合成 id，移动时需剥掉） */
  docId?: string;
  isTemplate?: boolean;
  isLink?: boolean;
  children?: ArborNode[];
}

export default function ExplorerSidebar() {
  const { tabs, activeTabKey, switchTab, closeTab, activeTabTitle, isDirty, isTemplateDirty, selectCharacter } = useCharacter();
  const { view } = useUI();
  const { myCharacters, folders, currentFolderId, refreshCharacterList, moveCharacter, moveFolder } = useVault();
  const { user } = useAuth();

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

  // 折叠 / 展开的区块
  const [openEditorsExpanded, setOpenEditorsExpanded] = useState(true);
  const [vaultExpanded, setVaultExpanded] = useState(true);

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

  // ===== arborist 树数据（folders + myCharacters 组装为嵌套结构） =====
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

  // 拖拽移动：文件夹 → moveFolder；文档 → moveCharacter（目标文件夹为 null 表示根目录）
  const handleMove: MoveHandler<ArborNode> = async ({ dragIds, parentId }) => {
    const target = parentId ?? null;
    for (const dragId of dragIds) {
      try {
        if (dragId.startsWith('folder-')) {
          await moveFolder(dragId.slice('folder-'.length), target);
        } else {
          await moveCharacter(dragId, target);
        }
      } catch (e: any) {
        console.error('[ExplorerSidebar] 移动失败:', e);
      }
    }
  };

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

  const renderRow = ({ node, style, dragHandle }: NodeRendererProps<ArborNode>) => {
    const data = node.data;
    const isFolder = data.isFolder;
    const active = isFolder
      ? currentFolderId === data.docId
      : view !== 'vault' && view !== 'svg-template' && data.docId === activeDocId;
    const Icon = isFolder
      ? (node.isOpen ? FolderOpen : Folder)
      : (data.isLink ? Link2 : (data.isTemplate ? Braces : FileText));
    return (
      <div
        ref={dragHandle}
        style={style}
        onClick={() => {
          if (isFolder) node.toggle();
          else selectCharacter(data.docId!, true, true);
        }}
        title={isFolder ? data.name : (data.isTemplate ? '模板' : (data.isLink ? '链接（只读）' : '人物卡'))}
        className={`group flex items-center gap-1.5 px-2 pr-2 cursor-pointer text-xs select-none transition-colors h-full ${
          active ? 'bg-primary/10 text-primary font-bold' : 'text-stone-600 hover:bg-stone-200/60'
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
        <span className="flex-1 min-w-0 truncate">{data.name}</span>
        {data.isLink && <span className="text-[9px] text-stone-400 shrink-0">链接</span>}
      </div>
    );
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

        {/* 区块二：档案库树（react-arborist 虚拟化 + 拖拽归类） */}
        <button
          onClick={() => setVaultExpanded(o => !o)}
          className="shrink-0 w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-200/60 transition-colors border-t border-stone-200 mt-1"
        >
          {vaultExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          档案库
        </button>
        <div ref={treeWrapRef} className="flex-1 min-h-0">
          {user && vaultExpanded && treeSize.h > 0 && treeSize.w > 0 && (
            <Tree
              data={treeData}
              openByDefault={false}
              rowHeight={ROW_HEIGHT}
              indent={12}
              width={treeSize.w}
              height={treeSize.h}
              disableMultiSelection
              onMove={handleMove}
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
    </div>
  );
}

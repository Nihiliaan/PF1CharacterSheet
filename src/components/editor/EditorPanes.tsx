/**
 * 编辑器分栏布局（VS Code 式）：横向排列的编辑栏，每栏是一个完整单元：
 *  - 栏顶小标签条：本栏的文档标签（可拖拽跨栏、右键文件操作）+ 右侧 [+] 新建 / [▦] 向右分栏 / [👁] 预览分栏
 *  - 路径行：本栏活动文档的路径（含脏标记 / 只读标记），对标 VS Code 的面包屑
 *  - 内容区：聚焦栏渲染 live 状态（可编辑）；未聚焦栏经影子作用域渲染只读视图，
 *    点击分栏任意位置即聚焦（live 状态切换到该栏文档）
 * chooser 标签渲染"新建标签页"大页面；preview 标签实时渲染当前编辑中的模板。
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Plus, Columns2, Eye, FileText, Braces, X, ChevronRight, ChevronDown, Folder, FolderOpen,
  Save, SaveAll, Share2, FileDown, ClipboardCopy, Swords, Sparkle, Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CharacterContext, useCharacter,
  type EditorPane, type TabSnapshot, type CharacterContextType,
} from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance,
} from '../../utils/calculations';
import CharacterEditor from './CharacterEditor';
import BBCodeTemplateEditor from '../BBCodeTemplateEditor';
import NewTabPage from './NewTabPage';
import { DEFAULT_BBCODE_TEMPLATE } from '../../constants';
import BBCodePreview from '../common/BBCodePreview';
import ContextMenu from '../common/ContextMenu';

/** 标签在分栏之间拖拽所用的原生 dataTransfer 协议 */
const TAB_MIME = 'application/x-pf1-tab';

interface TabContextMenu {
  x: number;
  y: number;
  tabKey: string;
}

/** 只读影子作用域：用快照数据覆写 CharacterContext，供未聚焦分栏渲染文档只读视图 */
function ShadowScope({ snapshot, children }: { snapshot: TabSnapshot; children: React.ReactNode }) {
  const ctx = useCharacter();
  // 用 ref 取最新 ctx，memo 仅依赖 snapshot：聚焦栏的每次击键不会引发影子分栏重渲染
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const shadowValue = useMemo<CharacterContextType>(() => {
    const base = ctxRef.current;
    return {
      ...base,
      data: snapshot.data,
      lastSavedData: snapshot.lastSavedData,
      bbcodeTemplate: snapshot.bbcodeTemplate,
      isReadOnly: true,
      computed: {
        modifiers: getAttributeModifiers(snapshot.data),
        totalCost: calculateTotalCost(snapshot.data),
        totalWeight: calculateTotalWeightNum(snapshot.data),
        encumbrance: getComputedEncumbrance(snapshot.data),
      },
      // 变更类 API 全部置空，防止影子分栏写入
      setData: (() => {}) as CharacterContextType['setData'],
      setBbcodeTemplate: () => {},
      update: () => {},
      handleSave: async () => undefined,
      handleSaveAs: async () => undefined,
      handleRevertChanges: () => {},
      saveCharacter: async () => undefined,
    };
  }, [snapshot]);
  return <CharacterContext.Provider value={shadowValue}>{children}</CharacterContext.Provider>;
}

/** 单栏组件：标签条 + 路径行 + 内容区 */
function EditorPaneView({ pane, paneIndex, paneCount, focused }: {
  pane: EditorPane;
  paneIndex: number;
  paneCount: number;
  focused: boolean;
}) {
  const { t } = useTranslation();
  const {
    tabs, activeTabKey, switchTab, closeTab, moveTabToPane, isDirty, isTemplateDirty, isReadOnly,
    data, getItemPath, bbcodeTemplate, setBbcodeTemplate, currentTemplateId,
    handleSave, handleSaveAs, handleShare, handleExport, handleExportBBCode,
    updateExistingTemplate, saveAsTemplate, setShowAIModal,
    openChooserTab, addPane, openPreviewTab, focusPane, getTabSnapshot,
  } = useCharacter();
  const { gmCompactMode, setGmCompactMode, setForumSyncOpen, setBbcodeHelpOpen, setToast } = useUI();
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  // 拖拽悬停的插入位置指示（paneId:tabKey）
  const [dragOverChipKey, setDragOverChipKey] = useState<string | null>(null);
  const [dragTabKey, setDragTabKey] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<TabContextMenu | null>(null);
  const liveDirty = isDirty || isTemplateDirty;

  const activeTab = tabs.find(tt => tt.key === pane.activeTabKey);

  // 本栏路径行文本（聚焦栏用 live 状态；未聚焦栏用快照/标签标题）
  const pathText = useMemo(() => {
    if (!activeTab) return '空分栏';
    if (activeTab.kind === 'chooser') return '新建标签页';
    if (activeTab.kind === 'preview') return '预览（实时渲染当前编辑中的模板）';
    const ro = focused ? isReadOnly : (getTabSnapshot(activeTab.key)?.isReadOnly ?? true);
    const dirty = focused ? liveDirty : activeTab.dirty;
    let p = '';
    if (activeTab.docId) p = getItemPath(activeTab.docId) || '';
    if (!p) p = focused ? (data.basic?.name?.trim() || activeTab.title) : activeTab.title;
    return p + (dirty ? '*' : '') + (ro ? ` (${t('common.read_only')})` : '');
  }, [activeTab, focused, isReadOnly, liveDirty, getItemPath, data.basic?.name, t, getTabSnapshot]);

  // ===== 标签右键菜单（文件操作迁自原工具条；仅聚焦栏的活动标签提供保存类操作）=====
  const menuItemsFor = (tabKey: string) => {
    const tab = tabs.find(tt => tt.key === tabKey);
    if (!tab) return [];
    const items: { label: string; icon: any; onClick: () => void; danger?: boolean }[] = [];
    const isFocusedLive = tabKey === activeTabKey;
    const isDoc = tab.kind === 'character' || tab.kind === 'template';

    if (isFocusedLive && isDoc && !isReadOnly) {
      if (tab.kind === 'character') {
        items.push({ label: '保存', icon: Save, onClick: () => { void handleSave(); } });
        items.push({ label: '另存为', icon: SaveAll, onClick: () => { void handleSaveAs(); } });
      } else {
        items.push({
          label: '保存', icon: Save,
          onClick: () => {
            if (currentTemplateId) void updateExistingTemplate(currentTemplateId, bbcodeTemplate);
            else {
              const name = window.prompt(t('editor.bbcode.prompt_name'), t('editor.bbcode.default_name'));
              if (name) void saveAsTemplate(name, bbcodeTemplate);
            }
          },
        });
        items.push({
          label: '另存为', icon: SaveAll,
          onClick: () => {
            const name = window.prompt(t('editor.bbcode.prompt_name'), t('editor.bbcode.default_name'));
            if (name) void saveAsTemplate(name, bbcodeTemplate);
          },
        });
        items.push({ label: '变量参考', icon: ClipboardCopy, onClick: () => setBbcodeHelpOpen(true) });
        items.push({
          label: '导入默认模板', icon: FileDown,
          onClick: () => {
            if (window.confirm(t('editor.bbcode.confirm_reset'))) {
              setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
              setToast({ message: t('editor.bbcode.reset_success'), type: 'success' });
            }
          },
        });
      }
      items.push({ label: '分享链接', icon: Share2, onClick: () => { void handleShare(); } });
      items.push({ label: '导出文件', icon: FileDown, onClick: () => { void handleExport(); } });
      if (tab.kind === 'character') {
        items.push({ label: '复制 BBCode', icon: ClipboardCopy, onClick: () => { void handleExportBBCode(); } });
      } else {
        // 模板标签：复制原始模板文本（非渲染结果）
        items.push({
          label: '复制模板文本', icon: ClipboardCopy,
          onClick: () => { void navigator.clipboard.writeText(bbcodeTemplate); },
        });
      }
      if (tab.kind === 'character') {
        items.push({ label: '同步到论坛', icon: Share2, onClick: () => setForumSyncOpen(true) });
        items.push({
          label: gmCompactMode ? '退出 GM 紧凑卡' : 'GM 紧凑数据卡', icon: Swords,
          onClick: () => setGmCompactMode(!gmCompactMode),
        });
        items.push({ label: 'AI 识别导入', icon: Sparkle, onClick: () => setShowAIModal(true) });
      }
    }

    items.push({ label: '关闭', icon: Trash2, danger: true, onClick: () => closeTab(tabKey) });
    return items;
  };

  const stripBtn = 'p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-800 transition-colors';

  return (
    <div
      onPointerDown={e => {
        // 聚焦分栏；但按下标签芯片时不打断后续的拖拽手势
        if (!focused && !(e.target as HTMLElement).closest('[data-tab-chip]')) focusPane(pane.id);
      }}
      onDragOver={e => {
        // 整栏都是拖拽落点（标签拖入本栏）
        if (e.dataTransfer.types.includes(TAB_MIME)) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDragEnd={() => { setDragTabKey(null); setDragOverChipKey(null); }}
      onDrop={e => {
        setDragOver(false);
        const raw = e.dataTransfer.getData(TAB_MIME);
        if (!raw) return;
        try {
          const { tabKey } = JSON.parse(raw);
          if (tabKey) moveTabToPane(tabKey, pane.id);
        } catch { /* 忽略无效负载 */ }
      }}
      className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
        focused ? 'bg-white' : 'bg-stone-100/70'
      } ${paneIndex < paneCount - 1 ? 'border-r border-stone-300' : ''}`}
    >
      {/* 栏顶小标签条 */}
      <div className={`shrink-0 flex items-center gap-0.5 px-1 overflow-x-auto custom-scrollbar ${
        focused ? 'bg-stone-50 border-b border-stone-200' : 'bg-stone-200/60 border-b border-stone-300'
      }`}>
        {pane.tabKeys.map(key => {
          const tab = tabs.find(tt => tt.key === key);
          if (!tab) return null;
          const active = focused && pane.activeTabKey === key;
          const dirty = active ? liveDirty : tab.dirty;
          const Icon = tab.kind === 'preview' ? Eye : (tab.kind === 'chooser' ? FileText : (tab.kind === 'character' ? FileText : Braces));
          const isChipDropTarget = dragOverChipKey === `${pane.id}:${key}` && dragTabKey !== tab.key;
          return (
            <div
              key={tab.key}
              data-tab-chip
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(TAB_MIME, JSON.stringify({ tabKey: tab.key }));
                e.dataTransfer.effectAllowed = 'move';
                setDragTabKey(tab.key);
              }}
              onDragOver={e => {
                // 芯片是精确插入位置落点：悬停高亮，放置=插入到该芯片之前
                if (e.dataTransfer.types.includes(TAB_MIME)) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverChipKey(`${pane.id}:${key}`);
                }
              }}
              onDragLeave={() => setDragOverChipKey(prev => (prev === `${pane.id}:${key}` ? null : prev))}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverChipKey(null);
                const raw = e.dataTransfer.getData(TAB_MIME);
                if (!raw) return;
                try {
                  const { tabKey } = JSON.parse(raw);
                  if (tabKey && tabKey !== tab.key) moveTabToPane(tabKey, pane.id, pane.tabKeys.indexOf(tab.key));
                } catch { /* 忽略无效负载 */ }
              }}
              onClick={() => switchTab(tab.key)}
              onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeTab(tab.key); } }}
              onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY, tabKey: tab.key });
              }}
              title={tab.title}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-xs whitespace-nowrap transition-colors border-r border-stone-200/70 ${
                isChipDropTarget ? 'border-l-2 border-l-primary' : ''
              } ${
                active
                  ? 'bg-white text-stone-800 font-bold'
                  : 'bg-transparent text-stone-500 hover:bg-stone-300/50 hover:text-stone-700'
              }`}
            >
              <Icon size={12} className={active ? 'text-primary' : 'text-stone-400'} />
              <span className="max-w-[130px] truncate">{tab.title}</span>
              {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="有未保存的修改" />}
              <span
                onClick={e => { e.stopPropagation(); closeTab(tab.key); }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-300 text-stone-500"
                title="关闭标签页"
              >
                <X size={11} />
              </span>
            </div>
          );
        })}

        {/* 栏内操作：新建 / 分栏 / 预览 */}
        <div className="flex items-center gap-0.5 ml-auto pl-1 pr-0.5 shrink-0">
          <button
            onClick={() => openChooserTab(pane.id)}
            title="新建标签页（本栏）"
            className="shrink-0 px-2.5 py-1.5 text-xs text-stone-500 hover:bg-stone-300/50 hover:text-stone-700 transition-colors select-none self-stretch flex items-center"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={addPane}
            disabled={paneCount >= 4}
            title={paneCount >= 4 ? '最多支持 4 个分栏' : '向右拆分新分栏'}
            className={`${stripBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Columns2 size={13} />
          </button>
          <button
            onClick={() => openPreviewTab(true)}
            disabled={paneCount >= 4}
            title={paneCount >= 4 ? '最多支持 4 个分栏' : '在新分栏中打开预览窗格'}
            className={`${stripBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Eye size={13} />
          </button>
        </div>
      </div>

      {/* 路径行 */}
      <div className={`shrink-0 flex items-center gap-1 px-3 py-1 text-[11px] border-b ${
        focused ? 'bg-stone-50 text-stone-500 border-stone-200' : 'bg-stone-200/40 text-stone-400 border-stone-300'
      }`}>
        {focused ? <ChevronRight size={11} className="text-stone-400" /> : <ChevronDown size={11} className="text-stone-400" />}
        <span className="truncate">{pathText}</span>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!activeTab || activeTab.kind === 'chooser' ? (
          <NewTabPage chooserKey={pane.activeTabKey ?? undefined} />
        ) : activeTab.kind === 'preview' ? (
          // 预览窗格：实时渲染当前编辑中的模板内容（读 live 状态，无论聚焦与否）
          <div className="h-full overflow-y-auto custom-scrollbar bg-stone-50 p-4">
            <BBCodePreview bbcode={bbcodeTemplate} />
          </div>
        ) : activeTab.kind === 'template' ? (
          focused ? <BBCodeTemplateEditor /> : (
            <div className="h-full overflow-y-auto custom-scrollbar bg-stone-50 p-4">
              {(() => {
                const snap = getTabSnapshot(pane.activeTabKey ?? null);
                return snap ? <BBCodePreview bbcode={snap.bbcodeTemplate} /> : (
                  <div className="text-xs text-stone-400 italic">点击聚焦此栏以加载内容</div>
                );
              })()}
              <div className="mt-2 text-[10px] text-stone-400 text-center">只读预览 · 点击分栏任意位置聚焦后可编辑</div>
            </div>
          )
        ) : focused ? (
          <CharacterEditor user={user} />
        ) : (
          (() => {
            const snap = getTabSnapshot(pane.activeTabKey ?? null);
            if (!snap) {
              return (
                <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                  点击聚焦此栏以加载内容
                </div>
              );
            }
            return (
              <ShadowScope snapshot={snap}>
                <CharacterEditor user={user} />
              </ShadowScope>
            );
          })()
        )}
      </div>

      {/* 标签右键菜单 */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={menuItemsFor(ctxMenu.tabKey)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

/** 分栏布局主组件 */
export default function EditorPanes() {
  const { panes, focusedPaneId, focusPane } = useCharacter();

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {panes.map((pane, i) => (
        <EditorPaneView
          key={pane.id}
          pane={pane}
          paneIndex={i}
          paneCount={panes.length}
          focused={pane.id === focusedPaneId}
        />
      ))}
    </div>
  );
}

/**
 * 顶部全局标签栏（单层）：固定功能标签 + 按分栏分组的文档标签 + "+"新建 + 分栏/预览按钮。
 * 文档标签按所属分栏分组显示（组间分隔线）；拖动标签到某一组的区域上松手 = 移入该分栏。
 * 原工具条的全部文件操作迁移至文档标签的右键菜单（保存/另存为/分享/导出/同步论坛/导出卡片/GM/AI）。
 * 已激活的固定标签再次点击 = 返回聚焦文档的编辑视图。
 */
import { useState } from 'react';
import { Database, Sparkles, Plus, Columns2, Eye, FileText, Braces, X, Save, SaveAll, Share2, FileDown, ClipboardCopy, Swords, Sparkle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import ContextMenu from '../common/ContextMenu';

const FIXED_TABS = [
  { id: 'vault' as const, label: '我的档案库', icon: Database },
  { id: 'svg-template' as const, label: 'SVG 模板工坊', icon: Sparkles },
];

/** 标签在分栏之间拖拽所用的原生 dataTransfer 协议 */
const TAB_MIME = 'application/x-pf1-tab';

interface TabContextMenu {
  x: number;
  y: number;
  tabKey: string;
}

export default function EditorTabBar() {
  const { t } = useTranslation();
  const {
    tabs, activeTabKey, panes, focusedPaneId,
    addPane, openChooserTab, openPreviewTab, moveTabToPane, switchTab, closeTab,
    isDirty, isTemplateDirty, isReadOnly,
    bbcodeTemplate, currentTemplateId,
    handleSave, handleSaveAs, handleShare, handleExport, handleExportBBCode,
    updateExistingTemplate, saveAsTemplate, setShowAIModal,
  } = useCharacter();
  const { view, setView, gmCompactMode, setGmCompactMode, setForumSyncOpen, setCardExportOpen } = useUI();
  const [dragOverPaneId, setDragOverPaneId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<TabContextMenu | null>(null);
  const liveDirty = isDirty || isTemplateDirty;
  const inEditorView = view === 'editor' || view === 'new-tab';

  // 返回聚焦文档对应的编辑视图
  const backToFocusedDoc = () => {
    const activeTab = tabs.find(t => t.key === activeTabKey);
    setView(activeTab?.kind === 'template' ? 'bbcode-template' : 'editor');
  };

  // ===== 标签右键菜单：文件操作迁自原工具条；仅聚焦的活动标签提供保存类操作 =====
  const menuItemsFor = (tabKey: string) => {
    const tab = tabs.find(t => t.key === tabKey);
    if (!tab) return [];
    const items: { label: string; icon: any; onClick: () => void; danger?: boolean }[] = [];
    const isFocusedLive = tabKey === activeTabKey;
    const isDoc = tab.kind === 'character' || tab.kind === 'template';

    if (isFocusedLive && isDoc && !isReadOnly) {
      if (tab.kind === 'character') {
        items.push({ label: '保存', icon: Save, onClick: () => { void handleSave(); } });
        items.push({ label: '另存为', icon: SaveAll, onClick: () => { void handleSaveAs(); } });
      } else {
        // 模板：有 id 就地更新，否则另存为新模板
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
      }
      items.push({ label: '分享链接', icon: Share2, onClick: () => { void handleShare(); } });
      items.push({ label: '导出文件', icon: FileDown, onClick: () => { void handleExport(); } });
      items.push({ label: '复制 BBCode', icon: ClipboardCopy, onClick: () => { void handleExportBBCode(); } });
      if (tab.kind === 'character') {
        items.push({ label: '同步到论坛', icon: Share2, onClick: () => setForumSyncOpen(true) });
        items.push({ label: '导出角色卡图片', icon: FileDown, onClick: () => setCardExportOpen(true) });
        items.push({
          label: gmCompactMode ? '退出 GM 紧凑卡' : 'GM 紧凑数据卡', icon: Swords,
          onClick: () => setGmCompactMode(!gmCompactMode),
        });
        items.push({ label: 'AI 识别导入', icon: Sparkle, onClick: () => setShowAIModal(true) });
      }
    }

    items.push({ label: '关闭', icon: X, danger: true, onClick: () => closeTab(tabKey) });
    return items;
  };

  return (
    <div className="shrink-0 flex items-stretch gap-1 px-2 pt-1.5 bg-stone-100 border-b border-stone-200 overflow-x-auto custom-scrollbar">
      {/* 固定功能标签（不可关闭；再次点击 = 返回编辑视图） */}
      <div className="shrink-0 flex items-stretch gap-1">
        {FIXED_TABS.map(f => {
          const active = view === f.id;
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              onClick={() => (active ? backToFocusedDoc() : setView(f.id))}
              title={f.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer select-none text-xs whitespace-nowrap transition-colors border-t border-x ${
                active
                  ? 'bg-white border-stone-200 text-stone-800 font-bold shadow-sm -mb-px'
                  : 'bg-transparent border-transparent text-stone-500 hover:bg-stone-200/60 hover:text-stone-700'
              }`}
            >
              <Icon size={13} className={active ? 'text-primary' : 'text-stone-400'} />
              <span className="whitespace-nowrap">{f.label}</span>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 w-px h-5 self-center bg-stone-300 mx-1.5" />

      {/* 文档标签：按所属分栏分组，组间分隔线；组区域是拖拽落点；右键 = 文件操作菜单 */}
      <div className="flex-1 flex items-stretch gap-1 min-w-0">
        {panes.map((pane, i) => {
          const isDropTarget = dragOverPaneId === pane.id;
          return (
            <div
              key={pane.id}
              onDragOver={e => {
                if (e.dataTransfer.types.includes(TAB_MIME)) {
                  e.preventDefault();
                  setDragOverPaneId(pane.id);
                }
              }}
              onDragLeave={() => setDragOverPaneId(prev => (prev === pane.id ? null : prev))}
              onDrop={e => {
                setDragOverPaneId(null);
                const raw = e.dataTransfer.getData(TAB_MIME);
                if (!raw) return;
                try {
                  const { tabKey } = JSON.parse(raw);
                  if (tabKey) moveTabToPane(tabKey, pane.id);
                } catch { /* 忽略无效负载 */ }
              }}
              className={`flex items-stretch gap-1 min-w-0 ${
                isDropTarget ? 'bg-primary/10 rounded-lg ring-1 ring-inset ring-primary/40' : ''
              } ${i < panes.length - 1 ? 'pr-1.5 mr-1 border-r border-stone-300' : ''}`}
            >
              {pane.tabKeys.map(key => {
                const tab = tabs.find(t => t.key === key);
                if (!tab) return null;
                const active = inEditorView && pane.id === focusedPaneId && key === activeTabKey;
                const dirty = active ? liveDirty : tab.dirty;
                const Icon = tab.kind === 'preview' ? Eye : (tab.kind === 'chooser' ? FileText : (tab.kind === 'character' ? FileText : Braces));
                return (
                  <div
                    key={tab.key}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData(TAB_MIME, JSON.stringify({ tabKey: tab.key }));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => switchTab(tab.key)}
                    onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeTab(tab.key); } }}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCtxMenu({ x: e.clientX, y: e.clientY, tabKey: tab.key });
                    }}
                    title={tab.title}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg cursor-pointer select-none text-xs whitespace-nowrap transition-colors border-t border-x ${
                      active
                        ? 'bg-white border-stone-200 text-stone-800 font-bold shadow-sm -mb-px'
                        : 'bg-transparent border-transparent text-stone-500 hover:bg-stone-200/60 hover:text-stone-700'
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
              {pane.tabKeys.length === 0 && (
                <span className="self-center px-2 text-xs text-stone-400 italic whitespace-nowrap">空分栏（拖入标签）</span>
              )}
            </div>
          );
        })}
      </div>

      {/* "+" 新建标签页 + 向右分栏 + 预览分栏 */}
      <div className="shrink-0 flex items-center gap-0.5 pl-1">
        <button
          onClick={openChooserTab}
          title="新建标签页"
          className="p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={addPane}
          disabled={panes.length >= 4}
          title={panes.length >= 4 ? '最多支持 4 个分栏' : '向右拆分新分栏'}
          className="p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Columns2 size={14} />
        </button>
        <button
          onClick={() => openPreviewTab(true)}
          disabled={panes.length >= 4}
          title={panes.length >= 4 ? '最多支持 4 个分栏' : '在新分栏中打开预览窗格'}
          className="p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye size={14} />
        </button>
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

/**
 * 顶部全局标签栏（单层）：固定功能标签 + 按分栏分组的文档标签 + "+"新建 + 分栏按钮。
 * 文档标签按所属分栏分组显示（组间分隔线）；拖动标签到某一组的区域上松手 = 移入该分栏。
 * 已激活的固定标签再次点击 = 返回聚焦文档的编辑视图。
 */
import { useState } from 'react';
import { Database, Sparkles, Plus, Columns2, FileText, Braces, X } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';

const FIXED_TABS = [
  { id: 'vault' as const, label: '我的档案库', icon: Database },
  { id: 'svg-template' as const, label: 'SVG 模板工坊', icon: Sparkles },
];

/** 标签在分栏之间拖拽所用的原生 dataTransfer 协议 */
const TAB_MIME = 'application/x-pf1-tab';

export default function EditorTabBar() {
  const { tabs, activeTabKey, panes, focusedPaneId, addPane, openChooserTab, moveTabToPane, switchTab, closeTab, isDirty, isTemplateDirty } = useCharacter();
  const { view, setView } = useUI();
  const [dragOverPaneId, setDragOverPaneId] = useState<string | null>(null);
  const liveDirty = isDirty || isTemplateDirty;
  const inEditorView = view === 'editor' || view === 'new-tab';

  // 返回聚焦文档对应的编辑视图
  const backToFocusedDoc = () => {
    const activeTab = tabs.find(t => t.key === activeTabKey);
    setView(activeTab?.kind === 'template' ? 'bbcode-template' : 'editor');
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

      {/* 文档标签：按所属分栏分组，组间分隔线；组区域是拖拽落点 */}
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
                const Icon = tab.kind === 'chooser' ? FileText : (tab.kind === 'character' ? FileText : Braces);
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

      {/* "+" 新建标签页 + 向右分栏 */}
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
      </div>
    </div>
  );
}

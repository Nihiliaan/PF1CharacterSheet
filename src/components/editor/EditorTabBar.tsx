/**
 * 顶部全局标签栏：固定的"档案库 / SVG 模板工坊"功能标签 + "+"新建标签页 + 向右分栏按钮。
 * 文档标签（人物卡/BBCode 模板）已移入各分栏的小标签条（见 EditorPanes）。
 * 已激活的固定标签再次点击 = 返回聚焦文档的编辑视图。
 */
import { Database, Sparkles, Plus, Columns2 } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';

const FIXED_TABS = [
  { id: 'vault' as const, label: '我的档案库', icon: Database },
  { id: 'svg-template' as const, label: 'SVG 模板工坊', icon: Sparkles },
];

export default function EditorTabBar() {
  const { tabs, activeTabKey, panes, addPane, openChooserTab } = useCharacter();
  const { view, setView } = useUI();

  // 返回聚焦文档对应的编辑视图
  const backToFocusedDoc = () => {
    const activeTab = tabs.find(t => t.key === activeTabKey);
    setView(activeTab?.kind === 'template' ? 'bbcode-template' : 'editor');
  };

  return (
    <div className="shrink-0 flex items-stretch gap-1 px-2 pt-1.5 bg-stone-100 border-b border-stone-200">
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

      {/* "+" 新建标签页（chooser 开场，落在聚焦分栏） */}
      <button
        onClick={openChooserTab}
        title="新建标签页"
        className="shrink-0 self-center p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
      >
        <Plus size={14} />
      </button>

      {/* 向右分栏（新增一个编辑栏，以新建标签页开场） */}
      <button
        onClick={addPane}
        disabled={panes.length >= 4}
        title={panes.length >= 4 ? '最多支持 4 个分栏' : '向右拆分新分栏'}
        className="shrink-0 self-center p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Columns2 size={14} />
      </button>
    </div>
  );
}

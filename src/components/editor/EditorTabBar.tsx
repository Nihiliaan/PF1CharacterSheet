/**
 * 编辑器顶部标签栏（VS Code / 浏览器风格，应用的主导航）。
 * 布局：最前面是固定的"档案库 / SVG 模板工坊"功能标签（浏览器固定标签页惯例），
 * 之后是可横向滚动的文档标签（人物卡 + BBCode 模板混排，未保存圆点、中键关闭），
 * "+"按钮紧跟最后一个文档标签——点击瞬间创建"新建标签页"（chooser 伪标签，
 * 页面内呈现新建人物卡 / 新建模板 / 最近打开文件的大页选项，见 NewTabPage）。
 */
import { Database, Sparkles, FileText, Braces, X, Plus } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';

const FIXED_TABS = [
  { id: 'vault' as const, label: '我的档案库', icon: Database },
  { id: 'svg-template' as const, label: 'SVG 模板工坊', icon: Sparkles },
];

export default function EditorTabBar() {
  const { tabs, activeTabKey, switchTab, closeTab, activeTabTitle, isDirty, isTemplateDirty, openChooserTab } = useCharacter();
  const { view, setView } = useUI();
  const liveDirty = isDirty || isTemplateDirty;
  // 只有处于编辑器类视图（含新建标签页）时，对应文档标签才呈现"激活"态
  const inEditorView = view === 'editor' || view === 'bbcode-template' || view === 'new-tab';

  const tabIcon = (kind: 'character' | 'template' | 'chooser') => {
    if (kind === 'chooser') return Plus;
    return kind === 'character' ? FileText : Braces;
  };

  return (
    <div className="shrink-0 flex items-stretch px-2 pt-1.5 bg-stone-100 border-b border-stone-200">
      {/* 固定功能标签（最前面，不可关闭） */}
      <div className="shrink-0 flex items-stretch gap-1">
        {FIXED_TABS.map(f => {
          const active = view === f.id;
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              onClick={() => setView(f.id)}
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

      {/* 文档标签（可横向滚动）+ 紧跟其后的"+"新建按钮 */}
      <div className="flex-1 flex items-stretch gap-1 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const active = inEditorView && tab.key === activeTabKey;
          const title = active ? activeTabTitle : (tab.title || (tab.kind === 'character' ? '人物卡' : '模板'));
          const dirty = active ? liveDirty : tab.dirty;
          const Icon = tabIcon(tab.kind);
          return (
            <div
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              onMouseDown={e => {
                // 中键关闭（新建标签页也可以关）
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.key);
                }
              }}
              title={title}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer select-none text-xs whitespace-nowrap transition-colors border-t border-x ${
                active
                  ? 'bg-white border-stone-200 text-stone-800 font-bold shadow-sm -mb-px'
                  : 'bg-transparent border-transparent text-stone-500 hover:bg-stone-200/60 hover:text-stone-700'
              }`}
            >
              <Icon size={13} className={active ? 'text-primary' : 'text-stone-400'} />
              <span className="max-w-[160px] truncate">{title}</span>
              {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="有未保存的修改" />}
              <span
                onClick={e => {
                  e.stopPropagation();
                  closeTab(tab.key);
                }}
                className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-300 text-stone-500"
                title="关闭标签页"
              >
                <X size={12} />
              </span>
            </div>
          );
        })}

        {/* "+"：紧跟最后一个标签，点击瞬间创建"新建标签页" */}
        <button
          onClick={openChooserTab}
          title="新建标签页"
          className="shrink-0 self-center p-1.5 rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

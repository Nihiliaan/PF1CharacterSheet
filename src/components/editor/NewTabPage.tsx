/**
 * "新建标签页"页面（浏览器 New Tab 的等价物）。
 * 点击标签栏"+"按钮瞬间创建 chooser 伪标签后呈现的大页面：
 * 两个大入口卡（新建人物卡 / 新建模板）+ 最近打开的文件列表。
 * 选择动作通过 CharacterContext 就地在当前 chooser 标签上落地（同页跳转语义）。
 */
import { useMemo } from 'react';
import { FileText, Braces, X } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';

export default function NewTabPage() {
  const { convertChooserTab, openDocFromChooser } = useCharacter();
  const { recentCharacterIds, removeFromRecent } = useUI();
  const { myCharacters } = useVault();

  const recentItems = useMemo(() => {
    return recentCharacterIds
      .map(id => {
        const found = myCharacters?.find((c: any) => c.id === id);
        if (!found) return null;
        const data = found.data || {};
        return {
          id,
          name: data.basic?.name || found.name || '未命名',
          avatar: found.isTemplate
            ? 'https://ui-avatars.com/api/?name=T&background=6366f1&color=fff'
            : (data.basic?.avatars?.url?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(found.name || '未知')}`),
          classes: data.basic?.classes || found.classes || '',
          isTemplate: !!found.isTemplate,
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  }, [recentCharacterIds, myCharacters]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-stone-100">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* 大入口卡 */}
        <h2 className="text-xl font-bold text-stone-800 mb-1">新建标签页</h2>
        <p className="text-sm text-stone-500 mb-6">选择要创建的内容，或从下方最近打开的文件继续</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => convertChooserTab('character')}
            className="group text-left bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <FileText size={20} className="text-primary" />
            </div>
            <div className="text-sm font-bold text-stone-800 mb-1">新建人物卡</div>
            <div className="text-xs text-stone-500">从空白角色卡开始录入属性、技能、装备与背景</div>
          </button>

          <button
            onClick={() => convertChooserTab('template')}
            className="group text-left bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
              <Braces size={20} className="text-indigo-500" />
            </div>
            <div className="text-sm font-bold text-stone-800 mb-1">新建模板</div>
            <div className="text-xs text-stone-500">基于默认 BBCode 模板编排论坛发布排版</div>
          </button>
        </div>

        {/* 最近打开的文件 */}
        <h3 className="text-sm font-bold text-stone-600 mb-3">最近打开的文件</h3>
        {recentItems.length === 0 ? (
          <div className="text-sm text-stone-400 italic bg-white/60 border border-dashed border-stone-300 rounded-xl p-6 text-center">
            暂无最近打开的文件
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentItems.map(item => (
              <div key={item.id} className="relative group/item">
                <button
                  onClick={() => openDocFromChooser(item.id)}
                  className="w-full flex items-center gap-3 bg-white border border-stone-200 rounded-lg px-4 py-3 shadow-xs hover:shadow-sm hover:border-primary/40 transition-all text-left pr-9"
                >
                  <img
                    src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`}
                    className="w-9 h-9 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                    referrerPolicy="no-referrer"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-stone-800 truncate">{item.name}</span>
                      {item.isTemplate && (
                        <span title="模板" className="shrink-0">
                          <Braces size={12} className="text-indigo-400" />
                        </span>
                      )}
                    </div>
                    {item.classes && <div className="text-xs text-stone-400 truncate">{item.classes}</div>}
                  </div>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeFromRecent(item.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all rounded hover:bg-rose-50"
                  title="删除记录"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 顶部辅助工具栏：当前编辑态提示、模板预设下拉、存为预设内联输入条与宏变量标签
 * （onMouseDown 阻止失焦，在光标处秒速插入文字；所有数据与回调均来自容器）
 */
import React from 'react';
import { Sparkles, ChevronDown, BookmarkPlus } from 'lucide-react';
import { ForumBindingItem } from '../../../schema/types';
import { TemplatePreset, EditingTarget, MACRO_TAGS } from './shared';

interface TemplateToolbarProps {
  activeEditing: EditingTarget | null;
  localBindings: ForumBindingItem[];
  showPresetMenu: boolean;
  showSavePresetInput: boolean;
  savePresetName: string;
  availablePresets: TemplatePreset[];
  onTogglePresetMenu: () => void;
  onToggleSavePresetInput: () => void;
  onChangeSavePresetName: (value: string) => void;
  onApplyPreset: (preset: TemplatePreset) => void;
  onSaveCustomPreset: () => void;
  onCancelSavePreset: () => void;
  onInsertTextAtCursor: (text: string) => void;
}

const TemplateToolbar: React.FC<TemplateToolbarProps> = ({
  activeEditing,
  localBindings,
  showPresetMenu,
  showSavePresetInput,
  savePresetName,
  availablePresets,
  onTogglePresetMenu,
  onToggleSavePresetInput,
  onChangeSavePresetName,
  onApplyPreset,
  onSaveCustomPreset,
  onCancelSavePreset,
  onInsertTextAtCursor
}) => {
  return (
    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-stone-600 font-medium truncate">
          {activeEditing && activeEditing.field !== 'msgId'
            ? `当前正在编辑: 楼层 #${localBindings[activeEditing.index]?.msgId || '新建'} 的${activeEditing.field === 'titleTemplate' ? '主标题' : '副标题'}`
            : '点击下方任意标题或副标题即可编辑；点击宏在光标处插入，选择预设快速替换'}
        </span>

        {/* 预设工具栏 */}
        <div className="relative flex items-center gap-1 shrink-0">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={onTogglePresetMenu}
            className="px-2 py-0.5 text-[11px] font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Sparkles size={11} className="text-amber-700" />
            <span>载入模板预设</span>
            <ChevronDown size={11} className="text-stone-400" />
          </button>

          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={onToggleSavePresetInput}
            className="px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded flex items-center gap-1 cursor-pointer shadow-2xs"
            title="将当前输入框内容存入自建预设"
          >
            <BookmarkPlus size={11} />
            <span>存为预设</span>
          </button>

          {/* 预设下拉列表 */}
          {showPresetMenu && (
            <div className="absolute right-0 top-6 mt-1 w-64 bg-white border border-stone-200 rounded-md shadow-lg z-30 py-1 text-xs">
              <div className="px-3 py-1 font-semibold text-stone-400 text-[10px] uppercase">
                推荐模板
              </div>
              {availablePresets.filter(p => !p.isCustom).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onApplyPreset(p)}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-100 flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="font-medium text-stone-800">{p.label}</span>
                  <span className="font-mono text-[10px] text-stone-400 truncate">{p.template}</span>
                </button>
              ))}

              <div className="border-t border-stone-100 my-1" />
              <div className="px-3 py-1 font-semibold text-stone-400 text-[10px] uppercase">
                自建模板 ({availablePresets.filter(p => p.isCustom).length})
              </div>
              {availablePresets.filter(p => p.isCustom).length === 0 ? (
                <div className="px-3 py-1.5 text-stone-400 text-[10px]">暂无自建预设</div>
              ) : (
                availablePresets.filter(p => p.isCustom).map(cp => (
                  <button
                    key={cp.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => onApplyPreset(cp)}
                    className="w-full text-left px-3 py-1 hover:bg-stone-100 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium text-stone-800 truncate">{cp.label}</span>
                    <span className="font-mono text-[10px] text-stone-400 truncate">{cp.template}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 存为预设内联条 */}
      {showSavePresetInput && (
        <div className="flex items-center gap-1.5 p-1.5 bg-amber-50/70 border border-amber-200 rounded">
          <span className="text-[11px] font-semibold text-amber-900 shrink-0">预设名称:</span>
          <input
            type="text"
            value={savePresetName}
            onChange={e => onChangeSavePresetName(e.target.value)}
            placeholder="例如：极简副标题..."
            className="flex-1 px-2 py-0.5 text-xs text-stone-900 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-amber-600"
          />
          <button
            type="button"
            onClick={onSaveCustomPreset}
            className="px-2.5 py-0.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer"
          >
            保存
          </button>
          <button
            type="button"
            onClick={onCancelSavePreset}
            className="px-1.5 py-0.5 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
          >
            取消
          </button>
        </div>
      )}

      {/* 宏变量标签（点击秒速原位插入文字，无失焦，零卡顿） */}
      <div className="flex items-center flex-wrap gap-1">
        <span className="text-[10px] text-stone-400 mr-0.5">点击光标处插入:</span>
        {MACRO_TAGS.map(m => (
          <button
            key={m.tag}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onInsertTextAtCursor(m.tag)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 transition-colors cursor-pointer shadow-2xs"
            title={`在光标处插入 ${m.label}`}
          >
            {m.tag} <span className="text-stone-400 font-sans text-[9px]">({m.label})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateToolbar;

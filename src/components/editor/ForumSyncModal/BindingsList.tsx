/**
 * 已绑定的果园楼层列表：列表头部（计数 + 复制带锚点 BBCode）、
 * 空状态提示、绑定卡片集合与「添加绑定楼层卡片」按钮
 */
import React from 'react';
import { Copy, Plus } from 'lucide-react';
import { ForumBindingItem, CharacterData } from '../../../schema/types';
import { PostStatus, EditingTarget } from './shared';
import BindingCard from './BindingCard';

interface BindingsListProps {
  t: any;
  localBindings: ForumBindingItem[];
  titles: Record<number, string>;
  descriptions: Record<number, string>;
  loadingTitles: Record<number, boolean>;
  statuses: Record<number, PostStatus>;
  activeEditing: EditingTarget | null;
  setActiveEditing: React.Dispatch<React.SetStateAction<EditingTarget | null>>;
  activeInputRef: React.RefObject<HTMLInputElement | null>;
  data: CharacterData;
  computed: any;
  onCopyBBCode: () => void;
  onAddCard: () => void;
  onUpdateLocal: (index: number, field: keyof ForumBindingItem, val: any) => void;
  onFinishEditing: () => void;
  onCommitMsgId: (index: number, rawInput: string) => void;
  onDeleteCard: (index: number) => void;
  onRefreshTitle: (msgId: number) => void;
}

const BindingsList: React.FC<BindingsListProps> = ({
  t,
  localBindings,
  titles,
  descriptions,
  loadingTitles,
  statuses,
  activeEditing,
  setActiveEditing,
  activeInputRef,
  data,
  computed,
  onCopyBBCode,
  onAddCard,
  onUpdateLocal,
  onFinishEditing,
  onCommitMsgId,
  onDeleteCard,
  onRefreshTitle
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>{t('editor.forum_sync.bound_posts_list', '已绑定的果园楼层')}</span>
          <span className="text-stone-400 font-normal">({localBindings.filter(b => b.msgId > 0).length})</span>
        </h4>
        <button
          type="button"
          onClick={onCopyBBCode}
          className="text-[11px] text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 cursor-pointer"
          title="复制带 [anchor=ID-start] 与 [anchor=ID-end] 双锚点的 BBCode"
        >
          <Copy size={11} />
          <span>{t('editor.forum_sync.copy_code_btn', '复制带锚点 BBCode')}</span>
        </button>
      </div>

      {localBindings.length === 0 ? (
        <div className="p-6 border border-dashed border-stone-300 rounded-lg text-center text-xs text-stone-400">
          当前人物卡尚未绑定任何论坛楼层，请点击下方「+ 添加绑定楼层卡片」直接开始。
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {localBindings.map((item, index) => (
            <BindingCard
              key={index}
              item={item}
              index={index}
              titles={titles}
              descriptions={descriptions}
              loadingTitles={loadingTitles}
              statuses={statuses}
              activeEditing={activeEditing}
              setActiveEditing={setActiveEditing}
              activeInputRef={activeInputRef}
              data={data}
              computed={computed}
              t={t}
              onUpdateLocal={onUpdateLocal}
              onFinishEditing={onFinishEditing}
              onCommitMsgId={onCommitMsgId}
              onDeleteCard={onDeleteCard}
              onRefreshTitle={onRefreshTitle}
            />
          ))}
        </div>
      )}

      {/* 新建空白卡片按钮 */}
      <button
        type="button"
        onClick={onAddCard}
        className="w-full py-1.5 border border-dashed border-stone-300 hover:border-amber-600 hover:bg-amber-50/50 rounded-lg text-xs font-medium text-stone-600 hover:text-amber-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus size={13} />
        <span>+ 添加果园楼层绑定卡片</span>
      </button>
    </div>
  );
};

export default BindingsList;

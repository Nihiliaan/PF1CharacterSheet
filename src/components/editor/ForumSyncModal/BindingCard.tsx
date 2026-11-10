/**
 * 单张楼层绑定卡片：msg 编号（点击就地编辑）、原帖链接、同步状态、
 * 主标题/副标题模板的展示态与就地编辑态、实时编译预览
 */
import React from 'react';
import {
  ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Clock, Trash2
} from 'lucide-react';
import { ForumBindingItem, CharacterData } from '../../../schema/types';
import { renderTitleTemplate } from '../../../utils/bbcodeExporter';
import { PostStatus, EditingTarget } from './shared';

interface BindingCardProps {
  t: any;
  item: ForumBindingItem;
  index: number;
  titles: Record<number, string>;
  descriptions: Record<number, string>;
  loadingTitles: Record<number, boolean>;
  statuses: Record<number, PostStatus>;
  activeEditing: EditingTarget | null;
  setActiveEditing: React.Dispatch<React.SetStateAction<EditingTarget | null>>;
  activeInputRef: React.RefObject<HTMLInputElement | null>;
  data: CharacterData;
  computed: any;
  onUpdateLocal: (index: number, field: keyof ForumBindingItem, val: any) => void;
  onFinishEditing: () => void;
  onCommitMsgId: (index: number, rawInput: string) => void;
  onDeleteCard: (index: number) => void;
  onRefreshTitle: (msgId: number) => void;
}

const BindingCard: React.FC<BindingCardProps> = ({
  t,
  item,
  index,
  titles,
  descriptions,
  loadingTitles,
  statuses,
  activeEditing,
  setActiveEditing,
  activeInputRef,
  data,
  computed,
  onUpdateLocal,
  onFinishEditing,
  onCommitMsgId,
  onDeleteCard,
  onRefreshTitle
}) => {
  const id = item.msgId;
  const origTitle = titles[id] || '';
  const origSub = descriptions[id] || '';
  const isLoading = loadingTitles[id];
  const st = statuses[id] || { status: 'idle' };

  const isEditingMsgId = activeEditing?.index === index && activeEditing?.field === 'msgId';
  const isEditingTitle = activeEditing?.index === index && activeEditing?.field === 'titleTemplate';
  const isEditingSubtitle = activeEditing?.index === index && activeEditing?.field === 'subtitleTemplate';

  // 实时编译预览
  const evaluatedTitle = item.titleTemplate?.trim()
    ? renderTitleTemplate(item.titleTemplate, data, t, { computed, data }, {
        originalTitle: origTitle || `楼层 #${id}`,
        subject: origTitle || `楼层 #${id}`,
        originalSubtitle: origSub,
        description: origSub
      })
    : '';

  const evaluatedSubtitle = item.subtitleTemplate?.trim()
    ? renderTitleTemplate(item.subtitleTemplate, data, t, { computed, data }, {
        originalTitle: origTitle || `楼层 #${id}`,
        subject: origTitle || `楼层 #${id}`,
        originalSubtitle: origSub,
        description: origSub
      })
    : '';

  // 展示态文本：有模板显示编译结果；未输入显示原帖嗅探到的真实内容
  const displayTitleText = item.titleTemplate?.trim()
    ? evaluatedTitle
    : (origTitle || (isLoading ? '正在获取原帖标题...' : (id > 0 ? `楼层 #${id}` : '点击输入msg编号或链接')));

  const displaySubtitleText = item.subtitleTemplate?.trim()
    ? evaluatedSubtitle
    : (origSub || (isLoading ? '正在获取原帖副标题...' : '（原帖未设副标题，点击添加）'));

  return (
    <div
      className="border border-stone-200 rounded-lg bg-stone-50/40 p-2.5 flex flex-col gap-1.5 transition-colors"
    >
      {/* 第一行：编号（DynamicInput 模式，平时静态，点击即可编辑） + 网址 + 状态 + 操作 */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isEditingMsgId ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-stone-500">msg#</span>
              <input
                type="text"
                autoFocus
                defaultValue={id > 0 ? String(id) : ''}
                onBlur={e => onCommitMsgId(index, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCommitMsgId(index, (e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') setActiveEditing(null);
                }}
                placeholder="输入msg编号或果园网址..."
                className="w-48 px-1.5 py-0.5 text-xs font-mono font-semibold text-stone-900 bg-white border border-amber-500 rounded focus:outline-hidden ring-1 ring-amber-500 shadow-2xs"
              />
            </div>
          ) : (
            <div
              onClick={() => setActiveEditing({ index, field: 'msgId' })}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-semibold text-[11px] text-stone-700 bg-stone-200/80 hover:bg-amber-100 hover:text-amber-900 transition-colors cursor-pointer"
              title="点击可修改帖子 msg 编号或网址"
            >
              <span>msg#{id > 0 ? id : '点击填写编号'}</span>
            </div>
          )}

          {id > 0 && !isEditingMsgId && (
            <a
              href={`https://www.goddessfantasy.net/bbs/index.php?msg=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 truncate text-[11px] flex items-center gap-0.5 cursor-pointer ml-1"
              title="在果园中查看此楼层"
            >
              <span className="truncate">https://www.goddessfantasy.net/bbs/index.php?msg={id}</span>
              <ExternalLink size={10} className="shrink-0" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLoading && (
            <RefreshCw size={11} className="animate-spin text-stone-400" />
          )}
          {st.status === 'syncing' && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-700 flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin" />
              <span>同步中</span>
            </span>
          )}
          {st.status === 'success' && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
              <CheckCircle2 size={10} />
              <span>成功</span>
            </span>
          )}
          {st.status === 'error' && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-700 flex items-center gap-0.5" title={st.errorMessage}>
              <AlertTriangle size={10} />
              <span>失败</span>
            </span>
          )}
          {st.lastSyncedAt && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
              <Clock size={9} />
              <span>{st.lastSyncedAt}</span>
            </span>
          )}
          {id > 0 && (
            <button
              type="button"
              onClick={() => onRefreshTitle(id)}
              disabled={isLoading}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              title="重新嗅探此楼层标题与副标题"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteCard(index)}
            className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
            title="删除此卡片"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* 第二行：主标题（平时纯净静态文本，点击就地变成输入框；未输入直接呈现原帖标题） */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold text-stone-500 bg-stone-200/50 px-1 py-0.5 rounded shrink-0">
          主标题
        </span>

        {isEditingTitle ? (
          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
            <input
              type="text"
              autoFocus
              ref={el => { activeInputRef.current = el; }}
              value={item.titleTemplate || ''}
              onChange={e => onUpdateLocal(index, 'titleTemplate', e.target.value)}
              onBlur={onFinishEditing}
              onKeyDown={e => {
                if (e.key === 'Enter') onFinishEditing();
                if (e.key === 'Escape') setActiveEditing(null);
              }}
              placeholder={origTitle ? `原帖主标题「${origTitle}」` : '输入主标题模板，留空保持原帖不变...'}
              className="w-full px-2 py-0.5 text-xs text-stone-900 font-mono bg-white border border-amber-500 rounded focus:outline-hidden ring-1 ring-amber-500 shadow-2xs"
            />
            {evaluatedTitle && (
              <div className="text-[10px] text-stone-500 truncate pl-0.5">
                实时预览: <span className="font-medium text-stone-900">{evaluatedTitle}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setActiveEditing({ index, field: 'titleTemplate' })}
            className="flex items-center justify-between gap-1 flex-1 min-w-0 px-1.5 py-0.5 rounded hover:bg-amber-50/70 border border-transparent hover:border-amber-200/60 transition-colors cursor-pointer group"
            title="点击可编辑主标题模板"
          >
            <span className={`text-xs truncate ${item.titleTemplate ? 'text-stone-900 font-medium' : 'text-stone-700'}`}>
              {displayTitleText}
            </span>
            {item.titleTemplate ? (
              <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1 rounded font-mono shrink-0">
                自定义模板
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 shrink-0">
                (原帖主标题)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 第三行：副标题（平时纯净静态文本，点击就地变成输入框；未输入直接呈现原帖副标题） */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold text-amber-900 bg-amber-100/60 px-1 py-0.5 rounded shrink-0">
          副标题
        </span>

        {isEditingSubtitle ? (
          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
            <input
              type="text"
              autoFocus
              ref={el => { activeInputRef.current = el; }}
              value={item.subtitleTemplate || ''}
              onChange={e => onUpdateLocal(index, 'subtitleTemplate', e.target.value)}
              onBlur={onFinishEditing}
              onKeyDown={e => {
                if (e.key === 'Enter') onFinishEditing();
                if (e.key === 'Escape') setActiveEditing(null);
              }}
              placeholder={origSub ? `原帖副标题「${origSub}」` : '输入副标题模板，留空保持原帖不变...'}
              className="w-full px-2 py-0.5 text-xs text-stone-900 font-mono bg-white border border-amber-500 rounded focus:outline-hidden ring-1 ring-amber-500 shadow-2xs"
            />
            {evaluatedSubtitle && (
              <div className="text-[10px] text-amber-900/80 truncate pl-0.5">
                实时预览: <span className="font-medium text-amber-950">{evaluatedSubtitle}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setActiveEditing({ index, field: 'subtitleTemplate' })}
            className="flex items-center justify-between gap-1 flex-1 min-w-0 px-1.5 py-0.5 rounded hover:bg-amber-50/70 border border-transparent hover:border-amber-200/60 transition-colors cursor-pointer group"
            title="点击可编辑副标题模板"
          >
            <span className={`text-xs truncate ${item.subtitleTemplate ? 'text-amber-950 font-medium' : (origSub ? 'text-stone-600' : 'text-stone-400 italic')}`}>
              {displaySubtitleText}
            </span>
            {item.subtitleTemplate ? (
              <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1 rounded font-mono shrink-0">
                自定义模板
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 shrink-0">
                (原帖副标题)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BindingCard;

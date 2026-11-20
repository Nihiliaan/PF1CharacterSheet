/**
 * 单张楼层绑定卡片：msg 编号（点击就地编辑）、原帖链接、同步状态、
 * 主标题/副标题模板的展示态与就地编辑态、实时编译预览。
 *
 * 编辑态增强：
 * - 键入 {{ 触发宏变量自动补全菜单（↑↓ 选择、Enter/Tab 插入、Esc 关闭菜单）；
 * - 输入框下方内嵌「预设」Combobox（当前字段对应的内置+自建预设，末项可存为预设）；
 * - Escape 恢复编辑前快照（取消编辑），blur/Enter 走容器统一提交闸门。
 */
import React, { useState, useRef } from 'react';
import {
  ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Clock, Trash2
} from 'lucide-react';
import { CharacterData } from '../../../schema/types';
import { renderTitleTemplate } from '../../../utils/bbcodeExporter';
import {
  PostStatus, EditingTarget, LocalBinding, TemplatePreset,
  MACRO_TAGS, SAVE_AS_PRESET_VALUE
} from './shared';
import { Combobox } from '../../ui/combobox';

interface BindingCardProps {
  t: any;
  item: LocalBinding;
  index: number;
  titles: Record<number, string>;
  descriptions: Record<number, string>;
  loadingTitles: Record<number, boolean>;
  statuses: Record<number, PostStatus>;
  titlePresets: TemplatePreset[];
  subtitlePresets: TemplatePreset[];
  activeEditing: EditingTarget | null;
  activeInputRef: React.RefObject<HTMLInputElement | null>;
  data: CharacterData;
  computed: any;
  onUpdateLocal: (index: number, field: keyof LocalBinding, val: any) => void;
  onBeginEditing: (index: number, field: EditingTarget['field']) => void;
  onFinishEditing: () => void;
  onFieldFocus: () => void;
  onFieldBlur: () => void;
  onGateCancelPending: () => void;
  onGateScheduleFinish: () => void;
  onCancelEditing: () => void;
  onCommitMsgId: (index: number, rawInput: string) => void;
  onDeleteCard: (index: number) => void;
  onRefreshTitle: (msgId: number) => void;
  onApplyPreset: (index: number, field: 'titleTemplate' | 'subtitleTemplate', preset: TemplatePreset) => void;
  onSaveCustomPreset: (index: number, field: 'titleTemplate' | 'subtitleTemplate', name: string) => void;
}

// {{ 自动补全菜单的运行时状态
interface AcState {
  start: number;
  query: string;
  highlight: number;
}

const computeAc = (el: HTMLInputElement): AcState | null => {
  const caret = el.selectionStart ?? 0;
  const before = el.value.slice(0, caret);
  const m = before.match(/\{\{([^}]*)$/);
  if (!m) return null;
  return { start: caret - m[0].length, query: m[1], highlight: 0 };
};

const BindingCard: React.FC<BindingCardProps> = ({
  t,
  item,
  index,
  titles,
  descriptions,
  loadingTitles,
  statuses,
  titlePresets,
  subtitlePresets,
  activeEditing,
  activeInputRef,
  data,
  computed,
  onUpdateLocal,
  onBeginEditing,
  onFinishEditing,
  onFieldFocus,
  onFieldBlur,
  onGateCancelPending,
  onGateScheduleFinish,
  onCancelEditing,
  onCommitMsgId,
  onDeleteCard,
  onRefreshTitle,
  onApplyPreset,
  onSaveCustomPreset
}) => {
  const id = item.msgId;
  const origTitle = titles[id] || '';
  const origSub = descriptions[id] || '';
  const isLoading = loadingTitles[id];
  const st = statuses[id] || { status: 'idle' };

  const isEditingMsgId = activeEditing?.index === index && activeEditing?.field === 'msgId';
  const isEditingTitle = activeEditing?.index === index && activeEditing?.field === 'titleTemplate';
  const isEditingSubtitle = activeEditing?.index === index && activeEditing?.field === 'subtitleTemplate';

  // {{ 自动补全（仅在主/副标题编辑态生效）
  const [ac, setAc] = useState<AcState | null>(null);

  // 预设下拉的关闭后动作标记与存为预设内联输入
  const pendingAfterCloseRef = useRef<'none' | 'applied' | 'saveas'>('none');
  const [showSaveName, setShowSaveName] = useState(false);
  const [saveName, setSaveName] = useState('');

  const floorFallback = id > 0 ? t('editor.forum_sync.floor_fallback', '楼层 #{{id}}', { id }) : '';

  // 实时编译预览
  const evaluatedTitle = item.titleTemplate?.trim()
    ? renderTitleTemplate(item.titleTemplate, data, t, { computed, data }, {
        originalTitle: origTitle || floorFallback || `#${id}`,
        subject: origTitle || floorFallback || `#${id}`,
        originalSubtitle: origSub,
        description: origSub
      })
    : '';

  const evaluatedSubtitle = item.subtitleTemplate?.trim()
    ? renderTitleTemplate(item.subtitleTemplate, data, t, { computed, data }, {
        originalTitle: origTitle || floorFallback || `#${id}`,
        subject: origTitle || floorFallback || `#${id}`,
        originalSubtitle: origSub,
        description: origSub
      })
    : '';

  // 展示态文本：有模板显示编译结果；未输入显示原帖嗅探到的真实内容
  const displayTitleText = item.titleTemplate?.trim()
    ? evaluatedTitle
    : (origTitle || (isLoading
        ? t('editor.forum_sync.getting_title', '正在获取原帖标题...')
        : (id > 0 ? floorFallback : t('editor.forum_sync.edit_msgid_hint', '点击填写编号'))));

  const displaySubtitleText = item.subtitleTemplate?.trim()
    ? evaluatedSubtitle
    : (origSub || (isLoading
        ? t('editor.forum_sync.getting_subtitle', '正在获取原帖副标题...')
        : t('editor.forum_sync.no_subtitle_hint', '（原帖未设副标题，点击添加）')));

  // ---- {{ 自动补全逻辑 ----
  const filteredMacros = ac
    ? MACRO_TAGS.filter(m => m.tag.slice(2, -2).toLowerCase().includes(ac.query.toLowerCase()))
    : [];

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'titleTemplate' | 'subtitleTemplate') => {
    onUpdateLocal(index, field, e.target.value);
    setAc(computeAc(e.target));
  };

  const insertMacro = (tag: string) => {
    if (!ac) return;
    const input = activeInputRef.current;
    if (!input || !activeEditing) return;
    const field = activeEditing.field as 'titleTemplate' | 'subtitleTemplate';
    const caret = input.selectionStart ?? input.value.length;
    const cur = input.value;
    const newVal = cur.slice(0, ac.start) + tag + cur.slice(caret);
    const nextCaret = ac.start + tag.length;
    onUpdateLocal(index, field, newVal);
    setAc(null);
    requestAnimationFrame(() => {
      if (activeInputRef.current) {
        activeInputRef.current.focus();
        activeInputRef.current.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

  const handleTemplateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'titleTemplate' | 'subtitleTemplate') => {
    if (ac && filteredMacros.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAc({ ...ac, highlight: (ac.highlight + 1) % filteredMacros.length });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAc({ ...ac, highlight: (ac.highlight - 1 + filteredMacros.length) % filteredMacros.length });
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMacro(filteredMacros[Math.min(ac.highlight, filteredMacros.length - 1)].tag);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setAc(null);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onFinishEditing();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancelEditing();
    }
  };

  // ---- 预设下拉 ----
  const presetList = isEditingTitle ? titlePresets : subtitlePresets;
  const presetOptions = [
    ...presetList.map(p => ({
      value: p.id,
      label: p.labelKey ? t(`editor.forum_sync.${p.labelKey}`) : (p.label || ''),
      keywords: [p.template]
    })),
    { value: SAVE_AS_PRESET_VALUE, label: t('editor.forum_sync.save_as_preset_item', '＋ 将当前内容存为预设...') }
  ];

  const handlePresetSelect = (v: string | number) => {
    if (v === SAVE_AS_PRESET_VALUE) {
      pendingAfterCloseRef.current = 'saveas';
      setShowSaveName(true);
      setSaveName('');
      return;
    }
    const preset = presetList.find(p => p.id === v);
    if (preset) {
      pendingAfterCloseRef.current = 'applied';
      onApplyPreset(index, isEditingTitle ? 'titleTemplate' : 'subtitleTemplate', preset);
    }
  };

  const handlePresetPopoverChange = (open: boolean) => {
    if (open) {
      onGateCancelPending();
      return;
    }
    const mode = pendingAfterCloseRef.current;
    pendingAfterCloseRef.current = 'none';
    if (mode === 'none') {
      // 未选中任何动作的关闭（点击外部）：照常走失焦提交
      onGateScheduleFinish();
      return;
    }
    onGateCancelPending();
    if (mode === 'applied') {
      // 套用预设后回收焦点，保持编辑态以便微调
      requestAnimationFrame(() => {
        if (activeInputRef.current) {
          activeInputRef.current.focus();
          const len = activeInputRef.current.value.length;
          activeInputRef.current.setSelectionRange(len, len);
        }
      });
    }
    // mode === 'saveas'：存为预设名称输入条 autoFocus 接管焦点
  };

  const confirmSavePreset = () => {
    onSaveCustomPreset(index, isEditingTitle ? 'titleTemplate' : 'subtitleTemplate', saveName);
    setShowSaveName(false);
    setSaveName('');
  };

  // 模板输入框通用渲染
  const renderTemplateEditor = (field: 'titleTemplate' | 'subtitleTemplate') => {
    const value = item[field] || '';
    const isTitle = field === 'titleTemplate';
    const evaluated = isTitle ? evaluatedTitle : evaluatedSubtitle;
    const orig = isTitle ? origTitle : origSub;
    const placeholder = orig
      ? t(isTitle ? 'editor.forum_sync.title_placeholder_with_orig' : 'editor.forum_sync.subtitle_placeholder_with_orig',
          isTitle ? '原帖主标题「{{orig}}」' : '原帖副标题「{{orig}}」', { orig })
      : t(isTitle ? 'editor.forum_sync.title_placeholder_empty' : 'editor.forum_sync.subtitle_placeholder_empty',
          isTitle ? '输入主标题模板，留空保持原帖不变...' : '输入副标题模板，留空保持原帖不变...');

    return (
      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div className="relative">
          <input
            type="text"
            autoFocus
            ref={el => { activeInputRef.current = el; }}
            value={value}
            onChange={e => handleTemplateChange(e, field)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onSelect={e => setAc(computeAc(e.currentTarget))}
            onKeyDown={e => handleTemplateKeyDown(e, field)}
            placeholder={placeholder}
            className="w-full px-2 py-0.5 text-xs text-stone-900 font-mono bg-white border border-amber-500 rounded focus:outline-hidden ring-1 ring-amber-500 shadow-2xs"
          />
          {ac && filteredMacros.length > 0 && (
            <div className="absolute left-0 top-full mt-0.5 w-80 max-h-48 overflow-y-auto custom-scrollbar bg-white border border-stone-200 rounded-md shadow-lg z-40 py-1 text-xs">
              {filteredMacros.map((m, i) => (
                <button
                  key={m.tag}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => insertMacro(m.tag)}
                  className={`w-full text-left px-3 py-1 flex items-center justify-between gap-2 cursor-pointer ${i === ac.highlight ? 'bg-amber-50 text-amber-950' : 'hover:bg-stone-100'}`}
                >
                  <span className="font-mono text-stone-800">{m.tag}</span>
                  <span className="text-[10px] text-stone-400">{t(`editor.forum_sync.${m.labelKey}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {evaluated && (
          <div className={`text-[10px] truncate pl-0.5 ${isTitle ? 'text-stone-500' : 'text-amber-900/80'}`}>
            {t('editor.forum_sync.preview_label', '实时预览:')} <span className={`font-medium ${isTitle ? 'text-stone-900' : 'text-amber-950'}`}>{evaluated}</span>
          </div>
        )}

        {/* 预设 Combobox（当前字段专属）+ 存为预设内联命名条 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Combobox
            options={presetOptions}
            onSelect={handlePresetSelect}
            onOpenChange={handlePresetPopoverChange}
            allowCustom={false}
            className="w-56 text-[11px] text-stone-700 border border-stone-200 rounded bg-white px-2 py-0.5"
            placeholder={
              <span className="text-[11px] text-stone-500">
                {t('editor.forum_sync.preset_placeholder', '载入模板预设...')}
              </span>
            }
          />
          {showSaveName && (
            <div className="flex items-center gap-1.5 px-1.5 py-1 bg-amber-50/70 border border-amber-200 rounded">
              <span className="text-[11px] font-semibold text-amber-900 shrink-0">
                {t('editor.forum_sync.preset_name_label', '预设名称:')}
              </span>
              <input
                type="text"
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onFocus={onFieldFocus}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmSavePreset();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSaveName(false);
                    setSaveName('');
                  }
                }}
                placeholder={t('editor.forum_sync.preset_name_placeholder', '例如：极简副标题...')}
                className="w-40 px-2 py-0.5 text-[11px] text-stone-900 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-amber-600"
              />
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={confirmSavePreset}
                className="px-2 py-0.5 text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer"
              >
                {t('common.save', '保存')}
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setShowSaveName(false); setSaveName(''); }}
                className="px-1.5 py-0.5 text-[11px] text-stone-500 hover:text-stone-700 cursor-pointer"
              >
                {t('common.cancel', '取消')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCommitMsgId(index, (e.target as HTMLInputElement).value);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancelEditing();
                  }
                }}
                placeholder={t('editor.forum_sync.msgid_placeholder', '输入msg编号或果园网址...')}
                className="w-48 px-1.5 py-0.5 text-xs font-mono font-semibold text-stone-900 bg-white border border-amber-500 rounded focus:outline-hidden ring-1 ring-amber-500 shadow-2xs"
              />
            </div>
          ) : (
            <div
              onClick={() => onBeginEditing(index, 'msgId')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-semibold text-[11px] text-stone-700 bg-stone-200/80 hover:bg-amber-100 hover:text-amber-900 transition-colors cursor-pointer"
              title={t('editor.forum_sync.msgid_edit_title', '点击可修改帖子 msg 编号或网址')}
            >
              <span>msg#{id > 0 ? id : t('editor.forum_sync.edit_msgid_hint', '点击填写编号')}</span>
            </div>
          )}

          {id > 0 && !isEditingMsgId && (
            <a
              href={`https://www.goddessfantasy.net/bbs/index.php?msg=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 truncate text-[11px] flex items-center gap-0.5 cursor-pointer ml-1"
              title={t('editor.forum_sync.msgid_link_title', '在果园中查看此楼层')}
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
              <span>{t('editor.forum_sync.status_syncing', '同步中')}</span>
            </span>
          )}
          {st.status === 'success' && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
              <CheckCircle2 size={10} />
              <span>{t('editor.forum_sync.status_success', '成功')}</span>
            </span>
          )}
          {st.status === 'error' && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-700 flex items-center gap-0.5" title={st.errorMessage}>
              <AlertTriangle size={10} />
              <span>{t('editor.forum_sync.status_error', '失败')}</span>
            </span>
          )}
          {(item.lastSyncedAt || st.lastSyncedAt) && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
              <Clock size={9} />
              <span>{item.lastSyncedAt || st.lastSyncedAt}</span>
            </span>
          )}
          {id > 0 && (
            <button
              type="button"
              onClick={() => onRefreshTitle(id)}
              disabled={isLoading}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              title={t('editor.forum_sync.refresh_title_tip', '重新嗅探此楼层标题与副标题')}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteCard(index)}
            className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
            title={t('editor.forum_sync.delete_card_tip', '删除此卡片')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* 第二行：主标题（平时纯净静态文本，点击就地变成输入框；未输入直接呈现原帖标题） */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold text-stone-500 bg-stone-200/50 px-1 py-0.5 rounded shrink-0">
          {t('editor.forum_sync.title_label', '主标题')}
        </span>

        {isEditingTitle ? (
          renderTemplateEditor('titleTemplate')
        ) : (
          <div
            onClick={() => onBeginEditing(index, 'titleTemplate')}
            className="flex items-center justify-between gap-1 flex-1 min-w-0 px-1.5 py-0.5 rounded hover:bg-amber-50/70 border border-transparent hover:border-amber-200/60 transition-colors cursor-pointer group"
            title={t('editor.forum_sync.title_edit_tip', '点击可编辑主标题模板')}
          >
            <span className={`text-xs truncate ${item.titleTemplate ? 'text-stone-900 font-medium' : 'text-stone-700'}`}>
              {displayTitleText}
            </span>
            {item.titleTemplate ? (
              <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1 rounded font-mono shrink-0">
                {t('editor.forum_sync.custom_template_badge', '自定义模板')}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 shrink-0">
                {t('editor.forum_sync.original_title_badge', '(原帖主标题)')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 第三行：副标题（平时纯净静态文本，点击就地变成输入框；未输入直接呈现原帖副标题） */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold text-amber-900 bg-amber-100/60 px-1 py-0.5 rounded shrink-0">
          {t('editor.forum_sync.subtitle_label', '副标题')}
        </span>

        {isEditingSubtitle ? (
          renderTemplateEditor('subtitleTemplate')
        ) : (
          <div
            onClick={() => onBeginEditing(index, 'subtitleTemplate')}
            className="flex items-center justify-between gap-1 flex-1 min-w-0 px-1.5 py-0.5 rounded hover:bg-amber-50/70 border border-transparent hover:border-amber-200/60 transition-colors cursor-pointer group"
            title={t('editor.forum_sync.subtitle_edit_tip', '点击可编辑副标题模板')}
          >
            <span className={`text-xs truncate ${item.subtitleTemplate ? 'text-amber-950 font-medium' : (origSub ? 'text-stone-600' : 'text-stone-400 italic')}`}>
              {displaySubtitleText}
            </span>
            {item.subtitleTemplate ? (
              <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1 rounded font-mono shrink-0">
                {t('editor.forum_sync.custom_template_badge', '自定义模板')}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 shrink-0">
                {t('editor.forum_sync.original_subtitle_badge', '(原帖副标题)')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BindingCard;

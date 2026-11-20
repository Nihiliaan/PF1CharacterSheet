/**
 * 论坛同步弹窗容器组件：
 * 负责全部状态编排（本地绑定草稿、预设管理、油猴嗅探/同步事件监听与各操作回调）
 * 以及弹窗整体布局；各 UI 块拆分至同目录 ForumSyncModal/ 子组件，通过 props 传入数据与回调。
 *
 * 编辑闸门设计：
 * - 本地草稿（LocalBinding）纯内存维护，打字/预设套用绝不触发人物卡全局重算；
 * - 失焦提交走 150ms 延迟闸门：为预设下拉（Radix Popover 抢焦点）让路，
 *   onFieldFocus / 下拉打开会撤销挂起的提交，下拉关闭若无套用动作则照常提交；
 * - Escape 恢复进入编辑时的快照并标记取消态，随后触发的 blur 不再提交。
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';
import { ForumBinding, ForumBindingItem } from '../../schema/types';
import { getCharacterBBCode } from '../../utils/bbcodeExporter';
import { triggerForumSync } from '../../utils/forumSyncHelper';
import { Combobox } from '../ui/combobox';
import {
  PostStatus, TemplatePreset, EditingTarget, LocalBinding,
  STORAGE_KEY_TITLE_PRESETS, STORAGE_KEY_SUBTITLE_PRESETS,
  BUILTIN_TITLE_PRESETS, BUILTIN_SUBTITLE_PRESETS,
  extractMsgIdFromInput, makeUid, toPlainBinding
} from './ForumSyncModal/shared';
import ModalHeader from './ForumSyncModal/ModalHeader';
import HelperTipBanner from './ForumSyncModal/HelperTipBanner';
import BindingsList from './ForumSyncModal/BindingsList';
import ModalFooter from './ForumSyncModal/ModalFooter';

// 失焦提交延迟（ms）：为预设下拉抢焦点/选项预留窗口
const BLUR_COMMIT_DELAY = 150;

interface ForumSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const loadPresets = (key: string): TemplatePreset[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const ForumSyncModal: React.FC<ForumSyncModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { data, update, computed } = useCharacter();
  const { setToast } = useUI();
  const { myCharacters } = useVault();

  // t / setToast 的 ref 镜像：事件监听 effect 只注册一次，不随渲染重订阅
  const tRef = useRef(t);
  tRef.current = t;
  const setToastRef = useRef(setToast);
  setToastRef.current = setToast;

  // 档案库全部 BBCode 模板（按名称排序，展示名去掉 .bbc 扩展名）
  const bbcodeTemplates = useMemo(() => (myCharacters || [])
    .filter((c: any) => c.isTemplate)
    .map((c: any) => ({ id: c.id, name: (c.name || '').replace(/\.bbc$/i, '') }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-Hans-CN')), [myCharacters]);

  // 本地独立草稿状态（纯本地维护；draftDirty 标记草稿所有权，防止全局异步写回覆盖编辑中的草稿）
  const [localBindings, setLocalBindings] = useState<LocalBinding[]>([]);
  const draftDirtyRef = useRef(false);
  const localBindingsRef = useRef<LocalBinding[]>([]);
  localBindingsRef.current = localBindings;

  // 当前处于编辑态的定位指针: { index, field } | null
  const [activeEditing, setActiveEditing] = useState<EditingTarget | null>(null);
  const activeEditingRef = useRef<EditingTarget | null>(null);
  activeEditingRef.current = activeEditing;
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // 编辑闸门：快照（Escape 恢复）、取消标记（blur 跳过提交）、失焦延迟提交定时器
  const editSnapshotRef = useRef('');
  const cancelEditRef = useRef(false);
  const blurTimerRef = useRef<any>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showHelperTip, setShowHelperTip] = useState(false);

  const [customTitlePresets, setCustomTitlePresets] = useState<TemplatePreset[]>(() => loadPresets(STORAGE_KEY_TITLE_PRESETS));
  const [customSubtitlePresets, setCustomSubtitlePresets] = useState<TemplatePreset[]>(() => loadPresets(STORAGE_KEY_SUBTITLE_PRESETS));

  // 嗅探到的原帖主标题与副标题、嗅探中标记、同步状态
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [loadingTitles, setLoadingTitles] = useState<Record<number, boolean>>({});
  const [statuses, setStatuses] = useState<Record<number, PostStatus>>({});
  const titlesRef = useRef(titles);
  titlesRef.current = titles;
  const loadingTitlesRef = useRef(loadingTitles);
  loadingTitlesRef.current = loadingTitles;

  const syncTimerRef = useRef<any>(null);

  const markDraftDirty = () => { draftDirtyRef.current = true; };

  // 初始化本地绑定项（打开弹窗或全局绑定数据变化时；一旦草稿被本地编辑过则不再覆盖）
  useEffect(() => {
    if (!isOpen) {
      draftDirtyRef.current = false;
      cancelEditRef.current = false;
      setActiveEditing(null);
      return;
    }
    if (draftDirtyRef.current) return;
    const raw: ForumBinding[] = Array.isArray(data.forumBindings) ? data.forumBindings : [];
    const normalized: LocalBinding[] = raw.map((b: any) => {
      if (typeof b === 'number') {
        return { uid: makeUid(), msgId: b, titleTemplate: '', subtitleTemplate: '' };
      }
      return {
        uid: makeUid(),
        msgId: b.msgId,
        titleTemplate: b.titleTemplate || '',
        subtitleTemplate: b.subtitleTemplate || '',
        ...(b.lastSyncedAt ? { lastSyncedAt: b.lastSyncedAt } : {})
      };
    }).filter((b: any) => typeof b.msgId === 'number' && !isNaN(b.msgId) && b.msgId > 0);

    setLocalBindings(normalized);
  }, [isOpen, data.forumBindings]);

  // 失焦提交（一次性持久化至全局人物卡状态）
  const commitToGlobal = (items: LocalBinding[]) => {
    update('forumBindings', items.filter(b => b.msgId > 0).map(toPlainBinding));
  };

  const cancelPendingBlurCommit = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  // 编辑闸门三步：失焦延迟提交、聚焦撤销、下拉关闭时无套用动作则照常提交
  const handleFieldBlur = () => {
    cancelPendingBlurCommit();
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      handleFinishEditing();
    }, BLUR_COMMIT_DELAY);
  };

  const handleFieldFocus = () => cancelPendingBlurCommit();

  // 编辑闸门手动控制：预设下拉打开/动作收尾时撤销挂起提交，无动作关闭时照常提交
  const handleGateCancelPending = () => cancelPendingBlurCommit();
  const handleGateScheduleFinish = () => handleFieldBlur();

  // 进入编辑：快照当前值，供 Escape 恢复
  const handleBeginEditing = (index: number, field: EditingTarget['field']) => {
    const item = localBindingsRef.current[index];
    if (!item) return;
    editSnapshotRef.current = field === 'msgId'
      ? String(item.msgId > 0 ? item.msgId : '')
      : (item[field] || '');
    cancelEditRef.current = false;
    setActiveEditing({ index, field });
  };

  // 失焦/回车完成编辑：取消态则跳过提交，否则统一提交
  const handleFinishEditing = () => {
    cancelPendingBlurCommit();
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setActiveEditing(null);
      return;
    }
    setActiveEditing(null);
    commitToGlobal(localBindingsRef.current);
  };

  // Escape 取消编辑：恢复快照并标记取消态（随后由卸载触发的 blur 不再提交）；
  // 取消新建空白卡的编号编辑时，若该卡从未有内容则直接移除
  const handleCancelEditing = () => {
    const target = activeEditingRef.current;
    if (!target) return;
    const { index, field } = target;
    const item = localBindingsRef.current[index];
    cancelEditRef.current = true;

    if (field === 'msgId' && item && !(extractMsgIdFromInput(editSnapshotRef.current)) && !item.titleTemplate?.trim() && !item.subtitleTemplate?.trim()) {
      const next = localBindingsRef.current.filter((_, i) => i !== index);
      localBindingsRef.current = next;
      setLocalBindings(next);
      setActiveEditing(null);
      return;
    }

    const next = localBindingsRef.current.map((b, i) => {
      if (i !== index) return b;
      if (field === 'msgId') return { ...b, msgId: extractMsgIdFromInput(editSnapshotRef.current) || 0 };
      return { ...b, [field]: editSnapshotRef.current };
    });
    localBindingsRef.current = next;
    setLocalBindings(next);
    setActiveEditing(null);
  };

  // 修改编号失焦时
  const handleCommitMsgId = (index: number, rawInput: string) => {
    cancelPendingBlurCommit();
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setActiveEditing(null);
      return;
    }
    const num = extractMsgIdFromInput(rawInput) || 0;
    const next = localBindingsRef.current.map((b, i) => i === index ? { ...b, msgId: num } : b);
    localBindingsRef.current = next;
    setLocalBindings(next);
    markDraftDirty();
    commitToGlobal(next);
    setActiveEditing(null);

    if (num > 0) {
      setLoadingTitles(prev => ({ ...prev, [num]: true }));
      loadingTitlesRef.current = { ...loadingTitlesRef.current, [num]: true };
      window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId: num } }));
    }
  };

  // 删除卡片（危险操作，沿用全局 window.confirm 约定）
  const handleDeleteCard = (index: number) => {
    if (!window.confirm(t('editor.forum_sync.delete_confirm', '确定要删除该楼层绑定卡片吗？其主/副标题模板设置将一并清除。'))) return;
    cancelPendingBlurCommit();
    const next = localBindingsRef.current.filter((_, i) => i !== index);
    localBindingsRef.current = next;
    setLocalBindings(next);
    markDraftDirty();
    commitToGlobal(next);
    setActiveEditing(null);
  };

  // 添加一张新空白卡片，直接聚焦到编号输入框
  const handleAddNewBlankCard = () => {
    const next = [...localBindingsRef.current, { uid: makeUid(), msgId: 0, titleTemplate: '', subtitleTemplate: '' }];
    localBindingsRef.current = next;
    setLocalBindings(next);
    markDraftDirty();
    handleBeginEditing(next.length - 1, 'msgId');
  };

  // 重新嗅探
  const handleRefreshTitle = (msgId: number) => {
    if (!msgId) return;
    setLoadingTitles(prev => ({ ...prev, [msgId]: true }));
    loadingTitlesRef.current = { ...loadingTitlesRef.current, [msgId]: true };
    window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId } }));
    setToast({ message: t('editor.forum_sync.resniffing_toast', '正在重新嗅探楼层 #{{msgId}} 标题与副标题...', { msgId }), type: 'info' });
  };

  // 局部更新文本（纯本地更新，绝不触发全卡重算；与打字同等地位，待失焦统一提交）
  const handleUpdateLocal = (index: number, field: keyof ForumBindingItem, val: any) => {
    const next = localBindingsRef.current.map((b, i) => i === index ? { ...b, [field]: val } : b);
    localBindingsRef.current = next;
    setLocalBindings(next);
    markDraftDirty();
  };

  // 套用预设：写入当前编辑字段并回收焦点（下拉关闭后保持编辑态以便微调）
  const handleApplyPreset = (index: number, field: 'titleTemplate' | 'subtitleTemplate', preset: TemplatePreset) => {
    handleUpdateLocal(index, field, preset.template);
    setToast({ message: t('editor.forum_sync.preset_saved_applied', '已载入模板: {{name}}', { name: preset.labelKey ? t(`editor.forum_sync.${preset.labelKey}`) : (preset.label || '') }), type: 'success' });
  };

  // 存为自建预设（保存目标 = 当前正在编辑的字段，天然无歧义）
  const handleSaveCustomPreset = (index: number, field: 'titleTemplate' | 'subtitleTemplate', name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setToast({ message: t('editor.forum_sync.preset_name_required', '请输入预设名称'), type: 'error' });
      return;
    }
    const val = (localBindingsRef.current[index]?.[field] || '').trim();
    if (!val) {
      setToast({ message: t('editor.forum_sync.preset_error_empty', '当前内容为空，无法保存为预设'), type: 'error' });
      return;
    }

    const newPreset: TemplatePreset = {
      id: `custom-${Date.now()}`,
      label: trimmedName,
      template: val,
      isCustom: true
    };

    if (field === 'titleTemplate') {
      const nextList = [...customTitlePresets, newPreset];
      setCustomTitlePresets(nextList);
      try { localStorage.setItem(STORAGE_KEY_TITLE_PRESETS, JSON.stringify(nextList)); } catch {}
    } else {
      const nextList = [...customSubtitlePresets, newPreset];
      setCustomSubtitlePresets(nextList);
      try { localStorage.setItem(STORAGE_KEY_SUBTITLE_PRESETS, JSON.stringify(nextList)); } catch {}
    }
    setToast({ message: t('editor.forum_sync.preset_saved', '自建模板「{{name}}」已保存', { name: trimmedName }), type: 'success' });
  };

  // 复制带双锚点的 BBCode
  const handleCopyWrappedBBCode = async () => {
    const rawBBCode = getCharacterBBCode(data, computed, t);
    const wrapped = `[anchor=${data.id || 'default_id'}-start][/anchor]\n${rawBBCode}\n[anchor=${data.id || 'default_id'}-end][/anchor]`;
    try {
      await navigator.clipboard.writeText(wrapped);
      setToast({ message: t('editor.forum_sync.copy_wrapped_success', '已复制带 [anchor] 锚点的 BBCode！直接在果园新发帖粘贴即可。'), type: 'success' });
    } catch {
      setToast({ message: t('editor.forum_sync.copy_failed', '复制失败：当前环境未授权剪贴板访问'), type: 'error' });
    }
  };

  // 触发一键同步
  const handleTriggerSync = () => {
    cancelPendingBlurCommit();
    // 强制先失焦提交所有本地变更
    commitToGlobal(localBindingsRef.current);

    const validItems = localBindingsRef.current.filter(b => b.msgId > 0);
    if (validItems.length === 0) {
      setToast({ message: t('editor.forum_sync.no_posts_tip', '请先绑定至少一个有效的果园楼层'), type: 'info' });
      return;
    }

    setIsSyncing(true);
    setShowHelperTip(false);

    const newStatuses: Record<number, PostStatus> = {};
    validItems.forEach(item => {
      newStatuses[item.msgId] = { status: 'syncing' };
    });
    setStatuses(newStatuses);

    // 统一调用固定业务函数触发论坛同步
    triggerForumSync(data, computed, t, {
      bindings: validItems.map(toPlainBinding),
      titles,
      descriptions
    });

    const isHelperReady = typeof window !== 'undefined' && !!(window as any).__PF1_SYNC_HELPER__?.ready;
    if (isHelperReady) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setIsSyncing(false);
      setShowHelperTip(true);
      const resetStatuses: Record<number, PostStatus> = {};
      validItems.forEach(item => {
        resetStatuses[item.msgId] = { status: 'idle' };
      });
      setStatuses(resetStatuses);
    }, 2500);
  };

  // 监听来自油猴脚本的事件（只注册一次，动态数据一律经 ref 读取）
  useEffect(() => {
    if (!isOpen) return;

    const clearSyncTimer = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };

    const handleAck = () => {
      clearSyncTimer();
      setShowHelperTip(false);
    };

    const handleTitleFetched = (e: any) => {
      const { msgId, title, description } = e.detail || {};
      const numId = parseInt(msgId, 10);
      if (!numId) return;

      if (title) setTitles(prev => ({ ...prev, [numId]: title }));
      if (description !== undefined) setDescriptions(prev => ({ ...prev, [numId]: description }));
      setLoadingTitles(prev => ({ ...prev, [numId]: false }));
    };

    const handleProgress = (e: any) => {
      clearSyncTimer();
      setShowHelperTip(false);

      const { msgId, status, errorMessage, lastSyncedAt, title, description } = e.detail || {};
      const numId = parseInt(msgId, 10);
      if (!numId) return;

      if (title) setTitles(prev => ({ ...prev, [numId]: title }));
      if (description !== undefined) setDescriptions(prev => ({ ...prev, [numId]: description }));

      setStatuses(prev => ({
        ...prev,
        [numId]: {
          status: status || 'idle',
          errorMessage: errorMessage || '',
          lastSyncedAt: lastSyncedAt || new Date().toLocaleTimeString()
        }
      }));

      // 同步成功：把最近同步时间持久化到绑定项（草稿与全局同时落笔）
      if (status === 'success' && lastSyncedAt) {
        const next = localBindingsRef.current.map(b => b.msgId === numId ? { ...b, lastSyncedAt } : b);
        localBindingsRef.current = next;
        setLocalBindings(next);
        commitToGlobal(next);
      }
    };

    const handleDone = () => {
      setIsSyncing(false);
      setToastRef.current({ message: tRef.current('editor.forum_sync.all_done', '论坛帖子同步完成！'), type: 'success' });
    };

    window.addEventListener('FORUM_SYNC_ACK', handleAck);
    document.addEventListener('FORUM_SYNC_ACK', handleAck);
    window.addEventListener('PF1_SYNC_HELPER_READY', handleAck);
    document.addEventListener('PF1_SYNC_HELPER_READY', handleAck);
    window.addEventListener('POST_TITLE_FETCHED', handleTitleFetched);
    window.addEventListener('FORUM_POST_SYNC_PROGRESS', handleProgress);
    window.addEventListener('FORUM_POSTS_SYNC_DONE', handleDone);

    return () => {
      window.removeEventListener('FORUM_SYNC_ACK', handleAck);
      document.removeEventListener('FORUM_SYNC_ACK', handleAck);
      window.removeEventListener('PF1_SYNC_HELPER_READY', handleAck);
      document.removeEventListener('PF1_SYNC_HELPER_READY', handleAck);
      window.removeEventListener('POST_TITLE_FETCHED', handleTitleFetched);
      window.removeEventListener('FORUM_POST_SYNC_PROGRESS', handleProgress);
      window.removeEventListener('FORUM_POSTS_SYNC_DONE', handleDone);
      cancelPendingBlurCommit();
      clearSyncTimer();
    };
  }, [isOpen]);

  // 针对本地绑定的楼层，未嗅探过则触发嗅探（独立于事件监听，避免监听器反复重订阅）
  useEffect(() => {
    if (!isOpen) return;
    localBindings.forEach(item => {
      if (item.msgId > 0 && !titlesRef.current[item.msgId] && !loadingTitlesRef.current[item.msgId]) {
        setLoadingTitles(prev => ({ ...prev, [item.msgId]: true }));
        loadingTitlesRef.current = { ...loadingTitlesRef.current, [item.msgId]: true };
        window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId: item.msgId } }));
      }
    });
  }, [isOpen, localBindings]);

  // 无编辑态时按 Escape 关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Radix Popover（下拉菜单）内部已处理 Escape 并 preventDefault，此处跳过避免连带关弹窗
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && !activeEditingRef.current) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titlePresets = [...BUILTIN_TITLE_PRESETS, ...customTitlePresets];
  const subtitlePresets = [...BUILTIN_SUBTITLE_PRESETS, ...customSubtitlePresets];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('editor.forum_sync.modal_title', '纯美苹果园帖子自动化定点同步')}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 flex flex-col gap-3 max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部标题 */}
        <ModalHeader t={t} onClose={onClose} />

        {/* 未检测到油猴助手提示条 */}
        {showHelperTip && (
          <HelperTipBanner t={t} />
        )}

        {/* 导出模板选择：绑定 id 随人物卡保存；模板被删时导出自动逐级回退（系统设置 → 内置默认） */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-xs font-bold text-stone-600 shrink-0">{t('editor.forum_sync.export_template_label', '导出模板')}</span>
          <Combobox
            options={[
              { value: '', label: t('editor.forum_sync.export_template_follow_system', '跟随系统设置') },
              ...bbcodeTemplates.map(tpl => ({ value: tpl.id, label: tpl.name }))
            ]}
            value={data.exportTemplateId || ''}
            onSelect={(v) => update('exportTemplateId', String(v))}
            allowCustom={false}
            className="flex-1 min-w-0 text-sm text-stone-800 border border-stone-200 rounded-lg bg-white"
            placeholder={data.exportTemplateId
              ? (bbcodeTemplates.find(tpl => tpl.id === data.exportTemplateId)?.name || t('editor.forum_sync.export_template_follow_system', '跟随系统设置'))
              : t('editor.forum_sync.export_template_follow_system', '跟随系统设置')}
          />
        </div>

        {/* 绑定的楼层列表（中段可滚动，头尾固定） */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          <BindingsList
            t={t}
            localBindings={localBindings}
            titles={titles}
            descriptions={descriptions}
            loadingTitles={loadingTitles}
            statuses={statuses}
            titlePresets={titlePresets}
            subtitlePresets={subtitlePresets}
            activeEditing={activeEditing}
            activeInputRef={activeInputRef}
            data={data}
            computed={computed}
            onCopyBBCode={handleCopyWrappedBBCode}
            onAddCard={handleAddNewBlankCard}
            onUpdateLocal={handleUpdateLocal}
            onBeginEditing={handleBeginEditing}
            onFinishEditing={handleFinishEditing}
            onFieldFocus={handleFieldFocus}
            onFieldBlur={handleFieldBlur}
            onGateCancelPending={handleGateCancelPending}
            onGateScheduleFinish={handleGateScheduleFinish}
            onCancelEditing={handleCancelEditing}
            onCommitMsgId={handleCommitMsgId}
            onDeleteCard={handleDeleteCard}
            onRefreshTitle={handleRefreshTitle}
            onApplyPreset={handleApplyPreset}
            onSaveCustomPreset={handleSaveCustomPreset}
          />
        </div>

        {/* 底部操作栏 */}
        <ModalFooter
          t={t}
          isSyncing={isSyncing}
          localBindings={localBindings}
          onClose={onClose}
          onTriggerSync={handleTriggerSync}
        />
      </div>
    </div>
  );
};

export default ForumSyncModal;

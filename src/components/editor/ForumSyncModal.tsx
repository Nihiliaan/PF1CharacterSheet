/**
 * 论坛同步弹窗容器组件：
 * 负责全部状态编排（本地绑定草稿、预设管理、油猴嗅探/同步事件监听与各操作回调）
 * 以及弹窗整体布局；各 UI 块拆分至同目录 ForumSyncModal/ 子组件，通过 props 传入数据与回调。
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { ForumBindingItem, ForumBinding } from '../../schema/types';
import { getCharacterBBCode } from '../../utils/bbcodeExporter';
import { triggerForumSync } from '../../utils/forumSyncHelper';
import {
  PostStatus, TemplatePreset, EditingTarget,
  STORAGE_KEY_TITLE_PRESETS, STORAGE_KEY_SUBTITLE_PRESETS,
  BUILTIN_TITLE_PRESETS, BUILTIN_SUBTITLE_PRESETS,
  extractMsgIdFromInput
} from './ForumSyncModal/shared';
import ModalHeader from './ForumSyncModal/ModalHeader';
import HelperTipBanner from './ForumSyncModal/HelperTipBanner';
import TemplateToolbar from './ForumSyncModal/TemplateToolbar';
import BindingsList from './ForumSyncModal/BindingsList';
import ModalFooter from './ForumSyncModal/ModalFooter';

interface ForumSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForumSyncModal: React.FC<ForumSyncModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { data, update, computed } = useCharacter();
  const { setToast } = useUI();

  // 本地独立草稿状态（纯本地维护，键盘打字与点击宏绝不触发人物卡全局重算，彻底消灭卡顿）
  const [localBindings, setLocalBindings] = useState<ForumBindingItem[]>([]);

  // 当前处于编辑态的定位指针: { index: number, field: 'msgId' | 'titleTemplate' | 'subtitleTemplate' } | null
  const [activeEditing, setActiveEditing] = useState<EditingTarget | null>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showHelperTip, setShowHelperTip] = useState(false);

  // 预设下拉与保存
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);

  const [customTitlePresets, setCustomTitlePresets] = useState<TemplatePreset[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TITLE_PRESETS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const [customSubtitlePresets, setCustomSubtitlePresets] = useState<TemplatePreset[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUBTITLE_PRESETS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // 嗅探到的原帖主标题与副标题
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [loadingTitles, setLoadingTitles] = useState<Record<number, boolean>>({});
  const [statuses, setStatuses] = useState<Record<number, PostStatus>>({});

  const syncTimerRef = useRef<any>(null);

  // 初始化本地绑定项
  useEffect(() => {
    if (!isOpen) return;
    const raw: ForumBinding[] = Array.isArray(data.forumBindings) ? data.forumBindings : [];
    const normalized: ForumBindingItem[] = raw.map((b: any) => {
      if (typeof b === 'number') {
        return { msgId: b, titleTemplate: '', subtitleTemplate: '' };
      }
      return {
        msgId: b.msgId,
        titleTemplate: b.titleTemplate || '',
        subtitleTemplate: b.subtitleTemplate || ''
      };
    }).filter((b: any) => typeof b.msgId === 'number' && !isNaN(b.msgId) && b.msgId > 0);

    setLocalBindings(normalized);
  }, [isOpen, data.forumBindings]);

  // 只有在失焦或删除时，才一次性持久化至全局人物卡状态
  const commitToGlobal = (itemsToCommit: ForumBindingItem[]) => {
    update('forumBindings', itemsToCommit);
  };

  // 监听来自油猴脚本的事件
  useEffect(() => {
    if (!isOpen) return;

    const handleAck = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
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
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
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
    };

    const handleDone = () => {
      setIsSyncing(false);
      setToast({ message: t('editor.forum_sync.all_done', '论坛帖子同步完成！'), type: 'success' });
    };

    window.addEventListener('FORUM_SYNC_ACK', handleAck);
    document.addEventListener('FORUM_SYNC_ACK', handleAck);
    window.addEventListener('PF1_SYNC_HELPER_READY', handleAck);
    document.addEventListener('PF1_SYNC_HELPER_READY', handleAck);
    window.addEventListener('POST_TITLE_FETCHED', handleTitleFetched);
    window.addEventListener('FORUM_POST_SYNC_PROGRESS', handleProgress);
    window.addEventListener('FORUM_POSTS_SYNC_DONE', handleDone);

    // 针对本地绑定的楼层，未嗅探过则触发嗅探
    localBindings.forEach(item => {
      if (item.msgId > 0 && !titles[item.msgId] && !loadingTitles[item.msgId]) {
        setLoadingTitles(prev => ({ ...prev, [item.msgId]: true }));
        window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId: item.msgId } }));
      }
    });

    return () => {
      window.removeEventListener('FORUM_SYNC_ACK', handleAck);
      document.removeEventListener('FORUM_SYNC_ACK', handleAck);
      window.removeEventListener('PF1_SYNC_HELPER_READY', handleAck);
      document.removeEventListener('PF1_SYNC_HELPER_READY', handleAck);
      window.removeEventListener('POST_TITLE_FETCHED', handleTitleFetched);
      window.removeEventListener('FORUM_POST_SYNC_PROGRESS', handleProgress);
      window.removeEventListener('FORUM_POSTS_SYNC_DONE', handleDone);
    };
  }, [isOpen, localBindings, titles, loadingTitles, setToast, t]);

  if (!isOpen) return null;

  const characterId = data.id || 'default_id';

  // 复制带双锚点的 BBCode
  const handleCopyWrappedBBCode = () => {
    const rawBBCode = getCharacterBBCode(data, computed, t);
    const wrapped = `[anchor=${characterId}-start][/anchor]\n${rawBBCode}\n[anchor=${characterId}-end][/anchor]`;
    navigator.clipboard.writeText(wrapped);
    setToast({
      message: `已复制带 [anchor=${characterId}-start] 与 [anchor=${characterId}-end] 锚点的完整卡片！在果园新发帖粘贴即可。`,
      type: 'success'
    });
  };

  // 添加一张新空白卡片，直接聚焦到编号输入框
  const handleAddNewBlankCard = () => {
    const newBlankItem: ForumBindingItem = {
      msgId: 0,
      titleTemplate: '',
      subtitleTemplate: ''
    };
    const next = [...localBindings, newBlankItem];
    setLocalBindings(next);
    setActiveEditing({ index: next.length - 1, field: 'msgId' });
  };

  // 局部更新文本（纯本地更新，绝不触发全卡重算）
  const handleUpdateLocal = (index: number, field: keyof ForumBindingItem, val: any) => {
    const next = [...localBindings];
    next[index] = { ...next[index], [field]: val };
    setLocalBindings(next);
  };

  // 失焦完成编辑：切回展示态，并将修改统一提交至人物卡
  const handleFinishEditing = () => {
    setActiveEditing(null);
    commitToGlobal(localBindings.filter(b => b.msgId > 0));
  };

  // 修改编号失焦时
  const handleCommitMsgId = (index: number, rawInput: string) => {
    const num = extractMsgIdFromInput(rawInput) || 0;
    const next = [...localBindings];
    next[index] = { ...next[index], msgId: num };
    setLocalBindings(next);
    commitToGlobal(next.filter(b => b.msgId > 0));
    setActiveEditing(null);

    if (num > 0) {
      setLoadingTitles(prev => ({ ...prev, [num]: true }));
      window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId: num } }));
    }
  };

  // 删除卡片
  const handleDeleteCard = (index: number) => {
    const next = localBindings.filter((_, i) => i !== index);
    setLocalBindings(next);
    commitToGlobal(next.filter(b => b.msgId > 0));
    setActiveEditing(null);
  };

  // 重新嗅探
  const handleRefreshTitle = (msgId: number) => {
    if (!msgId) return;
    setLoadingTitles(prev => ({ ...prev, [msgId]: true }));
    window.dispatchEvent(new CustomEvent('FETCH_POST_TITLE', { detail: { msgId } }));
    setToast({ message: `正在重新嗅探楼层 #${msgId} 标题与副标题...`, type: 'info' });
  };

  // 核心功能：在当前光标处插入特定文字（纯本地极速计算，零全局开销，毫秒级响应）
  const handleInsertTextAtCursor = (textToInsert: string) => {
    if (!activeEditing || activeEditing.field === 'msgId') {
      if (localBindings.length > 0) {
        // 默认插入第0项的副标题末尾
        const cur = localBindings[0].subtitleTemplate || '';
        const updated = cur ? `${cur} ${textToInsert}` : textToInsert;
        handleUpdateLocal(0, 'subtitleTemplate', updated);
        setActiveEditing({ index: 0, field: 'subtitleTemplate' });
        setToast({ message: `已在副标题末尾插入「${textToInsert}」`, type: 'info' });
        return;
      }
      setToast({ message: '请先点击要编辑的主标题或副标题', type: 'info' });
      return;
    }

    const { index, field } = activeEditing;
    const input = activeInputRef.current;
    const curVal = localBindings[index][field] || '';

    let newVal = curVal;
    let nextCursor = 0;

    if (input) {
      const start = input.selectionStart ?? curVal.length;
      const end = input.selectionEnd ?? curVal.length;
      newVal = curVal.substring(0, start) + textToInsert + curVal.substring(end);
      nextCursor = start + textToInsert.length;
    } else {
      newVal = curVal ? `${curVal} ${textToInsert}` : textToInsert;
      nextCursor = newVal.length;
    }

    handleUpdateLocal(index, field, newVal);

    requestAnimationFrame(() => {
      if (activeInputRef.current) {
        activeInputRef.current.focus();
        activeInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  // 核心功能：选择模板将输入框内容更新为模板内容（纯本地覆盖，零卡顿）
  const handleApplyPresetTemplate = (preset: TemplatePreset) => {
    const targetIdx = activeEditing && activeEditing.field !== 'msgId' ? activeEditing.index : 0;
    const targetField = activeEditing && activeEditing.field !== 'msgId' ? activeEditing.field : 'subtitleTemplate';

    if (localBindings.length === 0) {
      setToast({ message: '请先添加绑定卡片', type: 'info' });
      return;
    }

    handleUpdateLocal(targetIdx, targetField, preset.template);
    setActiveEditing({ index: targetIdx, field: targetField });
    setShowPresetMenu(false);
    setToast({ message: `已载入模板: ${preset.label}`, type: 'success' });

    requestAnimationFrame(() => {
      if (activeInputRef.current) {
        activeInputRef.current.focus();
        activeInputRef.current.setSelectionRange(preset.template.length, preset.template.length);
      }
    });
  };

  // 存为自建预设
  const handleSaveCustomPreset = () => {
    if (!activeEditing || activeEditing.field === 'msgId') {
      setToast({ message: '请先点击要保存的主标题或副标题输入框', type: 'error' });
      return;
    }

    const trimmedName = savePresetName.trim();
    if (!trimmedName) {
      setToast({ message: '请输入预设名称', type: 'error' });
      return;
    }

    const { index, field } = activeEditing;
    const val = (localBindings[index][field] || '').trim();
    if (!val) {
      setToast({ message: '当前内容为空，无法保存为预设', type: 'error' });
      return;
    }

    const isTitle = field === 'titleTemplate';
    const newPreset: TemplatePreset = {
      id: `custom-${Date.now()}`,
      label: trimmedName,
      template: val,
      isCustom: true
    };

    if (isTitle) {
      const nextList = [...customTitlePresets, newPreset];
      setCustomTitlePresets(nextList);
      try { localStorage.setItem(STORAGE_KEY_TITLE_PRESETS, JSON.stringify(nextList)); } catch {}
    } else {
      const nextList = [...customSubtitlePresets, newPreset];
      setCustomSubtitlePresets(nextList);
      try { localStorage.setItem(STORAGE_KEY_SUBTITLE_PRESETS, JSON.stringify(nextList)); } catch {}
    }

    setShowSavePresetInput(false);
    setSavePresetName('');
    setToast({ message: `自建模板「${trimmedName}」已保存`, type: 'success' });
  };

  // 触发一键同步
  const handleTriggerSync = () => {
    // 强制先失焦提交所有本地变更
    commitToGlobal(localBindings.filter(b => b.msgId > 0));

    const validItems = localBindings.filter(b => b.msgId > 0);
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
      bindings: validItems,
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

  const isCurrentEditingTitle = activeEditing?.field === 'titleTemplate';
  const availablePresets = isCurrentEditingTitle
    ? [...BUILTIN_TITLE_PRESETS, ...customTitlePresets]
    : [...BUILTIN_SUBTITLE_PRESETS, ...customSubtitlePresets];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
        {/* 头部标题与说明 */}
        <ModalHeader t={t} characterId={characterId} onClose={onClose} />

        {/* 未检测到油猴助手提示条 */}
        {showHelperTip && (
          <HelperTipBanner />
        )}

        {/* 顶部辅助工具栏（onMouseDown 阻止失焦，在光标处秒速插入文字） */}
        <TemplateToolbar
          activeEditing={activeEditing}
          localBindings={localBindings}
          showPresetMenu={showPresetMenu}
          showSavePresetInput={showSavePresetInput}
          savePresetName={savePresetName}
          availablePresets={availablePresets}
          onTogglePresetMenu={() => setShowPresetMenu(!showPresetMenu)}
          onToggleSavePresetInput={() => setShowSavePresetInput(!showSavePresetInput)}
          onChangeSavePresetName={setSavePresetName}
          onApplyPreset={handleApplyPresetTemplate}
          onSaveCustomPreset={handleSaveCustomPreset}
          onCancelSavePreset={() => setShowSavePresetInput(false)}
          onInsertTextAtCursor={handleInsertTextAtCursor}
        />

        {/* 绑定的楼层列表（完全遵循 DynamicInput 规范：平时纯净静态文本，点上去即可就地编辑，未输入时展示真实原帖标题） */}
        <BindingsList
          t={t}
          localBindings={localBindings}
          titles={titles}
          descriptions={descriptions}
          loadingTitles={loadingTitles}
          statuses={statuses}
          activeEditing={activeEditing}
          setActiveEditing={setActiveEditing}
          activeInputRef={activeInputRef}
          data={data}
          computed={computed}
          onCopyBBCode={handleCopyWrappedBBCode}
          onAddCard={handleAddNewBlankCard}
          onUpdateLocal={handleUpdateLocal}
          onFinishEditing={handleFinishEditing}
          onCommitMsgId={handleCommitMsgId}
          onDeleteCard={handleDeleteCard}
          onRefreshTitle={handleRefreshTitle}
        />

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

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe, Plus, Trash2, ExternalLink, RefreshCw,
  CheckCircle2, AlertTriangle, X, Copy, DownloadCloud, Clock,
  BookmarkPlus, ChevronDown, Sparkles
} from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { ForumBindingItem, ForumBinding } from '../../schema/types';
import { getCharacterBBCode, renderTitleTemplate } from '../../utils/bbcodeExporter';
import { triggerForumSync } from '../../utils/forumSyncHelper';

interface ForumSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function extractMsgIdFromInput(inputStr: string): number | null {
  const trimmed = inputStr.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return num > 0 ? num : null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      const searchNormalized = (parsedUrl.search || '').replace(/^\?/, '').replace(/;/g, '&');
      const searchParams = new URLSearchParams(searchNormalized);

      if (searchParams.has('msg')) {
        const val = parseInt(searchParams.get('msg') || '', 10);
        if (val > 0) return val;
      }

      const topicParam = searchParams.get('topic') || '';
      const topicMsgMatch = topicParam.match(/\.msg(\d+)/i);
      if (topicMsgMatch) {
        const val = parseInt(topicMsgMatch[1], 10);
        if (val > 0) return val;
      }

      const hash = parsedUrl.hash || '';
      const hashMatch = hash.match(/^#msg_?(\d+)$/i);
      if (hashMatch) {
        const val = parseInt(hashMatch[1], 10);
        if (val > 0) return val;
      }
    } catch {}
  }

  const fallbackMatch = trimmed.match(/msg[=_#]?(\d+)/i);
  if (fallbackMatch) {
    const val = parseInt(fallbackMatch[1], 10);
    if (val > 0) return val;
  }

  return null;
}

interface PostStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  lastSyncedAt?: string;
}

interface TemplatePreset {
  id: string;
  label: string;
  template: string;
  isCustom?: boolean;
}

const STORAGE_KEY_TITLE_PRESETS = 'pf1_forum_title_presets';
const STORAGE_KEY_SUBTITLE_PRESETS = 'pf1_forum_subtitle_presets';

// 内置推荐模板
const BUILTIN_TITLE_PRESETS: TemplatePreset[] = [
  { id: 't-name', label: '纯角色名', template: '{{name}}' },
  { id: 't-pc-level', label: '前缀+名字+等级', template: '[PC] {{name}} (Lv.{{basic.level}})' },
  { id: 't-name-class', label: '名字 - 职业', template: '{{name}} - {{basic.classes}}' },
  { id: 't-original', label: '保留原帖标题', template: '{{originalTitle}}' }
];

const BUILTIN_SUBTITLE_PRESETS: TemplatePreset[] = [
  { id: 's-pfs-basic', label: '跑团基础 (职业 等级 经验)', template: '{{basic.classes}} {{basic.level}}级 {{pfs.xp}}xp' },
  { id: 's-pfs-full', label: 'PFS档案 (英文名 编号)', template: '{{name}}（Nihilia {{pfs.playerNumber}}-{{pfs.characterNumber}}）' },
  { id: 's-pfs-detailed', label: '详尽战绩 (等级 经验 声誉)', template: 'Lv.{{basic.level}} {{basic.classes}} [{{pfs.xp}} XP / {{pfs.prestige}} PP]' },
  { id: 's-original', label: '保留原帖副标题', template: '{{originalSubtitle}}' }
];

const MACRO_TAGS = [
  { tag: '{{name}}', label: '角色名' },
  { tag: '{{basic.classes}}', label: '职业' },
  { tag: '{{basic.level}}', label: '等级' },
  { tag: '{{pfs.xp}}', label: '经验' },
  { tag: '{{pfs.fame}}', label: '名望' },
  { tag: '{{pfs.prestige}}', label: '声誉' },
  { tag: '{{originalTitle}}', label: '原主标题' },
  { tag: '{{originalSubtitle}}', label: '原副标题' }
];

export const ForumSyncModal: React.FC<ForumSyncModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { data, update, computed } = useCharacter();
  const { setToast } = useUI();

  // 本地独立草稿状态（纯本地维护，键盘打字与点击宏绝不触发人物卡全局重算，彻底消灭卡顿）
  const [localBindings, setLocalBindings] = useState<ForumBindingItem[]>([]);

  // 当前处于编辑态的定位指针: { index: number, field: 'msgId' | 'titleTemplate' | 'subtitleTemplate' } | null
  const [activeEditing, setActiveEditing] = useState<{ index: number; field: 'msgId' | 'titleTemplate' | 'subtitleTemplate' } | null>(null);
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
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
              <Globe size={16} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                {t('editor.forum_sync.modal_title', '纯美苹果园帖子自动化定点同步')}
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.2">
                基于天然 ID <code className="bg-stone-100 px-1 py-0.2 rounded text-amber-900 font-mono">[anchor={characterId}-start]</code> 与 <code className="bg-stone-100 px-1 py-0.2 rounded text-amber-900 font-mono">[anchor={characterId}-end]</code> 定点更新
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* 未检测到油猴助手提示条 */}
        {showHelperTip && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">未检测到同步助手响应</p>
                <p className="text-stone-600 text-[11px] mt-0.5">
                  请确认浏览器已安装并启用《PF1 人物卡跨站同步助手》（v1.4.0+），且当前浏览器已登录纯美苹果园。
                </p>
              </div>
            </div>
            <a
              href="/scripts/pf1-cross-site-sync-helper.user.js"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <DownloadCloud size={12} />
              <span>一键安装/更新脚本</span>
            </a>
          </div>
        )}

        {/* 顶部辅助工具栏（onMouseDown 阻止失焦，在光标处秒速插入文字） */}
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
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="px-2 py-0.5 text-[11px] font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Sparkles size={11} className="text-amber-700" />
                <span>载入模板预设</span>
                <ChevronDown size={11} className="text-stone-400" />
              </button>

              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setShowSavePresetInput(!showSavePresetInput)}
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
                      onClick={() => handleApplyPresetTemplate(p)}
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
                        onClick={() => handleApplyPresetTemplate(cp)}
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
                onChange={e => setSavePresetName(e.target.value)}
                placeholder="例如：极简副标题..."
                className="flex-1 px-2 py-0.5 text-xs text-stone-900 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-amber-600"
              />
              <button
                type="button"
                onClick={handleSaveCustomPreset}
                className="px-2.5 py-0.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setShowSavePresetInput(false)}
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
                onClick={() => handleInsertTextAtCursor(m.tag)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 transition-colors cursor-pointer shadow-2xs"
                title={`在光标处插入 ${m.label}`}
              >
                {m.tag} <span className="text-stone-400 font-sans text-[9px]">({m.label})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 绑定的楼层列表（完全遵循 DynamicInput 规范：平时纯净静态文本，点上去即可就地编辑，未输入时展示真实原帖标题） */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>{t('editor.forum_sync.bound_posts_list', '已绑定的果园楼层')}</span>
              <span className="text-stone-400 font-normal">({localBindings.filter(b => b.msgId > 0).length})</span>
            </h4>
            <button
              type="button"
              onClick={handleCopyWrappedBBCode}
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
              {localBindings.map((item, index) => {
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
                    key={index}
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
                              onBlur={e => handleCommitMsgId(index, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleCommitMsgId(index, (e.target as HTMLInputElement).value);
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
                            onClick={() => handleRefreshTitle(id)}
                            disabled={isLoading}
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                            title="重新嗅探此楼层标题与副标题"
                          >
                            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(index)}
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
                            onChange={e => handleUpdateLocal(index, 'titleTemplate', e.target.value)}
                            onBlur={handleFinishEditing}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleFinishEditing();
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
                            onChange={e => handleUpdateLocal(index, 'subtitleTemplate', e.target.value)}
                            onBlur={handleFinishEditing}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleFinishEditing();
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
              })}
            </div>
          )}

          {/* 新建空白卡片按钮 */}
          <button
            type="button"
            onClick={handleAddNewBlankCard}
            className="w-full py-1.5 border border-dashed border-stone-300 hover:border-amber-600 hover:bg-amber-50/50 rounded-lg text-xs font-medium text-stone-600 hover:text-amber-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>+ 添加果园楼层绑定卡片</span>
          </button>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
          <a
            href="/scripts/pf1-cross-site-sync-helper.user.js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-500 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <DownloadCloud size={12} />
            <span>安装/更新油猴助手脚本 (v1.4.0)</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
            >
              {t('common.cancel', '关闭')}
            </button>
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing || localBindings.filter(b => b.msgId > 0).length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
              <span>
                {isSyncing ? '正在批量定点同步...' : t('editor.forum_sync.sync_now_btn', '一键定点同步')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumSyncModal;

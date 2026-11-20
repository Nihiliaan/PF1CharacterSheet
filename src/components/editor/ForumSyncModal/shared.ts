/**
 * ForumSyncModal 子组件共用的类型、常量与小工具函数
 */
import { ForumBindingItem } from '../../../schema/types';

export interface PostStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  lastSyncedAt?: string;
}

export interface TemplatePreset {
  id: string;
  /** 内置预设的展示名走 i18n；自建预设用用户输入的 label */
  labelKey?: string;
  label?: string;
  template: string;
  isCustom?: boolean;
}

// 当前处于编辑态的定位指针
export type EditingField = 'msgId' | 'titleTemplate' | 'subtitleTemplate';
export interface EditingTarget {
  index: number;
  field: EditingField;
}

// 本地草稿绑定项：携带仅存在于弹窗内存中的稳定 uid（用于 React key 与编辑定位），提交全局状态时剥离
export type LocalBinding = ForumBindingItem & { uid: string };

let uidSeq = 0;
export function makeUid(): string {
  uidSeq += 1;
  return `local-uid-${uidSeq}`;
}

// 剥离 uid，还原为可持久化的纯绑定项
export function toPlainBinding(item: LocalBinding): ForumBindingItem {
  const { uid: _uid, ...rest } = item;
  return rest;
}

export function extractMsgIdFromInput(inputStr: string): number | null {
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

export const STORAGE_KEY_TITLE_PRESETS = 'pf1_forum_title_presets';
export const STORAGE_KEY_SUBTITLE_PRESETS = 'pf1_forum_subtitle_presets';

// 内置推荐模板（labelKey → editor.forum_sync.* 文案）
export const BUILTIN_TITLE_PRESETS: TemplatePreset[] = [
  { id: 't-name', labelKey: 'preset_builtin_plain_name', template: '{{name}}' },
  { id: 't-pc-level', labelKey: 'preset_builtin_pc_level', template: '[PC] {{name}} (Lv.{{basic.level}})' },
  { id: 't-name-class', labelKey: 'preset_builtin_name_class', template: '{{name}} - {{basic.classes}}' },
  { id: 't-original', labelKey: 'preset_builtin_keep_title', template: '{{originalTitle}}' }
];

export const BUILTIN_SUBTITLE_PRESETS: TemplatePreset[] = [
  { id: 's-pfs-basic', labelKey: 'preset_builtin_pfs_basic', template: '{{basic.classes}} {{basic.level}}级 {{pfs.xp}}xp' },
  { id: 's-pfs-full', labelKey: 'preset_builtin_pfs_full', template: '{{name}}（Nihilia {{pfs.playerNumber}}-{{pfs.characterNumber}}）' },
  { id: 's-pfs-detailed', labelKey: 'preset_builtin_pfs_detailed', template: 'Lv.{{basic.level}} {{basic.classes}} [{{pfs.xp}} XP / {{pfs.prestige}} PP]' },
  { id: 's-original', labelKey: 'preset_builtin_keep_subtitle', template: '{{originalSubtitle}}' }
];

// 宏变量表：labelKey 指向 i18n 文案，供 {{ 自动补全菜单展示
export const MACRO_TAGS = [
  { tag: '{{name}}', labelKey: 'macro_name' },
  { tag: '{{basic.classes}}', labelKey: 'macro_classes' },
  { tag: '{{basic.level}}', labelKey: 'macro_level' },
  { tag: '{{pfs.xp}}', labelKey: 'macro_xp' },
  { tag: '{{pfs.fame}}', labelKey: 'macro_fame' },
  { tag: '{{pfs.prestige}}', labelKey: 'macro_prestige' },
  { tag: '{{originalTitle}}', labelKey: 'macro_original_title' },
  { tag: '{{originalSubtitle}}', labelKey: 'macro_original_subtitle' }
] as const;

// 存为预设伪选项的专用 value（Combobox 内以此触发保存流程）
export const SAVE_AS_PRESET_VALUE = '__save_as_preset__';

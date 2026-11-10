/**
 * ForumSyncModal 子组件共用的类型、常量与小工具函数
 * 仅作纯搬移，不含任何 UI 与状态逻辑
 */

export interface PostStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  lastSyncedAt?: string;
}

export interface TemplatePreset {
  id: string;
  label: string;
  template: string;
  isCustom?: boolean;
}

// 当前处于编辑态的定位指针
export type EditingField = 'msgId' | 'titleTemplate' | 'subtitleTemplate';
export interface EditingTarget {
  index: number;
  field: EditingField;
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

// 内置推荐模板
export const BUILTIN_TITLE_PRESETS: TemplatePreset[] = [
  { id: 't-name', label: '纯角色名', template: '{{name}}' },
  { id: 't-pc-level', label: '前缀+名字+等级', template: '[PC] {{name}} (Lv.{{basic.level}})' },
  { id: 't-name-class', label: '名字 - 职业', template: '{{name}} - {{basic.classes}}' },
  { id: 't-original', label: '保留原帖标题', template: '{{originalTitle}}' }
];

export const BUILTIN_SUBTITLE_PRESETS: TemplatePreset[] = [
  { id: 's-pfs-basic', label: '跑团基础 (职业 等级 经验)', template: '{{basic.classes}} {{basic.level}}级 {{pfs.xp}}xp' },
  { id: 's-pfs-full', label: 'PFS档案 (英文名 编号)', template: '{{name}}（Nihilia {{pfs.playerNumber}}-{{pfs.characterNumber}}）' },
  { id: 's-pfs-detailed', label: '详尽战绩 (等级 经验 声誉)', template: 'Lv.{{basic.level}} {{basic.classes}} [{{pfs.xp}} XP / {{pfs.prestige}} PP]' },
  { id: 's-original', label: '保留原帖副标题', template: '{{originalSubtitle}}' }
];

export const MACRO_TAGS = [
  { tag: '{{name}}', label: '角色名' },
  { tag: '{{basic.classes}}', label: '职业' },
  { tag: '{{basic.level}}', label: '等级' },
  { tag: '{{pfs.xp}}', label: '经验' },
  { tag: '{{pfs.fame}}', label: '名望' },
  { tag: '{{pfs.prestige}}', label: '声誉' },
  { tag: '{{originalTitle}}', label: '原主标题' },
  { tag: '{{originalSubtitle}}', label: '原副标题' }
];

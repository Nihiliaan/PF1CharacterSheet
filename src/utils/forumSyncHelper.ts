import { CharacterData, ForumBindingItem } from '../schema/types';
import { getCharacterBBCode, renderTitleTemplate } from './bbcodeExporter';

export interface ForumSyncOptions {
  bindings?: ForumBindingItem[];
  titles?: Record<number, string>;
  descriptions?: Record<number, string>;
}

/**
 * 统一的纯美苹果园论坛帖子同步业务入口
 * 手动同步（弹窗一键同步）与自动同步（保存触发）唯一调用此函数
 */
export function triggerForumSync(
  data: CharacterData,
  computed: any,
  t: (key: string, defaultValue?: string) => string,
  options?: ForumSyncOptions
): boolean {
  const rawBindings = options?.bindings || (Array.isArray(data.forumBindings) ? data.forumBindings : []);
  if (rawBindings.length === 0) {
    return false;
  }

  const boundItems: ForumBindingItem[] = rawBindings.map((b: any) => {
    if (typeof b === 'number') {
      return { msgId: b, titleTemplate: '', subtitleTemplate: '' };
    }
    return {
      msgId: b.msgId,
      titleTemplate: b.titleTemplate || '',
      subtitleTemplate: b.subtitleTemplate || '',
    };
  }).filter((b: any) => typeof b.msgId === 'number' && !isNaN(b.msgId) && b.msgId > 0);

  if (boundItems.length === 0) {
    return false;
  }

  const characterId = data.id || 'default_id';
  // 统一调用固定函数输出人物卡 BBCode，零防御、零重复实现
  const rawBBCode = getCharacterBBCode(data, computed, t);

  const postsPayload = boundItems.map((item) => {
    const origTitle = options?.titles?.[item.msgId] || '';
    const origSub = options?.descriptions?.[item.msgId] || '';

    const customSubject = item.titleTemplate?.trim()
      ? renderTitleTemplate(item.titleTemplate, data, t, { computed, data }, {
          originalTitle: origTitle,
          subject: origTitle,
          originalSubtitle: origSub,
          description: origSub,
        })
      : undefined;

    const customDescription = item.subtitleTemplate?.trim()
      ? renderTitleTemplate(item.subtitleTemplate, data, t, { computed, data }, {
          originalTitle: origTitle,
          subject: origTitle,
          originalSubtitle: origSub,
          description: origSub,
        })
      : undefined;

    return {
      msgId: item.msgId,
      customSubject,
      customDescription,
    };
  });

  const syncEvent = new CustomEvent('SYNC_FORUM_POSTS', {
    detail: {
      characterId,
      bbcode: rawBBCode,
      postIds: postsPayload,
      posts: postsPayload,
    },
  });

  window.dispatchEvent(syncEvent);
  if (typeof document !== 'undefined') {
    document.dispatchEvent(syncEvent);
  }

  return true;
}

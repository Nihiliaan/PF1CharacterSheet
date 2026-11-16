/**
 * 人物卡 BBCode 导出模板解析器（单一收敛点）
 *
 * 三级回退链（逐级在模板缓存中查证，miss 则下沉）：
 *   1. 人物卡绑定 id（data.exportTemplateId）
 *   2. 系统设置默认模板（settings.export.defaultTemplateId）
 *   3. 网站内置默认模板（DEFAULT_BBCODE_TEMPLATE）
 *
 * 模板缓存由 VaultContext（useVaultSync）注册：档案库模板列表变化时全量刷新，
 * 使解析器可在任意非 React 上下文（bbcodeExporter / 论坛同步 helper）中同步取用。
 * 缓存 miss 即视为该 id 不可用（模板已删除），结构性回退，无需任何清理动作。
 */
import { CharacterData } from '../schema/types';
import { DEFAULT_BBCODE_TEMPLATE } from '../constants/index';
import { getStoredSettings } from '../contexts/SettingsContext';

/** id → 模板内容；由 VaultContext 注册，未注册（未登录 / 档案库未加载）时为空 */
let cacheProvider: (() => Map<string, string>) | null = null;

export function setTemplateCacheProvider(provider: () => Map<string, string>): void {
  cacheProvider = provider;
}

/** 按 id 从缓存取模板内容；provider 未注册或 id 查证失败返回 null */
function getTemplateContentById(id: string): string | null {
  if (!id || !cacheProvider) return null;
  return cacheProvider().get(id) ?? null;
}

/**
 * 解析当前人物卡导出用的模板内容（唯一业务入口）
 * 所有 BBCode 导出（剪贴板复制 / 论坛同步 / 导出弹窗）统一经此获取模板
 */
export function resolveExportTemplate(data: CharacterData): string {
  return (
    getTemplateContentById(data.exportTemplateId || '') ||
    getTemplateContentById(getStoredSettings().export.defaultTemplateId || '') ||
    DEFAULT_BBCODE_TEMPLATE
  );
}

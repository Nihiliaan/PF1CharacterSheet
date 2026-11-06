import { TemplateDefinition } from './types';
import badgeSvg from './svg/badge.svgt?raw';
import parchmentSvg from './svg/parchment.svgt?raw';
import darkSvg from './svg/tactical-dark.svgt?raw';
import defaultBbc from './bbcode/default.bbc?raw';
import compactBbc from './bbcode/compact.bbc?raw';

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'svg-badge',
    name: '紧凑签名名片',
    type: 'svg',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    description: '460px 宽的紧凑信息卡，适合论坛签名档或跟帖展示，包含头像、核心防御与六维。',
    defaultWidth: 540,
    defaultHeight: 250,
    source: badgeSvg
  },
  {
    id: 'svg-parchment',
    name: '经典羊皮纸图鉴卡',
    type: 'svg',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    description: 'Pathfinder 官方图鉴风格的暖色羊皮纸卡片，双栏排版，数据全面详实。',
    defaultWidth: 660,
    defaultHeight: 490,
    source: parchmentSvg
  },
  {
    id: 'svg-dark',
    name: '暗黑战术高对比卡',
    type: 'svg',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    description: '深黑与荧光金配色的战术仪表盘卡，高对比度视觉冲击力，极具现代感。',
    defaultWidth: 600,
    defaultHeight: 300,
    source: darkSvg
  },
  {
    id: 'bbcode-default',
    name: '纯美苹果园标准完整排版',
    type: 'bbcode',
    extension: 'bbc',
    mimeType: 'text/plain',
    description: '经典全内容 BBCode 导出，包含基本信息、技能、专长、法术、装备与 PFS 记录单。',
    source: defaultBbc
  },
  {
    id: 'bbcode-compact',
    name: '战斗速查简明版',
    type: 'bbcode',
    extension: 'bbc',
    mimeType: 'text/plain',
    description: '仅包含 AC、HP、豁免、六维与主要攻击的简短排版，适合回帖报点。',
    source: compactBbc
  }
];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'pf1_custom_templates';

export function getCustomTemplates(): TemplateDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('[TemplateRegistry] Failed to load custom templates from localStorage', e);
    return [];
  }
}

export function saveCustomTemplate(template: TemplateDefinition): void {
  try {
    const list = getCustomTemplates();
    const index = list.findIndex(t => t.id === template.id);
    if (index >= 0) {
      list[index] = { ...template, isCustom: true };
    } else {
      list.push({ ...template, isCustom: true });
    }
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[TemplateRegistry] Failed to save custom template', e);
  }
}

export function deleteCustomTemplate(id: string): void {
  try {
    const list = getCustomTemplates().filter(t => t.id !== id);
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[TemplateRegistry] Failed to delete custom template', e);
  }
}

export function getAllTemplates(): TemplateDefinition[] {
  return [...BUILTIN_TEMPLATES, ...getCustomTemplates()];
}

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return getAllTemplates().find(t => t.id === id);
}

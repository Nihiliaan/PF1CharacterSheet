import { CharacterData } from '../schema/types';

export type TemplateType = 'svg' | 'bbcode';

export interface TemplateDefinition {
  id: string;               // 唯一天然标识符，如 'svg-badge', 'svg-parchment', 'bbcode-default'
  name: string;             // 人类可读名称
  type: TemplateType;       // 'svg' | 'bbcode'
  extension: 'svg' | 'bbc'; // 最终导出或渲染输出的扩展名
  mimeType: 'image/svg+xml' | 'text/plain';
  description: string;      // 描述用途
  source: string;           // 模板源代码（Handlebars 语法）
  defaultWidth?: number;    // SVG 默认宽度 (像素)
  defaultHeight?: number;   // SVG 默认高度 (像素)
  isCustom?: boolean;       // 是否为用户自定义模板
}

export interface RenderOptions {
  theme?: string;
  hideAvatar?: boolean;
  accentColor?: string;
  customTitle?: string;
  t?: (key: string, options?: any) => string;
  characterContext?: any;
}

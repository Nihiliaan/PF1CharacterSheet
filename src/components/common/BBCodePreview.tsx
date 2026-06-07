import React from 'react';
import BBCode from '@bbob/react';
import presetReact from '@bbob/preset-react';

interface BBCodePreviewProps {
  bbcode: string;
  className?: string;
}

/**
 * Custom SMF-style components for BBCode tags
 */
const SMFQuote = ({ author, children }: { author?: string; children: React.ReactNode }) => (
  <div className="mb-2">
    <div className="quoteheader">{author ? `引用自: ${author}` : '引用'}</div>
    <blockquote className="bbc_standard_quote">{children}</blockquote>
  </div>
);

const SMFCode = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div className="mb-2">
    <div className="codeheader">{label ? `代码 (${label})` : '代码'}</div>
    <pre className="bbc_code">{children}</pre>
  </div>
);

const SMFImage = ({ width, height, src }: { width?: string; height?: string; src?: string }) => (
  <img 
    src={src} 
    width={width} 
    height={height} 
    alt="" 
    className="bbc_img" 
    loading="lazy"
  />
);

/**
 * Extend the React preset to support SMF-specific behaviors and styling
 */
const smfPreset = presetReact.extend((tags) => ({
  ...tags,
  quote: (node) => ({
    ...node,
    tag: SMFQuote,
    attrs: { author: node.attrs.author || node.attrs.quote },
  }),
  code: (node) => ({
    ...node,
    tag: SMFCode,
    attrs: { label: node.attrs.code },
  }),
  img: (node) => {
    // 图片地址始终在内容中，属性用于控制宽高
    const src = Array.isArray(node.content) ? node.content.join('') : '';
    return {
      ...node,
      tag: SMFImage,
      attrs: { 
        ...node.attrs, 
        src: String(src).trim() 
      },
      content: null,
    };
  },
  url: (node) => {
    // 链接地址可能在属性中 [url=link] 或内容中 [url]link[/url]
    const href = node.attrs.url || Object.keys(node.attrs)[0] || (Array.isArray(node.content) ? node.content.join('') : '');
    return {
      ...node,
      tag: 'a',
      attrs: { 
        href: String(href).trim() || '#', 
        target: '_blank', 
        rel: 'noopener noreferrer', 
        className: 'bbc_link' 
      },
    };
  },
  size: (node) => {
    let fontSize = node.attrs.size;
    if (/^\d+$/.test(fontSize)) fontSize = `${fontSize}pt`;
    return {
      ...node,
      tag: 'span',
      attrs: { 
        style: { fontSize },
        className: 'bbc_size'
      },
    };
  },
  color: (node) => ({
    ...node,
    tag: 'span',
    attrs: { style: { color: node.attrs.color } },
  }),
  font: (node) => ({
    ...node,
    tag: 'span',
    attrs: { style: { fontFamily: node.attrs.font } },
  }),
  center: (node) => ({
    ...node,
    tag: 'div',
    attrs: { className: 'bbc_center' },
  }),
  left: (node) => ({
    ...node,
    tag: 'div',
    attrs: { className: 'bbc_left' },
  }),
  right: (node) => ({
    ...node,
    tag: 'div',
    attrs: { className: 'bbc_right' },
  }),
  table: (node) => ({
    ...node,
    tag: 'table',
    attrs: { className: 'bbc_table' },
  }),
  tr: (node) => ({ ...node, tag: 'tr' }),
  td: (node) => ({ ...node, tag: 'td' }),
  list: (node) => {
    const type = node.attrs.list;
    const isOrdered = ['1', 'a', 'A', 'i', 'I'].includes(type);
    const listStyleType = type === '1' ? 'decimal' : type === 'a' ? 'lower-alpha' : type === 'A' ? 'upper-alpha' : type === 'i' ? 'lower-roman' : type === 'I' ? 'upper-roman' : undefined;
    
    return {
      ...node,
      tag: isOrdered ? 'ol' : 'ul',
      attrs: { 
        className: 'bbc_list',
        style: listStyleType ? { listStyleType } : undefined 
      },
    };
  },
  li: (node) => ({ ...node, tag: 'li' }),
  '*': (node) => ({ ...node, tag: 'li' }),
  hr: (node) => ({ ...node, tag: 'hr', attrs: { className: 'bbc_hr' } }),
  u: (node) => ({ ...node, tag: 'span', attrs: { className: 'bbc_u' } }),
  s: (node) => ({ ...node, tag: 'del' }),
  shadow: (node) => {
    const [color] = (node.attrs.shadow || '').split(',');
    return {
      ...node,
      tag: 'span',
      attrs: { style: { textShadow: `2px 2px 2px ${color || 'gray'}` } },
    };
  },
  glow: (node) => {
    const [color, , strength] = (node.attrs.glow || '').split(',');
    return {
      ...node,
      tag: 'span',
      attrs: { style: { textShadow: `0 0 ${strength || '10px'} ${color || 'red'}` } },
    };
  },
  nobbc: (node) => ({
    ...node,
    tag: 'span',
    content: node.content, // Should ideally render raw, but bbob handles this
  }),
}));

const plugins = [smfPreset()];

/**
 * A component that parses and renders BBCode as HTML using bbob/react,
 * specifically styled to mimic SMF 2.1.4.
 */
export const BBCodePreview: React.FC<BBCodePreviewProps> = ({ bbcode, className }) => {
  if (!bbcode) return null;

  return (
    <div className={`smf-content ${className || ''}`}>
      <BBCode plugins={plugins}>
        {bbcode}
      </BBCode>
    </div>
  );
};

export default BBCodePreview;

import React from 'react';
import { getHandlerByPath, CharacterPrototype } from '../schema/fieldRegistry';
import { VIEW_REGISTRY } from './viewRegistry';
import DynamicInput from './DynamicInput';
import { get } from 'lodash-es';

interface SchemaRendererProps {
  path: string;
  [key: string]: any;
}

/**
 * Schema 递归渲染器
 * 核心职责：根据数据路径自动决定渲染“业务复合视图”还是“原子输入控件”
 */
export const SchemaRenderer = ({ path, ...overrideProps }: SchemaRendererProps) => {
  const handler = getHandlerByPath(path);
  
  if (!handler) {
    return <span className="text-red-500 font-mono text-xs">[Invalid Path: {path}]</span>;
  }

  // 1. 如果绑定了特定的业务视图层 (如 Table/SpellTable)
  if (handler.view && VIEW_REGISTRY[handler.view]) {
    const Component = VIEW_REGISTRY[handler.view];
    
    // 从原型链中提取该节点的其它属性 (如 columns, newItemGenerator 等)
    const normalizedPath = path
        .replace(/\[\d+\]/g, '')
        .replace(/\.\d+(\.|$)/g, (match) => match.endsWith('.') ? '.' : '');
    const nodeConfig = get(CharacterPrototype, normalizedPath) || {};

    return (
      <Component 
        path={path} 
        {...nodeConfig} 
        {...overrideProps} 
      />
    );
  }

  // 2. 否则，渲染为标准输入控件
  return (
    <DynamicInput 
        path={path} 
        {...overrideProps} 
    />
  );
};

export default SchemaRenderer;

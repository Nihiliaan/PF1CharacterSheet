import React from 'react';
import { get } from 'lodash-es';
import { CharacterPrototype } from '../schema/fieldRegistry';
import SchemaRenderer from './SchemaRenderer';

interface CompositeViewProps {
  path: string;
}

/**
 * 通用复合视图
 * 职责：自动根据原型树结构，递归渲染当前路径下的所有可编辑子节点
 */
const CompositeView: React.FC<CompositeViewProps> = ({ path }) => {
  // 1. 获取原型树中的对应定义
  const normalizedPath = path
    .replace(/\[\d+\]/g, '')
    .replace(/\.\d+(\.|$)/g, (match) => match.endsWith('.') ? '.' : '');

  const prototypeNode = get(CharacterPrototype, normalizedPath);

  if (!prototypeNode || typeof prototypeNode !== 'object') {
    return null;
  }

  // 2. 这里的“子节点”是指除了 handler 以外的所有 key
  const childKeys = Object.keys(prototypeNode).filter(k => k !== 'handler' && k !== 'columns' && k !== 'fixedRows');

  // 3. 简单的网格布局展示，如果是 basic 这类顶层板块，会自动呈现
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {childKeys.map(key => (
        <div key={key} className="flex flex-col">
          <SchemaRenderer 
            path={`${path}.${key}`} 
            label={key} // 暂时用 key 作为 label，多语言支持可通过 t(`fields.${key}`) 扩展
          />
        </div>
      ))}
    </div>
  );
};

export default CompositeView;

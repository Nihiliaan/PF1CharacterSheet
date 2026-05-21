import React, { useCallback } from 'react';
import { CharacterData } from '../../schema/types';
import { dataUpdateService } from '../../logic/dataUpdateService';

/**
 * 角色数据更新操作的封装 Hook
 * 现在统一使用 updateByPath 模式，极大简化了组件层的逻辑
 */
export const useCharacterActions = (
  isReadOnly: boolean,
  setData: React.Dispatch<React.SetStateAction<CharacterData>>
) => {
  /**
   * 核心更新函数：支持路径寻址和自动类型转换
   */
  const update = useCallback((path: string, value: any) => {
    if (isReadOnly) return;
    setData(p => dataUpdateService.updateByPath(p, path, value));
  }, [isReadOnly, setData]);

  /**
   * 列表项管理
   */
  const addBag = () => {
    setData(p => ({
      ...p,
      equipment: {
        ...p.equipment,
        container: [
          ...(p.equipment.container || []),
          {
            id: 'bag-' + Math.random(),
            name: '新容器',
            ignoreWeight: false,
            item: [],
            quantity: [],
            cost: [],
            weight: [],
            notes: []
          }
        ]
      }
    }));
  };

  const removeBag = (id: string) => {
    setData(p => ({
      ...p,
      equipment: {
        ...p.equipment,
        container: p.equipment.container.filter(b => b.id !== id)
      }
    }));
  };

  const addMagicBlock = (type: 'text' | 'table' | 'spell', spellType?: number) => {
    let newBlock: any;
    if (type === 'spell') {
      const sType = spellType ?? 2;
      newBlock = {
        id: 'magic-' + Math.random(),
        type: 'spell',
        spellType: sType,
        title: sType === 4 ? '类法术能力' : '法术',
        casterLevel: 1,
        concentration: 1,
        notes: '',
        uses: [],
        spells: []
      };
    } else {
      newBlock = {
        id: 'magic-' + Math.random(),
        type,
        title: type === 'text' ? '自定文本' : '类别名',
        content: '',
        columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
        tableData: { col0: [], col1: [], col2: [] }
      };
    }
    setData(p => ({ ...p, magicBlocks: [...(p.magicBlocks || []), newBlock] }));
  };

  const removeMagicBlock = (id: string) => {
    setData(p => ({ ...p, magicBlocks: p.magicBlocks.filter(b => b.id !== id) }));
  };

  const addAdditionalBlock = (type: 'text' | 'table' | 'image') => {
    const newBlock = {
      id: 'add-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : type === 'table' ? '自定表格' : '附加图片',
      content: '',
      url: '',
      columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
      tableData: []
    };
    setData(p => ({ ...p, additionalData: [...p.additionalData, newBlock] }));
  };

  const removeAdditionalBlock = (id: string) => {
    setData(p => ({ ...p, additionalData: p.additionalData.filter(b => b.id !== id) }));
  };

  return {
    update,
    addBag,
    removeBag,
    addMagicBlock,
    removeMagicBlock,
    addAdditionalBlock,
    removeAdditionalBlock
  };
};

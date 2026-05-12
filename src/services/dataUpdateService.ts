import { produce } from 'immer';
import { CharacterData } from '../types';

/**
 * 处理 CharacterData 深层更新的业务逻辑
 */
export const dataUpdateService = {
  /**
   * 通用字段更新 (处理 basic, defenses 等)
   */
  updateField(data: CharacterData, section: keyof CharacterData, key: string, val: any): CharacterData {
    return produce(data, draft => {
      const target = draft[section] as any;
      if (target && typeof target === 'object') {
        target[key] = val;
      }
    });
  },

  /**
   * 背包管理
   */
  addBag(data: CharacterData): CharacterData {
    return produce(data, draft => {
      draft.equipmentBags.push({
        id: 'bag-' + Math.random().toString(36).substr(2, 9),
        name: '新背包',
        ignoreWeight: false,
        items: []
      });
    });
  },

  removeBag(data: CharacterData, id: string): CharacterData {
    return produce(data, draft => {
      draft.equipmentBags = draft.equipmentBags.filter(b => b.id !== id);
    });
  },

  updateBag(data: CharacterData, id: string, updates: any): CharacterData {
    return produce(data, draft => {
      const bag = draft.equipmentBags.find(b => b.id === id);
      if (bag) {
        Object.assign(bag, updates);
      }
    });
  },

  /**
   * 模块化数据块 (Magic Blocks / Additional Data)
   */
  addBlock(data: CharacterData, listName: 'magicBlocks' | 'additionalData', block: any): CharacterData {
    return produce(data, draft => {
      draft[listName].push({
        id: (listName === 'magicBlocks' ? 'magic-' : 'add-') + Math.random().toString(36).substr(2, 9),
        ...block
      });
    });
  },

  updateBlock(data: CharacterData, listName: 'magicBlocks' | 'additionalData', id: string, updates: any): CharacterData {
    return produce(data, draft => {
      const block = draft[listName].find(b => b.id === id);
      if (block) {
        Object.assign(block, updates);
      }
    });
  },

  removeBlock(data: CharacterData, listName: 'magicBlocks' | 'additionalData', id: string): CharacterData {
    return produce(data, draft => {
      draft[listName] = draft[listName].filter(b => b.id !== id);
    });
  },

  /**
   * 拖拽排序逻辑 (通用的列表内排序)
   */
  reorderList(data: CharacterData, listKey: keyof CharacterData, sourceIndex: number, targetIndex: number): CharacterData {
    return produce(data, draft => {
      const list = draft[listKey] as any[];
      if (Array.isArray(list)) {
        const [removed] = list.splice(sourceIndex, 1);
        list.splice(targetIndex, 0, removed);
      }
    });
  },

  /**
   * 跨背包移动物品
   */
  moveItemBetweenBags(data: CharacterData, sourceBagId: string, sourceIndex: number, targetBagId: string, targetIndex: number): CharacterData {
    return produce(data, draft => {
      const sourceBag = draft.equipmentBags.find(b => b.id === sourceBagId);
      const targetBag = draft.equipmentBags.find(b => b.id === targetBagId);
      if (sourceBag && targetBag) {
        const [item] = sourceBag.items.splice(sourceIndex, 1);
        if (item) {
          targetBag.items.splice(targetIndex, 0, item);
        }
      }
    });
  }
};

import { produce } from 'immer';
import { CharacterData } from '../types';
import { getHandlerByPath } from '../schema/fieldRegistry';

/**
 * 处理 CharacterData 深层更新的业务逻辑
 */
export const dataUpdateService = {
  /**
   * 统一的路径更新方法
   * 逻辑：路径 -> 获取 Handler -> 数据转换 -> Immer 更新
   */
  updateByPath(data: CharacterData, path: string, value: any): CharacterData {
    const handler = getHandlerByPath(path);
    
    // 如果有对应的处理器，先进行数据转换（如字符串转数字）
    const finalValue = handler ? handler.update(value) : value;

    return produce(data, draft => {
      const parts = path.split('.');
      let current: any = draft;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const arrayMatch = part.match(/(.+)\[(\d+)\]/);
        
        if (arrayMatch) {
          const [, name, index] = arrayMatch;
          current = current[name][parseInt(index, 10)];
        } else {
          current = current[part];
        }
        
        if (current === undefined) return; // 路径不存在
      }

      const lastPart = parts[parts.length - 1];
      const arrayMatch = lastPart.match(/(.+)\[(\d+)\]/);
      
      if (arrayMatch) {
        const [, name, index] = arrayMatch;
        current[name][parseInt(index, 10)] = finalValue;
      } else {
        current[lastPart] = finalValue;
      }
    });
  },

  /**
   * 通用字段更新 (保留兼容性，但内部调用新逻辑)
   */
  updateField(data: CharacterData, section: keyof CharacterData, key: string, val: any): CharacterData {
    return this.updateByPath(data, `${String(section)}.${key}`, val);
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
        items: {
          item: [],
          quantity: [],
          cost: [],
          weight: [],
          notes: []
        }
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
   * 拖拽排序逻辑 (支持嵌套路径)
   */
  reorderList(data: CharacterData, path: string, sourceIndex: number, targetIndex: number): CharacterData {
    return produce(data, draft => {
      const parts = path.split('.');
      let list = draft as any;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const match = part.match(/(.+)\[(\d+)\]/);
        if (match) {
          list = list[match[1]][parseInt(match[2], 10)];
        } else {
          list = list[part];
        }
      }

      if (list && typeof list === 'object' && !Array.isArray(list)) {
        // SoA 模式：对所有列进行同步排序
        Object.keys(list).forEach(key => {
          if (Array.isArray(list[key])) {
            const [removed] = list[key].splice(sourceIndex, 1);
            list[key].splice(targetIndex, 0, removed);
          }
        });
      } else if (Array.isArray(list)) {
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
        const sourceItems = sourceBag.items as any;
        const targetItems = targetBag.items as any;

        const removedItem: Record<string, any> = {};
        Object.keys(sourceItems).forEach(key => {
          if (Array.isArray(sourceItems[key])) {
            const [val] = sourceItems[key].splice(sourceIndex, 1);
            removedItem[key] = val;
          }
        });

        Object.keys(targetItems).forEach(key => {
          if (Array.isArray(targetItems[key])) {
            targetItems[key].splice(targetIndex, 0, removedItem[key] ?? '');
          }
        });
      }
    });
  }
};

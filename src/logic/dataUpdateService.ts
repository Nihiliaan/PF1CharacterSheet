import { produce } from 'immer';
import { CharacterData } from '../schema/types';
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
    // 增加防御性检查，确保 update 方法存在
    const finalValue = (handler && typeof handler.update === 'function') 
      ? handler.update(value) 
      : value;

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
   * 背包管理
   */
  addBag(data: CharacterData): CharacterData {
    return produce(data, draft => {
      if (!draft.equipment) draft.equipment = { container: [], encumbranceMultiplier: 1, currency: { pp: 0, gp: 0, sp: 0, cp: 0, coinWeight: 0 }, notes: '' };
      draft.equipment.container.push({
        id: 'bag-' + Math.random().toString(36).substr(2, 9),
        name: '新容器',
        ignoreWeight: false,
        item: [],
        quantity: [],
        cost: [],
        weight: [],
        notes: []
      });
    });
  },

  removeBag(data: CharacterData, id: string): CharacterData {
    return produce(data, draft => {
      if (draft.equipment?.container) {
        draft.equipment.container = draft.equipment.container.filter(b => b.id !== id);
      }
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
        // SoA 模式：对所有数组列进行同步排序
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
      const sourceBag = draft.equipment?.container.find(b => b.id === sourceBagId);
      const targetBag = draft.equipment?.container.find(b => b.id === targetBagId);
      
      if (sourceBag && targetBag) {
        const removedItem: Record<string, any> = {};
        
        // 从源提取所有属性
        Object.keys(sourceBag).forEach(key => {
          if (Array.isArray(sourceBag[key])) {
            const [val] = sourceBag[key].splice(sourceIndex, 1);
            removedItem[key] = val;
          }
        });

        // 插入到目标
        Object.keys(targetBag).forEach(key => {
          if (Array.isArray(targetBag[key])) {
            targetBag[key].splice(targetIndex, 0, removedItem[key] ?? '');
          }
        });
      }
    });
  }
};

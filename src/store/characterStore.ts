import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { set, get } from 'lodash-es';
import { CharacterData } from '../types';
import initialData from './defaultData.json';
import { getHandlerByPath } from '../schema/fieldRegistry';

interface CharacterState {
  /** 内存中唯一的人物卡数据源 (存储格式) */
  data: CharacterData;
  
  /** 设置完整的人物数据 (用于加载或同步) */
  setCharacterData: (data: CharacterData) => void;

  /** 
   * 核心修改方法：
   * 根据路径查表，自动完成 交互格式 -> 存储格式 的映射并写入
   */
  updateField: (path: string, interactiveValue: string) => void;

  /** 根据路径获取存储格式数据 */
  getRawValue: (path: string) => any;
}

/**
 * 集中式人物卡内存 Store
 * 采用 Zustand + Immer 实现，支持深层路径更新
 */
export const useCharacterStore = create<CharacterState>()(
  immer((setStore, getStore) => ({
    // 使用 JSON 初始数据
    data: initialData as CharacterData,

    setCharacterData: (newData) => setStore((state) => {
      state.data = newData;
    }),

    getRawValue: (path) => {
      return get(getStore().data, path);
    },

    updateField: (path, interactiveValue) => {
      const handler = getHandlerByPath(path);
      
      if (handler) {
        const validate = handler.validate;
        const update = handler.update;
        
        if (validate && update && validate(interactiveValue)) {
          const storageValue = update(interactiveValue);
          
          setStore((state) => {
            set(state.data, path, storageValue);
          });
        }
      } else {
        console.warn(`[Store] 未能在 Prototype 中找到路径 "${path}" 的处理器。`);
      }
    },
  }))
);

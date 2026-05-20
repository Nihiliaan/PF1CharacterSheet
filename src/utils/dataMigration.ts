import { CharacterData } from '../types';
import { DEFAULT_DATA } from '../constants';

/**
 * 处理数据版本迁移和默认值合并
 * 核心逻辑：旧数据 -> 迁移规则 -> 与默认模板合并 -> 完整合规数据
 */
export const dataMigration = {
  /**
   * 迁移旧版本的数据结构到当前版本
   */
  migrate(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const migrated = { ...data };

    // 示例：将 meleeAttacks 迁移到新的 attacks 对象下
    if (migrated.meleeAttacks && !migrated.attacks) {
      migrated.attacks = {
        meleeAttacks: migrated.meleeAttacks,
        rangedAttacks: migrated.rangedAttacks || [],
        specialAttacks: migrated.specialAttacks || ''
      };
      delete migrated.meleeAttacks; 
      delete migrated.rangedAttacks; 
      delete migrated.specialAttacks;
    }

    // 示例：迁移 babTable 到 combatTable
    if (migrated.babTable && !migrated.combatTable) {
      migrated.combatTable = migrated.babTable;
      delete migrated.babTable;
    }

    return migrated;
  },

  /**
   * 递归地将数据与默认值合并，确保所有必要字段都存在
   */
  mergeWithDefault(data: any, defaults: any = DEFAULT_DATA): any {
    const migrated = this.migrate(data);
    if (typeof migrated !== 'object' || migrated === null) return JSON.parse(JSON.stringify(defaults));

    const result = { ...migrated };
    for (const key in defaults) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = this.mergeWithDefault(migrated[key], defaults[key]);
      } else if (result[key] === undefined) {
        result[key] = JSON.parse(JSON.stringify(defaults[key]));
      }
    }
    return result;
  }
};

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

    // 1. 战斗与防御 (Combat & Defenses)
    if (migrated.combatTable && !migrated.combatManeuver) {
      migrated.combatManeuver = {
        bab: migrated.combatTable.bab || 0,
        cmb: migrated.combatTable.cmb || 0,
        cmd: migrated.combatTable.cmd || 10,
        notes: migrated.combatManeuverNotes || ''
      };
      delete migrated.combatTable;
      delete migrated.combatManeuverNotes;
    }

    if (migrated.defenses) {
      if (migrated.defenses.acTable && !migrated.defenses.armorClass) {
        migrated.defenses.armorClass = {
          ...migrated.defenses.acTable,
          notes: migrated.defenses.acNotes || ''
        };
        delete migrated.defenses.acTable;
        delete migrated.defenses.acNotes;
      }
      if (migrated.defenses.savesTable && !migrated.defenses.saves) {
        migrated.defenses.saves = {
          ...migrated.defenses.savesTable,
          notes: migrated.defenses.savesNotes || ''
        };
        delete migrated.defenses.savesTable;
        delete migrated.defenses.savesNotes;
      }
      // 弃用 defensiveAbilities 移至 specialDefenses
      if (migrated.defenses.defensiveAbilities) {
        migrated.defenses.specialDefenses = (migrated.defenses.specialDefenses || '') + 
          (migrated.defenses.specialDefenses ? ' ' : '') + migrated.defenses.defensiveAbilities;
        delete migrated.defenses.defensiveAbilities;
      }
    }

    // 2. 天赋职业 (Favored Class)
    if (typeof migrated.favoredClass === 'string') {
      migrated.favoredClass = {
        fc: migrated.favoredClass,
        fcb: migrated.favoredClassBonus || ''
      };
      delete migrated.favoredClassBonus;
    }

    // 3. 技能 (Skills) - 迁移到 consolidated structure
    if (migrated.skills && migrated.skillsTotal !== undefined) {
      migrated.skills.totalPoints = migrated.skillsTotal;
      migrated.skills.acp = migrated.armorCheckPenalty || 0;
      migrated.skills.notes = migrated.skillsNotes || '';
      // 字段重命名：misc -> others
      if (migrated.skills.misc) {
        migrated.skills.others = migrated.skills.misc;
        delete migrated.skills.misc;
      }
      delete migrated.skillsTotal;
      delete migrated.armorCheckPenalty;
      delete migrated.skillsNotes;
    }

    // 4. 装备与资产 (Equipment)
    if (!migrated.equipment && (migrated.equipmentBags || migrated.currency)) {
      migrated.equipment = {
        container: (migrated.equipmentBags || []).map((bag: any) => {
          const { items, ...rest } = bag;
          return {
            ...rest,
            // 拆解 items 对象到平铺结构
            item: items?.item || [],
            quantity: items?.quantity || [],
            cost: items?.cost || [],
            weight: items?.weight || [],
            notes: items?.notes || []
          };
        }),
        encumbranceMultiplier: migrated.encumbranceMultiplier ?? 1,
        currency: migrated.currency || DEFAULT_DATA.equipment.currency,
        notes: migrated.equipmentNotes || ''
      };
      delete migrated.equipmentBags;
      delete migrated.encumbranceMultiplier;
      delete migrated.equipmentNotes;
      delete migrated.currency;
    }

    // 5. 施法块 (Magic Blocks) - 拆解 tableData 到平铺
    if (Array.isArray(migrated.magicBlocks)) {
      migrated.magicBlocks = migrated.magicBlocks.map((block: any) => {
        if (block.tableData && block.type === 'spell') {
          const { tableData, ...rest } = block;
          return {
            ...rest,
            uses: tableData.uses || [],
            spells: tableData.spells || []
          };
        }
        return block;
      });
    }

    // 6. 攻击系统重命名 (Attacks rename)
    if (migrated.attacks) {
      if (migrated.attacks.meleeAttacks && !migrated.attacks.melee) {
        migrated.attacks.melee = {
          ...migrated.attacks.meleeAttacks,
          touch: migrated.attacks.meleeAttacks.range || migrated.attacks.meleeAttacks.touch || []
        };
        delete migrated.attacks.meleeAttacks;
        // 如果旧数据里有 range 数组，也需要删掉以防干扰
        if (migrated.attacks.melee.range) delete migrated.attacks.melee.range;
      }
      if (migrated.attacks.rangedAttacks && !migrated.attacks.ranged) {
        migrated.attacks.ranged = migrated.attacks.rangedAttacks;
        delete migrated.attacks.rangedAttacks;
      }
    }

    return migrated;
  },

  /**
   * 递归地将数据与默认值合并，确保所有必要字段都存在
   * 优化版：分离迁移逻辑与合并逻辑，避免指数级复杂度
   */
  mergeWithDefault(data: any, defaults: any = DEFAULT_DATA): any {
    // 1. 仅在顶层执行一次迁移
    const migrated = this.migrate(data);
    
    // 2. 使用内部高效递归进行合并
    return this._deepMerge(migrated, defaults);
  },

  /**
   * 内部递归合并函数
   */
  _deepMerge(target: any, source: any): any {
    if (!target || typeof target !== 'object') {
      return JSON.parse(JSON.stringify(source));
    }

    const result = { ...target };
    for (const key in source) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (sourceVal?.constructor === Object) {
        result[key] = this._deepMerge(targetVal, sourceVal);
      } else if (targetVal === undefined) {
        // 仅在目标值不存在时使用默认值
        result[key] = Array.isArray(sourceVal) 
          ? [...sourceVal] 
          : (typeof sourceVal === 'object' && sourceVal !== null ? JSON.parse(JSON.stringify(sourceVal)) : sourceVal);
      }
    }
    return result;
  }
};

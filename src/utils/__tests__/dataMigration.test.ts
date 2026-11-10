import { describe, it, expect } from 'vitest';
import { dataMigration, CURRENT_SCHEMA_VERSION } from '../dataMigration';
import { DEFAULT_DATA } from '../../constants';

describe('migrate - 版本链总控', () => {
  it('非对象输入原样返回', () => {
    expect(dataMigration.migrate(null)).toBeNull();
    expect(dataMigration.migrate(undefined)).toBeUndefined();
    expect(dataMigration.migrate('abc')).toBe('abc');
    expect(dataMigration.migrate(42)).toBe(42);
  });

  it('v0 数据迁移后打上 schemaVersion=1', () => {
    const r = dataMigration.migrate({ basic: { name: 'X' } });
    expect(r.schemaVersion).toBe(1);
  });

  it('已是 schemaVersion=1 的数据不重复迁移', () => {
    // combatTable 是 v0 专属结构；带版本号时应原样保留
    const v1 = { schemaVersion: 1, combatTable: { bab: 2 }, basic: {} };
    const r = dataMigration.migrate(v1);
    expect(r.schemaVersion).toBe(1);
    expect(r.combatTable).toEqual({ bab: 2 });
    expect(r.combatManeuver).toBeUndefined();
  });

  it('CURRENT_SCHEMA_VERSION 与迁移目标版本一致', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(dataMigration.CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe('migrate v0→v1 - 战斗与防御', () => {
  it('combatTable → combatManeuver，notes 从 combatManeuverNotes 合并', () => {
    const r = dataMigration.migrate({
      combatTable: { bab: 2, cmb: 1, cmd: 15 },
      combatManeuverNotes: '精通擒抱',
    });
    expect(r.combatManeuver).toEqual({ bab: 2, cmb: 1, cmd: 15, notes: '精通擒抱' });
    expect(r.combatTable).toBeUndefined();
    expect(r.combatManeuverNotes).toBeUndefined();
  });

  it('acTable → armorClass，savesTable → saves，旧字段删除', () => {
    const r = dataMigration.migrate({
      defenses: {
        acTable: { ac: 15, touch: 12, flatFooted: 13 },
        acNotes: '敏捷加值',
        savesTable: { fortitude: 2, reflex: 1, will: 3 },
        savesNotes: '勇气',
      },
    });
    expect(r.defenses.armorClass).toEqual({ ac: 15, touch: 12, flatFooted: 13, notes: '敏捷加值' });
    expect(r.defenses.saves).toEqual({ fortitude: 2, reflex: 1, will: 3, notes: '勇气' });
    expect(r.defenses.acTable).toBeUndefined();
    expect(r.defenses.savesTable).toBeUndefined();
  });

  it('弃用的 defensiveAbilities 并入 specialDefenses', () => {
    const r = dataMigration.migrate({
      defenses: { specialDefenses: '石肤', defensiveAbilities: '气袍' },
    });
    expect(r.defenses.specialDefenses).toBe('石肤 气袍');
    expect(r.defenses.defensiveAbilities).toBeUndefined();
  });

  it('已有 armorClass 时不覆盖', () => {
    const r = dataMigration.migrate({
      defenses: { acTable: { ac: 99 }, armorClass: { ac: 15 } },
    });
    expect(r.defenses.armorClass.ac).toBe(15);
  });
});

describe('migrate v0→v1 - 天赋职业与技能', () => {
  it('favoredClass 字符串 → {fc:数组, fcb}', () => {
    const r = dataMigration.migrate({ favoredClass: '战士', favoredClassBonus: '+1 HP' });
    expect(r.favoredClass).toEqual({ fc: ['战士'], fcb: '+1 HP' });
    expect(r.favoredClassBonus).toBeUndefined();
  });

  it('技能顶层字段并入 skills，misc 重命名为 others', () => {
    const r = dataMigration.migrate({
      skills: { name: [0, 5], rank: ['1', '2'], misc: ['2', '0'] },
      skillsTotal: 5,
      armorCheckPenalty: -2,
      skillsNotes: '备注',
    });
    expect(r.skills.totalPoints).toBe(5);
    expect(r.skills.acp).toBe(-2);
    expect(r.skills.notes).toBe('备注');
    expect(r.skills.others).toEqual(['2', '0']);
    expect(r.skills.misc).toBeUndefined();
    expect(r.skillsTotal).toBeUndefined();
    expect(r.armorCheckPenalty).toBeUndefined();
    expect(r.skillsNotes).toBeUndefined();
  });
});

describe('migrate v0→v1 - 装备 SoA 扁平化', () => {
  it('equipmentBags.items 嵌套对象 → container 内的平铺并行数组', () => {
    const r = dataMigration.migrate({
      equipmentBags: [
        {
          name: '主袋',
          ignoreWeight: false,
          items: { item: ['绳', '火把'], quantity: ['1', '2'], cost: ['1', '0.01'], weight: ['5', '1'], notes: ['', ''] },
        },
      ],
      currency: { pp: '1', gp: '2', sp: '3', cp: '4' },
      encumbranceMultiplier: 2,
      equipmentNotes: '负重备注',
    });
    expect(r.equipment.container).toEqual([
      {
        name: '主袋',
        ignoreWeight: false,
        item: ['绳', '火把'],
        quantity: ['1', '2'],
        cost: ['1', '0.01'],
        weight: ['5', '1'],
        notes: ['', ''],
      },
    ]);
    expect(r.equipment.currency).toEqual({ pp: '1', gp: '2', sp: '3', cp: '4' });
    expect(r.equipment.encumbranceMultiplier).toBe(2);
    expect(r.equipment.notes).toBe('负重备注');
    expect(r.equipmentBags).toBeUndefined();
    expect(r.currency).toBeUndefined();
    expect(r.encumbranceMultiplier).toBeUndefined();
  });

  it('已有 equipment 结构时不重复迁移', () => {
    const r = dataMigration.migrate({ equipment: { container: [], currency: {} }, currency: { gp: '1' } });
    expect(r.equipment.container).toEqual([]);
    // 顶层 currency 保留（未触发迁移分支）
    expect(r.currency).toEqual({ gp: '1' });
  });
});

describe('migrate v0→v1 - 施法块与攻击', () => {
  it("旧版 type:'spell' 的 tableData 拆解为 uses/spells", () => {
    const r = dataMigration.migrate({
      magicBlocks: [
        { type: 'spell', name: '一环', tableData: { uses: ['3'], spells: ['魔法飞弹'] } },
        { type: 5, name: '类法术', tableData: { uses: ['1'], spells: ['黑暗视觉'] } },
      ],
    });
    expect(r.magicBlocks[0]).toEqual({ type: 'spell', name: '一环', uses: ['3'], spells: ['魔法飞弹'] });
    expect(r.magicBlocks[0].tableData).toBeUndefined();
  });

  it('meleeAttacks → melee，旧 range 数组转入 touch；rangedAttacks → ranged', () => {
    const r = dataMigration.migrate({
      attacks: {
        meleeAttacks: { name: ['长拳'], range: ['触及'], damage: ['1d3'] },
        rangedAttacks: { name: ['短弓'], range: ['30尺'], damage: ['1d4'] },
      },
    });
    expect(r.attacks.melee).toEqual({ name: ['长拳'], touch: ['触及'], damage: ['1d3'] });
    expect(r.attacks.melee.range).toBeUndefined();
    expect(r.attacks.ranged).toEqual({ name: ['短弓'], range: ['30尺'], damage: ['1d4'] });
    expect(r.attacks.meleeAttacks).toBeUndefined();
    expect(r.attacks.rangedAttacks).toBeUndefined();
  });
});

describe('migrate v0→v1 - 多选字段数组化', () => {
  it('basic.senses / languages：逗号分隔字符串 → 数组', () => {
    const r = dataMigration.migrate({ basic: { senses: '黑暗视觉, 侦测魔力', languages: '通用语；精灵语' } });
    expect(r.basic.senses).toEqual(['黑暗视觉', '侦测魔力']);
    // 分号不是分隔符，保持为单一元素
    expect(r.basic.languages).toEqual(['通用语；精灵语']);
  });

  it('JSON 数组字符串与空串', () => {
    const r = dataMigration.migrate({ basic: { senses: '["a","b"]', languages: '' } });
    expect(r.basic.senses).toEqual(['a', 'b']);
    expect(r.basic.languages).toEqual([]);
  });

  it('已是数组则原样保留；null → []', () => {
    const r = dataMigration.migrate({ basic: { senses: ['黑暗视觉'], languages: null } });
    expect(r.basic.senses).toEqual(['黑暗视觉']);
    expect(r.basic.languages).toEqual([]);
  });
});

describe('migrate v0→v1 - PFS 模块', () => {
  it('playerNumber "12345-6" 拆分为编号与角色序号', () => {
    const r = dataMigration.migrate({ pfs: { playerNumber: '12345-6' } });
    expect(r.pfs.playerNumber).toBe('12345');
    expect(r.pfs.characterNumber).toBe('6');
  });

  it('编号剥离非数字字符；faction 字符串 key 转换为数字 id', () => {
    const r = dataMigration.migrate({ pfs: { playerNumber: 'P1234', faction: 'libertys_edge' } });
    expect(r.pfs.playerNumber).toBe('1234');
    expect(r.pfs.faction).toBe(2);
  });

  it('未知 faction key 与非法类型回退为 1', () => {
    expect(dataMigration.migrate({ pfs: { faction: 'not_a_key' } }).pfs.faction).toBe(1);
    expect(dataMigration.migrate({ pfs: { faction: null } }).pfs.faction).toBe(1);
  });

  it('goals：从 checks 布尔数组计算 checkedCount', () => {
    const r = dataMigration.migrate({
      pfs: { goals: [{ id: 'g1', checks: [true, false, true], maxChecks: 3 }] },
    });
    expect(r.pfs.goals).toEqual([{ id: 'g1', checkedCount: 2, maxChecks: 3 }]);
  });

  it('goals 非数组时归一化为 []', () => {
    expect(dataMigration.migrate({ pfs: { goals: {} } }).pfs.goals).toEqual([]);
  });

  it('boons：字符串数字净化、缺失列按长度补齐', () => {
    const r = dataMigration.migrate({
      pfs: { boons: { name: ['A', 'B'], uses: ['2', 'x'], sheetNo: [1, '3'] } },
    });
    expect(r.pfs.boons).toEqual({
      name: ['A', 'B'],
      desc: ['', ''],
      uses: [2, 0],
      sheetNo: [1, 3],
    });
  });

  it('boons 缺失时补空结构；chronicles 缺失时补全空列', () => {
    const r = dataMigration.migrate({ pfs: {} });
    expect(r.pfs.boons).toEqual({ uses: [], name: [], desc: [], sheetNo: [] });
    expect(r.pfs.chronicles).toEqual({
      date: [], scenario: [], gm: [], event: [],
      faction: [], prestige: [], notes: [], link: [],
    });
  });

  it('chronicles：缺失列补齐、faction 字符串转 id', () => {
    const r = dataMigration.migrate({
      pfs: {
        chronicles: {
          date: ['2024-01-01'],
          scenario: ['S1-00'],
          faction: ['grand_lodge'],
        },
      },
    });
    expect(r.pfs.chronicles.scenario).toEqual(['S1-00']);
    expect(r.pfs.chronicles.faction).toEqual([1]);
    expect(r.pfs.chronicles.gm).toEqual(['']);
    expect(r.pfs.chronicles.prestige).toEqual([0]);
  });
});

describe('migrate v0→v1 - 论坛同步', () => {
  it('forumBindings 数字/对象/字符串混排统一为结构体，非法项过滤', () => {
    const r = dataMigration.migrate({
      forumBindings: [
        123,
        { msgId: '456', titleTemplate: '标题' },
        '帖子#789',
        { msgId: 'abc' },
        -5,
      ],
    });
    expect(r.forumBindings).toEqual([
      { msgId: 123, titleTemplate: '', subtitleTemplate: '' },
      { msgId: 456, titleTemplate: '标题', subtitleTemplate: '' },
      { msgId: 789, titleTemplate: '', subtitleTemplate: '' },
    ]);
  });

  it('forumBindings 缺失或非数组 → []；forumTitleTemplate 非字符串 → ""', () => {
    expect(dataMigration.migrate({}).forumBindings).toEqual([]);
    expect(dataMigration.migrate({ forumBindings: 'x' }).forumBindings).toEqual([]);
    expect(dataMigration.migrate({ forumTitleTemplate: 123 }).forumTitleTemplate).toBe('');
  });
});

describe('mergeWithDefault', () => {
  it('迁移 + 深度合并：用户值优先，缺失字段由默认模板补齐', () => {
    const r = dataMigration.mergeWithDefault({
      basic: { name: '老兵' },
      combatTable: { bab: 3, cmb: 3, cmd: 17 },
    });
    expect(r.basic.name).toBe('老兵');
    expect(r.combatManeuver.bab).toBe(3);
    expect(r.combatTable).toBeUndefined();
    expect(r.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // 默认模板的关键结构被补齐
    expect(r.equipment.currency).toBeDefined();
    expect(r.skills.name).toBeDefined();
    expect(r.forumBindings).toEqual([]);
  });

  it('用户数组不被默认数组覆盖', () => {
    const r = dataMigration.mergeWithDefault({ skills: { rank: ['5'] } });
    expect(r.skills.rank).toEqual(['5']);
  });

  it('与 DEFAULT_DATA 等价输入：结构与默认模板一致', () => {
    // 默认数据本身应能通过迁移+合并而保持稳定（幂等）
    const r = dataMigration.mergeWithDefault(DEFAULT_DATA);
    expect(r.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(r.basic.name).toBe(DEFAULT_DATA.basic.name);
  });
});

describe('纯函数化 - 输入不被突变', () => {
  it('migrate(v0旧数据) 后原始对象深层结构不变（触发嵌套 delete 的 defenses 迁移）', () => {
    const input: any = {
      defenses: {
        acTable: { ac: 15, touch: 12, flatFooted: 13 },
        acNotes: '敏捷加值',
        savesTable: { fortitude: 2 },
      },
    };
    const r = dataMigration.migrate(input);
    // 迁移结果：acTable 已重命名为 armorClass
    expect(r.defenses.armorClass).toBeDefined();
    expect(r.defenses.acTable).toBeUndefined();
    // 原始对象不被突变：acTable / acNotes 仍然存在，savesTable 未被删除
    expect(input.defenses.acTable).toEqual({ ac: 15, touch: 12, flatFooted: 13 });
    expect(input.defenses.acNotes).toBe('敏捷加值');
    expect(input.defenses.savesTable).toEqual({ fortitude: 2 });
    expect(input.defenses.armorClass).toBeUndefined();
  });

  it('mergeWithDefault(input) 后 input 深层不变', () => {
    const input: any = {
      basic: { name: '老兵' },
      combatTable: { bab: 3, cmb: 3, cmd: 17 },
      combatManeuverNotes: '战技备注',
      skills: { rank: ['5'] },
    };
    const snapshot = JSON.stringify(input);
    const r = dataMigration.mergeWithDefault(input);
    // 迁移结果生效
    expect(r.combatManeuver.bab).toBe(3);
    expect(r.combatTable).toBeUndefined();
    // 原始输入深层不变
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(input.basic.name).toBe('老兵');
    expect(input.combatTable).toEqual({ bab: 3, cmb: 3, cmd: 17 });
    expect(input.combatManeuver).toBeUndefined();
    expect(input.skills).toEqual({ rank: ['5'] });
  });

  it('mergeWithDefault(DEFAULT_DATA) 后 DEFAULT_DATA 深层不变', () => {
    const snapshot = JSON.stringify(DEFAULT_DATA);
    const r = dataMigration.mergeWithDefault(DEFAULT_DATA);
    expect(JSON.stringify(DEFAULT_DATA)).toBe(snapshot);
  });

  it('mergeWithDefault(DEFAULT_DATA) 返回值可自由修改嵌套字段而不影响 DEFAULT_DATA', () => {
    const r = dataMigration.mergeWithDefault(DEFAULT_DATA);
    // 修改返回值的嵌套对象与数组
    r.basic.name = '改名了';
    r.equipment.currency.gp = '999';
    r.skills.rank.push('99');
    r.forumBindings.push({ msgId: 1, titleTemplate: 't', subtitleTemplate: '' });
    // DEFAULT_DATA 不受影响
    expect(r.basic.name).not.toBe(DEFAULT_DATA.basic.name);
    expect(r.equipment.currency.gp).not.toBe(DEFAULT_DATA.equipment.currency.gp);
    expect(r.skills.rank).not.toBe(DEFAULT_DATA.skills.rank);
    expect(DEFAULT_DATA.forumBindings).toEqual([]);
  });
});

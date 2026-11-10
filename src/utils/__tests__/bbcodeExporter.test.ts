import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  generateBBCode,
  renderTitleTemplate,
  buildViewObject,
  getCharacterBBCode,
} from '../bbcodeExporter';
import { DEFAULT_DATA } from '../../constants';
import i18n from '../../i18n/config';
import type { CharacterData } from '../../schema/types';

// 使用生产同款 i18n 实例，固定中文以保证断言稳定
const t = i18n.t as any;
const asData = (o: any): CharacterData => o as unknown as CharacterData;

beforeAll(() => {
  i18n.changeLanguage('zh');
});

beforeEach(() => {
  localStorage.clear();
});

describe('generateBBCode - 模板渲染基础', () => {
  it('with 块 + 标量字段', () => {
    const data = asData({ basic: { name: '艾莉丝', race: '精灵' } });
    expect(generateBBCode(data, '{{#with basic}}{{name}}|{{race}}{{/with}}', t)).toBe('艾莉丝|精灵');
  });

  it('数字字段经 Handler 格式化（年龄 → "25岁"）', () => {
    const data = asData({ basic: { age: 25 } });
    expect(generateBBCode(data, '{{basic.age}}', t)).toBe('25岁');
  });

  it('空值渲染为空串（不出现 "undefined"/"null"）', () => {
    const data = asData({ basic: { name: '' } });
    expect(generateBBCode(data, '[{{basic.name}}]', t)).toBe('[]');
    expect(generateBBCode(asData({}), '{{basic.name}}', t)).toBe('');
  });

  it('SoA 结构可用 each 遍历（攻击表示例）', () => {
    const data = asData({
      attacks: { melee: { name: ['长剑', '匕首'], attack: ['+5', '+3'], damage: ['1d8+2', '1d4+1'] } },
    });
    const out = generateBBCode(data, '{{#each attacks.melee}}[{{name}}/{{attack}}/{{damage}}]{{/each}}', t);
    expect(out).toBe('[长剑/+5/1d8+2][匕首/+3/1d4+1]');
  });

  it('md2bb 助手：Markdown 链接转 BBCode url 标签', () => {
    const data = asData({});
    expect(generateBBCode(data, '{{#md2bb}}看[文档](http://x.com)这里{{/md2bb}}', t)).toBe(
      '看[url=http://x.com]文档[/url]这里'
    );
  });

  it('eq 助手可在子表达式中使用', () => {
    const data = asData({ basic: { name: '艾莉丝' } });
    expect(generateBBCode(data, '{{#if (eq basic.name "艾莉丝")}}Y{{else}}N{{/if}}', t)).toBe('Y');
    expect(generateBBCode(data, '{{#if (eq basic.name "别人")}}Y{{else}}N{{/if}}', t)).toBe('N');
  });

  it('模板编译错误时返回错误标记而非抛出异常', () => {
    const data = asData({ basic: { name: 'X' } });
    const out = generateBBCode(data, '{{#with basic}}未闭合', t);
    expect(out).toContain('导出错误');
    expect(out).toContain('[color=red]');
  });
});

describe('generateBBCode - 计算属性注入', () => {
  const data = asData({
    attributes: { final: [10, 10, 10, 10, 10, 10] },
    equipment: {
      container: [{ item: ['长剑'], cost: ['15'], quantity: ['2'], weight: ['3'] }],
      currency: { gp: '10', coinWeight: '5' },
      encumbranceMultiplier: '1',
    },
  });

  it('总资产 = 装备 cost×qty + 钱币', () => {
    expect(generateBBCode(data, '{{equipment.totalCost}}', t)).toBe('40');
  });

  it('总重量保留一位小数', () => {
    // 5 (钱币) + 3×2 = 11
    expect(generateBBCode(data, '{{equipment.totalWeight}}', t)).toBe('11.0');
  });

  it('负重阈值（力量 10：轻 33 / 中 66 / 重 100）', () => {
    expect(generateBBCode(data, '{{equipment.encumbrance.light}}/{{equipment.encumbrance.medium}}/{{equipment.encumbrance.heavy}}', t)).toBe('33/66/100');
  });
});

describe('buildViewObject', () => {
  it('注入顶层快捷字段 name/race/languages/senses 与属性名数组', () => {
    const data = asData({
      basic: { name: '艾莉丝', race: '精灵', languages: ['通用语'], senses: ['黑暗视觉'] },
      attributes: { final: [10, 10, 10, 10, 10, 10] },
    });
    const view = buildViewObject(data, t);
    expect(view.name).toBe('艾莉丝');
    expect(view.race).toBe('精灵');
    expect(view.languages).toEqual(['通用语']);
    expect(view.attributes.name).toHaveLength(6);
  });
});

describe('renderTitleTemplate', () => {
  const data = asData({ basic: { name: '艾莉丝' } });

  it('空模板返回空串', () => {
    expect(renderTitleTemplate('', data, t)).toBe('');
    expect(renderTitleTemplate('   ', data, t)).toBe('');
  });

  it('originalTitle 上下文注入', () => {
    const out = renderTitleTemplate('{{basic.name}} - {{originalTitle}}', data, t, undefined, {
      originalTitle: '招募',
    });
    expect(out).toBe('艾莉丝 - 招募');
  });

  it('剥离标题中无法渲染的 Markdown 链接', () => {
    expect(renderTitleTemplate('链接[点我](http://a.b)完', data, t)).toBe('链接点我完');
  });

  it('渲染异常时静默返回空串', () => {
    expect(renderTitleTemplate('{{#with basic}}坏', data, t)).toBe('');
  });
});

describe('getCharacterBBCode - 完整导出管线', () => {
  const data = asData({
    ...DEFAULT_DATA,
    basic: { ...(DEFAULT_DATA as any).basic, name: '测试角色甲' },
  });

  it('默认模板冒烟测试：包含角色名且无导出错误', () => {
    const out = getCharacterBBCode(data, {} as any);
    expect(out).toContain('测试角色甲');
    expect(out).not.toContain('导出错误');
  });

  it('localStorage 中的自定义模板优先生效', () => {
    localStorage.setItem('bbcode_template', '姓名={{basic.name}}');
    expect(getCharacterBBCode(data, {} as any)).toBe('姓名=测试角色甲');
  });
});

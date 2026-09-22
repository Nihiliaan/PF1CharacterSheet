import { CharacterData, ATTRIBUTE_NAMES } from '../schema/types';
import { getModifier, formatModifier } from './calculations';
import handlers from '../schema/handlers';

// 标准 Pathfinder 1e CR -> XP 对照表 (扩充至 CR 30 封顶)
export const CR_XP_TABLE: Record<string, number> = {
  '1/8': 50,
  '1/6': 65,
  '1/4': 100,
  '1/3': 135,
  '1/2': 200,
  '1': 400,
  '2': 600,
  '3': 800,
  '4': 1200,
  '5': 1600,
  '6': 2400,
  '7': 3200,
  '8': 4800,
  '9': 6400,
  '10': 9600,
  '11': 12800,
  '12': 19200,
  '13': 25600,
  '14': 38400,
  '15': 51200,
  '16': 76800,
  '17': 102400,
  '18': 153600,
  '19': 204800,
  '20': 307200,
  '21': 409600,
  '22': 614400,
  '23': 819200,
  '24': 1228800,
  '25': 1638400,
  '26': 2457600,
  '27': 3276800,
  '28': 4915200,
  '29': 6553600,
  '30': 9830400,
};

export const getXPByCR = (cr: number | string): string => {
  const crStr = String(cr).trim();
  if (CR_XP_TABLE[crStr]) {
    return CR_XP_TABLE[crStr].toLocaleString();
  }
  const numericCR = typeof cr === 'number' ? cr : parseFloat(cr);
  if (isNaN(numericCR) || numericCR <= 0) return '0';
  if (numericCR < 1) return '200';
  // 严格限制最大范围 1-30，绝不产生指数溢出
  const rounded = Math.min(30, Math.max(1, Math.round(numericCR)));
  if (CR_XP_TABLE[String(rounded)]) {
    return CR_XP_TABLE[String(rounded)].toLocaleString();
  }
  return CR_XP_TABLE['30'].toLocaleString();
};

/**
 * 根据体型获取默认占据与触及（尺）
 */
export const getSpaceAndReach = (sizeValue: number | string): { space: string; reach: string } => {
  const idx = typeof sizeValue === 'number' ? sizeValue : parseInt(sizeValue, 10);
  switch (idx) {
    case 0: // 超微型 Fine
      return { space: '1/2', reach: '0' };
    case 1: // 微型 Diminutive
      return { space: '1', reach: '0' };
    case 2: // 超小型 Tiny
      return { space: '2.5', reach: '0' };
    case 3: // 小型 Small
    case 4: // 中型 Medium
    default:
      return { space: '5', reach: '5' };
    case 5: // 大型 Large
      return { space: '10', reach: '10' };
    case 6: // 超大型 Huge
      return { space: '15', reach: '15' };
    case 7: // 巨型 Gargantuan
      return { space: '20', reach: '20' };
    case 8: // 超巨型 Colossal
      return { space: '30', reach: '30' };
  }
};

/**
 * 自动估算角色的基础 CR（从职业/等级或生命骰中提取）
 */
export const getEstimatedCR = (data: CharacterData): number => {
  const classesStr = data.basic?.classes || '';

  // 1. 彻底剥离 Markdown 链接中的 URL 与裸 URL，防止 URL 中的端口、IP、页面ID等数字被误算为等级
  const cleanStr = classesStr
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [法师](http://.../1234) -> 法师
    .replace(/https?:\/\/\S+/g, '');          // 移除所有裸露 URL

  let totalLevel = 0;

  // 2. 匹配可能表示等级的数字 (优先匹配 "10级"、"5 级" 等显式带"级"的格式)
  const explicitLevelMatches = cleanStr.match(/(\d{1,2})\s*级/g);
  if (explicitLevelMatches && explicitLevelMatches.length > 0) {
    totalLevel = explicitLevelMatches.reduce((acc, curr) => {
      const num = parseInt(curr.replace(/[^\d]/g, ''), 10) || 0;
      return acc + (num <= 20 ? num : 0);
    }, 0);
  } else {
    // 匹配常规职业等级数值（单职业限定 1-20）
    const generalMatches = cleanStr.match(/\b([1-9]|1\d|20)\b/g);
    if (generalMatches && generalMatches.length > 0) {
      totalLevel = generalMatches.reduce((acc, curr) => {
        const num = parseInt(curr, 10) || 0;
        return acc + num;
      }, 0);
    }
  }

  // 3. 若职业未能解析出等级，尝试从生命骰解析 (如 "10d8+20" -> 10)
  if (totalLevel <= 0) {
    const hdStr = data.defenses?.hd || '';
    const hdMatch = hdStr.match(/^(\d{1,2})d/i);
    if (hdMatch) {
      totalLevel = parseInt(hdMatch[1], 10) || 1;
    }
  }

  // 安全范围兜底：限制在 1 到 30 之间
  if (totalLevel <= 0) return 1;
  return Math.min(30, Math.max(1, totalLevel));
};

export interface FormattedAttack {
  weapon: string;
  hit: string;
  damage: string;
  crit: string;
  rangeOrTouch?: string;
  damageType?: string;
  special?: string;
  fullText: string;
}

export interface FormattedMagicBlock {
  title: string;
  cl: string;
  concentration: string;
  type: number;
  typeName: string;
  rows: {
    levelText: string;
    usesText: string;
    spellsText: string;
  }[];
  notes?: string;
}

export interface FormattedStatBlock {
  // 头部
  name: string;
  cr: string;
  mr?: number;
  xp: string;
  classes: string;
  race: string;
  alignment: string;
  size: string;
  typeSubtype: string;
  initiative: string;
  senses: string;
  aura: string;

  // 防御
  ac: number;
  touch: number;
  flatFooted: number;
  acSource: string;
  hp: number;
  hd: string;
  regenFastHealing: string;
  fort: string;
  ref: string;
  will: string;
  conditionalSaves: string;
  specialDefenses: string;
  dr: string;
  immune: string;
  resist: string;
  sr: string;
  weakness: string;

  // 进攻
  speed: string;
  meleeAttacks: FormattedAttack[];
  rangedAttacks: FormattedAttack[];
  space: string;
  reach: string;
  specialAttacks: string;
  magicBlocks: FormattedMagicBlock[];

  // 战术
  tactics?: {
    beforeCombat?: string;
    duringCombat?: string;
    morale?: string;
  };

  // 统计
  attributes: { name: string; value: number; mod: string }[];
  bab: string;
  cmb: string;
  cmd: number;
  feats: { name: string; type?: string; desc?: string }[];
  skills: { name: string; total: string; rank: number }[];
  languages: string;
  specialQualities: { name: string; type?: string; desc?: string }[];
  combatGear: string[];
  otherGear: string[];

  // 特殊能力详细说明
  specialAbilities: { name: string; type: string; desc: string }[];
}

/**
 * 格式化角色为结构化怪物数据卡对象
 */
export const formatStatBlockData = (
  data: CharacterData,
  t: any,
  overrideCR?: number | string,
  overrideMR?: number
): FormattedStatBlock => {
  const estimatedCR = overrideCR !== undefined && overrideCR !== '' ? overrideCR : getEstimatedCR(data);
  const crStr = String(estimatedCR);
  const xpStr = getXPByCR(crStr);

  // 1. 基础信息
  const name = data.basic?.name?.trim() || t('common.untitled_character', '未命名角色');
  const classes = data.basic?.classes?.trim() || '';
  const rawRace = handlers.RaceHandler.formatDisplay(data.basic?.race, { t }) || '';
  const race = (rawRace === '—' || rawRace === 'None') ? '' : rawRace;
  const alignment = handlers.AlignmentHandler.formatDisplay(data.basic?.alignment, { t }) || '';
  const size = handlers.SizeHandler.formatDisplay(data.basic?.size, { t }) || '';
  
  // 生物类型/子类型推导
  const typeName = handlers.CreatureTypeHandler.formatDisplay(data.basic?.type, { t }) || (race ? t('gm_view.humanoid', '类人生物') : '');
  let subtypeName = handlers.CreatureSubtypeHandler.formatDisplay(data.basic?.subtype, { t }) || '';
  if (subtypeName === '—' || subtypeName === '') {
    subtypeName = '';
  }
  if (!subtypeName && race && (data.basic?.type === undefined || data.basic?.type === 5)) {
    subtypeName = race;
  }
  const typeSubtype = subtypeName ? `${typeName}（${subtypeName}）` : typeName;

  const initiative = formatModifier(data.basic?.initiative || 0);

  // 感官
  const sensesList: string[] = [];
  if (Array.isArray(data.basic?.senses)) {
    data.basic.senses.forEach(s => {
      const formatted = handlers.SensesHandler.formatDisplay(s, { t });
      if (formatted && formatted !== '—') sensesList.push(formatted);
    });
  }
  const perceptionVal = data.basic?.perception ?? 0;
  const perceptionStr = `${t('editor.basic.perception', '察觉')} ${formatModifier(perceptionVal)}`;
  sensesList.push(perceptionStr);
  const senses = sensesList.join('，');

  // 灵光：查找职业或特性中含“灵光”的能力
  let aura = '';
  if (Array.isArray(data.classFeatures?.name)) {
    data.classFeatures.name.forEach((fn, idx) => {
      if (fn && (fn.includes('灵光') || fn.toLowerCase().includes('aura'))) {
        const desc = data.classFeatures.desc?.[idx];
        aura = desc ? `${fn}（${desc.slice(0, 30)}）` : fn;
      }
    });
  }

  // 2. 防御
  const ac = data.defenses?.armorClass?.ac || 10;
  const touch = data.defenses?.armorClass?.touch || 10;
  const flatFooted = data.defenses?.armorClass?.flatFooted || 10;
  const acSource = data.defenses?.armorClass?.source || '';

  const hp = data.defenses?.hp || 0;
  const hd = data.defenses?.hd || '';
  const fort = formatModifier(data.defenses?.saves?.fort || 0);
  const ref = formatModifier(data.defenses?.saves?.ref || 0);
  const will = formatModifier(data.defenses?.saves?.will || 0);
  const conditionalSaves = data.defenses?.saves?.notes?.trim() || '';

  // 防御能力拆解（从 specialDefenses 提取或整合）
  const fullDefenses = data.defenses?.specialDefenses?.trim() || '';
  let dr = '';
  let immune = '';
  let resist = '';
  let sr = '';
  let weakness = '';
  let specialDefenses = fullDefenses;

  // 3. 进攻
  const speeds: string[] = [];
  const speedObj = data.basic?.speed || { land: 30, fly: 0, maneuverability: 2, swim: 0, climb: 0, burrow: 0 };
  speeds.push(`${speedObj.land || 30}尺`);
  if (speedObj.fly && speedObj.fly > 0) {
    const manStr = handlers.ManeuverabilityHandler.formatDisplay(speedObj.maneuverability, { t });
    speeds.push(`飞行 ${speedObj.fly}尺（${manStr}）`);
  }
  if (speedObj.swim && speedObj.swim > 0) speeds.push(`游泳 ${speedObj.swim}尺`);
  if (speedObj.climb && speedObj.climb > 0) speeds.push(`攀爬 ${speedObj.climb}尺`);
  if (speedObj.burrow && speedObj.burrow > 0) speeds.push(`掘地 ${speedObj.burrow}尺`);
  const speed = speeds.join('，');

  // 近战与远程攻击
  const meleeAttacks: FormattedAttack[] = [];
  if (data.attacks?.melee?.weapon) {
    data.attacks.melee.weapon.forEach((wpn, i) => {
      if (!wpn || wpn.trim() === '') return;
      const hit = formatModifier(data.attacks.melee.hit?.[i] || 0);
      const dmg = data.attacks.melee.damage?.[i] || '1d4';
      const cRange = data.attacks.melee.critRange?.[i] || 20;
      const cMult = data.attacks.melee.critMultiplier?.[i] || 2;
      const critText = cRange < 20 ? `${cRange}-20/x${cMult}` : `x${cMult}`;
      const touchDist = data.attacks.melee.touch?.[i];
      const touchStr = touchDist && touchDist > 5 ? `触及 ${touchDist}尺` : '';
      const dmgType = data.attacks.melee.damageType?.[i] || '';
      const special = data.attacks.melee.special?.[i] || '';

      const parenParts = [`${dmg}/${critText}`, touchStr, dmgType, special].filter(Boolean);
      const fullText = `${wpn} ${hit} (${parenParts.join(' ')})`;
      meleeAttacks.push({
        weapon: wpn,
        hit,
        damage: dmg,
        crit: critText,
        damageType: dmgType,
        special,
        fullText
      });
    });
  }

  const rangedAttacks: FormattedAttack[] = [];
  if (data.attacks?.ranged?.weapon) {
    data.attacks.ranged.weapon.forEach((wpn, i) => {
      if (!wpn || wpn.trim() === '') return;
      const hit = formatModifier(data.attacks.ranged.hit?.[i] || 0);
      const dmg = data.attacks.ranged.damage?.[i] || '1d4';
      const cRange = data.attacks.ranged.critRange?.[i] || 20;
      const cMult = data.attacks.ranged.critMultiplier?.[i] || 2;
      const critText = cRange < 20 ? `${cRange}-20/x${cMult}` : `x${cMult}`;
      const rangeDist = data.attacks.ranged.range?.[i];
      const rangeStr = rangeDist ? `${rangeDist}尺` : '';
      const dmgType = data.attacks.ranged.damageType?.[i] || '';
      const special = data.attacks.ranged.special?.[i] || '';

      const parenParts = [`${dmg}/${critText}`, rangeStr, dmgType, special].filter(Boolean);
      const fullText = `${wpn} ${hit} (${parenParts.join(' ')})`;
      rangedAttacks.push({
        weapon: wpn,
        hit,
        damage: dmg,
        crit: critText,
        rangeOrTouch: rangeStr,
        damageType: dmgType,
        special,
        fullText
      });
    });
  }

  const { space, reach } = getSpaceAndReach(data.basic?.size ?? 4);
  const specialAttacks = data.attacks?.specialAttacks?.trim() || '';

  // 法术与类法术
  const magicBlocks: FormattedMagicBlock[] = [];
  if (Array.isArray(data.magicBlocks)) {
    data.magicBlocks.forEach(b => {
      if (!b) return;
      const title = b.title || t('editor.spells.default_block_title', '法术');
      const cl = b.casterLevel ? String(b.casterLevel) : '';
      const type = b.type ?? 2;
      const isExtractBlock = type === 4; // 化合炼成没有专注
      const concentration = (!isExtractBlock && b.concentration) ? formatModifier(b.concentration) : '';
      const typeName = handlers.SpellTypeHandler.formatDisplay(type, { t }) || '';

      const spellsArr: string[] = Array.isArray(b.spells) ? b.spells : [];
      const usesArr: (number | string)[] = Array.isArray(b.uses) ? b.uses : [];
      const rowCount = Math.max(spellsArr.length, usesArr.length);

      const rows: { levelText: string; usesText: string; spellsText: string }[] = [];
      const isSpellBlock = type !== 5;
      const lowestLevel = handlers.SpellTypeHandler.lowestLevel[type] || 0;

      for (let i = 0; i < rowCount; i++) {
        const spellNames = (spellsArr[i] || '').trim();
        if (!spellNames) continue; // 跳过空法术行

        const usesVal = usesArr[i];
        let levelText = '';
        if (isSpellBlock) {
          const compLevel = rowCount - 1 - i + lowestLevel;
          const levelName = t('editor.spells.computed_level', { n: compLevel });
          if (compLevel === 0) {
            if (usesVal !== undefined && usesVal !== '' && usesVal !== 0 && usesVal !== '0') {
              levelText = `${levelName}（${usesVal}/日）`;
            } else {
              levelText = `${levelName}（${t('editor.spells.at_will', '随意')}）`;
            }
          } else {
            if (usesVal !== undefined && usesVal !== '' && usesVal !== 0 && usesVal !== '0') {
              levelText = `${levelName}（${usesVal}/日）`;
            } else {
              levelText = levelName;
            }
          }
        } else {
          // 类法术能力：完全由使用频率驱动（恒定、随意、3次/日、1次/日等）
          if (usesVal === undefined || usesVal === '' || usesVal === 0 || usesVal === '0') {
            levelText = t('editor.spells.at_will', '随意');
          } else if (typeof usesVal === 'number' || /^\d+$/.test(String(usesVal).trim())) {
            levelText = `${usesVal}次/日`;
          } else {
            levelText = String(usesVal).trim();
          }
        }

        rows.push({
          levelText,
          usesText: '',
          spellsText: spellNames
        });
      }

      if (rows.length > 0 || b.notes) {
        magicBlocks.push({
          title,
          cl,
          concentration,
          type,
          typeName,
          rows,
          notes: b.notes?.trim()
        });
      }
    });
  }

  // 4. 统计
  const attributes = ATTRIBUTE_NAMES.map((nameKey, i) => {
    const val = data.attributes?.final?.[i] ?? 10;
    const mod = getModifier(val);
    const label = t(`editor.attributes.${i}`);
    return {
      name: label,
      value: val,
      mod: formatModifier(mod)
    };
  });

  const bab = formatModifier(data.combatManeuver?.bab || 0);
  const cmb = formatModifier(data.combatManeuver?.cmb || 0);
  const cmd = data.combatManeuver?.cmd || 10;

  // 专长
  const feats: { name: string; type?: string; desc?: string }[] = [];
  if (data.feats?.name) {
    data.feats.name.forEach((fname, i) => {
      if (!fname || fname.trim() === '') return;
      feats.push({
        name: fname.trim(),
        type: data.feats.type?.[i],
        desc: data.feats.desc?.[i]
      });
    });
  }

  // 技能：仅取 rank > 0 的技能与无论是否有点数的察觉（Perception）
  const skills: { name: string; total: string; rank: number }[] = [];
  if (data.skills?.name) {
    data.skills.name.forEach((sNameId, i) => {
      const rank = parseInt(data.skills.rank?.[i] as any, 10) || 0;
      const total = data.skills.total?.[i] ?? 0;
      const row = {
        name: sNameId,
        rank,
        category: data.skills.category?.[i]
      };
      const formattedName = handlers.SkillNameHandler.formatDisplay(sNameId, { t, row });
      const isPerception = formattedName.includes('察觉') || formattedName.toLowerCase().includes('perception');

      if (rank > 0 || isPerception) {
        skills.push({
          name: formattedName,
          total: formatModifier(total),
          rank
        });
      }
    });
  }
  // 按字母/拼音或排序
  skills.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  // 语言
  const languagesList: string[] = [];
  if (Array.isArray(data.basic?.languages)) {
    data.basic.languages.forEach(l => {
      const fLang = handlers.LanguagesHandler.formatDisplay(l, { t });
      if (fLang && fLang !== '—') languagesList.push(fLang);
    });
  }
  const languages = languagesList.join('，') || '通用语';

  // 特殊能力汇总（种族特性、背景特性、职业特性）
  const specialQualities: { name: string; type?: string; desc?: string }[] = [];
  if (data.racialTraits?.name) {
    data.racialTraits.name.forEach((rname, i) => {
      if (!rname || rname.trim() === '') return;
      if (data.racialTraits?.SQshow?.[i] === false) return;
      specialQualities.push({
        name: rname.trim(),
        desc: data.racialTraits.desc?.[i]
      });
    });
  }
  if (data.backgroundTraits?.name) {
    data.backgroundTraits.name.forEach((bname, i) => {
      if (!bname || bname.trim() === '') return;
      if (data.backgroundTraits?.SQshow?.[i] === false) return;
      specialQualities.push({
        name: bname.trim(),
        desc: data.backgroundTraits.desc?.[i]
      });
    });
  }
  if (data.classFeatures?.name) {
    data.classFeatures.name.forEach((cname, i) => {
      if (!cname || cname.trim() === '') return;
      if (data.classFeatures?.SQshow?.[i] === false) return;
      const typeCode = data.classFeatures.type?.[i] ?? 0;
      const typeLabel = ['', 'Sp', 'Su', 'Ex'][typeCode] || '';
      specialQualities.push({
        name: cname.trim(),
        type: typeLabel,
        desc: data.classFeatures.desc?.[i]
      });
    });
  }

  // 装备分流（战斗装备与其它装备）
  const combatGear: string[] = [];
  const otherGear: string[] = [];
  if (data.equipment?.container) {
    data.equipment.container.forEach(bag => {
      if (!bag.item) return;
      const bagName = bag.name?.toLowerCase() || '';
      const isCombatBag = bagName.includes('战斗') || bagName.includes('随身') || bagName.includes('武器') || bagName.includes('消耗');

      bag.item.forEach((item, i) => {
        if (!item || item.trim() === '') return;
        const qty = bag.quantity?.[i] || 1;
        const itemText = qty > 1 ? `${item} (${qty})` : item;
        const itemLower = item.toLowerCase();
        if (
          isCombatBag ||
          itemLower.includes('药水') ||
          itemLower.includes('卷轴') ||
          itemLower.includes('魔棒') ||
          itemLower.includes('弹药') ||
          itemLower.includes('箭')
        ) {
          combatGear.push(itemText);
        } else {
          otherGear.push(itemText);
        }
      });
    });
  }

  // 特殊能力详细条目列表（供底部或弹层使用）
  const specialAbilities: { name: string; type: string; desc: string }[] = [];
  specialQualities.forEach(sq => {
    if (sq.desc && sq.desc.trim()) {
      specialAbilities.push({
        name: sq.name,
        type: sq.type || '',
        desc: sq.desc.trim()
      });
    }
  });

  return {
    name,
    cr: crStr,
    mr: overrideMR,
    xp: xpStr,
    classes,
    race,
    alignment,
    size,
    typeSubtype,
    initiative,
    senses,
    aura,
    ac,
    touch,
    flatFooted,
    acSource,
    hp,
    hd,
    regenFastHealing: '',
    fort,
    ref,
    will,
    conditionalSaves,
    specialDefenses,
    dr,
    immune,
    resist,
    sr,
    weakness,
    speed,
    meleeAttacks,
    rangedAttacks,
    space,
    reach,
    specialAttacks,
    magicBlocks,
    attributes,
    bab,
    cmb,
    cmd,
    feats,
    skills,
    languages,
    specialQualities,
    combatGear,
    otherGear,
    specialAbilities
  };
};

/**
 * 将角色数据渲染为严格符合《怪物数据卡Markdown模板.md》格式的 Markdown 文本
 */
export const exportStatBlockToMarkdown = (
  data: CharacterData,
  t: any,
  overrideCR?: number | string,
  overrideMR?: number
): string => {
  const sb = formatStatBlockData(data, t, overrideCR, overrideMR);
  const lines: string[] = [];

  // 1. 标题
  const mrPart = sb.mr ? `，神话阶层 MR ${sb.mr}` : '';
  lines.push(`# ${sb.name}（CR ${sb.cr}${mrPart}）`);
  lines.push('');
  lines.push(`**经验值 ${sb.xp}**`);
  lines.push(`${sb.race ? `${sb.race} ` : ''}${sb.classes}`);
  lines.push(`${sb.alignment} ${sb.size} ${sb.typeSubtype}`);
  lines.push(`**先攻** ${sb.initiative}；**感官** ${sb.senses}`);
  if (sb.aura) {
    lines.push(`**灵光** ${sb.aura}`);
  }
  lines.push('');

  // 2. 防御
  lines.push('------');
  lines.push('### 防御');
  lines.push('------');
  const acSources = sb.acSource ? `（${sb.acSource}）` : '';
  lines.push(`**AC** ${sb.ac}，**接触** ${sb.touch}，**措手不及** ${sb.flatFooted}${acSources}`);
  const hdPart = sb.hd ? `（${sb.hd}）` : '';
  lines.push(`**hp** ${sb.hp}${hdPart}`);
  const savesCond = sb.conditionalSaves ? `（${sb.conditionalSaves}）` : '';
  lines.push(`**豁免** 强韧 ${sb.fort}，反射 ${sb.ref}，意志 ${sb.will}${savesCond}`);
  if (sb.specialDefenses) {
    lines.push(`**防御能力** ${sb.specialDefenses}`);
  }
  lines.push('');

  // 3. 进攻
  lines.push('------');
  lines.push('### 进攻');
  lines.push('------');
  lines.push(`**速度** ${sb.speed}`);
  if (sb.meleeAttacks.length > 0) {
    lines.push(`**近战** ${sb.meleeAttacks.map(a => a.fullText).join('，')}`);
  }
  if (sb.rangedAttacks.length > 0) {
    lines.push(`**远程** ${sb.rangedAttacks.map(a => a.fullText).join('，')}`);
  }
  lines.push(`**占据** ${sb.space}尺；**触及** ${sb.reach}尺`);
  if (sb.specialAttacks) {
    lines.push(`**特殊攻击** ${sb.specialAttacks}`);
  }

  // 法术/类法术列表
  if (sb.magicBlocks.length > 0) {
    sb.magicBlocks.forEach(b => {
      lines.push('');
      const clPart = b.cl ? `施法者等级 ${b.cl}级` : '';
      const concPart = b.concentration ? `专注 ${b.concentration}` : '';
      const meta = [clPart, concPart].filter(Boolean).join('；');
      lines.push(`**${b.title}**${meta ? `（${meta}）` : ''}`);
      b.rows.forEach(r => {
        lines.push(`- **${r.levelText}** —— ${r.spellsText}`);
      });
      if (b.notes) {
        lines.push(`**备注** ${b.notes}`);
      }
    });
  }
  lines.push('');

  // 4. 统计
  lines.push('------');
  lines.push('### 统计');
  lines.push('------');
  const attrStr = sb.attributes.map(a => `${a.name} ${a.value} (${a.mod})`).join('，');
  lines.push(`**属性** ${attrStr}`);
  lines.push(`**BAB** ${sb.bab}；**CMB** ${sb.cmb}；**CMD** ${sb.cmd}`);
  if (sb.feats.length > 0) {
    lines.push(`**专长** ${sb.feats.map(f => f.name).join('，')}`);
  }
  if (sb.skills.length > 0) {
    lines.push(`**技能** ${sb.skills.map(s => `${s.name} ${s.total}`).join('，')}`);
  }
  lines.push(`**语言** ${sb.languages}`);
  if (sb.specialQualities.length > 0) {
    lines.push(`**特殊能力** ${sb.specialQualities.map(sq => sq.name).join('，')}`);
  }
  if (sb.combatGear.length > 0) {
    lines.push(`**战斗装备** ${sb.combatGear.join('，')}`);
  }
  if (sb.otherGear.length > 0) {
    lines.push(`**其他装备** ${sb.otherGear.join('，')}`);
  }
  lines.push('');

  // 5. 特殊能力详细描述
  if (sb.specialAbilities.length > 0) {
    lines.push('------');
    lines.push('### 特殊能力');
    lines.push('------');
    sb.specialAbilities.forEach(sa => {
      const typeStr = sa.type ? ` (${sa.type})` : '';
      lines.push(`**${sa.name}${typeStr}** ${sa.desc}`);
      lines.push('');
    });
  }

  return lines.join('\n');
};

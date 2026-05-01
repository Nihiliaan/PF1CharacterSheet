import { ATTRIBUTE_NAMES } from '../types';

export function generateBBCode(data: any, template: string): string {
  let bbcode = template;

  const getS = (obj: any, path: string) => {
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      // Handle array access like avatars.0.url
      if (Array.isArray(curr) && /^\d+$/.test(p)) {
        curr = curr[parseInt(p)];
      } else {
        curr = curr[p];
      }
    }
    return curr;
  };

  const formatDynamicBlock = (blocks: any[]) => {
    if (!blocks || blocks.length === 0) return '无';
    return blocks.map(block => {
      let blockResult = `[b]${block.title}[/b]\n`;
      if (block.type === 'text') {
        blockResult += block.content || '暂无内容';
      } else if (block.type === 'table') {
        const cols = block.columns || [];
        const tableData = block.tableData || [];
        blockResult += '[table]\n';
        blockResult += '[tr]' + cols.map((c: any) => `[td][b]${c.label}[/b][/td]`).join('') + '[/tr]\n';
        tableData.forEach((row: any) => {
          blockResult += '[tr]' + cols.map((c: any) => `[td]${row[c.key] || ''}[/td]`).join('') + '[/tr]\n';
        });
        blockResult += '[/table]';
      } else if (block.type === 'image') {
        blockResult += block.url ? `[img]${block.url}[/img]` : '暂无图片';
      }
      return blockResult;
    }).join('\n[hr]\n');
  };

  // Prepare special/computed variables
  const vars: Record<string, string> = {};

  // Basic shortcuts for convenience (legacy)
  const basicFields = ['name', 'classes', 'alignment', 'deity', 'size', 'gender', 'race', 'age', 'height', 'weight', 'speed', 'senses', 'initiative', 'perception', 'languages'];
  basicFields.forEach(f => {
    vars[f] = String(getS(data, `basic.${f}`) || '');
  });

  vars['avatarUrl'] = getS(data, 'basic.avatars.0.url') || 'http://此处填写人物头像图片地址';

  // Attributes Table
  vars['attributesTable'] = '[table]\n[tr][td][b]属性[/b][/td][td][b]数值[/b][/td][td][b]调整值[/b][/td][td][b]说明[/b][/td][/tr]\n' +
    (data.attributes || []).map((a: any, i: number) =>
      `[tr][td]${ATTRIBUTE_NAMES[i] || '-'}[/td][td]${a.final || '-'}[/td][td]${a.modifier || '-'}[/td][td]${a.source || ''}${a.status ? ' ' + a.status : ''}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  // BAB/CMB/CMD
  const babTable = getS(data, 'babTable');
  const cmNotes = getS(data, 'combatManeuverNotes');

  let bab = '', cmb = '', cmd = '';
  if (babTable && Array.isArray(babTable) && babTable.length > 0) {
    bab = babTable[0].bab;
    cmb = babTable[0].cmb;
    cmd = babTable[0].cmd;
  }
  vars['bab'] = bab;
  vars['cmb'] = cmb;
  vars['cmd'] = cmd;
  vars['combatManeuverNotes'] = cmNotes || '';

  // Attack Tables
  const attackHeader = '[tr][td][b]名称[/b][/td][td][b]命中[/b][/td][td][b]伤害/重击/类型[/b][/td][td][b]射程/特性[/b][/td][/tr]';

  vars['meleeAttackTable'] = '[table]\n' + attackHeader + '\n' + (data.meleeAttacks || []).map((m: any) =>
    `[tr][td]${m.weapon || '-'}[/td][td]${m.hit || '-'}[/td][td]${m.damage || '-'}/${m.crit || '-'}/${m.type || '-'}[/td][td]${m.range || '-'}/${m.special || '-'}[/td][/tr]`
  ).join('\n') + '\n[/table]';

  vars['rangedAttackTable'] = '[table]\n' + attackHeader + '\n' + (data.rangedAttacks || []).map((m: any) =>
    `[tr][td]${m.weapon || '-'}[/td][td]${m.hit || '-'}[/td][td]${m.damage || '-'}/${m.crit || '-'}/${m.type || '-'}[/td][td]${m.range || '-'}/${m.special || '-'}[/td][/tr]`
  ).join('\n') + '\n[/table]';

  // Defenses
  const defenses = data.defenses || {};
  const acData = defenses.acTable?.[0] || {};
  vars['ac'] = acData.ac || '';
  vars['acFlatFooted'] = acData.flatFooted || '';
  vars['acTouch'] = acData.touch || '';
  vars['acNotes'] = defenses.acNotes || '';
  vars['acLine'] = acData.ac ? `[b]AC[/b] ${acData.ac}, [b]措手不及[/b] ${acData.flatFooted || '-'}, [b]接触[/b] ${acData.touch || '-'}${defenses.acNotes ? ` (${defenses.acNotes})` : ''}` : '';

  vars['hp'] = defenses.hp || '';
  vars['hd'] = defenses.hd || '';
  vars['hpLine'] = `[b]HP[/b] ${defenses.hp}${defenses.hd ? ` (${defenses.hd})` : ''}`;

  const saveData = defenses.savesTable?.[0] || {};
  vars['saveFort'] = saveData.fort || '';
  vars['saveRef'] = saveData.ref || '';
  vars['saveWill'] = saveData.will || '';
  vars['savesNotes'] = defenses.savesNotes || '';
  vars['saveLine'] = saveData.fort ? `[b]强韧[/b] ${saveData.fort}, [b]反射[/b] ${saveData.ref}, [b]意志[/b] ${saveData.will}${defenses.savesNotes ? ` (${defenses.savesNotes})` : ''}` : '';
  vars['defensiveAbilities'] = getS(data, 'defenses.defensiveAbilities') || '无';

  // Traits
  vars['racialTraits'] = (data.racialTraits || []).map((r: any) => `[b]${r.name}[/b]: ${r.desc}`).join('\n') || '无';
  vars['backgroundTraits'] = (data.backgroundTraits || []).map((r: any) => `[b]${r.name}[/b] (${r.type}): ${r.desc}`).join('\n') || '无';

  // Class Features
  vars['favoredClass'] = getS(data, 'favoredClass') || '';
  vars['favoredClassBonus'] = getS(data, 'favoredClassBonus') || '';
  vars['classFeatures'] = (data.classFeatures || []).map((f: any) => `[b]${f.name}[/b]: ${f.desc}`).join('\n') || '无';

  // Feats Table
  vars['featTable'] = '[table]\n[tr][td][b]等级[/b][/td][td][b]名称[/b][/td][td][b]描述[/b][/td][/tr]\n' +
    (data.feats || []).map((f: any) =>
      `[tr][td]${f.level || '-'}[/td][td]${f.name || '-'}[/td][td]${f.desc || '-'}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  // Skill Table
  vars['skillTable'] = '[table]\n[tr][td][b]技能[/b][/td][td][b]总值[/b][/td][td][b]等级[/b][/td][td][b]本职[/b][/td][td][b]属性[/b][/td][td][b]其它/特殊[/b][/td][/tr]\n' +
    (data.skills || []).map((s: any) => {
      const abilityIdx = ATTRIBUTE_NAMES.indexOf(s.ability);
      let abilityMod = '';
      if (abilityIdx !== -1) {
        const attr = data.attributes[abilityIdx];
        if (attr) {
          const mod = parseInt(attr.modifier);
          abilityMod = isNaN(mod) ? '' : (mod >= 0 ? `+${mod}` : `${mod}`);
        }
      }
      return `[tr][td]${s.name || '-'}[/td][td]${s.total || '-'}[/td][td]${s.rank || '-'}[/td][td]${s.cs === 'true' ? '+3' : ''}[/td][td]${abilityMod}[/td][td]${s.others || ''} ${s.special || ''}[/td][/tr]`;
    }).join('\n') + '\n[/table]';

  // Equipment Table
  if (!data.equipmentBags || data.equipmentBags.length === 0) {
    vars['equipmentTable'] = '无';
  } else {
    vars['equipmentTable'] = data.equipmentBags.map((bag: any) => {
      let bagResult = `[b]${bag.name}${bag.ignoreWeight ? ' (不计重)' : ''}[/b]\n`;
      const items = bag.items || [];
      if (items.length === 0) {
        bagResult += '此容器内无物品\n';
      } else {
        bagResult += '[table]\n[tr][td][b]物品[/b][/td][td][b]数量[/b][/td][td][b]价格[/b][/td][td][b]重量[/b][/td][td][b]说明[/b][/td][/tr]\n';
        bagResult += items.map((i: any) =>
          `[tr][td]${i.item || '-'}[/td][td]${i.quantity || '1'}[/td][td]${i.cost || '-'}[/td][td]${i.weight || '-'}[/td][td]${i.notes || '-'}[/td][/tr]`
        ).join('\n');
        bagResult += '\n[/table]';
      }
      return bagResult;
    }).join('\n\n');
  }

  // Magic & Additional Blocks
  vars['magicBlocks'] = formatDynamicBlock(data.magicBlocks);
  vars['additionalData'] = formatDynamicBlock(data.additionalData);

  // Weight Calculation
  let totalWeight = 0;
  (data.equipmentBags || []).forEach((bag: any) => {
    if (!bag.ignoreWeight) {
      (bag.items || []).forEach((item: any) => {
        const w = parseFloat(item.weight) || 0;
        const q = parseInt(item.quantity) || 1;
        totalWeight += w * q;
      });
    }
  });

  // Calculate limits based on Strength (first attribute in Pathfinder)
  const strAttr = data.attributes?.[0];
  const strValue = strAttr ? parseInt(strAttr.final) || 10 : 10;
  const mult = parseFloat(data.encumbranceMultiplier) || 1;

  let heavy = 0;
  if (strValue <= 10) {
    heavy = strValue * 10;
  } else {
    const seq = [115, 130, 150, 175, 200, 230, 260, 300, 350];
    if (strValue >= 11 && strValue <= 19) { heavy = seq[strValue - 11]; }
    else {
      const eff = (strValue % 10) + 10;
      const baseHeavy = eff === 10 ? 100 : seq[eff - 11];
      const power = Math.floor((strValue - eff) / 10);
      heavy = baseHeavy * Math.pow(4, power);
    }
  }

  const lightLimit = Math.floor(heavy / 3 * mult);
  const mediumLimit = Math.floor(heavy * 2 / 3 * mult);
  const heavyLimit = Math.floor(heavy * mult);

  let status = '轻载';
  if (totalWeight > mediumLimit) status = '重载';
  else if (totalWeight > lightLimit) status = '中载';

  vars['loadStatus'] = `${status} (${totalWeight.toFixed(1)} lbs)`;
  vars['loadLimits'] = `${lightLimit} / ${mediumLimit} / ${heavyLimit}`;

  // Final replacement pass
  const regex = /\{([a-zA-Z0-9._]+)\}/g;
  bbcode = bbcode.replace(regex, (match, path) => {
    // 1. Check special/computed vars
    if (vars[path] !== undefined) return vars[path];

    // 2. Check path in data
    const pathVal = getS(data, path);
    if (typeof pathVal === 'string' || typeof pathVal === 'number') return String(pathVal);

    return match; // Keep the placeholder if no match found
  });

  return bbcode;
}

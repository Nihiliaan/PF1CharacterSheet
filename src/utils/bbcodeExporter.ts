import { ATTRIBUTE_NAMES, CharacterData } from '../types';

const getDisplayValue = (value: string, type: string, t: any): string => {
  if (type === 'bonus' && value !== '') {
    const num = parseInt(value);
    if (!isNaN(num)) return num >= 0 ? `+${num}` : num.toString();
  }
  if (type === 'level' && value !== '') {
    return t('editor.lists.level_format', { n: value });
  }
  if (type === 'distance' && value !== '') {
    return t('editor.lists.distance_format', { v: value });
  }
  if (type === 'cost') {
    if (!value) return '—';
    return `${value} ${t('editor.items.units.gp')}`;
  }
  if (type === 'weight') {
    if (!value) return '—';
    return `${value} ${t('editor.items.units.lbs')}`;
  }
  if (value === '' || value === undefined || value === null) return '';
  return String(value);
};

export function generateBBCode(data: CharacterData, template: string, t: any): string {
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
        blockResult += block.content || t('editor.lists.no_content') || '暂无内容';
      } else if (block.type === 'table') {
        const cols = block.columns || [];
        const tableData = block.tableData || [];
        blockResult += '[table]\n';
        tableData.forEach((row: any) => {
          blockResult += '[tr]' + cols.map((c: any) => `[td]${row[c.key] || ''}[/td]`).join('') + '[/tr]\n';
        });
        blockResult += '[/table]';
      } else if (block.type === 'image') {
        blockResult += block.url ? `[img]${block.url}[/img]` : (t('editor.lists.no_image') || '暂无图片');
      }
      return blockResult;
    }).join('\n[hr]\n');
  };

  const vars: Record<string, string> = {};

  const basicFields = ['name', 'classes', 'alignment', 'deity', 'size', 'gender', 'race', 'age', 'height', 'weight', 'speed', 'senses', 'initiative', 'perception', 'languages'];
  basicFields.forEach(f => {
    const val = getS(data, `basic.${f}`) || '';
    if (f === 'initiative' || f === 'perception') {
      vars[f] = getDisplayValue(val, 'bonus', t);
    } else {
      vars[f] = String(val);
    }
  });

  vars['avatarUrl'] = (getS(data, 'basic.avatars')?.[0]?.url) || 'http://此处填写人物头像图片地址';

  vars['acp'] = data.armorCheckPenalty && data.armorCheckPenalty !== '0' ? `-${data.armorCheckPenalty}` : '0';

  vars['attributesTable'] = '[table]\n' +
    (data.attributes || []).map((a: any, i: number) =>
      `[tr][td]${t('editor.attributes.' + ATTRIBUTE_NAMES[i]) || ''}[/td][td]${a.final || ''}[/td][td]${getDisplayValue(a.modifier, 'bonus', t)}[/td][td]${a.source || ''}${a.status ? ' ' + a.status : ''}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  const babTable = getS(data, 'babTable');
  const cmNotes = getS(data, 'combatManeuverNotes');

  let bab = '', cmb = '', cmd = '';
  if (babTable && Array.isArray(babTable) && babTable.length > 0) {
    bab = getDisplayValue(babTable[0].bab, 'bonus', t);
    cmb = getDisplayValue(babTable[0].cmb, 'bonus', t);
    cmd = babTable[0].cmd;
  }
  vars['bab'] = bab;
  vars['cmb'] = cmb;
  vars['cmd'] = cmd;
  vars['combatManeuverNotes'] = cmNotes || '';

  vars['meleeAttackTable'] = '[table]\n' + (data.meleeAttacks || []).map((m: any) => {
    const critStr = `${m.critRange || m.crit || ''}${m.critMultiplier || ''}`;
    const damageType = m.damageType || m.type || '';
    return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit, 'bonus', t)}}[/td][td]${m.damage || ''}/${critStr}/${damageType}[/td][td]${getDisplayValue(m.range, 'distance', t)}/${m.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  vars['rangedAttackTable'] = '[table]\n' + (data.rangedAttacks || []).map((m: any) => {
    const critStr = `${m.critRange || m.crit || ''}${m.critMultiplier || ''}`;
    const damageType = m.damageType || m.type || '';
    return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit, 'bonus', t)}[/td][td]${m.damage || ''}/${critStr}/${damageType}[/td][td]${getDisplayValue(m.range, 'distance', t)}/${m.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  const defenses = data.defenses || {} as any;
  const acData = defenses.acTable?.[0] || {};
  vars['ac'] = acData.ac || '';
  vars['acFlatFooted'] = acData.flatFooted || '';
  vars['acTouch'] = acData.touch || '';
  vars['acNotes'] = defenses.acNotes || '';
  vars['acLine'] = acData.ac ? `[b]AC[/b] ${acData.ac}, [b]${t('editor.defenses.flat_footed')}[/b] ${acData.flatFooted || ''}, [b]${t('editor.defenses.touch')}[/b] ${acData.touch || ''}${defenses.acNotes ? ` (${defenses.acNotes})` : ''}` : '';

  vars['hp'] = defenses.hp || '';
  vars['hd'] = defenses.hd || '';
  vars['hpLine'] = `[b]HP[/b] ${defenses.hp}${defenses.hd ? ` (${defenses.hd})` : ''}`;

  const saveData = defenses.savesTable?.[0] || {};
  vars['saveFort'] = getDisplayValue(saveData.fort, 'bonus', t);
  vars['saveRef'] = getDisplayValue(saveData.ref, 'bonus', t);
  vars['saveWill'] = getDisplayValue(saveData.will, 'bonus', t);
  vars['savesNotes'] = defenses.savesNotes || '';
  vars['saveLine'] = saveData.fort ? `[b]${t('editor.defenses.fort')}[/b] ${getDisplayValue(saveData.fort, 'bonus', t)}, [b]${t('editor.defenses.ref')}[/b] ${getDisplayValue(saveData.ref, 'bonus', t)}, [b]${t('editor.defenses.will')}[/b] ${getDisplayValue(saveData.will, 'bonus', t)}${defenses.savesNotes ? ` (${defenses.savesNotes})` : ''}` : '';
  vars['defensiveAbilities'] = getS(data, 'defenses.defensiveAbilities') || '无';

  vars['racialTraits'] = (data.racialTraits || []).map((r: any) => `[b]${r.name}[/b]: ${r.desc}`).join('\n') || '无';
  vars['backgroundTraits'] = (data.backgroundTraits || []).map((r: any) => `[b]${r.name}[/b] (${r.type}): ${r.desc}`).join('\n') || '无';

  vars['favoredClass'] = getS(data, 'favoredClass') || '';
  vars['favoredClassBonus'] = getS(data, 'favoredClassBonus') || '';
  vars['classFeatures'] = (data.classFeatures || []).map((f: any) => `[b]${f.name}[/b] [i]${getDisplayValue(f.level, 'level', t)}${f.type ? ' ' + f.type : ''}[/i]: ${f.desc}`).join('\n') || '无';

  vars['featTable'] = '[table]\n' +
    (data.feats || []).map((f: any) =>
      `[tr][td]${getDisplayValue(f.level, 'level', t)}[/td][td]${f.name || ''}${f.type ? ` (${f.type})` : ''}[/td][td]${f.desc || ''}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  vars['skillTable'] = '[table]\n' +
    (data.skills || []).map((s: any) => {
      let abilityIdx = -1;
      if (typeof s.ability === 'string' && /^\d+$/.test(s.ability)) {
        abilityIdx = parseInt(s.ability) - 1;
      } else {
        abilityIdx = ATTRIBUTE_NAMES.indexOf(s.ability);
      }

      let abilityStr = '';
      if (abilityIdx >= 0 && abilityIdx < 6) {
        const attrData = data.attributes[abilityIdx];
        if (attrData) {
          const localizedName = t('editor.attributes.' + ATTRIBUTE_NAMES[abilityIdx]);
          const modStr = getDisplayValue(attrData.modifier, 'bonus', t);
          abilityStr = `${localizedName} ${modStr}`;
        }
      } else {
        abilityStr = '—';
      }

      const details = [
        getDisplayValue(s.rank, 'level', t),
        s.cs === 'true' ? '+3' : '',
        abilityStr,
        s.others,
        s.special
      ].filter(x => x).join('');

      const totalValue = getDisplayValue(s.total, 'bonus', t) || '0';
      const mergedString = details ? `${totalValue} (${details})` : totalValue;

      return `[tr][td]${s.name || ''}[/td][td]${mergedString}[/td][/tr]`;
    }).join('\n') + '\n[/table]';

  let itemsWeight = 0;
  let itemsValue = 0;
  
  if (!data.equipmentBags || data.equipmentBags.length === 0) {
    vars['equipmentTable'] = '无';
  } else {
    vars['equipmentTable'] = data.equipmentBags.map((bag: any) => {
      let bagResult = `[b]${bag.name}${bag.ignoreWeight ? ' (' + (t('editor.items.units.ignore_weight') || '不计重') + ')' : ''}[/b]\n`;
      const items = bag.items || [];
      if (items.length === 0) {
        bagResult += (t('editor.items.no_items') || '此容器内无物品') + '\n';
      } else {
        bagResult += '[quote][table]\n';
        bagResult += items.map((i: any) => {
          const q = parseInt(i.quantity) || 1;
          const w = parseFloat(i.weight) || 0;
          const c = parseFloat(i.cost) || 0;
          const totalW = (w * q).toFixed(1);
          const totalC = (c * q).toFixed(1);
          
          if (!bag.ignoreWeight) itemsWeight += w * q;
          itemsValue += c * q;

          const name = i.item + (q > 1 ? `(${q})` : '');
          return `[tr][td]${name || ''}[/td][td]${(totalC === '0.0' || totalC === '0') ? '' : totalC + 'gp'}[/td][td]${(totalW === '0.0' || totalW === '0') ? '' : totalW + 'lbs'}[/td][td]${i.notes || ''}[/td][/tr]`;
        }).join('\n');
        bagResult += '\n[/table][/quote]';
      }
      return bagResult;
    }).join('\n');
  }

  const pp = parseInt(data.currency?.pp) || 0;
  const gp = parseInt(data.currency?.gp) || 0;
  const sp = parseInt(data.currency?.sp) || 0;
  const cp = parseInt(data.currency?.cp) || 0;
  const totalCoins = pp + gp + sp + cp;
  const coinWeightStr = data.currency?.coinWeight || '0.02';
  const coinWeight = parseFloat(coinWeightStr);
  const currencyWeight = totalCoins * coinWeight;
  const currencyValue = pp * 10 + gp + sp * 0.1 + cp * 0.01;
  
  const coinTexts = [];
  if (pp > 0) coinTexts.push(`${pp}${t('editor.items.pp').split(' (')[0]}`);
  if (gp > 0) coinTexts.push(`${gp}${t('editor.items.gp').split(' (')[0]}`);
  if (sp > 0) coinTexts.push(`${sp}${t('editor.items.sp').split(' (')[0]}`);
  if (cp > 0) coinTexts.push(`${cp}${t('editor.items.cp').split(' (')[0]}`);
  const coinsLine = coinTexts.length > 0 ? `${t('editor.items.currency') || '钱币'}（${coinTexts.join('')}）` : `${t('editor.items.currency') || '钱币'}（无）`;
  
  vars['currencyLine'] = `[b]${coinsLine} ${t('editor.items.coin_weight_total') || '钱币总重量'} ${currencyWeight.toFixed(1)}磅 ${t('editor.items.total_assets') || '钱币总价值'} ${currencyValue.toFixed(2)}gp[/b]`;

  const finalTotalWeight = itemsWeight + currencyWeight;
  
  const strAttr = data.attributes?.[0];
  const strValue = strAttr ? parseInt(strAttr.final) || 10 : 10;
  const mult = parseFloat(data.encumbranceMultiplier) || 1;

  let heavyLimitBase = 0;
  if (strValue <= 10) {
    heavyLimitBase = strValue * 10;
  } else {
    const seq = [115, 130, 150, 175, 200, 230, 260, 300, 350];
    if (strValue >= 11 && strValue <= 19) { heavyLimitBase = seq[strValue - 11]; }
    else {
      const eff = (strValue % 10) + 10;
      const baseHeavy = eff === 10 ? 100 : seq[eff - 11];
      const power = Math.floor((strValue - eff) / 10);
      heavyLimitBase = baseHeavy * Math.pow(4, power);
    }
  }

  const lightLimit = Math.floor(heavyLimitBase / 3 * mult);
  const mediumLimit = Math.floor(heavyLimitBase * 2 / 3 * mult);
  const heavyLimit = Math.floor(heavyLimitBase * mult);

  let statusKey = t('editor.items.light');
  if (finalTotalWeight > heavyLimit) statusKey = t('editor.items.overload');
  else if (finalTotalWeight > mediumLimit) statusKey = t('editor.items.heavy');
  else if (finalTotalWeight > lightLimit) statusKey = t('editor.items.medium');

  vars['loadSummary'] = `[b]${t('editor.items.total_weight') || '负重'} ${statusKey} ${finalTotalWeight.toFixed(1)}磅（${t('editor.items.actual_weight') || '实际总负重'}） ${lightLimit}/${mediumLimit}/${heavyLimit}（${t('editor.items.load_limits') || '轻载/中载/重载上限'}）[/b]`;

  vars['loadStatus'] = `${statusKey} (${finalTotalWeight.toFixed(1)} lbs)`;
  vars['loadLimits'] = `${lightLimit} / ${mediumLimit} / ${heavyLimit}`;

  vars['equipmentSection'] = vars['equipmentTable'] + '\n' + vars['currencyLine'] + '\n' + vars['loadSummary'];

  const regex = /\{([a-zA-Z0-9._]+)\}/g;
  bbcode = bbcode.replace(regex, (match, path) => {
    if (vars[path] !== undefined) return vars[path];
    const pathVal = getS(data, path);
    if (typeof pathVal === 'string' || typeof pathVal === 'number') return String(pathVal);
    if (path === 'armorCheckPenalty') return vars['acp'];
    return match;
  });

  return bbcode;
}

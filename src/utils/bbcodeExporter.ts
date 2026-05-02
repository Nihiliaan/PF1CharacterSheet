import { ATTRIBUTE_NAMES, CharacterData } from '../types';
import { getDisplayValue } from './formatters';

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
      } else if (block.type === 'spell') {
        // Spell blocks (SLA, Spontaneous, Prepared)
        const cl = block.casterLevel || '0';
        const conc = block.concentration || '0';
        blockResult += `[b]${t('editor.spells.cl') || '施法者等级'}[/b] ${getDisplayValue(cl, 'level', t)} [b]${t('editor.spells.concentration') || '集中'}[/b] ${getDisplayValue(conc, 'bonus', t)}\n`;

        const cols = block.columns || [];
        const tableData = block.tableData || [];
        if (tableData.length > 0) {
          blockResult += '[table]\n';
          tableData.forEach((row: any) => {
            blockResult += '[tr]' + cols.map((c: any) => `[td]${row[c.key] || ''}[/td]`).join('') + '[/tr]\n';
          });
          blockResult += '[/table]\n';
        }

        if (block.notes) {
          blockResult += `${block.notes}`;
        }
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
    return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit, 'bonus', t)}[/td][td]${m.damage || ''}[/td][td]${critStr}[/td][td]${damageType}[/td][td]${getDisplayValue(m.range, 'distance', t)}[/td][td]${m.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  vars['rangedAttackTable'] = '[table]\n' + (data.rangedAttacks || []).map((m: any) => {
    const critStr = `${m.critRange || m.crit || ''}${m.critMultiplier || ''}`;
    const damageType = m.damageType || m.type || '';
    return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit, 'bonus', t)}[/td][td]${m.damage || ''}[/td][td]${critStr}[/td][td]${damageType}[/td][td]${getDisplayValue(m.range, 'distance', t)}[/td][td]${m.special || ''}[/td][/tr]`;
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
  vars['defensiveAbilities'] = getS(data, 'defenses.defensiveAbilities') || t('common.none');
  vars['specialDefenses'] = getS(data, 'defenses.specialDefenses') || t('common.none');

  vars['racialTraits'] = '[table]\n' + (data.racialTraits || []).map((r: any) => `[tr][td]${r.name}[/td][td]${r.desc}[/td][/tr]`).join('\n') + '\n[/table]' || t('common.none');
  vars['backgroundTraits'] = (data.backgroundTraits || []).map((r: any) => `${r.name}(${r.type}): ${r.desc}`).join('\n') || t('common.none');

  vars['favoredClass'] = getS(data, 'favoredClass') || '';
  vars['favoredClassBonus'] = getS(data, 'favoredClassBonus') || '';
  vars['classFeatures'] = '[table]\n' + (data.classFeatures || []).map((f: any) => `[tr][td]${getDisplayValue(f.level, 'level', t)}${f.type ? ' ' + f.type : ''}[/td][td]${f.name}[/td][td]${f.desc}[/td][/tr]`).join('\n') + '\n[/table]' || t('common.none');

  vars['featTable'] = '[table]\n' +
    (data.feats || []).map((f: any) =>
      `[tr][td]${getDisplayValue(f.level, 'level', t)}[/td][td]${f.name || ''}${f.type ? ` (${f.type})` : ''}[/td][td]${f.desc || ''}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  const displayFormatter1 = (val) => {
    if (!val || val === '0') return '';
    const idx = parseInt(val, 10) - 1;
    const localizedName = t('editor.attributes.' + ATTRIBUTE_NAMES[idx]);
    const modStr = getDisplayValue(data.attributes[idx].modifier, 'bonus', t);
    return `${modStr}${localizedName}`;
  }

  vars['skillTable'] = '[table]\n' +
    (data.skills || []).map((s: any) => {
      const rankVal = parseInt(s.rank) || 0;
      const details = [
        getDisplayValue(s.rank, 'level', t),
        (s.cs === 'true' && rankVal > 0) ? `+3${t('editor.sections.cs_short')}` : '',
        displayFormatter1(s.ability),
        s.others,
        s.special
      ].filter(x => x).join('');

      const totalValue = getDisplayValue(s.total, 'bonus', t) || '0';
      const mergedString = details ? `${totalValue} (${details})` : totalValue;

      return `[tr][td]${s.name || ''}[/td][td]${mergedString}[/td][td]${s.special || ''}[/td][/tr]`;
    }).join('\n') + '\n[/table]';

  let itemsWeight = 0;
  let itemsValue = 0;

  if (!data.equipmentBags || data.equipmentBags.length === 0) {
    vars['equipmentTable'] = '无';
  } else {
    vars['equipmentTable'] = data.equipmentBags.map((bag: any) => {
      let bagResult = `[quote]\n[b]${bag.name}${bag.ignoreWeight ? ' (' + (t('editor.items.units.ignore_weight') || '不计重') + ')' : ''}[/b]\n`;
      const items = bag.items || [];
      if (items.length === 0) {
        bagResult += (t('editor.items.no_items') || '此容器内无物品') + '\n';
      } else {
        bagResult += '[table]\n';
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
        bagResult += '\n[/table]';
      }
      bagResult += '\n[/quote]'
      return bagResult;
    }).join('\n');
  }

  const pp = parseInt(data.currency?.pp) || 0;
  const gp = parseInt(data.currency?.gp) || 0;
  const sp = parseInt(data.currency?.sp) || 0;
  const cp = parseInt(data.currency?.cp) || 0;
  const currencyWeight = parseFloat(data.currency?.coinWeight) || 0;
  const currencyValue = pp * 10 + gp + sp * 0.1 + cp * 0.01;

  const coinTexts = [];
  if (pp > 0) coinTexts.push(`${pp}${t('editor.items.pp')}`);
  if (gp > 0) coinTexts.push(`${gp}${t('editor.items.gp')}`);
  if (sp > 0) coinTexts.push(`${sp}${t('editor.items.sp')}`);
  if (cp > 0) coinTexts.push(`${cp}${t('editor.items.cp')}`);
  const coinsLine = coinTexts.length > 0 ? `${t('editor.items.currency') || '钱币'}（${coinTexts.join('')}）` : `${t('editor.items.currency') || '钱币'}（无）`;

  vars['currencyLine'] = `[b]${coinsLine} ${t('editor.items.coin_weight_total') || '钱币总重'} ${currencyWeight.toFixed(1)}磅 ${t('editor.items.total_assets') || '钱币总价值'} ${currencyValue.toFixed(2)}gp[/b]`;

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

  vars['loadSummary'] = `[b]${t('editor.items.total_weight') || '负重'} ${statusKey} ${finalTotalWeight.toFixed(1)}磅 ${lightLimit}/${mediumLimit}/${heavyLimit}[/b]`;

  vars['loadStatus'] = `${statusKey} (${finalTotalWeight.toFixed(1)} lbs)`;
  vars['loadLimits'] = `${lightLimit} / ${mediumLimit} / ${heavyLimit}`;

  vars['equipmentSection'] = vars['equipmentTable'] + '\n' + vars['currencyLine'] + '\n' + vars['loadSummary'];

  vars['magicBlocks'] = formatDynamicBlock(data.magicBlocks || []);
  vars['additionalData'] = formatDynamicBlock(data.additionalData || []);

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

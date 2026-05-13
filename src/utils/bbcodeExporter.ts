import { ATTRIBUTE_NAMES, CharacterData } from '../types';
import { getDisplayValue } from './formatters';
import { calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance } from './calculations';

export function generateBBCode(data: CharacterData, template: string, t: any): string {
  let bbcode = template;

  const getS = (obj: any, path: string) => {
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      // Handle array access like avatars[0].url
      const arrayMatch = p.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const idx = parseInt(arrayMatch[2]);
        curr = curr[key]?.[idx];
      } else if (Array.isArray(curr) && /^\d+$/.test(p)) {
        curr = curr[parseInt(p)];
      } else {
        curr = curr[p];
      }
    }
    return curr;
  };

  const formatDynamicBlock = (blocks: any[], parentPath: string) => {
    if (!blocks || blocks.length === 0) return t('common.none') || '无';
    return blocks.map((block, index) => {
      let blockResult = `[b]${block.title}[/b]`;
      const blockPath = `${parentPath}[${index}]`;

      if (block.type === 'text') {
        blockResult += `\n${block.content || t('editor.lists.no_content') || '暂无内容'}`;
      } else if (block.type === 'table') {
        const cols = block.columns || [];
        const tableData = block.tableData || [];
        if (tableData.length > 0) {
          blockResult += '\n[table]\n';
          tableData.forEach((row: any, rowIndex: number) => {
            blockResult += '[tr]' + cols.map((c: any) => {
              const val = row[c.key] || '';
              // 按照 SoA 寻址：parentPath[index].tableData.key[rowIndex]
              const cellPath = `${blockPath}.tableData.${c.key}[${rowIndex}]`;
              return `[td]${getDisplayValue(val, c.type || 'text', t, { path: cellPath })}[/td]`;
            }).join('') + '[/tr]\n';
          });
          blockResult += '[/table]';
        }
      } else if (block.type === 'spell') {
        const cl = block.casterLevel || '0';
        const conc = block.concentration || '0';
        const clStr = getDisplayValue(cl, 'level', t, { path: `${blockPath}.casterLevel` });
        const concStr = getDisplayValue(conc, 'bonus', t, { path: `${blockPath}.concentration` });

        blockResult += `（[b]${t('editor.spells.caster_level')}[/b] ${clStr}；[b]${t('editor.spells.concentration')}[/b] ${concStr}）\n`;

        const tableData = block.tableData || [];
        const baseLevel = block.baseLevel ?? ((block.spellType === 0 || block.spellType === 2) ? 0 : 1);
        const spellType = block.spellType ?? 2;

        if (tableData.length > 0) {
          blockResult += '[table]\n';
          [...tableData].reverse().forEach((row: any, i: number) => {
            const rowIndex = tableData.length - 1 - i;
            const levelNum = rowIndex + baseLevel;
            const levelStr = t('editor.spells.computed_level', { n: levelNum }) || `${levelNum}环`;

            blockResult += '[tr]';
            if (spellType !== 4) blockResult += `[td]${levelStr}[/td]`;
            if (spellType !== 0 && spellType !== 1) {
              const usesVal = getDisplayValue(row.uses, 'dailyUses', t, { path: `${blockPath}.spellTable.uses[${rowIndex}]` });
              blockResult += `[td]${usesVal}[/td]`;
            }
            const spellsVal = row.spells || '';
            blockResult += `[td]${spellsVal}[/td]`;
            blockResult += '[/tr]\n';
          });
          blockResult += '[/table]\n';
        }

        if (block.notes) blockResult += `${block.notes}`;
      }
      return blockResult;
    }).join('\n[hr]\n');
  };

  const vars: Record<string, string> = {};

  // 1. Basic Info
  const basicFields = ['name', 'classes', 'alignment', 'deity', 'size', 'gender', 'race', 'age', 'height', 'weight', 'senses', 'initiative', 'perception', 'languages'];
  basicFields.forEach(f => {
    vars[f] = getDisplayValue(getS(data, `basic.${f}`) || '', 'text', t, { path: `basic.${f}` });
  });

  vars['speed'] = getDisplayValue(data.basic.speed.land, 'distance', t, { path: 'basic.speed.land' });

  vars['avatarUrl'] = (data.basic.avatars?.url?.[0]) || 'http://此处填写人物头像图片地址';
  vars['acp'] = getDisplayValue(data.armorCheckPenalty, 'int', t, { path: 'armorCheckPenalty' });

  // 2. Attributes
  vars['attributesTable'] = '[table]\n' +
    (data.attributes?.final || []).map((_, i: number) => {
      const name = t('editor.attributes.' + ATTRIBUTE_NAMES[i]) || '';
      const final = getDisplayValue(data.attributes.final[i], 'int', t, { path: `attributes.final[${i}]` });
      const mod = getDisplayValue(data.attributes.modifier[i], 'bonus', t, { path: `attributes.modifier[${i}]` });
      const source = data.attributes.source[i] || '';
      const status = data.attributes.status[i] ? ' ' + data.attributes.status[i] : '';
      return `[tr][td]${name}[/td][td]${final}[/td][td]${mod}[/td][td]${source}${status}[/td][/tr]`;
    }).join('\n') + '\n[/table]';

  // 3. Combat Table (Correct path: combatTable.key[0])
  vars['bab'] = getDisplayValue(data.combatTable?.bab?.[0], 'bonus', t, { path: 'combatTable.bab[0]' });
  vars['cmb'] = getDisplayValue(data.combatTable?.cmb?.[0], 'bonus', t, { path: 'combatTable.cmb[0]' });
  vars['cmd'] = getDisplayValue(data.combatTable?.cmd?.[0], 'int', t, { path: 'combatTable.cmd[0]' });
  vars['combatManeuverNotes'] = data.combatManeuverNotes || '';

  // 4. Attacks
  const formatAttackTable = (attacks: any, path: string) => {
    if (!attacks || !attacks.weapon || attacks.weapon.length === 0) return '';
    return '[table]\n' + attacks.weapon.map((_: any, i: number) => {
      const weapon = attacks.weapon[i] || '';
      const hit = getDisplayValue(attacks.hit[i], 'bonus', t, { path: `${path}.hit[${i}]` });
      const damage = attacks.damage[i] || '';
      const critRange = getDisplayValue(attacks.critRange[i], 'critRange', t, { path: `${path}.critRange[${i}]` });
      const critMult = getDisplayValue(attacks.critMultiplier[i], 'critMultiplier', t, { path: `${path}.critMultiplier[${i}]` });
      const critStr = (critRange === '20' && (critMult === '×2' || critMult === '2')) ? '' : `${critRange}${critMult}`;
      const range = getDisplayValue(attacks.range[i], 'distance', t, { path: `${path}.range[${i}]` });
      return `[tr][td]${weapon}[/td][td]${hit}[/td][td]${damage}[/td][td]${critStr}[/td][td]${attacks.damageType[i] || ''}[/td][td]${range}[/td][td]${attacks.special[i] || ''}[/td][/tr]`;
    }).join('\n') + '\n[/table]';
  };

  vars['meleeAttackTable'] = formatAttackTable(data.attacks.meleeAttacks, 'attacks.meleeAttacks');
  vars['rangedAttackTable'] = formatAttackTable(data.attacks.rangedAttacks, 'attacks.rangedAttacks');
  vars['specialAttacks'] = data.attacks.specialAttacks || '';

  // 5. Defenses
  vars['ac'] = getDisplayValue(data.defenses.acTable?.ac?.[0], 'int', t, { path: 'defenses.acTable.ac[0]' });
  vars['acTouch'] = getDisplayValue(data.defenses.acTable?.touch?.[0], 'int', t, { path: 'defenses.acTable.touch[0]' });
  vars['acFlatFooted'] = getDisplayValue(data.defenses.acTable?.flatFooted?.[0], 'int', t, { path: 'defenses.acTable.flatFooted[0]' });
  vars['acSource'] = data.defenses.acTable?.source?.[0] || '';
  vars['acNotes'] = data.defenses.acNotes || '';
  vars['acLine'] = vars['ac'] ? `[b]AC[/b] ${vars['ac']}, [b]${t('editor.defenses.flat_footed')}[/b] ${vars['acFlatFooted']}, [b]${t('editor.defenses.touch')}[/b] ${vars['acTouch']}${vars['acSource'] ? ` (${vars['acSource']})` : ''}${vars['acNotes'] ? `；${vars['acNotes']}` : ''}` : '';

  vars['hp'] = getDisplayValue(data.defenses.hp, 'posInt', t, { path: 'defenses.hp' });
  vars['hd'] = data.defenses.hd || '';
  vars['hpLine'] = `[b]HP[/b] ${vars['hp']}${vars['hd'] ? ` (${vars['hd']})` : ''}`;

  vars['saveFort'] = getDisplayValue(data.defenses.savesTable?.fort?.[0], 'bonus', t, { path: 'defenses.savesTable.fort[0]' });
  vars['saveRef'] = getDisplayValue(data.defenses.savesTable?.ref?.[0], 'bonus', t, { path: 'defenses.savesTable.ref[0]' });
  vars['saveWill'] = getDisplayValue(data.defenses.savesTable?.will?.[0], 'bonus', t, { path: 'defenses.savesTable.will[0]' });
  vars['savesNotes'] = data.defenses.savesNotes || '';
  vars['saveLine'] = vars['saveFort'] ? `[b]${t('editor.defenses.fort')}[/b] ${vars['saveFort']}, [b]${t('editor.defenses.ref')}[/b] ${vars['saveRef']}, [b]${t('editor.defenses.will')}[/b] ${vars['saveWill']}${vars['savesNotes'] ? ` (${vars['savesNotes']})` : ''}` : '';
  vars['specialDefenses'] = data.defenses.specialDefenses || '';

  // 6. Traits & Features
  vars['racialTraits'] = (data.racialTraits?.name?.length > 0)
    ? '[table]\n' + data.racialTraits.name.map((_, i: number) => `[tr][td]${getDisplayValue(data.racialTraits.name[i], 'text', t, { path: `racialTraits.name[${i}]` })}[/td][td]${getDisplayValue(data.racialTraits.desc[i], 'text', t, { path: `racialTraits.desc[${i}]` })}[/td][/tr]`).join('\n') + '\n[/table]'
    : t('common.none');

  vars['backgroundTraits'] = (data.backgroundTraits?.name?.length > 0)
    ? data.backgroundTraits.name.map((_, i: number) => `${data.backgroundTraits.name[i]}(${data.backgroundTraits.type[i]}): ${data.backgroundTraits.desc[i]}`).join('\n')
    : t('common.none');

  vars['favoredClass'] = data.favoredClass || '';
  vars['favoredClassBonus'] = data.favoredClassBonus || '';

  vars['classFeatures'] = (data.classFeatures?.name?.length > 0)
    ? '[table]\n' + data.classFeatures.name.map((_, i: number) => `[tr][td]${getDisplayValue(data.classFeatures.level[i], 'level', t, { path: `classFeatures.level[${i}]` })}[/td][td]${data.classFeatures.name[i]}${data.classFeatures.type[i] ? `（${t('editor.class_features.types.' + data.classFeatures.type[i]) || ''}）` : ''}[/td][td]${data.classFeatures.desc[i]}[/td][/tr]`).join('\n') + '\n[/table]'
    : t('common.none');

  vars['featTable'] = (data.feats?.name?.length > 0)
    ? '[table]\n' + data.feats.name.map((_, i: number) => `[tr][td]${getDisplayValue(data.feats.level[i], 'level', t, { path: `feats.level[${i}]` })}[/td][td]${data.feats.name[i] || ''}${data.feats.type[i] ? ` (${data.feats.type[i]})` : ''}[/td][td]${data.feats.desc[i] || ''}[/td][/tr]`).join('\n') + '\n[/table]'
    : t('common.none');

  // 7. Skills
  vars['skillTable'] = (data.skills?.name?.length > 0)
    ? '[table]\n' + data.skills.name.map((_, i: number) => {
        const total = getDisplayValue(data.skills.total[i], 'bonus', t, { path: `skills.total[${i}]` });
        const rank = getDisplayValue(data.skills.rank[i], 'level', t, { path: `skills.rank[${i}]` });
        const cs = (data.skills.cs[i] && (data.skills.rank[i] || 0) > 0) ? `+3${t('editor.sections.cs_short')}` : '';
        let attrStr = '';
        if (data.skills.ability[i] && data.skills.ability[i] !== 0) {
          const idx = data.skills.ability[i] - 1;
          attrStr = `${getDisplayValue(data.attributes.modifier[idx], 'bonus', t, { path: `attributes.modifier[${idx}]` })}${t('editor.attributes.' + ATTRIBUTE_NAMES[idx])}`;
        }
        const det = [rank, cs, attrStr, data.skills.others?.[i]].filter(x => x).join(' ');
        return `[tr][td]${data.skills.name[i] || ''}[/td][td]${det ? `${total} (${det})` : total}[/td][td]${data.skills.special?.[i] || ''}[/td][/tr]`;
      }).join('\n') + '\n[/table]'
    : t('common.none');

  // 8. Equipment & Currency
  if (!data.equipmentBags || data.equipmentBags.length === 0) {
    vars['equipmentTable'] = t('common.none');
  } else {
    vars['equipmentTable'] = data.equipmentBags.map((bag, bIdx) => {
      let res = `[quote author=${bag.name}${bag.ignoreWeight ? ' (' + t('editor.items.ignore_weight') + ')' : ''}]\n`;
      const items = bag.items;
      if (!items || !items.item || items.item.length === 0) {
        res += (t('editor.items.no_items') || '此容器内无物品') + '\n';
      } else {
        res += '[table]\n' + items.item.map((_, iIdx) => {
          const q = parseInt(items.quantity[iIdx] as any) || 1;
          const c = (parseFloat(items.cost[iIdx] as any) || 0) * q;
          const w = (parseFloat(items.weight[iIdx] as any) || 0) * q;
          const name = items.item[iIdx] + (q > 1 ? `(${q})` : '');
          const cStr = c === 0 ? '' : `${c.toFixed(2)}gp`;
          const wStr = w === 0 ? '' : `${w.toFixed(2)}lbs`;
          const notes = items.notes[iIdx] || '';
          return `[tr][td]${name}[/td][td]${cStr}[/td][td]${wStr}[/td][td]${notes}[/td][/tr]`;
        }).join('\n') + '\n[/table]';
      }
      return res + '[/quote]';
    }).join('\n');
  }

  vars['currencyLine'] = `[b]${t('editor.items.currency')} (${[
    data.currency.pp > 0 && `${data.currency.pp}${t('editor.items.pp')}`,
    data.currency.gp > 0 && `${data.currency.gp}${t('editor.items.gp')}`,
    data.currency.sp > 0 && `${data.currency.sp}${t('editor.items.sp')}`,
    data.currency.cp > 0 && `${data.currency.cp}${t('editor.items.cp')}`
  ].filter(Boolean).join('') || '无'}) ${t('editor.items.coin_weight_total')} ${parseFloat(String(data.currency.coinWeight)).toFixed(1)}lbs ${t('editor.items.total_assets')} ${calculateTotalCost(data)}gp[/b]`;

  const totalW = calculateTotalWeightNum(data);
  const enc = getComputedEncumbrance(data);
  let sKey = t('editor.items.light');
  if (totalW > enc.heavy) sKey = t('editor.items.overload');
  else if (totalW > enc.medium) sKey = t('editor.items.heavy');
  else if (totalW > enc.light) sKey = t('editor.items.medium');

  vars['loadSummary'] = `[b]${t('editor.items.total_weight')} ${sKey} ${totalW.toFixed(1)}lbs ${enc.light}/${enc.medium}/${enc.heavy}[/b]`;
  vars['equipmentSection'] = vars['equipmentTable'] + '\n' + vars['currencyLine'] + '\n' + vars['loadSummary'];

  // 9. Magic & Additional
  vars['magicBlocks'] = formatDynamicBlock(data.magicBlocks || [], 'magicBlocks');
  vars['additionalData'] = formatDynamicBlock(data.additionalData || [], 'additionalData');

  const resolveValue = (path: string) => {
    if (vars[path] !== undefined) return String(vars[path]);
    const val = getS(data, path);
    return (typeof val === 'string' || typeof val === 'number') ? String(val) : undefined;
  };

  const tagRegex = /\{((?:[^{}\\]|\\.)+)\}/g;
  let changed = true, passes = 0;
  while (changed && passes < 3) {
    const old = bbcode;
    bbcode = bbcode.replace(tagRegex, (match, content) => {
      let fQ = -1, fC = -1, esc = false;
      for (let i = 0; i < content.length; i++) {
        if (esc) { esc = false; continue; }
        if (content[i] === '\\') { esc = true; continue; }
        if (content[i] === '?') { if (fQ === -1) fQ = i; }
        else if (content[i] === ':') { if (fC === -1) fC = i; }
      }
      let p = '', iNE = '', iE = '';
      if (fQ === -1 && fC === -1) p = content;
      else if (fQ !== -1 && fC === -1) { p = content.substring(0, fQ); iNE = content.substring(fQ + 1); }
      else if (fQ === -1 && fC !== -1) { p = content.substring(0, fC); iE = content.substring(fC + 1); }
      else {
        if (fQ < fC) { p = content.substring(0, fQ); iNE = content.substring(fQ + 1, fC); iE = content.substring(fC + 1); }
        else { p = content.substring(0, fC); iE = content.substring(fC + 1, fQ); iNE = content.substring(fQ + 1); }
      }
      const val = resolveValue(p);
      const empty = val === undefined || val === null || val === '';
      let res = (fQ === -1 && fC === -1) ? (val !== undefined ? val : match) : (fQ !== -1 && fC === -1) ? (!empty ? iNE : '') : (fQ === -1 && fC !== -1) ? (!empty ? val : iE) : (!empty ? iNE : iE);
      if (val !== undefined && res.includes('$')) {
        let sub = '', subEsc = false;
        for (let i = 0; i < res.length; i++) {
          if (subEsc) { sub += res[i]; subEsc = false; }
          else if (res[i] === '\\') { sub += '\\'; subEsc = true; }
          else if (res[i] === '$') sub += val;
          else sub += res[i];
        }
        res = sub;
      }
      return res;
    });
    changed = bbcode !== old;
    passes++;
  }
  let final = '', fEsc = false;
  for (let i = 0; i < bbcode.length; i++) {
    if (fEsc) { final += bbcode[i]; fEsc = false; }
    else if (bbcode[i] === '\\') fEsc = true;
    else final += bbcode[i];
  }
  return final;
}

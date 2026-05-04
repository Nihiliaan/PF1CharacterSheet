import { ATTRIBUTE_NAMES, CharacterData } from '../types';
import { getDisplayValue } from './formatters';

export function generateBBCode(data: CharacterData, template: string, t: any): string {
  let bbcode = template;

  const getS = (obj: any, path: string) => {
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      if (Array.isArray(curr) && /^\d+$/.test(p)) {
        curr = curr[parseInt(p)];
      } else {
        curr = curr[p];
      }
    }
    return curr;
  };

  /**
   * 辅助工具：SoA 转 行数组 (用于 BBCode 循环渲染)
   */
  const soaToRows = (soaObj: any) => {
    if (!soaObj || typeof soaObj !== 'object') return [];
    const keys = Object.keys(soaObj).filter(k => Array.isArray(soaObj[k]));
    const rowCount = keys.length > 0 ? soaObj[keys[0]].length : 0;
    return Array.from({ length: rowCount }, (_, i) => {
      const row: any = {};
      keys.forEach(k => { row[k] = soaObj[k][i]; });
      return row;
    });
  };

  const formatDynamicBlock = (blocks: any[]) => {
    if (!blocks || blocks.length === 0) return '无';
    return blocks.map(block => {
      let blockResult = `[b]${block.title}[/b]`;
      if (block.type === 'text') {
        blockResult += block.content || t('editor.lists.no_content') || '暂无内容';
      } else if (block.type === 'table') {
        const tableRows = soaToRows(block.tableData);
        const cols = block.columns || [];
        blockResult += '[table]\n';
        tableRows.forEach((row: any) => {
          blockResult += '[tr]' + cols.map((c: any) => `[td]${row[c.key] || ''}[/td]`).join('') + '[/tr]\n';
        });
        blockResult += '[/table]';
      } else if (block.type === 'spell') {
        const cl = block.casterLevel || '0';
        const conc = block.concentration || '0';
        blockResult += `（[b]${t('editor.spells.caster_level')}[/b] ${getDisplayValue(cl.toString(), 'level', t)}；[b]${t('editor.spells.concentration')}[/b] ${getDisplayValue(conc.toString(), 'bonus', t)}）\n`;

        const tableRows = soaToRows(block.spellTable);
        const baseLevel = block.baseLevel || 0;
        if (tableRows.length > 0) {
          blockResult += '[table]\n';
          tableRows.forEach((row: any, i: number) => {
            // 注意：BBCode 导出时的列顺序
            const cols = ['level', 'uses', 'spells'];
            blockResult += '[tr]' + cols.map((key) => {
              let val = row[key] || '';
              if (key === 'level') {
                const levelNum = tableRows.length - 1 - i + baseLevel;
                val = t('editor.spells.computed_level', { n: levelNum }) || `${levelNum}环`;
              } else if (key === 'uses' && val) {
                if (/^\d+(\/\d+)?$/.test(val) && !val.includes('日') && !val.includes('day')) {
                  val += t('editor.spells.times_per_day');
                }
              }
              return `[td]${val}[/td]`;
            }).join('') + '[/tr]\n';
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
      vars[f] = getDisplayValue(val.toString(), 'bonus', t);
    } else {
      vars[f] = String(val);
    }
  });

  vars['avatarUrl'] = (getS(data, 'basic.avatars')?.[0]?.url) || 'http://此处填写人物头像图片地址';
  vars['acp'] = (data as any).armorCheckPenalty && (data as any).armorCheckPenalty !== '0' ? `-${(data as any).armorCheckPenalty}` : '0';

  // 1. 属性适配
  const attrRows = soaToRows(data.attributes);
  vars['attributesTable'] = '[table]\n' +
    attrRows.map((a: any, i: number) =>
      `[tr][td]${t('editor.attributes.' + ATTRIBUTE_NAMES[i]) || ''}[/td][td]${a.final || ''}[/td][td]${getDisplayValue(a.modifier?.toString(), 'bonus', t)}[/td][td]${a.source || ''}${a.status ? ' ' + a.status : ''}[/td][/tr]`
    ).join('\n') + '\n[/table]';

  // 2. 战斗适配
  const combatData = (data as any).combatTable || {};
  vars['bab'] = getDisplayValue((combatData.bab || 0).toString(), 'bonus', t);
  vars['cmb'] = getDisplayValue((combatData.cmb || 0).toString(), 'bonus', t);
  vars['cmd'] = (combatData.cmd || 10).toString();
  vars['combatManeuverNotes'] = combatData.combatManeuverNotes || '';

  const formatCrit = (range: string, multi: string) => {
    const r = range || '20';
    const m = multi || '×2';
    if (r === '20' && (m === '×2' || m === 'x2')) return '';
    const rangeStr = r === '20' ? '20' : `${r}-20`;
    return `${rangeStr}${m}`;
  };

  // 3. 攻击适配
  const meleeRows = soaToRows((data as any).attacks?.meleeAttacks);
  vars['meleeAttackTable'] = '[table]\n' + meleeRows.map((m: any) => {
    const critStr = formatCrit(m.critRange, m.critMultiplier);
    return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit?.toString(), 'bonus', t)}[/td][td]${m.damage || ''}[/td][td]${critStr}[/td][td]${m.damageType || ''}[/td][td]${m.touch || ''}[/td][td]${m.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  const rangedRows = soaToRows((data as any).attacks?.rangedAttacks);
  vars['rangedAttackTable'] = '[table]\n' + rangedRows.map((m: any) => {
      const critStr = formatCrit(m.critRange, m.critMultiplier);
      return `[tr][td]${m.weapon || ''}[/td][td]${getDisplayValue(m.hit?.toString(), 'bonus', t)}[/td][td]${m.damage || ''}[/td][td]${critStr}[/td][td]${m.damageType || ''}[/td][td]射程${getDisplayValue(m.range?.toString(), 'distance', t)}[/td][td]${m.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  // 4. 防御适配
  const defenses = (data as any).defenses || {};
  const acRows = soaToRows(defenses.acTable);
  const acData = acRows[0] || {};
  vars['ac'] = (acData.ac || '').toString();
  vars['acFlatFooted'] = (acData.flatFooted || '').toString();
  vars['acTouch'] = (acData.touch || '').toString();
  vars['acSource'] = acData.source || '';
  vars['acLine'] = acData.ac ? `[b]AC[/b] ${acData.ac}, [b]${t('editor.defenses.flat_footed')}[/b] ${acData.flatFooted || ''}, [b]${t('editor.defenses.touch')}[/b] ${acData.touch || ''}${acData.source ? ` (${acData.source})` : ''}` : '';
  vars['hp'] = (defenses.hp || '').toString();
  vars['hd'] = defenses.hd || '';
  vars['hpLine'] = `[b]HP[/b] ${defenses.hp}${defenses.hd ? ` (${defenses.hd})` : ''}`;

  const saveRows = soaToRows(defenses.savesTable);
  const saveData = saveRows[0] || {};
  vars['saveLine'] = saveData.fort ? `[b]${t('editor.defenses.fort')}[/b] ${getDisplayValue(saveData.fort.toString(), 'bonus', t)}, [b]${t('editor.defenses.ref')}[/b] ${getDisplayValue(saveData.ref.toString(), 'bonus', t)}, [b]${t('editor.defenses.will')}[/b] ${getDisplayValue(saveData.will.toString(), 'bonus', t)}` : '';

  // 5. 特征与技能适配
  vars['racialTraits'] = '[table]\n' + soaToRows((data as any).racialTraits).map((r: any) => `[tr][td]${r.name}[/td][td]${r.desc}[/td][/tr]`).join('\n') + '\n[/table]';
  vars['classFeatures'] = '[table]\n' + soaToRows((data as any).classFeatures).map((f: any) => `[tr][td]${getDisplayValue(f.level.toString(), 'level', t)}[/td][td]${f.name}[/td][td]${f.desc}[/td][/tr]`).join('\n') + '\n[/table]';
  vars['featTable'] = '[table]\n' + soaToRows((data as any).feats).map((f: any) => `[tr][td]${getDisplayValue((f.level || '').toString(), 'level', t)}[/td][td]${f.name || ''}[/td][td]${f.desc || ''}[/td][/tr]`).join('\n') + '\n[/table]';

  const skillRows = soaToRows((data as any).skills);
  vars['skillTable'] = '[table]\n' + skillRows.map((s: any) => {
    const total = getDisplayValue(s.total?.toString(), 'bonus', t);
    return `[tr][td]${s.name || ''}[/td][td]${total}[/td][td]${s.special || ''}[/td][/tr]`;
  }).join('\n') + '\n[/table]';

  // 6. 装备适配 (Nested SoA)
  let itemsWeight = 0;
  let itemsValue = 0;
  const bags = (data as any).equipmentBags || [];
  vars['equipmentTable'] = bags.map((bag: any) => {
      let bagResult = `[quote author=${bag.name}]\n`;
      const itemRows = soaToRows(bag.items);
      if (itemRows.length === 0) {
        bagResult += '无物品\n';
      } else {
        bagResult += '[table]\n';
        bagResult += itemRows.map((i: any) => {
          const q = parseInt(i.quantity) || 1;
          const w = parseFloat(i.weight) || 0;
          const c = parseFloat(i.cost) || 0;
          if (!bag.ignoreWeight) itemsWeight += w * q;
          itemsValue += c * q;
          return `[tr][td]${i.item}${q>1?`(${q})`:''}[/td][td]${c*q}gp[/td][td]${w*q}磅[/td][td]${i.notes || ''}[/td][/tr]`;
        }).join('\n');
        bagResult += '\n[/table]';
      }
      bagResult += '\n[/quote]';
      return bagResult;
  }).join('\n');

  // 钱币处理
  const curr = (data as any).currency || {};
  const coinVal = (parseInt(curr.pp)||0)*10 + (parseInt(curr.gp)||0) + (parseInt(curr.sp)||0)*0.1 + (parseInt(curr.cp)||0)*0.01;
  vars['currencyLine'] = `资产总计: ${coinVal.toFixed(2)}gp, 物品总值: ${itemsValue.toFixed(2)}gp`;

  // 7. 动态块适配 (Recursive SoA within arrays)
  vars['magicBlocks'] = formatDynamicBlock((data as any).magicBlocks || []);
  vars['additionalData'] = formatDynamicBlock((data as any).additionalData || []);

  // BBCode 替换逻辑保持不变...
  const resolveValue = (path: string) => {
    if (vars[path] !== undefined) return String(vars[path]);
    const pathVal = getS(data, path);
    if (typeof pathVal === 'string' || typeof pathVal === 'number') return String(pathVal);
    return undefined;
  };

  const tagRegex = /\{((?:[^{}\\]|\\.)+)\}/g;
  let passes = 0; let changed = true;
  while (changed && passes < 3) {
    const old = bbcode;
    bbcode = bbcode.replace(tagRegex, (match, content) => {
      const val = resolveValue(content);
      return val !== undefined ? val : match;
    });
    changed = bbcode !== old;
    passes++;
  }

  return bbcode;
}

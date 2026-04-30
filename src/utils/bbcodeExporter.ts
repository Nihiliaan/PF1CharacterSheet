export function generateBBCode(data: any, template: string): string {
  let bbcode = template;

  const replaceVar = (key: string, value: string) => {
    bbcode = bbcode.replaceAll(`{${key}}`, value || '');
  };

  const getS = (obj: any, path: string) => {
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return '';
      curr = curr[p];
    }
    return curr === undefined ? '' : curr;
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

  // Basic Info
  replaceVar('name', getS(data, 'basic.name'));
  replaceVar('classes', getS(data, 'basic.classes'));
  replaceVar('alignment', getS(data, 'basic.alignment'));
  replaceVar('deity', getS(data, 'basic.deity'));
  replaceVar('size', getS(data, 'basic.size'));
  replaceVar('gender', getS(data, 'basic.gender'));
  replaceVar('race', getS(data, 'basic.race'));
  replaceVar('age', getS(data, 'basic.age'));
  replaceVar('height', getS(data, 'basic.height'));
  replaceVar('weight', getS(data, 'basic.weight'));
  replaceVar('speed', getS(data, 'basic.speed'));
  replaceVar('initiative', getS(data, 'basic.initiative'));
  replaceVar('perception', getS(data, 'basic.perception'));
  replaceVar('languages', getS(data, 'basic.languages'));
  replaceVar('avatarUrl', getS(data, 'basic.avatars.0.url') || 'http://此处填写人物头像图片地址');

  // Attributes Table Rows
  const attrRows = (data.attributes || []).map((a: any) => 
    `[tr][td]${a.name || '-'}[/td][td]${a.final || '-'}[/td][td]${a.modifier || '-'}[/td][td]${a.source || ''}${a.status ? ' ' + a.status : ''}[/td][/tr]`
  ).join('\n');
  replaceVar('attributesRows', attrRows);

  // BAB/CMB/CMD
  const babTable = getS(data, 'babTable');
  const cmNotes = getS(data, 'combatManeuverNotes');
  
  if (babTable && Array.isArray(babTable) && babTable.length > 0) {
    replaceVar('bab', babTable[0].bab);
    replaceVar('cmb', babTable[0].cmb);
    replaceVar('cmd', babTable[0].cmd);
  } else {
    const babStr = getS(data, 'babCmbCmd') || '';
    const babMatch = babStr.match(/BAB\s*([+-]?\d+)/i);
    const cmbMatch = babStr.match(/CMB\s*([+-]?\d+)/i);
    const cmdMatch = babStr.match(/CMD\s*(\d+)/i);
    
    replaceVar('bab', babMatch ? babMatch[1] : (babStr.split('/')[0] || ''));
    replaceVar('cmb', cmbMatch ? cmbMatch[1] : '');
    replaceVar('cmd', cmdMatch ? cmdMatch[1] : '');
  }
  replaceVar('combatManeuverNotes', cmNotes);

  // Attack Rows
  const meleeRows = (data.meleeAttacks || []).map((m: any) =>
    `[tr][td]${m.weapon || '-'}[/td][td]${m.hit || '-'}[/td][td]${m.damage || '-'}/${m.crit || '-'}/${m.type || '-'}[/td][td]${m.range || '-'}/${m.special || '-'}[/td][/tr]`
  );
  const rangedRows = (data.rangedAttacks || []).map((m: any) =>
    `[tr][td]${m.weapon || '-'}[/td][td]${m.hit || '-'}[/td][td]${m.damage || '-'}/${m.crit || '-'}/${m.type || '-'}[/td][td]${m.range || '-'}/${m.special || '-'}[/td][/tr]`
  );
  replaceVar('attackRows', [...meleeRows, ...rangedRows].join('\n'));

  // Defenses
  replaceVar('acLine', `AC ${getS(data, 'defenses.ac')}`);
  replaceVar('hpLine', `HP ${getS(data, 'defenses.hp')}`);
  replaceVar('saveLine', getS(data, 'defenses.saves'));
  replaceVar('defensiveAbilities', getS(data, 'defenses.defensiveAbilities') || '无');

  // Traits
  const racialStr = (data.racialTraits || []).map((r: any) => `[b]${r.name}[/b]: ${r.desc}`).join('\n');
  replaceVar('racialTraits', racialStr || '无');
  const backgroundStr = (data.backgroundTraits || []).map((r: any) => `[b]${r.name}[/b] (${r.type}): ${r.desc}`).join('\n');
  replaceVar('backgroundTraits', backgroundStr || '无');

  // Class Features
  replaceVar('favoredClass', getS(data, 'favoredClass'));
  replaceVar('favoredClassBonus', getS(data, 'favoredClassBonus'));
  const classFeaturesStr = (data.classFeatures || []).map((f: any) => `[b]${f.name}[/b]: ${f.desc}`).join('\n');
  replaceVar('classFeatures', classFeaturesStr || '无');

  // Feats Rows
  const featRows = (data.feats || []).map((f: any) => 
    `[tr][td]${f.level || '-'}[/td][td]${f.name || '-'}[/td][td]${f.desc || '-'}[/td][/tr]`
  ).join('\n');
  replaceVar('featRows', featRows);

  // Skills Rows
  const skillRows = (data.skills || []).map((s: any) => 
    `[tr][td]${s.name || '-'}[/td][td]${s.total || '-'}[/td][td]${s.source || '-'}[/td][/tr]`
  ).join('\n');
  replaceVar('skillRows', skillRows);

  // Equipment Rows
  const eqRows = (data.equipmentBags || []).flatMap((bag: any) => 
    (bag.items || []).map((i: any) => 
      `[tr][td]${i.item || '-'}[/td][td]${i.cost || '-'}[/td][td]${i.weight || '-'}[/td][td]${i.notes || '-'}[/td][/tr]`
    )
  ).join('\n');
  replaceVar('equipmentRows', eqRows);

  // Magic & Additional Blocks
  replaceVar('magicBlocks', formatDynamicBlock(data.magicBlocks));
  replaceVar('additionalData', formatDynamicBlock(data.additionalData));

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

  const strAttr = (data.attributes || []).find((a: any) => a.name === '力量');
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

  replaceVar('loadStatus', `${status} (${totalWeight.toFixed(1)} lbs)`);
  replaceVar('loadLimits', `${lightLimit} / ${mediumLimit} / ${heavyLimit}`);

  return bbcode;
}

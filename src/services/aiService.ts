import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_DATA } from "../constants";
import i18n from '../i18n/config';
import { SKILL_REGISTRY } from '../constants/skills';

export const characterSchema = {
  type: Type.OBJECT,
  properties: {
    basic: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "人物姓名" },
        classes: { type: Type.STRING, description: "职业与等级，例如：战士1" },
        alignment: { type: Type.STRING, description: "阵营 (如：中立善良、混乱邪恶)" },
        size: { type: Type.STRING, description: "体型 (如：中型、小型)" },
        gender: { type: Type.STRING, description: "性别 (男/女/其它)" },
        race: { type: Type.STRING, description: "种族" },
        age: { type: Type.STRING, description: "年龄" },
        height: { type: Type.NUMBER, description: "身高（总英寸数，例如 5'10\" 转换为 70）" },
        weight: { type: Type.NUMBER, description: "体重（磅）" },
        speed: { type: Type.STRING, description: "速度 (如：30尺)" },
        senses: { type: Type.STRING, description: "感官" },
        initiative: { type: Type.STRING, description: "先攻加值" },
        perception: { type: Type.STRING, description: "察觉加值" },
        languages: { type: Type.STRING, description: "语言" },
        deity: { type: Type.STRING, description: "信仰" },
        avatars: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "在文本中发现的人物头像或描述图片链接"
        },
      }
    },
    story: { type: Type.STRING, description: "背景故事或人物简介" },
    favoredClass: { type: Type.STRING, description: "天赋职业名称" },
    favoredClassBonus: { type: Type.STRING, description: "天赋职业奖励描述" },
    racialTraits: {
      type: Type.ARRAY,
      description: "种族特性列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          desc: { type: Type.STRING }
        }
      }
    },
    backgroundTraits: {
      type: Type.ARRAY,
      description: "背景特性列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          desc: { type: Type.STRING }
        }
      }
    },
    attributes: {
      type: Type.ARRAY,
      description: "六维属性（力量、敏捷、体质、智力、感知、魅力）",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "属性名" },
          value: { type: Type.STRING, description: "数值" },
          modifier: { type: Type.STRING, description: "调整值" },
          source: { type: Type.STRING, description: "基础/来源" },
        }
      }
    },
    babCmbCmd: {
      type: Type.OBJECT,
      properties: {
        bab: { type: Type.STRING },
        cmb: { type: Type.STRING },
        cmd: { type: Type.STRING }
      }
    },
    defenses: {
      type: Type.OBJECT,
      properties: {
        hp: { type: Type.STRING },
        hd: { type: Type.STRING, description: "生命骰，如 '11d6+22'。必须完整保留。" },
        ac: { type: Type.STRING },
        flatFooted: { type: Type.STRING },
        touch: { type: Type.STRING },
        acNotes: { type: Type.STRING },
        fort: { type: Type.STRING },
        ref: { type: Type.STRING },
        will: { type: Type.STRING },
        saveNotes: { type: Type.STRING },
      }
    },
    meleeAttacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          weapon: { type: Type.STRING },
          hit: { type: Type.STRING },
          damage: { type: Type.STRING },
          critRange: { type: Type.NUMBER, description: "重击起始值，如 20, 19, 18 等" },
          critMultiplier: { type: Type.NUMBER, description: "重击倍率，如 2, 3, 4" },
          damageType: { type: Type.STRING },
          special: { type: Type.STRING }
        }
      }
    },
    rangedAttacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          weapon: { type: Type.STRING },
          hit: { type: Type.STRING },
          damage: { type: Type.STRING },
          critRange: { type: Type.NUMBER, description: "重击起始值，如 20, 19, 18 等" },
          critMultiplier: { type: Type.NUMBER, description: "重击倍率，如 2, 3, 4" },
          range: { type: Type.STRING },
          damageType: { type: Type.STRING },
          special: { type: Type.STRING }
        }
      }
    },
    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "技能名称" },
          total: { type: Type.STRING, description: "总加值" },
          rank: { type: Type.NUMBER, description: "投入点数 (Ranks)" },
          isClassSkill: { type: Type.BOOLEAN, description: "是否为本职技能" },
          abilityAttribute: { type: Type.STRING, description: "关联属性名 (如 STR, DEX)" },
          otherBonus: { type: Type.STRING, description: "其它来源加值总和" },
          special: { type: Type.STRING, description: "备注或特殊说明" }
        }
      }
    },
    feats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING },
          name: { type: Type.STRING },
          source: { type: Type.STRING },
          desc: { type: Type.STRING }
        }
      }
    },
    classFeatures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING },
          name: { type: Type.STRING },
          type: { type: Type.STRING, description: "Sp/Su/Ex 或 空字符串" },
          desc: { type: Type.STRING }
        }
      }
    },
    magicBlocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "如：Wizard Spells, 法师法术, 类法术能力" },
          spellType: { type: Type.STRING, description: "分类：准备(有0环)/准备(无0环)/自发(有0环)/自发(无0环)/炼金/类法术" },
          casterLevel: { type: Type.NUMBER, description: "施法者等级 CL" },
          concentration: { type: Type.NUMBER, description: "专注加值" },
          levels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.NUMBER, description: "环级 (0-9)" },
                spells: { type: Type.ARRAY, items: { type: Type.STRING }, description: "该环级的所有法术名" },
                slots: { type: Type.STRING, description: "次数或位次，如 '4' 或 '3/day'，如果是随意使用请返回 '0'" }
              }
            }
          }
        }
      }
    },
    equipment: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          quantity: { type: Type.STRING },
          cost: { type: Type.STRING },
          weight: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      }
    }
  }
};

/**
 * 辅助函数：将文本中的 BBCode URL 转换为 Markdown 格式
 */
function bbcodeToMarkdown(text: any): string {
  if (typeof text !== 'string') return String(text ?? '');
  return text.replace(/\[url=([^\]]+)\]([^\[]+)\[\/url\]/gi, '[$2]($1)');
}

/**
 * 将 AI 提取的原始数据转换为符合 CharacterData (SoA 结构) 的格式
 */
export function transformAIData(extracted: any) {
  const mergedData = JSON.parse(JSON.stringify(DEFAULT_DATA));

  // 1. 基本信息
  if (extracted.basic) {
    const b = extracted.basic;
    mergedData.basic.name = b.name || mergedData.basic.name;
    mergedData.basic.classes = b.classes || '';
    mergedData.basic.race = b.race || '';
    mergedData.basic.gender = b.gender === '男' ? 1 : (b.gender === '女' ? 2 : 0);
    mergedData.basic.age = parseInt(b.age) || 0;
    mergedData.basic.height = parseInt(b.height) || 0;
    mergedData.basic.weight = parseInt(b.weight) || 0;
    mergedData.basic.senses = b.senses || [];
    mergedData.basic.languages = b.languages || [];
    mergedData.basic.deity = b.deity || '';
    
    if (b.avatars && Array.isArray(b.avatars)) {
      b.avatars.forEach((url: string) => {
        if (url && url.startsWith('http')) {
          mergedData.basic.avatars.url.push(url);
          mergedData.basic.avatars.note.push('AI 识别头像');
        }
      });
    }

    const alignmentMap: Record<string, number> = { "守序善良": 0, "中立善良": 1, "混乱善良": 2, "守序中立": 3, "绝对中立": 4, "中立": 4, "混乱中立": 5, "守序邪恶": 6, "中立邪恶": 7, "混乱邪恶": 8 };
    if (b.alignment) mergedData.basic.alignment = alignmentMap[b.alignment] ?? 4;

    const sizeMap: Record<string, number> = { "超微": 0, "微型": 1, "极小": 2, "小型": 3, "中型": 4, "大型": 5, "超大": 6, "极巨": 7, "超巨": 8 };
    if (b.size) mergedData.basic.size = sizeMap[b.size] ?? 4;
  }

  // 0. 全局文本转换 (BBCode -> MD)
  mergedData.story = bbcodeToMarkdown(extracted.story);

  // 2. 属性
  if (extracted.attributes && Array.isArray(extracted.attributes)) {
    const attrNames = ["力量", "敏捷", "体质", "智力", "感知", "魅力"];
    extracted.attributes.forEach((extAttr: any) => {
      const idx = attrNames.findIndex(n => extAttr.name && (extAttr.name.includes(n) || n.includes(extAttr.name)));
      if (idx !== -1) {
        mergedData.attributes.final[idx] = parseInt(extAttr.value) || 10;
        mergedData.attributes.modifier[idx] = parseInt(extAttr.modifier) || 0;
        mergedData.attributes.source[idx] = bbcodeToMarkdown(extAttr.source);
      }
    });
  }

  // 3. 战斗加值
  if (extracted.babCmbCmd) {
    mergedData.combatManeuver.bab = parseInt(extracted.babCmbCmd.bab) || 0;
    mergedData.combatManeuver.cmb = parseInt(extracted.babCmbCmd.cmb) || 0;
    mergedData.combatManeuver.cmd = parseInt(extracted.babCmbCmd.cmd) || 10;
  }

  // 4. 防御
  if (extracted.defenses) {
    const d = extracted.defenses;
    mergedData.defenses.hp = parseInt(d.hp) || 0;
    mergedData.defenses.hd = d.hd || '';
    mergedData.defenses.armorClass.ac = parseInt(d.ac) || 10;
    mergedData.defenses.armorClass.flatFooted = parseInt(d.flatFooted) || 10;
    mergedData.defenses.armorClass.touch = parseInt(d.touch) || 10;
    mergedData.defenses.armorClass.notes = bbcodeToMarkdown(d.acNotes);
    mergedData.defenses.saves.fort = parseInt(d.fort) || 0;
    mergedData.defenses.saves.ref = parseInt(d.ref) || 0;
    mergedData.defenses.saves.will = parseInt(d.will) || 0;
    mergedData.defenses.saves.notes = bbcodeToMarkdown(d.saveNotes);
  }

  // 5. 攻击
  const critRangeMap: Record<number, number> = { 20: 0, 19: 1, 18: 2, 17: 3, 16: 4, 15: 5 };
  const critMultMap: Record<number, number> = { 2: 0, 3: 1, 4: 2 };

  if (extracted.meleeAttacks && Array.isArray(extracted.meleeAttacks)) {
    extracted.meleeAttacks.forEach((a: any) => {
      mergedData.attacks.melee.weapon.push(bbcodeToMarkdown(a.weapon));
      mergedData.attacks.melee.hit.push(parseInt(a.hit) || 0);
      mergedData.attacks.melee.damage.push(a.damage || '');
      mergedData.attacks.melee.critRange.push(critRangeMap[parseInt(a.critRange)] ?? 0);
      mergedData.attacks.melee.critMultiplier.push(critMultMap[parseInt(a.critMultiplier)] ?? 0);
      mergedData.attacks.melee.damageType.push(a.damageType || '');
      mergedData.attacks.melee.special.push(bbcodeToMarkdown(a.special));
      mergedData.attacks.melee.touch.push(0);
    });
  }
  if (extracted.rangedAttacks && Array.isArray(extracted.rangedAttacks)) {
    extracted.rangedAttacks.forEach((a: any) => {
      mergedData.attacks.ranged.weapon.push(bbcodeToMarkdown(a.weapon));
      mergedData.attacks.ranged.hit.push(parseInt(a.hit) || 0);
      mergedData.attacks.ranged.damage.push(a.damage || '');
      mergedData.attacks.ranged.critRange.push(critRangeMap[parseInt(a.critRange)] ?? 0);
      mergedData.attacks.ranged.critMultiplier.push(critMultMap[parseInt(a.critMultiplier)] ?? 0);
      mergedData.attacks.ranged.range.push(parseInt(a.range) || 0);
      mergedData.attacks.ranged.damageType.push(a.damageType || '');
      mergedData.attacks.ranged.special.push(bbcodeToMarkdown(a.special));
    });
  }

  // 6. 特性与专长
  if (extracted.racialTraits && Array.isArray(extracted.racialTraits)) {
    extracted.racialTraits.forEach((t: any) => {
      mergedData.racialTraits.name.push(t.name || '');
      mergedData.racialTraits.desc.push(bbcodeToMarkdown(t.desc));
    });
  }
  if (extracted.backgroundTraits && Array.isArray(extracted.backgroundTraits)) {
    extracted.backgroundTraits.forEach((t: any) => {
      mergedData.backgroundTraits.name.push(t.name || '');
      mergedData.backgroundTraits.type.push(t.type || '');
      mergedData.backgroundTraits.desc.push(bbcodeToMarkdown(t.desc));
    });
  }
  if (extracted.classFeatures && Array.isArray(extracted.classFeatures)) {
    const typeMap: Record<string, number> = { '—': 0, 'Sp': 1, 'Su': 2, 'Ex': 3 };
    extracted.classFeatures.forEach((t: any) => {
      mergedData.classFeatures.level.push(parseInt(t.level) || 0);
      mergedData.classFeatures.name.push(t.name || '');
      mergedData.classFeatures.type.push(typeMap[t.type] || 0);
      mergedData.classFeatures.desc.push(bbcodeToMarkdown(t.desc));
    });
  }
  if (extracted.feats && Array.isArray(extracted.feats)) {
    extracted.feats.forEach((t: any) => {
      mergedData.feats.level.push(parseInt(t.level) || 0);
      mergedData.feats.name.push(t.name || '');
      mergedData.feats.source.push(t.source || '');
      mergedData.feats.desc.push(bbcodeToMarkdown(t.desc));
    });
  }

  // 7. 技能
  if (extracted.skills && Array.isArray(extracted.skills)) {
    const attrNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    
    // 获取 i18n 资源用于反向查找
    const zhNames = i18n.getResourceBundle('zh', 'translation')?.editor?.skills?.names || {};
    const enNames = i18n.getResourceBundle('en', 'translation')?.editor?.skills?.names || {};
    
    extracted.skills.forEach((s: any) => {
      const rawName = String(s.name || '').trim();
      let finalName: string | number = rawName;
      let finalCategory: number = 0; // 默认通用
      let finalAbility: number = -1;

      // 尝试匹配内置技能 (中文或英文名)
      const matchedId = Object.keys(zhNames).find(id => zhNames[id] === rawName) || 
                        Object.keys(enNames).find(id => enNames[id] === rawName);
      
      if (matchedId) {
        const idNum = parseInt(matchedId);
        const registryEntry = SKILL_REGISTRY.find(r => r.id === idNum);
        if (registryEntry) {
          finalName = idNum;
          finalCategory = registryEntry.category;
          finalAbility = registryEntry.defaultAbility;
        }
      } else {
        // 自定义技能尝试根据名字猜测大类
        if (rawName.includes('知识') || rawName.includes('Knowledge')) finalCategory = 2;
        else if (rawName.includes('工艺') || rawName.includes('Craft')) finalCategory = 3;
        else if (rawName.includes('表演') || rawName.includes('Perform')) finalCategory = 4;
        else if (rawName.includes('专业') || rawName.includes('Profession')) finalCategory = 5;
      }

      mergedData.skills.name.push(finalName);
      mergedData.skills.category.push(finalCategory);
      mergedData.skills.total.push(parseInt(s.total) || 0);
      mergedData.skills.rank.push(parseInt(s.rank) || 0);
      mergedData.skills.cs.push(s.isClassSkill === true);
      
      // 属性处理
      const attrIdx = attrNames.indexOf(String(s.abilityAttribute).toUpperCase());
      if (attrIdx !== -1) {
        mergedData.skills.ability.push(attrIdx);
      } else {
        mergedData.skills.ability.push(finalAbility !== -1 ? finalAbility : 0);
      }

      mergedData.skills.others.push(String(s.otherBonus || '0'));
      mergedData.skills.special.push(bbcodeToMarkdown(s.special));
    });
  }

  // 8. 装备
  if (extracted.equipment && Array.isArray(extracted.equipment)) {
    extracted.equipment.forEach((e: any) => {
      mergedData.equipment.container[0].item.push(e.item || '');
      mergedData.equipment.container[0].quantity.push(parseInt(e.quantity) || 1);
      mergedData.equipment.container[0].cost.push(parseInt(e.cost) || 0);
      mergedData.equipment.container[0].weight.push(parseInt(e.weight) || 0);
      mergedData.equipment.container[0].notes.push(bbcodeToMarkdown(e.notes));
    });
  }

  // 9. 魔法块 (按环级分组)
  if (extracted.magicBlocks && Array.isArray(extracted.magicBlocks)) {
    // 逻辑：0-准备(有0环), 1-准备(无0环), 2-自发(有0环), 3-自发(无0环), 4-炼金, 5-类法术
    const spellTypeIndex: Record<string, number> = { 
      "准备(有0环)": 0, "准备(无0环)": 1, 
      "自发(有0环)": 2, "自发(无0环)": 3, 
      "炼金": 4, "类法术": 5 
    };
    
    mergedData.magicBlocks = extracted.magicBlocks.map((block: any) => {
      const type = spellTypeIndex[block.spellType] ?? 5;
      const sortedLevels = (block.levels || []).sort((a: any, b: any) => b.level - a.level);
      
      return {
        id: 'mb-' + Math.random().toString(36).substr(2, 9),
        title: block.title || '法术',
        type: type,
        casterLevel: block.casterLevel || 1,
        concentration: block.concentration || 1,
        uses: sortedLevels.map((l: any) => String(l.slots ?? '0')),
        spells: sortedLevels.map((l: any) => (l.spells || []).join(', ')),
        notes: ''
      };
    });
  }

  return mergedData;
}

/**
 * 获取当前 API Key 可用的模型列表
 */
export async function listAvailableModels(apiKey: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return (data.models || [])
      .filter((m: any) => m.name?.toLowerCase().includes('gemini'))
      .map((m: any) => ({
        name: m.name,
        displayName: m.displayName || m.name.split('/').pop(),
        description: m.description
      }));
  } catch (error) {
    console.error("Failed to list models:", error);
    throw error;
  }
}

export async function extractCharacterFromText(text: string, apiKey: string, modelName: string = "models/gemini-1.5-flash") {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: "user",
        parts: [{
          text: `你是一个专业的 Pathfinder 1E (PF1) 跑团玩家，擅长从复杂的帖子中提取人物卡信息。
          待处理文本：
          ---
          ${text}
          ---
          
          关键要求：
          1. **HD与HP**：HD字段必须完整提取（如 '11d6+22'），不要进行任何截断。
          2. **重击范围与倍率**：critRange识别起始数值（如 19-20 识别为 19），critMultiplier识别倍率数字（如 x3 识别为 3）。
          3. **技能详情**：必须提取 rank(数字), isClassSkill(布尔), abilityAttribute(STR/DEX/CON/INT/WIS/CHA), otherBonus(数字字符串)。
          4. **格式转换**：如果文本中包含 BBCode 链接 [url=LINK]TEXT[/url]，请将其转换为 Markdown 链接 [TEXT](LINK)。
          5. **魔法与法术**：
             - **归类**：将同一套施法系统的法术归入一个 magicBlock。
             - **元数据**：提取该系统的 casterLevel(施法者等级) 和 concentration(专注加值)。
             - **分类判断**：根据该职业是准备还是自发施法，以及是否有 0 环法术，在 spellType 字段中返回对应的序号：
               0:准备(有0环), 1:准备(无0环), 2:自发(有0环), 3:自发(无0环), 4:炼金, 5:类法术。
             - **特性类型**：职业特性中的 type 字段返回序号：0:—, 1:Sp, 2:Su, 3:Ex。             - **环级分组**：将同一环级的所有法术合并到一个字符串数组中。
             - **用法/位次**：slots识别为纯数字字符串，如果是随意使用请返回 '0'。
          6. **头像**：发现图片链接放入 basic.avatars。
          
          请严格按照 JSON 格式返回。`
        }]
      }],
      config: { responseMimeType: "application/json", responseSchema: characterSchema, temperature: 0 }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Extraction failed:", error);
    throw error;
  }
}

import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_DATA } from "../constants";

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
        gender: { type: Type.STRING, description: "性别" },
        race: { type: Type.STRING, description: "种族" },
        age: { type: Type.STRING, description: "年龄" },
        height: { type: Type.STRING, description: "身高" },
        weight: { type: Type.STRING, description: "体重" },
        speed: { type: Type.STRING, description: "速度 (如：30尺)" },
        senses: { type: Type.STRING, description: "感官" },
        initiative: { type: Type.STRING, description: "先攻加值" },
        perception: { type: Type.STRING, description: "察觉加值" },
        languages: { type: Type.STRING, description: "语言" },
        deity: { type: Type.STRING, description: "信仰" },
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
        hd: { type: Type.STRING },
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
          critRange: { type: Type.STRING },
          critMultiplier: { type: Type.STRING },
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
          critRange: { type: Type.STRING },
          critMultiplier: { type: Type.STRING },
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
          name: { type: Type.STRING },
          total: { type: Type.STRING },
          rank: { type: Type.STRING },
          special: { type: Type.STRING }
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
          type: { type: Type.STRING },
          desc: { type: Type.STRING }
        }
      }
    },
    magicBlocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["text", "table"] },
          content: { type: Type.STRING },
          tableData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.STRING }
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
    mergedData.basic.height = parseFloat(b.height) || 0;
    mergedData.basic.weight = parseFloat(b.weight) || 0;
    mergedData.basic.senses = b.senses || '';
    mergedData.basic.languages = b.languages || '';
    mergedData.basic.deity = b.deity || '';
    
    // 阵营解析
    const alignmentMap: Record<string, number> = { "守序善良": 0, "中立善良": 1, "混乱善良": 2, "守序中立": 3, "绝对中立": 4, "中立": 4, "混乱中立": 5, "守序邪恶": 6, "中立邪恶": 7, "混乱邪恶": 8 };
    if (b.alignment) {
        mergedData.basic.alignment = alignmentMap[b.alignment] ?? 4;
    }

    // 体型解析
    const sizeMap: Record<string, number> = { "超微": 0, "微型": 1, "极小": 2, "小型": 3, "中型": 4, "大型": 5, "超大": 6, "极巨": 7, "超巨": 8 };
    if (b.size) {
        mergedData.basic.size = sizeMap[b.size] ?? 4;
    }
  }

  // 2. 属性 (SoA)
  if (extracted.attributes && Array.isArray(extracted.attributes)) {
    const attrNames = ["力量", "敏捷", "体质", "智力", "感知", "魅力"];
    extracted.attributes.forEach((extAttr: any) => {
      const idx = attrNames.findIndex(n => extAttr.name && (extAttr.name.includes(n) || n.includes(extAttr.name)));
      if (idx !== -1) {
        mergedData.attributes.final[idx] = parseInt(extAttr.value) || 10;
        mergedData.attributes.modifier[idx] = parseInt(extAttr.modifier) || 0;
        mergedData.attributes.source[idx] = extAttr.source || '';
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
    mergedData.defenses.armorClass.notes = d.acNotes || '';
    mergedData.defenses.saves.fort = parseInt(d.fort) || 0;
    mergedData.defenses.saves.ref = parseInt(d.ref) || 0;
    mergedData.defenses.saves.will = parseInt(d.will) || 0;
    mergedData.defenses.saves.notes = d.saveNotes || '';
  }

  // 5. 攻击 (SoA)
  if (extracted.meleeAttacks && Array.isArray(extracted.meleeAttacks)) {
    extracted.meleeAttacks.forEach((a: any) => {
      mergedData.attacks.melee.weapon.push(a.weapon || '');
      mergedData.attacks.melee.hit.push(a.hit || '');
      mergedData.attacks.melee.damage.push(a.damage || '');
      mergedData.attacks.melee.critRange.push(a.critRange || '20');
      mergedData.attacks.melee.critMultiplier.push(a.critMultiplier || '2');
      mergedData.attacks.melee.damageType.push(a.damageType || '');
      mergedData.attacks.melee.special.push(a.special || '');
    });
  }
  if (extracted.rangedAttacks && Array.isArray(extracted.rangedAttacks)) {
    extracted.rangedAttacks.forEach((a: any) => {
      mergedData.attacks.ranged.weapon.push(a.weapon || '');
      mergedData.attacks.ranged.hit.push(a.hit || '');
      mergedData.attacks.ranged.damage.push(a.damage || '');
      mergedData.attacks.ranged.critRange.push(a.critRange || '20');
      mergedData.attacks.ranged.critMultiplier.push(a.critMultiplier || '2');
      mergedData.attacks.ranged.range.push(a.range || '');
      mergedData.attacks.ranged.damageType.push(a.damageType || '');
      mergedData.attacks.ranged.special.push(a.special || '');
    });
  }

  // 6. 特性与专长 (SoA)
  if (extracted.racialTraits && Array.isArray(extracted.racialTraits)) {
    extracted.racialTraits.forEach((t: any) => {
      mergedData.racialTraits.name.push(t.name || '');
      mergedData.racialTraits.desc.push(t.desc || '');
    });
  }
  if (extracted.backgroundTraits && Array.isArray(extracted.backgroundTraits)) {
    extracted.backgroundTraits.forEach((t: any) => {
      mergedData.backgroundTraits.name.push(t.name || '');
      mergedData.backgroundTraits.type.push(t.type || '');
      mergedData.backgroundTraits.desc.push(t.desc || '');
    });
  }
  if (extracted.classFeatures && Array.isArray(extracted.classFeatures)) {
    extracted.classFeatures.forEach((t: any) => {
      mergedData.classFeatures.level.push(t.level || '');
      mergedData.classFeatures.name.push(t.name || '');
      mergedData.classFeatures.type.push(t.type || '');
      mergedData.classFeatures.desc.push(t.desc || '');
    });
  }
  if (extracted.feats && Array.isArray(extracted.feats)) {
    extracted.feats.forEach((t: any) => {
      mergedData.feats.level.push(t.level || '');
      mergedData.feats.name.push(t.name || '');
      mergedData.feats.source.push(t.source || '');
      mergedData.feats.desc.push(t.desc || '');
    });
  }

  // 7. 技能 (SoA)
  if (extracted.skills && Array.isArray(extracted.skills)) {
    extracted.skills.forEach((s: any) => {
      mergedData.skills.name.push(s.name || '');
      mergedData.skills.total.push(parseInt(s.total) || 0);
      mergedData.skills.rank.push(parseInt(s.rank) || 0);
      mergedData.skills.special.push(s.special || '');
      // Fill defaults for others
      mergedData.skills.cs.push(false);
      mergedData.skills.ability.push(0);
      mergedData.skills.others.push(0);
    });
  }

  // 8. 装备 (SoA)
  if (extracted.equipment && Array.isArray(extracted.equipment)) {
    extracted.equipment.forEach((e: any) => {
      mergedData.equipment.container[0].item.push(e.item || '');
      mergedData.equipment.container[0].quantity.push(e.quantity || '1');
      mergedData.equipment.container[0].cost.push(e.cost || '');
      mergedData.equipment.container[0].weight.push(e.weight || '');
      mergedData.equipment.container[0].notes.push(e.notes || '');
    });
  }

  // 9. 魔法块 (SoA)
  if (extracted.magicBlocks && Array.isArray(extracted.magicBlocks)) {
    mergedData.magicBlocks = extracted.magicBlocks.map((block: any) => ({
      id: 'mb-' + Math.random().toString(36).substr(2, 9),
      title: block.title || '能力',
      type: block.type === 'table' ? 5 : 5, // Default to SLA (5) for now as it's most common for AI extraction
      casterLevel: 1,
      concentration: 1,
      uses: [],
      spells: block.content || '',
      notes: ''
    }));
  }

  return mergedData;
}

export async function extractCharacterFromText(text: string, apiKey: string) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `你是一个专业的 Pathfinder 1E (PF1) 跑团玩家，擅长从复杂的论坛帖子和 BBCode 文本中提取人物卡信息。
              
              待处理文本：
              ---
              ${text}
              ---
              
              你的任务是将上述文本中的信息完整、准确地提取到 JSON 中。
              
              关键要求：
              1. **区分特性类型**：
                 - 种族特性放入 racialTraits。
                 - 职业特性放入 classFeatures。
                 - 背景特性放入 backgroundTraits。
              2. **提取完整性**：
                 - 提取所有攻击、属性、防御、技能、专长和装备。
                 - 尝试解析数值，如果无法解析则保留原始字符串。
              3. **处理复杂结构**：对于法术列表或类法术能力，请使用 magicBlocks。
              
              请严格按照 JSON 格式返回。`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: characterSchema,
        temperature: 0,
      }
    });

    return JSON.parse(response.text || "{}");

  } catch (error) {
    console.error("AI Extraction failed:", error);
    throw error;
  }
}

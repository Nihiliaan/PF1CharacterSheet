import { GoogleGenAI, Type } from "@google/genai";

export const characterSchema = {
  type: Type.OBJECT,
  properties: {
    basic: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "人物姓名" },
        classes: { type: Type.STRING, description: "职业与等级，例如：战士1" },
        alignment: { type: Type.STRING, description: "阵营" },
        size: { type: Type.STRING, description: "体型" },
        gender: { type: Type.STRING, description: "性别" },
        race: { type: Type.STRING, description: "种族" },
        age: { type: Type.STRING, description: "年龄" },
        height: { type: Type.STRING, description: "身高" },
        weight: { type: Type.STRING, description: "体重" },
        speed: { type: Type.STRING, description: "速度" },
        senses: { type: Type.STRING, description: "感官" },
        initiative: { type: Type.STRING, description: "先攻" },
        perception: { type: Type.STRING, description: "察觉" },
        languages: { type: Type.STRING, description: "语言" },
        deity: { type: Type.STRING, description: "信仰" },
      }
    },
    story: { type: Type.STRING, description: "背景故事或人物简介" },
    favoredClass: { type: Type.STRING, description: "天赋职业名称" },
    favoredClassBonus: { type: Type.STRING, description: "天赋职业奖励描述，例如：+1技能点或+1HP" },
    racialTraits: {
      type: Type.ARRAY,
      description: "种族特性列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "特性名称" },
          type: { type: Type.STRING, description: "类型 (Sp/Su/Ex)" },
          desc: { type: Type.STRING, description: "描述/效果说明" }
        }
      }
    },
    backgroundTraits: {
      type: Type.ARRAY,
      description: "背景特性列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "特性名称" },
          type: { type: Type.STRING, description: "类型" },
          desc: { type: Type.STRING, description: "效果说明" }
        }
      }
    },
    attributes: {
      type: Type.ARRAY,
      description: "六维属性（力量、敏捷、体质、智力、感知、魅力）",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "属性名称" },
          final: { type: Type.STRING, description: "最终数值" },
          modifier: { type: Type.STRING, description: "调整值，如 +2" },
          source: { type: Type.STRING, description: "基础值" },
          status: { type: Type.STRING, description: "状态/备注" },
        },
        required: ["name", "final"]
      }
    },
    babCmbCmd: { type: Type.STRING, description: "BAB/CMB/CMD 信息（旧版字段，请优先填写 babTable）" },
    babTable: {
      type: Type.ARRAY,
      description: "BAB/CMB/CMD 表格，包含1个对象",
      items: {
        type: Type.OBJECT,
        properties: {
          bab: { type: Type.STRING, description: "基本攻击加值 (BAB)" },
          cmb: { type: Type.STRING, description: "战技攻击加值 (CMB)" },
          cmd: { type: Type.STRING, description: "战技防御等级 (CMD)" }
        }
      }
    },
    combatManeuverNotes: { type: Type.STRING, description: "战技相关的通用备注或特殊加值说明" },
    defenses: {
      type: Type.OBJECT,
      description: "防御信息",
      properties: {
        hp: { type: Type.STRING, description: "HP（总生命值）" },
        hd: { type: Type.STRING, description: "HD（生命骰，如 3d8+3）" },
        acTable: {
          type: Type.ARRAY,
          description: "AC 详情表格，包含1个对象",
          items: {
            type: Type.OBJECT,
            properties: {
              ac: { type: Type.STRING, description: "综合 AC" },
              flatFooted: { type: Type.STRING, description: "措手不及 AC" },
              touch: { type: Type.STRING, description: "接触 AC" }
            }
          }
        },
        acNotes: { type: Type.STRING, description: "防护等级相关的备注（如护甲、盾牌、敏捷等来源）" },
        savesTable: {
          type: Type.ARRAY,
          description: "豁免表格，包含1个对象",
          items: {
            type: Type.OBJECT,
            properties: {
              fort: { type: Type.STRING, description: "强韧豁免" },
              ref: { type: Type.STRING, description: "反射豁免" },
              will: { type: Type.STRING, description: "意志豁免" }
            }
          }
        },
        savesNotes: { type: Type.STRING, description: "豁免相关的备注（如抗力加值等）" },
        ac: { type: Type.STRING, description: "AC 信息（旧版字段，请优先填写 acTable）" },
        saves: { type: Type.STRING, description: "豁免信息（旧版字段，请优先填写 savesTable）" },
      }
    },
    meleeAttacks: {
      type: Type.ARRAY,
      description: "近战攻击列表",
      items: {
        type: Type.OBJECT,
        minItems: 1,
        properties: {
          weapon: { type: Type.STRING, description: "武器名称" },
          hit: { type: Type.STRING, description: "命中加值" },
          damage: { type: Type.STRING, description: "伤害" },
          crit: { type: Type.STRING, description: "重击范围/倍率" },
          range: { type: Type.STRING, description: "触及" },
          type: { type: Type.STRING, description: "伤害类型" },
          special: { type: Type.STRING, description: "武器特性或特殊说明" }
        }
      }
    },
    rangedAttacks: {
      type: Type.ARRAY,
      description: "远程攻击列表",
      items: {
        type: Type.OBJECT,
        properties: {
          weapon: { type: Type.STRING, description: "武器名称" },
          hit: { type: Type.STRING, description: "命中加值" },
          damage: { type: Type.STRING, description: "伤害" },
          crit: { type: Type.STRING, description: "重击范围/倍率" },
          range: { type: Type.STRING, description: "射程" },
          type: { type: Type.STRING, description: "伤害类型" },
          special: { type: Type.STRING, description: "武器特性或特殊说明" }
        }
      }
    },
    skills: {
      type: Type.ARRAY,
      description: "技能列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "技能名称" },
          total: { type: Type.STRING, description: "总值" },
          source: { type: Type.STRING, description: "来源/加点细节" },
          special: { type: Type.STRING, description: "特殊加成或条件" }
        }
      }
    },
    feats: {
      type: Type.ARRAY,
      description: "专长列表",
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING, description: "获得等级" },
          name: { type: Type.STRING, description: "专长名称" },
          type: { type: Type.STRING, description: "类型 (Sp/Su/Ex)" },
          source: { type: Type.STRING, description: "来源" },
          desc: { type: Type.STRING, description: "效果说明" }
        }
      }
    },
    classFeatures: {
      type: Type.ARRAY,
      description: "职业特性列表",
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING, description: "获得等级" },
          name: { type: Type.STRING, description: "特性名称" },
          type: { type: Type.STRING, description: "类型 (Sp/Su/Ex)" },
          desc: { type: Type.STRING, description: "效果说明" }
        }
      }
    },
    magicBlocks: {
      type: Type.ARRAY,
      description: "法术、类法术能力或特殊能力块列表",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "标题，例如：1环法术、每日类法术能力" },
          type: { type: Type.STRING, description: "类型: text 或 table", enum: ["text", "table"] },
          content: { type: Type.STRING, description: "如果类型是 text，在此处填写内容" },
          columns: {
            type: Type.ARRAY,
            description: "如果类型是 table，定义列名",
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "内部使用的 key，如 col1, col2..." },
                label: { type: Type.STRING, description: "显示的列名" }
              }
            }
          },
          tableData: {
            type: Type.ARRAY,
            description: "如果类型是 table，在此处填写各行的 JSON 对象列表",
            items: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.STRING }
            }
          }
        }
      }
    },
    equipmentBags: {
      type: Type.ARRAY,
      description: "装备容器列表",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "容器名称，例如：身上、背包、马车" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING, description: "物品名称" },
                quantity: { type: Type.STRING, description: "数量" },
                cost: { type: Type.STRING, description: "价格(gp)" },
                weight: { type: Type.STRING, description: "重量(lbs)" },
                notes: { type: Type.STRING, description: "备注" }
              }
            }
          }
        }
      }
    }
  },
  required: ["basic", "attributes"]
};

export async function extractCharacterFromText(text: string, apiKey: string) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "models/gemini-flash-lite-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `你是一个专业的 Pathfinder 1E (PF1) 跑团玩家，擅长从复杂的论坛帖子和 BBCode 文本中提取人物卡信息。
              
              待处理文本（可能包含 BBCode 标签和表格结构）：
              ---
              ${text}
              ---
              
              你的任务是将上述文本中的信息完整、准确地提取到 JSON 中。
              
              关键要求：
              1. **区分特性类型**：
                 - 种族赋予的特性（如：黑暗视觉、敏捷性等）放入 racialTraits。
                 - 职业赋予的特性（如：偷袭、破邪斩、回避动作等）放入 classFeatures。
                 - 背景奖励（如：反制者、寻宝者等）放入 backgroundTraits。
              2. **提取完整性**：
                 - 务必为专长（feats）和特性（traits/features）寻找并填写等级（level）信息及描述（desc/special）。
                 - 提取所有提及的攻击（melee/ranged）、技能、装备。
              3. **处理法术和复杂结构**：
                 - 对于法术、类法术能力（SLA）或其他需要专门呈现的内容，请创建 magicBlocks。
                 - 如果法术在原帖中是以表格形式列出的，请在 magicBlocks 中创建一个类型为 "table" 的块，并定义相应的列和数据。
                 - 如果是零散的描述，使用 "text" 类型的块。
              4. **理解格式**：原文本可能包含 [table]、[tr]、[td] 等 BBCode 标签，请理解这些结构以正确关联数据。
              
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

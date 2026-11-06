export interface SvgSyntaxItem {
  code: string;
  desc: string;
  example: string;
}

export const SVG_HELPERS_GUIDE: SvgSyntaxItem[] = [
  {
    code: '{{xmlEscape val}}',
    desc: '安全转义 XML 文本中的特殊字符（&, <, >, ", \'），防止破坏 SVG 结构',
    example: '<text x="20" y="40">{{xmlEscape name}}</text>'
  },
  {
    code: '{{signed number}}',
    desc: '为正数添加加号（例如 3 => +3，-2 => -2，0 => +0），非常适合先攻、豁免与攻击加值',
    example: '<text>先攻 {{signed defenses.initiative.total}}</text>'
  },
  {
    code: '{{attrMod score}}',
    desc: '根据六维属性值（如 18）自动计算调整值（例如 18 => +4，8 => -1）',
    example: '<text>力量 {{attributes.total.[0]}} ({{attrMod attributes.total.[0]}})</text>'
  },
  {
    code: '{{default val "默认值"}}',
    desc: '当值为空或未定义时显示指定的默认占位符',
    example: '<text>{{default basic.alignment "绝对中立"}}</text>'
  },
  {
    code: '{{add a b}} / {{sub a b}}',
    desc: '数值加法与减法，用于动态计算 SVG 元素坐标与间距',
    example: '<rect y="{{add 100 (mul @index 30)}}" />'
  },
  {
    code: '{{mul a b}} / {{div a b}}',
    desc: '数值乘法与除法，用于根据数组索引计算多行或网格坐标',
    example: '<g transform="translate(0, {{mul @index 28}})">'
  },
  {
    code: '{{truncate text len}}',
    desc: '截断过长的字符串并自动追加省略号（…）',
    example: '<text>{{truncate basic.classes 24}}</text>'
  },
  {
    code: '{{#if (eq a b)}}...{{/if}}',
    desc: '条件判断分支（支持 eq, ne, gt, gte, lt, lte, and, or, not）',
    example: '{{#if (gt defenses.hp.current 0)}}存活{{else}}濒死{{/if}}'
  },
  {
    code: '{{#each list}}...{{/each}}',
    desc: '循环遍历列表（支持武器、专长、技能等，@index 代表当前序号）',
    example: '{{#each attacks.weapon.name}}<text y="{{add 100 (mul @index 20)}}">{{this}}</text>{{/each}}'
  }
];

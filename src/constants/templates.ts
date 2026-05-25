export const DEFAULT_BBCODE_TEMPLATE = `{{#md2bb}}{{#with basic}}[table][tr][td]
{{name}} {{classes}}
{{alignment}} {{deity}}
{{size}} {{gender}} {{race}}
{{height}} {{weight}} {{age}}
{{speed.land}} {{senses}}
先攻 {{initiative}} 察觉 {{perception}}
语言 {{languages}}
[/td]
[td][img width=200 height=200]{{avatars.url.[0]}}[/img][/td]
[/tr]
[/table]{{/with}}
[hr][b]属性[/b][hr]
[table]
{{#each attributes}}
[tr][td]{{name}}[/td][td]{{final}}[/td][td]{{modifier}}[/td][td]{{source}}{{status}}[/td][/tr]
{{/each}}
[/table]
{{#with combatManeuver}}BAB {{bab}}，CMB {{cmb}}，CMD {{cmd}}{{/with}}
[hr]
[b]攻击[/b]
[hr]{{#with attacks}}
近战攻击
[table]
{{#each melee}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{touch}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
远程攻击
[table]
{{#each ranged}}
[tr][td]{{weapon}}[/td][td]{{hit}}[/td][td]{{damage}}{{#unless (and (eq critRange "20") (eq critMultiplier "×2"))}}/{{critRange}}{{critMultiplier}}{{/unless}}[/td][td]{{damageType}}[/td][td]{{range}}[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
{{#if specialAttacks}}特殊攻击
{{specialAttacks}}{{/if}}
{{/with}}
[hr][b]防御[/b][hr]
{{#with defenses}}
{{#with armorClass}}AC {{ac}}（{{source}}），措手不及 {{flatFooted}}，接触 {{touch}}{{/with}}
hp {{hp}} ({{hd}})
{{#with saves}}强韧 {{fort}}，反射 {{ref}}，意志 {{will}}{{/with}}
{{#if specialDefenses}}特殊防御
{{specialDefenses}}{{/if}}
{{/with}}
[hr][b]背景特性与天赋职业[/b][hr]
[b]背景特性：[/b]
{{#each backgroundTraits}}
{{name}}（{{type}}）: {{desc}}
{{/each}}
[b]天赋职业奖励：[/b] {{favoredClass.fc}} ({{favoredClass.fcb}})
[hr][b]种族特性[/b][hr]
[table]
{{#each racialTraits}}
[tr][td]{{name}}[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr][b]职业特性[/b][hr]
[table]
{{#each classFeatures}}
[tr][td]{{level}}[/td][td]{{name}}（{{type}}）[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
{{#if magicBlocks}}[hr][b]法术与类法术能力[/b][hr]
{{#each magicBlocks}}
[b]{{title}}[/b]（CL {{casterLevel}}{{#unless (eq (raw "type") 4)}}, 专注 {{concentration}}{{/unless}}）
[table]
{{#each this}}
[tr]{{#unless (eq (raw "../type") 5)}}[td]{{level}}[/td]{{/unless}}{{#if uses}}[td]{{uses}}[/td]{{/if}}[td]{{spells}}[/td][/tr]
{{/each}}
[/table]
{{#if notes}}备注：{{notes}}{{/if}}
{{/each}}
{{/if}}
[hr][b]技能[/b][hr]
[table]
{{#each skills}}
[tr][td]{{name}}[/td][td]{{total}} ({{rank}}{{cs}}{{ability}} {{others}})[/td][td]{{special}}[/td][/tr]
{{/each}}
[/table]
[hr][b]专长[/b][hr]
[table]
{{#each feats}}
[tr][td]{{level}}[/td][td]{{name}} ({{type}})[/td][td]{{desc}}[/td][/tr]
{{/each}}
[/table]
[hr][b]物品[/b][hr]
{{#each equipment.container}}
[quote author={{name}}]
[table]
{{#each this}}
[tr][td]{{item}}[/td][td]{{quantity}}[/td][td]{{cost}}[/td][td]{{weight}}[/td][td]{{notes}}[/td][/tr]
{{/each}}
[/table]
[/quote]
{{/each}}
[b]总资产 {{equipment.totalCost}}gp，总重 {{equipment.totalWeight}}lbs[/b]
{{/md2bb}}
`;

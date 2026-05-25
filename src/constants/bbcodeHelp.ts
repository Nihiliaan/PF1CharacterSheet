export interface BBCodeSyntaxItem {
  code: string;
  descKey: string;
  example?: string;
}

export interface BBCodeTreeItem {
  key: string;
  descKey: string;
  children?: BBCodeTreeItem[];
  isSoA?: boolean;
}

export const BBCODE_SYNTAX_GUIDE: BBCodeSyntaxItem[] = [
  { code: '{{field}}', descKey: 'bbcode_help.syntax.field' },
  { code: '{{raw "field"}}', descKey: 'bbcode_help.syntax.raw', example: '{{#if (eq (raw "size") 4)}}中型{{/if}}' },
  { code: '{{raw "../field"}}', descKey: 'bbcode_help.syntax.raw_parent' },
  { code: '{{#with field}}...{{/with}}', descKey: 'bbcode_help.syntax.with' },
  { code: '{{#each field}}...{{/each}}', descKey: 'bbcode_help.syntax.each' },
  { code: '{{#if condition}}...{{else}}...{{/if}}', descKey: 'bbcode_help.syntax.if' },
  { code: '{{#unless condition}}...{{/unless}}', descKey: 'bbcode_help.syntax.unless' },
  { code: '(eq a b)', descKey: 'bbcode_help.syntax.eq', example: '{{#if (eq (raw "size") 4)}}中型{{/if}}' },
  { code: '(and a b), (or a b), (not a)', descKey: 'bbcode_help.syntax.logic' },
  { code: '{{md2bb field}}', descKey: 'bbcode_help.syntax.md2bb' },
  { code: '{{#md2bb}}...{{/md2bb}}', descKey: 'bbcode_help.syntax.md2bb_block' },
];

export const BBCODE_DATA_TREE: BBCodeTreeItem[] = [
  {
    key: 'basic',
    descKey: 'bbcode_help.data.basic',
    children: [
      { key: 'name', descKey: 'bbcode_help.data.basic_name' },
      { key: 'classes', descKey: 'bbcode_help.data.basic_classes' },
      { key: 'alignment', descKey: 'bbcode_help.data.basic_alignment' },
      { key: 'race', descKey: 'bbcode_help.data.basic_race' },
      { key: 'deity', descKey: 'bbcode_help.data.basic_deity' },
      { key: 'size', descKey: 'bbcode_help.data.basic_size' },
      { key: 'gender', descKey: 'bbcode_help.data.basic_gender' },
      { key: 'age', descKey: 'bbcode_help.data.basic_age' },
      { key: 'height', descKey: 'bbcode_help.data.basic_height' },
      { key: 'weight', descKey: 'bbcode_help.data.basic_weight' },
      { key: 'initiative', descKey: 'bbcode_help.data.basic_initiative' },
      { key: 'perception', descKey: 'bbcode_help.data.basic_perception' },
      { key: 'languages', descKey: 'bbcode_help.data.basic_languages' },
      { key: 'senses', descKey: 'bbcode_help.data.basic_senses' },
      {
        key: 'speed', descKey: 'bbcode_help.data.basic_speed', children: [
          { key: 'land', descKey: 'bbcode_help.data.basic_speed_land' },
          { key: 'fly', descKey: 'bbcode_help.data.basic_speed_fly' },
          { key: 'swim', descKey: 'bbcode_help.data.basic_speed_swim' },
          { key: 'climb', descKey: 'bbcode_help.data.basic_speed_climb' },
          { key: 'burrow', descKey: 'bbcode_help.data.basic_speed_burrow' },
          { key: 'maneuverability', descKey: 'bbcode_help.data.basic_speed_maneuverability' },
        ]
      },
      {
        key: 'avatars', descKey: 'bbcode_help.data.basic_avatars', isSoA: true, children: [
          { key: 'url', descKey: 'bbcode_help.data.basic_avatars_url' },
          { key: 'note', descKey: 'bbcode_help.data.basic_avatars_note' },
        ]
      },
    ]
  },
  { key: 'story', descKey: 'bbcode_help.data.story' },
  {
    key: 'attributes',
    descKey: 'bbcode_help.data.attributes',
    isSoA: true,
    children: [
      { key: 'name', descKey: 'bbcode_help.data.attributes_name' },
      { key: 'final', descKey: 'bbcode_help.data.attributes_final' },
      { key: 'modifier', descKey: 'bbcode_help.data.attributes_modifier' },
      { key: 'source', descKey: 'bbcode_help.data.attributes_source' },
      { key: 'status', descKey: 'bbcode_help.data.attributes_status' },
    ]
  },
  {
    key: 'combatManeuver',
    descKey: 'bbcode_help.data.combatManeuver',
    children: [
      { key: 'bab', descKey: 'bbcode_help.data.combatManeuver_bab' },
      { key: 'cmb', descKey: 'bbcode_help.data.combatManeuver_cmb' },
      { key: 'cmd', descKey: 'bbcode_help.data.combatManeuver_cmd' },
      { key: 'notes', descKey: 'bbcode_help.data.combatManeuver_notes' },
    ]
  },
  {
    key: 'attacks',
    descKey: 'bbcode_help.data.attacks',
    children: [
      {
        key: 'melee', descKey: 'bbcode_help.data.attacks_melee', isSoA: true, children: [
          { key: 'weapon', descKey: 'bbcode_help.data.attacks_melee_weapon' },
          { key: 'hit', descKey: 'bbcode_help.data.attacks_melee_hit' },
          { key: 'damage', descKey: 'bbcode_help.data.attacks_melee_damage' },
          { key: 'critRange', descKey: 'bbcode_help.data.attacks_melee_critRange' },
          { key: 'critMultiplier', descKey: 'bbcode_help.data.attacks_melee_critMultiplier' },
          { key: 'touch', descKey: 'bbcode_help.data.attacks_melee_touch' },
          { key: 'damageType', descKey: 'bbcode_help.data.attacks_melee_damageType' },
          { key: 'special', descKey: 'bbcode_help.data.attacks_melee_special' },
        ]
      },
      {
        key: 'ranged', descKey: 'bbcode_help.data.attacks_ranged', isSoA: true, children: [
          { key: 'weapon', descKey: 'bbcode_help.data.attacks_ranged_weapon' },
          { key: 'hit', descKey: 'bbcode_help.data.attacks_ranged_hit' },
          { key: 'damage', descKey: 'bbcode_help.data.attacks_ranged_damage' },
          { key: 'critRange', descKey: 'bbcode_help.data.attacks_ranged_critRange' },
          { key: 'critMultiplier', descKey: 'bbcode_help.data.attacks_ranged_critMultiplier' },
          { key: 'range', descKey: 'bbcode_help.data.attacks_ranged_range' },
          { key: 'damageType', descKey: 'bbcode_help.data.attacks_ranged_damageType' },
          { key: 'special', descKey: 'bbcode_help.data.attacks_ranged_special' },
        ]
      },
      { key: 'specialAttacks', descKey: 'bbcode_help.data.attacks_specialAttacks' },
    ]
  },
  {
    key: 'defenses',
    descKey: 'bbcode_help.data.defenses',
    children: [
      { key: 'hp', descKey: 'bbcode_help.data.defenses_hp' },
      { key: 'hd', descKey: 'bbcode_help.data.defenses_hd' },
      {
        key: 'armorClass', descKey: 'bbcode_help.data.defenses_armorClass', children: [
          { key: 'ac', descKey: 'bbcode_help.data.defenses_armorClass_ac' },
          { key: 'touch', descKey: 'bbcode_help.data.defenses_armorClass_touch' },
          { key: 'flatFooted', descKey: 'bbcode_help.data.defenses_armorClass_flatFooted' },
          { key: 'source', descKey: 'bbcode_help.data.defenses_armorClass_source' },
          { key: 'notes', descKey: 'bbcode_help.data.defenses_armorClass_notes' },
        ]
      },
      {
        key: 'saves', descKey: 'bbcode_help.data.defenses_saves', children: [
          { key: 'fort', descKey: 'bbcode_help.data.defenses_saves_fort' },
          { key: 'ref', descKey: 'bbcode_help.data.defenses_saves_ref' },
          { key: 'will', descKey: 'bbcode_help.data.defenses_saves_will' },
          { key: 'notes', descKey: 'bbcode_help.data.defenses_saves_notes' },
        ]
      },
      { key: 'specialDefenses', descKey: 'bbcode_help.data.defenses_specialDefenses' },
    ]
  },
  {
    key: 'racialTraits',
    descKey: 'bbcode_help.data.racialTraits',
    isSoA: true,
    children: [
      { key: 'name', descKey: 'bbcode_help.data.racialTraits_name' },
      { key: 'desc', descKey: 'bbcode_help.data.racialTraits_desc' },
    ]
  },
  {
    key: 'backgroundTraits',
    descKey: 'bbcode_help.data.backgroundTraits',
    isSoA: true,
    children: [
      { key: 'name', descKey: 'bbcode_help.data.backgroundTraits_name' },
      { key: 'type', descKey: 'bbcode_help.data.backgroundTraits_type' },
      { key: 'desc', descKey: 'bbcode_help.data.backgroundTraits_desc' },
    ]
  },
  {
    key: 'favoredClass',
    descKey: 'bbcode_help.data.favoredClass',
    children: [
      { key: 'fc', descKey: 'bbcode_help.data.favoredClass_fc' },
      { key: 'fcb', descKey: 'bbcode_help.data.favoredClass_fcb' },
    ]
  },
  {
    key: 'classFeatures',
    descKey: 'bbcode_help.data.classFeatures',
    isSoA: true,
    children: [
      { key: 'level', descKey: 'bbcode_help.data.classFeatures_level' },
      { key: 'name', descKey: 'bbcode_help.data.classFeatures_name' },
      { key: 'type', descKey: 'bbcode_help.data.classFeatures_type' },
      { key: 'desc', descKey: 'bbcode_help.data.classFeatures_desc' },
    ]
  },
  {
    key: 'feats',
    descKey: 'bbcode_help.data.feats',
    isSoA: true,
    children: [
      { key: 'level', descKey: 'bbcode_help.data.feats_level' },
      { key: 'source', descKey: 'bbcode_help.data.feats_source' },
      { key: 'name', descKey: 'bbcode_help.data.feats_name' },
      { key: 'type', descKey: 'bbcode_help.data.feats_type' },
      { key: 'desc', descKey: 'bbcode_help.data.feats_desc' },
    ]
  },
  {
    key: 'skills',
    descKey: 'bbcode_help.data.skills',
    isSoA: true,
    children: [
      { key: 'name', descKey: 'bbcode_help.data.skills_name' },
      { key: 'total', descKey: 'bbcode_help.data.skills_total' },
      { key: 'rank', descKey: 'bbcode_help.data.skills_rank' },
      { key: 'cs', descKey: 'bbcode_help.data.skills_cs' },
      { key: 'ability', descKey: 'bbcode_help.data.skills_ability' },
      { key: 'others', descKey: 'bbcode_help.data.skills_others' },
      { key: 'special', descKey: 'bbcode_help.data.skills_special' },
      { key: 'totalPoints', descKey: 'bbcode_help.data.skills_totalPoints' },
      { key: 'acp', descKey: 'bbcode_help.data.skills_acp' },
      { key: 'notes', descKey: 'bbcode_help.data.skills_notes' },
    ]
  },
  {
    key: 'magicBlocks',
    descKey: 'bbcode_help.data.magicBlocks',
    children: [
      { key: 'title', descKey: 'bbcode_help.data.magicBlocks_title' },
      { key: 'casterLevel', descKey: 'bbcode_help.data.magicBlocks_casterLevel' },
      { key: 'concentration', descKey: 'bbcode_help.data.magicBlocks_concentration' },
      { key: 'type', descKey: 'bbcode_help.data.magicBlocks_type' },
      { key: 'notes', descKey: 'bbcode_help.data.magicBlocks_notes' },
      { key: 'level', descKey: 'bbcode_help.data.magicBlocks_level' },
      { key: 'spells', descKey: 'bbcode_help.data.magicBlocks_spells' },
      { key: 'uses', descKey: 'bbcode_help.data.magicBlocks_uses' },
    ]
  },
  {
    key: 'equipment',
    descKey: 'bbcode_help.data.equipment',
    children: [
      {
        key: 'container', descKey: 'bbcode_help.data.equipment_container', children: [
          { key: 'name', descKey: 'bbcode_help.data.equipment_container_name' },
          { key: 'ignoreWeight', descKey: 'bbcode_help.data.equipment_container_ignoreWeight' },
          { key: 'item', descKey: 'bbcode_help.data.equipment_container_item' },
          { key: 'quantity', descKey: 'bbcode_help.data.equipment_container_quantity' },
          { key: 'cost', descKey: 'bbcode_help.data.equipment_container_cost' },
          { key: 'weight', descKey: 'bbcode_help.data.equipment_container_weight' },
          { key: 'notes', descKey: 'bbcode_help.data.equipment_container_notes' },
        ]
      },
      { key: 'encumbranceMultiplier', descKey: 'bbcode_help.data.equipment_encumbranceMultiplier' },
      {
        key: 'currency', descKey: 'bbcode_help.data.equipment_currency', children: [
          { key: 'pp', descKey: 'bbcode_help.data.equipment_currency_pp' },
          { key: 'gp', descKey: 'bbcode_help.data.equipment_currency_gp' },
          { key: 'sp', descKey: 'bbcode_help.data.equipment_currency_sp' },
          { key: 'cp', descKey: 'bbcode_help.data.equipment_currency_cp' },
          { key: 'coinWeight', descKey: 'bbcode_help.data.equipment_currency_coinWeight' },
        ]
      },
      { key: 'notes', descKey: 'bbcode_help.data.equipment_notes' },
      { key: 'totalCost', descKey: 'bbcode_help.data.equipment_totalCost' },
      { key: 'totalWeight', descKey: 'bbcode_help.data.equipment_totalWeight' },
      { key: 'encumbrance', descKey: 'bbcode_help.data.equipment_encumbrance' },
    ]
  },
  { key: 'additionalData', descKey: 'bbcode_help.data.additionalData' },
];

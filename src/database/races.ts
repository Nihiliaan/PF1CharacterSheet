export const RACES_DATA = [
  {
    name: 'core',
    content: [
      {
        name: 'Human',
        showParent: true,
        content: ['Azlanti', 'Chelaxian', 'Garundi', 'Keleshite', 'Kellid', 'Minkai', 'Mwangi', 'Shoanti', 'Taldan', 'Tian', 'Ulfen', 'Varisian', 'Vudrani']
      },
      'Elf', 'Dwarf', 'Gnome', 'Halfling', 'Half-Orc', 'Half-Elf'
    ]
  },
  {
    name: 'uncommon',
    content: [
      {
        name: 'Aasimar',
        selectable: true,
        showParent: true,
        content: ['Agathion-Blooded', 'Angel-Blooded', 'Archon-Blooded', 'Azata-Blooded', 'Garuda-Blooded', 'Peri-Blooded']
      },
      'Drow',
      {
        name: 'Geniekin',
        selectable: true,
        showParent: true,
        content: ['Ifrit', 'Oread', 'Suli', 'Sylph', 'Undine']
      },
      'Goblin', 'Kobold', 'Orc',
      {
        name: 'Tiefling',
        selectable: true,
        showParent: true,
        content: ['Asura-Spawn', 'Daemon-Spawn', 'Demodand-Spawn', 'Demon-Spawn', 'Devil-Spawn', 'Div-Spawn', 'Kyton-Spawn', 'Oni-Spawn', 'Qlippoth-Spawn', 'Rakshasa-Spawn']
      }
    ]
  },
  {
    name: 'rare',
    content: [
      { name: 'aliens', content: ['Kasatha', 'Lashunta', 'Triaxian', 'Trox'] },
      'Android',
      'Catfolk',
      'Changeling',
      {
        name: 'Dhampir',
        selectable: true,
        showParent: true,
        content: ['Jiang-Shi-Born', 'Moroi-Born', 'Nosferatu-Born', 'Vetala-Born']
      },
      { name: 'dragon_empires', content: ['Kitsune', 'Nagaji', 'Samsaran', 'Tengu', 'Wayang'] },
      'Fetchling',
      'Ghoran',
      'Gillman',
      'Hobgoblin',
      {
        name: 'other',
        content: [
          'Aquatic Elf', 'Duergar', 'Gathlain', 'Grippli', 'Merfolk',
          {
            name: 'Skinwalker',
            selectable: true,
            showParent: true,
            content: ['Werebat-Kin', 'Werebear-Kin', 'Wereboar-Kin', 'Werecrocodile-Kin', 'Wererat-Kin', 'Wereshark-Kin', 'Weretiger-Kin', 'Werewolf-Kin']
          },
          'Svirfneblin', 'Vanara', 'Vishkanya', 'Wyrwood', 'Wyvaran'
        ]
      },
      'Ratfolk',
      'Strix'
    ]
  }
];

export function flattenDirectory(data: any[]): any[] {
  let result: any[] = [];
  data.forEach(item => {
    if (typeof item === 'object' && item !== null && 'content' in item) {
      if (item.selectable) {
        result.push(item.name);
      }
      result = result.concat(flattenDirectory(item.content));
    } else {
      result.push(item);
    }
  });
  return result;
}

export const ALL_RACES = flattenDirectory(RACES_DATA);

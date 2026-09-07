export type LocalizedName = [string, string];

export interface PantheonCategory {
  name: LocalizedName;
  content: LocalizedName[];
}

export const DEITIES_BY_PANTHEON: PantheonCategory[] = [
  {
    name: ['Core Deities', '核心神祇'],
    content: [
      ['Erastil', '埃拉斯蒂尔'],
      ['Iomedae', '艾奥梅黛'],
      ['Torag', '托拉格'],
      ['Sarenrae', '塞恩蕾'],
      ['Shelyn', '莎琳'],
      ['Cayden Cailean', '凯登·凯利恩'],
      ['Desna', '黛丝娜'],
      ['Abadar', '阿布达'],
      ['Irori', '义洛理'],
      ['Gozreh', '格兹雷'],
      ['Green Faith', '苍翠誓约'],
      ['Nethys', '耐希斯'],
      ['Pharasma', '法拉兹玛'],
      ['Calistria', '卡莉丝翠'],
      ['Gorum', '古拉姆'],
      ['Asmodeus', '阿斯莫迪尔斯'],
      ['Zon-Kuthon', '宗-库松'],
      ['Norgorber', '诺格巴'],
      ['Urgathoa', '厄迦图娅'],
      ['Lamashtu', '拉玛什图'],
      ['Rovagug', '洛瓦古格']
    ]
  },
  {
    name: ['Other Deities', 'Other Deities'],
    content: [
      ['Apsu', '阿普苏'],
      ['Easivra', '伊西薇拉'],
      ['Gruhastha', 'Gruhastha'],
      ['Cihua Couatl', 'Cihua Couatl'],
      ['Kazutal', '卡祖塔'],
      ['Kurgess', '库尔吉斯'],
      ['Mazludeh', 'Mazludeh'],
      ['Omrataji', 'Omrataji'],
      ['Milani', '密拉妮'],
      ['Alseta', 'Alseta'],
      ['Erecura', 'Erecura'],
      ['Matravash', 'Matravash'],
      ['Brigh', 'Brigh'],
      ['Feronia', 'Feronia'],
      ['Grandmother Spider', 'Grandmother Spider'],
      ['Naderi', 'Naderi'],
      ['Nivi Rhombodazzle', 'Nivi Rhombodazzle'],
      ['Sivanah', '西凡娜'],
      ['Ashukharma', 'Ashukharma'],
      ['Besmara', '贝斯玛拉'],
      ['Groetus', '格罗图斯'],
      ['Hanspur', '翰斯普'],
      ['Nocticula (Redeemed)', '诺克提库拉'],
      ['Speakers of the Depths', '深渊演说者'],
      ['Achaekek', '阿卡艾克克'],
      ['Dhalavei', 'Dhalavei'],
      ['Lissala', '璃殇'],
      ['Ah Pook', 'Ah Pook'],
      ['Ahriman', '阿里曼'],
      ['Alazhra', '阿拉卓'],
      ['Arazni', '阿拉兹妮'],
      ['Zyphus', '泽弗斯'],
      ['Camazotz', 'Camazotz'],
      ['Dahak', '达哈克'],
      ['Ghlaunder', '珈兰德尔'],
      ['Gyronna', '吉罗娜'],
      ['Kitumu', 'Kitumu'],
      ['Ydersius', '耶德希斯']
    ]
  },
  {
    name: ['Aeon', '御衡者'],
    content: [
      ['Monad', 'Monad']
    ]
  },
  {
    name: ['Archdevils', 'Archdevils'],
    content: [
      ['Baalzebul', '巴尔泽布'],
      ['Barbatos', '巴尔巴托斯'],
      ['Belial', '贝利亚'],
      ['Dispater', '迪斯帕特'],
      ['Geryon', '格殷永'],
      ['Mammon', '玛门'],
      ['Mephistopheles', '墨菲斯托菲勒斯'],
      ['Moloch', '摩洛克']
    ]
  },
  {
    name: ['Asura Ranas', 'Asura Ranas'],
    content: [
      ['Andak', 'Andak'],
      ['Bohga', 'Bohga'],
      ['Chugarra', 'Chugarra'],
      ['Chupurvagasti', 'Chupurvagasti'],
      ['Gavidya', 'Gavidya'],
      ['Hydim', 'Hydim'],
      ['Ioramvol', 'Ioramvol'],
      ['Maeha', 'Maeha'],
      ['Onamahli', 'Onamahli'],
      ['Rahu', 'Rahu'],
      ['Rytara', 'Rytara'],
      ['Taraksun', 'Taraksun'],
      ['Zurapadyn', 'Zurapadyn']
    ]
  },
  {
    name: ['Azlanti Pantheon', 'Azlanti Pantheon'],
    content: [
      ['Aesocar', 'Aesocar'],
      ['Myr', 'Myr'],
      ['Jaidi', 'Jaidi'],
      ['Shelyn (pre-Earthfall)', '莎琳'],
      ['Elion', 'Elion'],
      ['Amaznen', 'Amaznen'],
      ['Lissala (pre-Earthfall)', '璃殇'],
      ['Onos', 'Onos'],
      ['Acavna', 'Acavna'],
      ['Sicva', 'Sicva'],
      ['Scal', 'Scal'],
      ['Ulon', 'Ulon']
    ]
  },
  {
    name: ['Daemon Harbingers', 'Daemon Harbingers'],
    content: [
      ['Aesdurath', 'Aesdurath'],
      ['Ajids', 'Ajids'],
      ['Anogetz', 'Anogetz'],
      ['Arlachramas', 'Arlachramas'],
      ['Braismois', 'Braismois'],
      ['Cixyron', 'Cixyron'],
      ['Corosbel', 'Corosbel'],
      ['Diceid', 'Diceid'],
      ['Ealdeez', 'Ealdeez'],
      ['Folca', 'Folca'],
      ['Geon', '吉翁'],
      ['Hastrikhal', 'Hastrikhal'],
      ['Jacarkas', 'Jacarkas'],
      ['Laivatiniel', 'Laivatiniel'],
      ['Llamolaek', 'Llamolaek'],
      ['Mneoc', 'Mneoc'],
      ['Nalmungder', 'Nalmungder'],
      ['Osolmyr', 'Osolmyr'],
      ['Pavnuri', 'Pavnuri'],
      ['Roqorolos', 'Roqorolos'],
      ['Ruapceras', 'Ruapceras'],
      ['Slandrais', 'Slandrais'],
      ['Stygidvod', 'Stygidvod'],
      ['Tamede', 'Tamede'],
      ['Tresmalvos', 'Tresmalvos'],
      ['Uaransaph', '乌兰萨夫'],
      ['Vorasha', 'Vorasha'],
      ['Xsistaid', 'Xsistaid'],
      ['Zaigasnar', 'Zaigasnar'],
      ['Zelishkar', 'Zelishkar']
    ]
  },
  {
    name: ['Dead Deities', 'Dead Deities'],
    content: [
      ['Aroden', '奥罗登']
    ]
  },
  {
    name: ['Deities of Ancient Osirion', 'Deities of Ancient Osirion'],
    content: [
      ['Osiris', 'Osiris'],
      ['Wadjet', 'Wadjet'],
      ['Bes', 'Bes'],
      ['Isis', 'Isis'],
      ['Khepri', 'Khepri'],
      ['Neith', 'Neith'],
      ['Hathor', 'Hathor'],
      ['Selket', 'Selket'],
      ['Anubis', 'Anubis'],
      ['Horus', 'Horus'],
      ['Maat', 'Maat'],
      ['Ra', 'Ra'],
      ['Thoth', 'Thoth'],
      ['Ptah', 'Ptah'],
      ['Bastet', 'Bastet'],
      ['Nephthys', 'Nephthys'],
      ['Sekhmet', 'Sekhmet'],
      ['Sobek', 'Sobek'],
      ['Set', 'Set'],
      ['Apep', '阿佩普']
    ]
  },
  {
    name: ['Deities of Tian Xia', 'Deities of Tian Xia'],
    content: [
      ['Shizuru', '静琉'],
      ['Tsukiyo', 'Tsukiyo'],
      ['Qi Zhong', 'Qi Zhong'],
      ['Kofusachi', 'Kofusachi'],
      ['Daikitsu', 'Daikitsu'],
      ['Nalinivati', 'Nalinivati'],
      ['Yamatsumi', 'Yamatsumi'],
      ['Hei Feng', 'Hei Feng'],
      ['Sun Wukong', 'Sun Wukong'],
      ['General Susumu', 'General Susumu'],
      ['Yaezhing', 'Yaezhing'],
      ['Fumeiyoshi', 'Fumeiyoshi'],
      ['Lao Shu Po', 'Lao Shu Po'],
      ['Lady Nanbyo', 'Lady Nanbyo']
    ]
  },
  {
    name: ['Demon Lords', 'Demon Lords'],
    content: [
      ['Abraxas', '阿巴拉克萨斯'],
      ['Aldinach', '奥迪娜克'],
      ['Andirifkhu', '安德莉芙库'],
      ['Angazhan', '安加赞'],
      ['Areshkagal', '厄莱什卡果'],
      ['Baphomet', '巴风特'],
      ['Cyth-V\'sug', 'Cyth-V\'sug'],
      ['Dagon', '大衮'],
      ['Deskari', '德斯卡利'],
      ['Flauros', '弗洛厄斯'],
      ['Gogunta', '果甘蜍'],
      ['Haagenti', '哈甘帖'],
      ['Jezelda', '杰塞尔达'],
      ['Jubilex', '尤贝莱克斯'],
      ['Kabriri', '卡布里力'],
      ['Kostchtchie', '科什迪克提凯'],
      ['Mazmezz', '玛茨麦兹'],
      ['Mestama', '麦斯塔玛'],
      ['Nocticula', '诺克提库拉'],
      ['Nurgal', '诺尔格'],
      ['Orcus', '奥喀斯'],
      ['Pazuzu', '帕祖祖'],
      ['Shax', '煞克斯'],
      ['Shivaska', '希瓦斯卡'],
      ['Sifkesh', '西芙凯什'],
      ['Socothbenoth', '索科斯彼诺斯'],
      ['Urxehl', '乌可吉尔'],
      ['Xoveron', '佐乌安'],
      ['Yhidothrus', '伊希多斯拉斯'],
      ['Zevgavizeb', '泽乌伽瓦灾布'],
      ['Zura', '祖拉']
    ]
  },
  {
    name: ['Dwarven Deities', 'Dwarven Deities'],
    content: [
      ['Angradd', '安哥拉德'],
      ['Folgrit', '福格瑞特'],
      ['Grundinnar', '奎因迪勒'],
      ['Bolka', '波络卡'],
      ['Trudd', '杜鲁德'],
      ['Dranngvit', '德朗维特'],
      ['Kols', '寇司'],
      ['Magrim', '马格里姆'],
      ['Droskar', '卓斯卡']
    ]
  },
  {
    name: ['Eldest', 'Eldest'],
    content: [
      ['Imbrex', '因博莱克斯'],
      ['Magdh', '玛芙'],
      ['Ng', '无'],
      ['Shyka', '夏依卡'],
      ['The Lost Prince', 'The Lost Prince'],
      ['Count Ranalc', '莱诺克伯爵'],
      ['The Lantern King', 'The Lantern King'],
      ['The Green Mother', 'The Green Mother'],
      ['Ragadahn', '拉格达恩']
    ]
  },
  {
    name: ['Elemental Lords', 'Elemental Lords'],
    content: [
      ['Ayrzul', '阿依尔祖'],
      ['Hshurha', '赫舒哈'],
      ['Kelizandri', '凯利赞锥'],
      ['Ymeri', '伊麦瑞']
    ]
  },
  {
    name: ['Elven Deities', 'Elven Deities'],
    content: [
      ['Yuelral', 'Yuelral'],
      ['Findeladlara', 'Findeladlara'],
      ['Ketephys', 'Ketephys']
    ]
  },
  {
    name: ['Empyreal Lords', 'Empyreal Lords'],
    content: [
      ['Andoletta', '安多莱塔'],
      ['Arqueros', 'Arqueros'],
      ['Damerrich', 'Damerrich'],
      ['Eldas', 'Eldas'],
      ['Falayna', 'Falayna'],
      ['Ghenshau', 'Ghenshau'],
      ['Kelinahat', 'Kelinahat'],
      ['Kroina', 'Kroina'],
      ['Lymnieris', 'Lymnieris'],
      ['Neshen', 'Neshen'],
      ['Olheon', 'Olheon'],
      ['Ragathiel', '拉贾瑟尔'],
      ['Smiad', 'Smiad'],
      ['Svarozic', 'Svarozic'],
      ['Tanagaar', 'Tanagaar'],
      ['Vildeis', 'Vildeis'],
      ['Winlas', 'Winlas'],
      ['Zohls', 'Zohls'],
      ['Arshea', '阿勒什'],
      ['Benorus', 'Benorus'],
      ['Bharnarol', 'Bharnarol'],
      ['Dalenydra', 'Dalenydra'],
      ['Eritrice', 'Eritrice'],
      ['Halcamora', 'Halcamora'],
      ['Irez', 'Irez'],
      ['Jaidz', 'Jaidz'],
      ['Korada', '孔冉达'],
      ['Lorris', 'Lorris'],
      ['Lythertida', 'Lythertida'],
      ['Ondisso', 'Ondisso'],
      ['Rowdrosh', 'Rowdrosh'],
      ['Seramaydiel', 'Seramaydiel'],
      ['Shei', 'Shei'],
      ['Soralyon', 'Soralyon'],
      ['Uskyeria', 'Uskyeria'],
      ['Ylimancha', 'Ylimancha'],
      ['Ashava', 'Ashava'],
      ['Black Butterfly', 'Black Butterfly'],
      ['Cernunnos', 'Cernunnos'],
      ['Chadali', 'Chadali'],
      ['Chucaro', 'Chucaro'],
      ['Hembad', 'Hembad'],
      ['Immonhiel', 'Immonhiel'],
      ['Jalaijatali', 'Jalaijatali'],
      ['Keltheald', 'Keltheald'],
      ['Lalaci', 'Lalaci'],
      ['Marishi', 'Marishi'],
      ['Picoperi', '皮寇派瑞'],
      ['Pulura', '普露拉'],
      ['Reymenda', 'Reymenda'],
      ['Sinashakti', '辛纳沙克提'],
      ['Thisamet', 'Thisamet'],
      ['Tolc', 'Tolc'],
      ['Valani', '瓦拉尼']
    ]
  },
  {
    name: ['Giant Deities', 'Giant Deities'],
    content: [
      ['Aegirran', 'Aegirran'],
      ['Bergelmir', 'Bergelmir'],
      ['Skode', 'Skode'],
      ['Skrymir', 'Skrymir'],
      ['Fandarra', 'Fandarra'],
      ['Tjasse', 'Tjasse'],
      ['Minderhal', 'Minderhal'],
      ['Zursvaater', 'Zursvaater'],
      ['Haggakal', 'Haggakal'],
      ['Thremyr', 'Thremyr'],
      ['Urazra', 'Urazra']
    ]
  },
  {
    name: ['Goblin Hero-Gods', 'Goblin Hero-Gods'],
    content: [
      ['Hadregash', 'Hadregash'],
      ['Venkelvore', 'Venkelvore'],
      ['Zarongel', 'Zarongel'],
      ['Zogmugot', 'Zogmugot']
    ]
  },
  {
    name: ['Great Old One', '旧日支配者'],
    content: [
      ['Tawil at\'Umr', 'Tawil at\'Umr']
    ]
  },
  {
    name: ['Great Old Ones', '旧日支配者'],
    content: [
      ['Bokrug', 'Bokrug'],
      ['Mhar', 'Mhar'],
      ['Yig', 'Yig'],
      ['Atlach-Nacha', 'Atlach-Nacha'],
      ['Ghatanothoa', 'Ghatanothoa'],
      ['Xhamen-Dor', 'Xhamen-Dor'],
      ['Chaugnar Faugn', 'Chaugnar Faugn'],
      ['Cthulhu', 'Cthulhu'],
      ['Hastur', 'Hastur'],
      ['Ithaqua', 'Ithaqua'],
      ['Mordiggian', 'Mordiggian'],
      ['Orgesh', 'Orgesh'],
      ['Rhan-Tegoth', 'Rhan-Tegoth'],
      ['Tsathoggua', 'Tsathoggua']
    ]
  },
  {
    name: ['Halfling Deities', 'Halfling Deities'],
    content: [
      ['Chaldira', 'Chaldira'],
      ['Thamir Gixx', 'Thamir Gixx']
    ]
  },
  {
    name: ['Horsemen', '天启骑士'],
    content: [
      ['Apollyon', '亚玻伦'],
      ['Charon', '卡戎'],
      ['Szuriel', '祖瑞艾尔'],
      ['Trelmarixian', '崔玛瑞克希安']
    ]
  },
  {
    name: ['Iblydan Hero-Gods', 'Iblydan Hero-Gods'],
    content: [
      ['Chinostes (Good Aspect)', 'Chinostes (Good Aspect)'],
      ['Kelksiomides', 'Kelksiomides'],
      ['Upion and Warrik', 'Upion and Warrik'],
      ['Psomeira', 'Psomeira'],
      ['Aerekostes', 'Aerekostes'],
      ['Drokalion', 'Drokalion'],
      ['Iapholi', 'Iapholi'],
      ['Chinostes (Evil Aspect)', 'Chinostes (Evil Aspect)'],
      ['Ongalte', 'Ongalte'],
      ['Pharimia', 'Pharimia']
    ]
  },
  {
    name: ['Infernal Dukes', 'Infernal Dukes'],
    content: [
      ['Alocer', 'Alocer'],
      ['Bifrons', 'Bifrons'],
      ['Crocell', '克罗赛尔'],
      ['Deumus', 'Deumus'],
      ['Eaqueo', '艾凯'],
      ['Eligos', '埃里格斯'],
      ['Furcas', 'Furcas'],
      ['Gaap', 'Gaap'],
      ['Haborym', 'Haborym'],
      ['Iaozrael', 'Iaozrael'],
      ['Jiraviddain', 'Jiraviddain'],
      ['Kalma', 'Kalma'],
      ['Lorcan', 'Lorcan'],
      ['Lorthact', 'Lorthact'],
      ['Losarkur', 'Losarkur'],
      ['Malthus', 'Malthus'],
      ['Nergal', 'Nergal'],
      ['Ose', 'Ose'],
      ['Pirias', '皮利亚斯'],
      ['Quindiovatos', 'Quindiovatos'],
      ['Rasvocel', 'Rasvocel'],
      ['Ruzel', 'Ruzel'],
      ['Sabnach', '萨布纳切'],
      ['Titivilus', 'Titivilus'],
      ['Uruskreil', 'Uruskreil'],
      ['Vapula', '瓦普拉'],
      ['Vois', 'Vois'],
      ['Wylgart', 'Wylgart'],
      ['Xhasnaphar', 'Xhasnaphar'],
      ['Yan-gant-y-tan', 'Yan-gant-y-tan'],
      ['Zaebos', 'Zaebos'],
      ['Zepar', 'Zepar']
    ]
  },
  {
    name: ['Kyton Demagogues', 'Kyton Demagogues'],
    content: [
      ['Aroggus', '阿诺古斯'],
      ['Barravoclair', 'Barravoclair'],
      ['Fharaas', 'Fharaas'],
      ['Inkariax', 'Inkariax'],
      ['Kaikyton', 'Kaikyton'],
      ['Morrobahn', 'Morrobahn'],
      ['Raetorgash', 'Raetorgash'],
      ['Sugroz', 'Sugroz'],
      ['Vevelor', '维沃若']
    ]
  },
  {
    name: ['Malebranche', 'Malebranche'],
    content: [
      ['Alichino', 'Alichino'],
      ['Barbariccia', 'Barbariccia'],
      ['Cagnazzo', 'Cagnazzo'],
      ['Calcabrina', 'Calcabrina'],
      ['Circiatto', 'Circiatto'],
      ['Draghignazzo', 'Draghignazzo'],
      ['Farfarello', 'Farfarello'],
      ['Graffiacane', 'Graffiacane'],
      ['Libicocco', 'Libicocco'],
      ['Malacoda', 'Malacoda'],
      ['Rubicante', 'Rubicante'],
      ['Scarmiglione', 'Scarmiglione']
    ]
  },
  {
    name: ['Nascent Demon Lords', 'Nascent Demon Lords'],
    content: [
      ['Daclau-Sar', 'Daclau-Sar'],
      ['Izyagna', 'Izyagna'],
      ['Kro\'akoth', 'Kro\'akoth'],
      ['Menxyr', 'Menxyr'],
      ['Murnath', 'Murnath'],
      ['Nightripper', 'Nightripper'],
      ['Ovonovo', 'Ovonovo'],
      ['Shamira', 'Shamira'],
      ['Sithhud', 'Sithhud'],
      ['Treerazer', '垂拉泽尔']
    ]
  },
  {
    name: ['Oni Daimyo', 'Oni Daimyo'],
    content: [
      ['Akuma', 'Akuma'],
      ['Inma', 'Inma'],
      ['Uzumae', 'Uzumae'],
      ['Chimon', 'Chimon'],
      ['Muronna', 'Muronna'],
      ['Nataka', 'Nataka'],
      ['Yabu', 'Yabu'],
      ['Guyuku', 'Guyuku'],
      ['Onmyuza', 'Onmyuza'],
      ['Ushitora', 'Ushitora']
    ]
  },
  {
    name: ['Orc Deities', 'Orc Deities'],
    content: [
      ['Dretha', 'Dretha'],
      ['Lanishra', 'Lanishra'],
      ['Nulgreth', '努戈雷什'],
      ['Rull', 'Rull'],
      ['Sezelrian', 'Sezelrian'],
      ['Varg', 'Varg'],
      ['Verex', 'Verex'],
      ['Zagresh', 'Zagresh']
    ]
  },
  {
    name: ['Outer Gods', '外神'],
    content: [
      ['Abhoth', 'Abhoth'],
      ['Azathoth', '阿撒托斯'],
      ['Yog-Sothoth', '尤格-索托斯'],
      ['Nhimbaloth', 'Nhimbaloth'],
      ['Nyarlathotep (Black Pharaoh)', '奈亚拉托普斯'],
      ['Nyarlathotep (Faceless Sphinx)', '奈亚拉托普斯'],
      ['Nyarlathotep (Haunter of the Dark)', '奈亚拉托普斯'],
      ['Shub-Niggurath', '莎波-尼古拉丝']
    ]
  },
  {
    name: ['Primal Inevitable', 'Primal Inevitable'],
    content: [
      ['Jerishall', 'Jerishall'],
      ['Kerkamoth', 'Kerkamoth'],
      ['Otolmens', 'Otolmens'],
      ['Valmallos', 'Valmallos']
    ]
  },
  {
    name: ['Protean Lord', 'Protean Lord'],
    content: [
      ['Il\'surrish', 'Il\'surrish'],
      ['Narriseminek', 'Narriseminek'],
      ['Ssila\'meshnik', 'Ssila\'meshnik'],
      ['Ydajisk', 'Ydajisk']
    ]
  },
  {
    name: ['Psychopomp Usher', 'Psychopomp Usher'],
    content: [
      ['Atropos', 'Atropos'],
      ['Barzahk', 'Barzahk'],
      ['Ceyannan', 'Ceyannan'],
      ['Dammar', 'Dammar'],
      ['Imot', 'Imot'],
      ['Mother Vulture', 'Mother Vulture'],
      ['Mrtyu', 'Mrtyu'],
      ['Narakaas', 'Narakaas'],
      ['Phlegyas', 'Phlegyas'],
      ['Saloc', 'Saloc'],
      ['Teshallas', 'Teshallas'],
      ['The Pale Horse', 'The Pale Horse'],
      ['Vale', 'Vale'],
      ['Vavaalrav', 'Vavaalrav'],
      ['Vonymos', 'Vonymos']
    ]
  },
  {
    name: ['Qlippoth Lords', 'Qlippoth Lords'],
    content: [
      ['Chavazvug', 'Chavazvug'],
      ['Isph-Aun-Vuln', 'Isph-Aun-Vuln'],
      ['Oaur-Ooung', 'Oaur-Ooung'],
      ['Shiggarreb', 'Shiggarreb'],
      ['Thuskchoon', 'Thuskchoon'],
      ['Yamasoth', 'Yamasoth']
    ]
  },
  {
    name: ['Queens of the Night', '暗夜女王'],
    content: [
      ['Ardad Lili', 'Ardad Lili'],
      ['Doloras', 'Doloras'],
      ['Eiseth', '埃赛丝'],
      ['Mahathallah', '玛汉沙拉']
    ]
  },
  {
    name: ['Rakshasa Immortals', 'Rakshasa Immortals'],
    content: [
      ['Aksha', 'Aksha'],
      ['Bundha', 'Bundha'],
      ['Caera', 'Caera'],
      ['Dradjit', 'Dradjit'],
      ['Hudima', 'Hudima'],
      ['Jyotah', 'Jyotah'],
      ['Kunkarna', 'Kunkarna'],
      ['Mursha', 'Mursha'],
      ['Otikaya', 'Otikaya'],
      ['Prihasta', 'Prihasta'],
      ['Ravana', 'Ravana'],
      ['Surpa', 'Surpa'],
      ['Vibhishah', 'Vibhishah'],
      ['Zabha', 'Zabha']
    ]
  },
  {
    name: ['Sahkil Tormentors', 'Sahkil Tormentors'],
    content: [
      ['Ananshea', 'Ananshea'],
      ['Chamiaholom', 'Chamiaholom'],
      ['Charg', 'Charg'],
      ['Dachzerul', 'Dachzerul'],
      ['Hataam', 'Hataam'],
      ['Iggeret', 'Iggeret'],
      ['Nameless', 'Nameless'],
      ['Ozranvial', 'Ozranvial'],
      ['Shawnari', 'Shawnari'],
      ['Velgaas', 'Velgaas'],
      ['Vermilion Mother', 'Vermilion Mother'],
      ['Xiquiripat', 'Xiquiripat'],
      ['Zipacna', 'Zipacna']
    ]
  }
];

export function flattenDirectory(data: any[]): string[] {
  let result: string[] = [];
  data.forEach(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'content' in item) {
      result = result.concat(flattenDirectory(item.content));
    } else if (Array.isArray(item)) {
      result.push(item[0]);
    } else if (typeof item === 'string') {
      result.push(item);
    }
  });
  return result;
}

export const ALL_DEITIES = flattenDirectory(DEITIES_BY_PANTHEON);

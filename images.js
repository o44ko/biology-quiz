// ============================================================
//  КАРТИНКИ — файлы из папки img/ (Wikimedia Commons, свободные лицензии).
//  imageFor(q): сначала поле q.img в вопросе, потом поиск по словам, потом по параграфу.
//  Чтобы задать вручную: добавь вопросу  img: "neuron"  (или "none" — без картинки).
// ============================================================
(() => {
  const IMAGES = {
    neuron: { title: 'Строение нейрона и синапса', src: 'img/neuron.png' },
    reflex: { title: 'Схема коленного рефлекса', src: 'img/reflex.png' },
    tracts: { title: 'Проводящие пути спинного мозга', src: 'img/tracts.png' },
    brain:  { title: 'Головной мозг и желудочки', src: 'img/brain.png' },
    lobes:  { title: 'Доли больших полушарий', src: 'img/lobes.jpg' },
    ans:    { title: 'Симпатический и парасимпатический отделы', src: 'img/ans.jpg' }
  };

  const RULES = [
    [/синап|медиатор|нейрон|дендрит|аксон|миелин|нервн\S* волок/i, 'neuron'],
    [/рефлек|рецептор|сухожил/i, 'reflex'],
    [/симпат|парасимпат|автономн|вегетатив/i, 'ans'],
    [/дол[ейи]|зон[аыу]|полушари|кор[аыеу]\b/i, 'lobes'],
    [/спинн|спинномозг|серое вещество|белое вещество/i, 'tracts'],
    [/мозжеч|продолговат|мост|средн\S* мозг|промежуточ|таламус|гипоталамус|головн|мозг/i, 'brain']
  ];
  const BY_REF = { '§6': 'neuron', '§7': 'tracts', '§8': 'brain', '§9': 'ans' };

  window.IMAGES = IMAGES;
  window.imageFor = (q) => {
    if (q.img) return IMAGES[q.img] || null;
    const text = q.q + ' ' + q.correct;
    for (const [re, name] of RULES) if (re.test(text)) return IMAGES[name];
    return IMAGES[BY_REF[q.ref]] || null;
  };
})();

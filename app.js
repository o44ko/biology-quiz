(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bioquiz.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bioquiz.' + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? few : many;
  };

  /* ===================== вкладки и полный экран ===================== */
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      $('#view-quiz').hidden = btn.dataset.view !== 'quiz';
      $('#view-match').hidden = btn.dataset.view !== 'match';
      if (btn.dataset.view === 'match' && !$('#match-play').hidden) drawLines();
    });
  });

  const fsBtn = $('#fs');
  if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    fsBtn.textContent = on ? '✕' : '⛶';
    fsBtn.title = on ? 'Выйти из полного экрана' : 'На весь экран';
  });

  /* ===================== ТЕСТ ===================== */
  const quiz = { topic: 'all', list: [], i: 0, score: 0, wrong: [], limit: 10 };
  const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

  const poolFor = (topic) => window.QUIZ.filter((q) => topic === 'all' || q.ref === topic);

  function renderQuizTopics() {
    const box = $('#quiz-topics');
    box.textContent = '';
    const items = [['all', 'Вся глава', '§5–10']].concat(
      Object.entries(window.TOPICS).map(([ref, full]) => [ref, full.replace(/^§\d+\.\s*/, ''), ref])
    );
    items.forEach(([key, name, badge]) => {
      const n = poolFor(key).length;
      const best = store.get('best.' + key, null);
      const t = el('button', 'tile' + (quiz.topic === key ? ' sel' : ''));
      t.type = 'button';
      t.appendChild(el('span', 'num', badge));
      const info = el('span', 'info', name);
      const sub = el('span', 'sub', `${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}` +
        (best ? ` · лучший ${Math.round((best.score / best.total) * 100)}%` : ''));
      info.appendChild(sub);
      t.appendChild(info);
      t.addEventListener('click', () => { quiz.topic = key; renderQuizTopics(); });
      box.appendChild(t);
    });
  }

  function startQuiz(limit) {
    const pool = poolFor(quiz.topic);
    quiz.limit = limit;
    quiz.list = shuffle(pool).slice(0, limit === 'all' ? pool.length : Math.min(limit, pool.length));
    quiz.i = 0; quiz.score = 0; quiz.wrong = [];
    $('#quiz-start').hidden = true;
    $('#quiz-end').hidden = true;
    $('#quiz-play').hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.list[quiz.i];
    $('#quiz-bar').style.width = (quiz.i / quiz.list.length) * 100 + '%';
    $('#quiz-count').textContent = `${quiz.i + 1} / ${quiz.list.length} · ${q.ref}`;
    $('#quiz-q').textContent = q.q;
    $('#quiz-foot').hidden = true;

    const box = $('#quiz-options');
    box.textContent = '';
    shuffle([{ t: q.correct, ok: true }, ...q.wrong.map((t) => ({ t, ok: false }))]).forEach((o, i) => {
      const b = el('button', 'opt');
      b.type = 'button';
      b.dataset.ok = o.ok ? '1' : '0';
      b.appendChild(el('span', 'badge', LETTERS[i]));
      b.appendChild(el('span', 'txt', o.t));
      b.addEventListener('click', () => answer(b, q));
      box.appendChild(b);
    });
  }

  function answer(btn, q) {
    const good = btn.dataset.ok === '1';
    document.querySelectorAll('#quiz-options .opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.ok === '1') b.classList.add('correct');
      else if (b !== btn) b.classList.add('dim');
    });
    if (good) quiz.score++;
    else { btn.classList.add('wrong'); quiz.wrong.push(q); }

    const fb = $('#quiz-feedback');
    fb.className = 'feedback ' + (good ? 'ok' : 'bad');
    fb.textContent = '';
    fb.appendChild(el('strong', '', good ? '✔ Верно! ' : '✘ Неверно. '));
    fb.appendChild(document.createTextNode(q.explain));

    $('#quiz-next').textContent = quiz.i === quiz.list.length - 1 ? 'Результат' : 'Дальше →';
    $('#quiz-foot').hidden = false;
  }

  $('#quiz-next').addEventListener('click', () => {
    quiz.i++;
    if (quiz.i < quiz.list.length) renderQuestion();
    else finishQuiz();
  });

  function finishQuiz() {
    $('#quiz-play').hidden = true;
    $('#quiz-end').hidden = false;
    const total = quiz.list.length;
    const pct = Math.round((quiz.score / total) * 100);
    $('#quiz-ring').style.setProperty('--p', pct);
    $('#quiz-pct').textContent = pct + '%';
    $('#quiz-title').textContent =
      pct === 100 ? 'Отлично!' : pct >= 80 ? 'Хорошо!' : pct >= 50 ? 'Неплохо, но стоит повторить' : 'Перечитай параграфы';
    $('#quiz-result').textContent = `Верных ответов: ${quiz.score} из ${total}`;

    const key = 'best.' + quiz.topic;
    const best = store.get(key, null);
    if (!best || pct > Math.round((best.score / best.total) * 100)) store.set(key, { score: quiz.score, total });

    const box = $('#quiz-wrong');
    box.textContent = '';
    if (quiz.wrong.length) {
      box.appendChild(el('h3', '', 'Над чем поработать:'));
      const ul = el('ul', 'wrong-list');
      quiz.wrong.forEach((q) => {
        const li = el('li');
        li.appendChild(el('div', 'q', q.q));
        li.appendChild(el('div', 'a', '✔ ' + q.correct));
        li.appendChild(el('div', 'ref', 'Учебник: ' + q.ref));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
  }

  $('#quiz-start-10').addEventListener('click', () => startQuiz(10));
  $('#quiz-start-all').addEventListener('click', () => startQuiz('all'));
  $('#quiz-again').addEventListener('click', () => startQuiz(quiz.limit));
  $('#quiz-menu').addEventListener('click', () => {
    $('#quiz-end').hidden = true;
    $('#quiz-start').hidden = false;
    renderQuizTopics();
  });

  /* ===================== ЛИНИИ ===================== */
  const board = $('#board');
  const svg = $('#lines');
  const colL = $('#col-left');
  const colR = $('#col-right');
  const SVGNS = 'http://www.w3.org/2000/svg';
  // каждой левой карточке — свой цвет (не подсказывает ответ)
  const PALETTE = ['#7c5cff', '#2f8cff', '#ff9f1a', '#ec4899', '#06b6d4', '#b7791f', '#4f46e5'];
  const HINT = 'Протяни линию от карточки слева к подходящей справа';

  // links: leftId -> rightId (id = индекс пары; верно, когда leftId === rightId)
  const mt = { topic: 0, links: new Map(), checked: false, selected: null, cards: { left: [], right: [] } };

  function renderMatchTopics() {
    const done = store.get('matchDone', {});
    const box = $('#match-topics');
    box.textContent = '';
    window.MATCH.forEach((t, i) => {
      const b = el('button', 'tile' + (done[i] ? ' done' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'num', String(i + 1)));
      const info = el('span', 'info', t.title);
      info.appendChild(el('span', 'sub', `${t.pairs.length} ${plural(t.pairs.length, 'пара', 'пары', 'пар')}`));
      b.appendChild(info);
      if (done[i]) b.appendChild(el('span', 'tick', '✔'));
      b.addEventListener('click', () => openTopic(i));
      box.appendChild(b);
    });
  }

  function openTopic(i) {
    mt.topic = i;
    mt.links = new Map();
    mt.checked = false;
    mt.selected = null;
    const t = window.MATCH[i];
    $('#match-menu').hidden = true;
    $('#match-play').hidden = false;
    $('#match-title').textContent = t.title;
    setMsg(HINT);
    $('#match-next').hidden = true;
    $('#match-check').hidden = false;

    colL.textContent = '';
    colR.textContent = '';
    mt.cards = { left: [], right: [] };
    t.pairs.forEach(([l], id) => {
      const c = el('div', 'pcard left', l);
      c.dataset.id = id; c.dataset.side = 'left';
      c.style.setProperty('--c', PALETTE[id % PALETTE.length]);
      colL.appendChild(c);
      mt.cards.left[id] = c;
    });
    shuffle(t.pairs.map((p, id) => ({ r: p[1], id }))).forEach(({ r, id }) => {
      const c = el('div', 'pcard right', r);
      c.dataset.id = id; c.dataset.side = 'right';
      colR.appendChild(c);
      mt.cards.right[id] = c;
    });
    drawLines();
    updateButtons();
  }

  $('#match-back').addEventListener('click', () => {
    $('#match-play').hidden = true;
    $('#match-menu').hidden = false;
    renderMatchTopics();
  });

  $('#match-reset').addEventListener('click', () => {
    mt.links.clear();
    mt.checked = false;
    mt.selected = null;
    $('#match-next').hidden = true;
    $('#match-check').hidden = false;
    setMsg(HINT);
    drawLines();
    updateButtons();
  });

  $('#match-next').addEventListener('click', () => openTopic((mt.topic + 1) % window.MATCH.length));

  function setMsg(text, cls) {
    const m = $('#match-msg');
    m.textContent = text;
    m.className = 'msg' + (cls ? ' ' + cls : '');
  }

  function updateButtons() {
    $('#match-check').disabled = mt.links.size !== window.MATCH[mt.topic].pairs.length;
  }

  // точка выхода линии: правый край левой карточки / левый край правой
  function anchor(card, side) {
    const b = board.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    return { x: (side === 'left' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
  }

  function curve(a, b) {
    const dx = Math.max(30, Math.abs(b.x - a.x) * 0.45);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  }

  function drawLines() {
    svg.textContent = '';
    if (!mt.cards.left.length) return;
    [...mt.cards.left, ...mt.cards.right].forEach((c) => {
      c.classList.remove('linked', 'ok', 'bad', 'selected');
      if (c.dataset.side === 'right') c.style.removeProperty('--c');
    });
    mt.links.forEach((r, l) => {
      const color = PALETTE[l % PALETTE.length];
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', curve(anchor(mt.cards.left[l], 'left'), anchor(mt.cards.right[r], 'right')));
      path.style.stroke = color;
      let cls = '';
      if (mt.checked) cls = l === r ? 'ok' : 'bad';
      if (cls) path.classList.add(cls);
      svg.appendChild(path);
      mt.cards.right[r].style.setProperty('--c', color);
      mt.cards.left[l].classList.add(cls || 'linked');
      mt.cards.right[r].classList.add(cls || 'linked');
    });
    if (mt.selected) mt.selected.card.classList.add('selected');
  }

  function connect(l, r) {
    // у каждой карточки не больше одной линии
    mt.links.delete(l);
    for (const [kl, kr] of mt.links) if (kr === r) mt.links.delete(kl);
    mt.links.set(l, r);
    mt.checked = false;
    mt.selected = null;
    setMsg(mt.links.size === window.MATCH[mt.topic].pairs.length ? 'Все соединено — жми «Проверить»' : HINT);
    $('#match-next').hidden = true;
    $('#match-check').hidden = false;
    drawLines();
    updateButtons();
  }

  function unlink(side, id) {
    if (side === 'left') mt.links.delete(id);
    else for (const [kl, kr] of mt.links) if (kr === id) mt.links.delete(kl);
    mt.checked = false;
    drawLines();
    updateButtons();
  }

  // ----- перетаскивание (мышь, палец, стилус) -----
  let drag = null;
  const clearTargets = () => document.querySelectorAll('.pcard.target').forEach((c) => c.classList.remove('target'));

  function cardAt(x, y) {
    const e = document.elementFromPoint(x, y);
    return e && e.closest ? e.closest('.pcard') : null;
  }

  board.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.pcard');
    if (!card || (e.pointerType === 'mouse' && e.button > 0)) return;
    board.setPointerCapture(e.pointerId);
    drag = {
      card, side: card.dataset.side, id: +card.dataset.id,
      x0: e.clientX, y0: e.clientY, moved: false, temp: null
    };
  });

  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) {
      drag.moved = true;
      drag.temp = document.createElementNS(SVGNS, 'path');
      drag.temp.classList.add('temp');
      drag.temp.style.stroke = drag.side === 'left' ? PALETTE[drag.id % PALETTE.length] : '#6d4aff';
      svg.appendChild(drag.temp);
    }
    if (!drag.moved) return;
    const b = board.getBoundingClientRect();
    const a = anchor(drag.card, drag.side);
    const p = { x: e.clientX - b.left, y: e.clientY - b.top };
    drag.temp.setAttribute('d', drag.side === 'left' ? curve(a, p) : curve(p, a));
    clearTargets();
    const over = cardAt(e.clientX, e.clientY);
    if (over && over.dataset.side !== drag.side) over.classList.add('target');
  });

  board.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    clearTargets();
    if (d.temp) d.temp.remove();

    if (d.moved) {
      const over = cardAt(e.clientX, e.clientY);
      if (over && over.dataset.side !== d.side) {
        const l = d.side === 'left' ? d.id : +over.dataset.id;
        const r = d.side === 'right' ? d.id : +over.dataset.id;
        connect(l, r);
      }
      return;
    }

    // простое нажатие: выбрать карточку, потом вторую — соединить
    const s = mt.selected;
    if (s && s.side !== d.side) {
      connect(s.side === 'left' ? s.id : d.id, s.side === 'right' ? s.id : d.id);
    } else if (s && s.card === d.card) {
      mt.selected = null;
      drawLines();
    } else {
      mt.selected = { card: d.card, side: d.side, id: d.id };
      drawLines();
    }
  });

  board.addEventListener('pointercancel', () => {
    if (drag && drag.temp) drag.temp.remove();
    drag = null;
    clearTargets();
  });

  // двойное нажатие — убрать линию у карточки
  board.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.pcard');
    if (card) unlink(card.dataset.side, +card.dataset.id);
  });

  // ----- проверка -----
  $('#match-check').addEventListener('click', () => {
    mt.checked = true;
    drawLines();
    const total = window.MATCH[mt.topic].pairs.length;
    let good = 0;
    mt.links.forEach((r, l) => { if (l === r) good++; });
    if (good === total) {
      setMsg(`🎉 Всё верно! ${good} из ${total}`, 'ok');
      const done = store.get('matchDone', {});
      done[mt.topic] = true;
      store.set('matchDone', done);
      $('#match-check').hidden = true;
      $('#match-next').hidden = false;
    } else {
      setMsg(`Верно ${good} из ${total}. Красные линии — ошибки, переделай их`, 'bad');
    }
  });

  const redraw = () => { if (!$('#match-play').hidden && !$('#view-match').hidden) drawLines(); };
  window.addEventListener('resize', redraw);
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(board);

  /* ===================== «домой» и полный сброс ===================== */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    $('#view-quiz').hidden = name !== 'quiz';
    $('#view-match').hidden = name !== 'match';
  }

  function goHome() {
    showTab('quiz');
    quiz.topic = 'all';
    quiz.list = [];
    $('#quiz-play').hidden = true;
    $('#quiz-end').hidden = true;
    $('#quiz-start').hidden = false;
    $('#match-play').hidden = true;
    $('#match-menu').hidden = false;
    mt.links.clear();
    mt.selected = null;
    renderQuizTopics();
    renderMatchTopics();
  }

  let toastTimer = null;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function resetAll() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('bioquiz.')).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    goHome();
    toast('Всё сброшено ✔');
  }

  // 1 нажатие — на старт; 5 быстрых нажатий подряд — полный сброс прогресса
  let homeTaps = 0, homeTimer = null;
  $('#home').addEventListener('click', () => {
    homeTaps++;
    clearTimeout(homeTimer);
    if (homeTaps >= 5) { homeTaps = 0; resetAll(); return; }
    homeTimer = setTimeout(() => { homeTaps = 0; }, 1500);
    goHome();
  });

  renderQuizTopics();
  renderMatchTopics();
})();

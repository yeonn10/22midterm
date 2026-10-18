(function () {
  'use strict';
  var E = window.QuizEngine, DATA = window.QUIZ_DATA;
  var app = document.getElementById('app');
  var store = E.makeStore(window.localStorage);
  var subjects = DATA.subjects, byId = {}, qById = {}, order = new Map(), n = 0;
  subjects.forEach(function (s) { byId[s.id] = s; s.questions.forEach(function (q) { qById[q.id] = { q: q, s: s }; order.set(q.id, n++); }); });
  var validIds = new Set(order.keys());
  var showHachi = false; // h 키로 하치와레 보이기/숨기기 (기본: 숨김)
  var Q = null; // 진행 중 퀴즈 상태
  var view = 'home';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('show'); }, 1600); }
  function updCount() { document.getElementById('bmCount').textContent = store.list().filter(function (i) { return validIds.has(i); }).length; }
  function nameOf(s, list, id) { var f = list.filter(function (x) { return x.id === id; })[0]; return f ? f.name : id; }

  /* ---------- 라우팅 ---------- */
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function route() {
    app.className = '';
    var mc = document.getElementById('mascot'); if (mc) mc.hidden = true;
    var h = location.hash || '#/';
    var m;
    if ((m = h.match(/^#\/s\/([^/]+)$/)) && byId[m[1]]) return setup(byId[m[1]]);
    if (h === '#/quiz' && Q) return quiz();
    if (h === '#/result' && Q) return result();
    if (h === '#/bookmarks') return bookmarks();
    if (h !== '#/') { location.hash = '#/'; return; }
    home();
  }
  window.addEventListener('hashchange', route);

  /* ---------- 홈 ---------- */
  function home() {
    view = 'home'; updCount();
    app.innerHTML = '<h1>과목 선택</h1><div class="grid">' + subjects.map(function (s) {
      var ks = E.countKinds(s);
      return '<button class="card subj" data-s="' + s.id + '"><b>' + esc(s.name) + '</b><div class="sub">' + esc(s.desc || '') + '</div><div class="sub">' +
        s.kinds.map(function (k) { return esc(k.name) + ' ' + ks[k.id]; }).join(' · ') + '</div></button>';
    }).join('') + '</div>' +
    '<p class="sub">북마크는 이 기기의 브라우저에 저장됩니다. 기기를 옮길 땐 북마크 화면에서 내보내기/불러오기를 쓰세요.</p>';
    app.querySelectorAll('.subj').forEach(function (b) { b.onclick = function () { go('#/s/' + b.dataset.s); }; });
  }

  /* ---------- 설정 ---------- */
  function setup(s) {
    view = 'setup';
    var prefs = (store.getPrefs()[s.id]) || {};
    var kinds = prefs.kinds || [s.kinds[0].id];
    var units = prefs.units || s.units.map(function (u) { return u.id; });
    var shuf = !!prefs.shuffle;
    function draw() {
      var uc = E.countUnits(s, kinds), kc = E.countKinds(s);
      var total = units.reduce(function (a, u) { return a + (kinds.length ? uc[u] : 0); }, 0);
      var bm = store.list().filter(function (i) { return qById[i] && qById[i].s.id === s.id; }).length;
      app.innerHTML = '<p><a href="#/">← 과목 선택</a></p><h1>' + esc(s.name) + '</h1>' +
        '<div class="card"><h2>문제 유형</h2><div class="chips row">' + s.kinds.map(function (k) {
          return '<label><input type="checkbox" data-k="' + k.id + '"' + (kinds.indexOf(k.id) >= 0 ? ' checked' : '') + '>' + esc(k.name) + ' (' + kc[k.id] + ')</label>';
        }).join('') + '</div></div>' +
        '<div class="card"><div class="row"><h2 style="margin:0">단원</h2><button id="all">전체 선택</button><button id="none">전체 해제</button></div>' +
        '<div class="units">' + s.units.map(function (u) {
          return '<label class="chk"><input type="checkbox" data-u="' + u.id + '"' + (units.indexOf(u.id) >= 0 ? ' checked' : '') + '>' + esc(u.id + '. ' + u.name) + '<span class="n">' + uc[u.id] + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="card row"><label class="chk"><input type="checkbox" id="shuf"' + (shuf ? ' checked' : '') + '>문제 순서 섞기</label>' +
        '<span style="flex:1"></span><button id="bmgo"' + (bm ? '' : ' disabled') + '>★ 북마크만 풀기 (' + bm + ')</button>' +
        '<button class="primary" id="go"' + (total ? '' : ' disabled') + '>시작 (' + total + '문항)</button></div>';
      app.querySelectorAll('[data-k]').forEach(function (c) { c.onchange = function () { kinds = Array.from(app.querySelectorAll('[data-k]:checked')).map(function (x) { return x.dataset.k; }); draw(); }; });
      app.querySelectorAll('[data-u]').forEach(function (c) { c.onchange = function () { units = Array.from(app.querySelectorAll('[data-u]:checked')).map(function (x) { return x.dataset.u; }); draw(); }; });
      document.getElementById('all').onclick = function () { units = s.units.map(function (u) { return u.id; }); draw(); };
      document.getElementById('none').onclick = function () { units = []; draw(); };
      document.getElementById('shuf').onchange = function (e) { shuf = e.target.checked; };
      document.getElementById('go').onclick = function () {
        var p = store.getPrefs(); p[s.id] = { kinds: kinds, units: units, shuffle: shuf }; store.setPrefs(p);
        start(s, E.buildDeck(s, { kinds: kinds, units: units, shuffle: shuf }), '');
      };
      document.getElementById('bmgo').onclick = function () {
        start(s, E.buildDeck(s, { onlyIds: store.list(), shuffle: shuf }), '★ 북마크');
      };
    }
    draw();
  }

  function start(s, deck, label) {
    if (!deck.length) return toast('문제가 없습니다');
    deck = deck.map(function (q) { return E.shuffleOptions(q); });   // 보기는 매번 새로 섞음(순서가 의미 있는 문항 제외)
    Q = { s: s, deck: deck, i: 0, ans: {}, pend: [], label: label };
    go('#/quiz');
  }

  /* ---------- 퀴즈 ---------- */
  function cur() { return Q.deck[Q.i]; }
  function quiz() {
    view = 'quiz'; updCount();
    var q = cur(), a = Q.ans[q.id], done = !!a, multi = q.ans.length > 1;
    var sel = done ? a.sel : Q.pend;
    var pct = Math.round(Object.keys(Q.ans).length / Q.deck.length * 100);
    var h = '<div class="qhead"><span><a href="#/s/' + Q.s.id + '">← 설정</a> · ' + esc(Q.label || Q.s.name) + '</span><span>' + (Q.i + 1) + ' / ' + Q.deck.length + '</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="card">' +
      '<div class="qhead"><span><span class="tag">' + esc(nameOf(Q.s, Q.s.kinds, q.kind)) + '</span> ' + esc(nameOf(Q.s, Q.s.units, q.unit)) + (q.topic ? ' · ' + esc(q.topic) : '') +
      '</span><span>' + (q.src ? esc(q.src) + ' · ' : '') + '<code>' + esc(q.id) + '</code> <button class="bm' + (store.has(q.id) ? ' on' : '') + '" id="bm" title="북마크 (9 추가 / 8 해제)">' + (store.has(q.id) ? '★' : '☆') + '</button></span></div>' +
      '<div class="qtext">' + esc(q.q) + (multi ? '  <span class="tag">모두 고르시오</span>' : '') + (q.gen ? ' <span class="badge">보기 재구성</span>' : '') + '</div>';
    var hasFig = !!((q.figs && q.figs.length) || q.img);
    app.className = hasFig ? 'wide' : '';
    var mc = document.getElementById('mascot'); if (mc) mc.hidden = !showHachi;
    h += '<div class="qgrid' + (hasFig ? ' withfig' : '') + '">';
    if (q.figs && q.figs.length) h += '<div class="figcol"><div class="fig">' + q.figs.map(function (f) { return '<img src="' + esc(f) + '" alt="문제 그림">'; }).join('') + '</div></div>';
    else if (q.img) h += '<div class="figcol"><div class="fig" id="fig"></div></div>';
    h += '<div class="optcol">' + q.opts.map(function (o, i) {
      var no = i + 1, cls = '';
      if (done) { var isA = q.ans.indexOf(no) >= 0, isS = sel.indexOf(no) >= 0; cls = isA ? ' right' : (isS ? ' bad' : ''); }
      else if (sel.indexOf(no) >= 0) cls = ' sel';
      return '<button class="opt' + cls + '" data-o="' + no + '"><span class="no">' + E.CIRCLED[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');
    if (!done) h += '<div class="row"><button class="primary" id="submit">정답 확인 (Enter)</button></div>';
    if (done) {
      var bn = a.dk ? ['dk', '모름 — 정답: '] : a.correct ? ['ok', '정답입니다 ✔'] : ['ng', '오답 ✘ — 정답: '];
      h += '<div class="banner ' + bn[0] + '">' + bn[1] + (a.correct ? '' : q.ans.map(function (x) { return E.CIRCLED[x - 1]; }).join(' ')) + '</div>';
      if (q.exp) h += '<div class="exp">' + esc(q.exp) + '</div>';
    }
    h += '</div></div></div><div class="nav"><button id="prev"' + (Q.i ? '' : ' disabled') + '>← 이전</button>' +
      '<button id="dk"' + (done ? ' disabled' : '') + '>모름 (0)</button>' +
      '<button class="primary" id="next">' + (Q.i === Q.deck.length - 1 ? '결과 보기' : '다음 →') + '</button></div>' +
      '<div class="keys"><kbd>1</kbd>–<kbd>5</kbd> 선택 · <kbd>0</kbd> 모름 · <kbd>→</kbd>/<kbd>↓</kbd> 다음(풀기 전에도 가능) · <kbd>Enter</kbd> 정답 확인 후 다음 · <kbd>←</kbd>/<kbd>↑</kbd> 이전 · <kbd>8</kbd> 북마크 추가 · <kbd>9</kbd> 북마크 해제' + ' · 번호로 고른 뒤 <kbd>Enter</kbd>로 정답 확인'+(multi ? ' (복수정답은 번호로 여러 개 선택)' : '') + '</div>';
    app.innerHTML = h;
    if (q.img && !(q.figs && q.figs.length)) drawFig(q);
    app.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { b.blur(); pick(+b.dataset.o); }; });
    var sb = document.getElementById('submit'); if (sb) sb.onclick = function () { sb.blur(); submit(); };
    document.getElementById('prev').onclick = function (e) { e.target.blur(); move(-1); };
    document.getElementById('next').onclick = function (e) { e.target.blur(); move(1); };
    document.getElementById('dk').onclick = function (e) { e.target.blur(); dontKnow(); };
    document.getElementById('bm').onclick = function (e) { e.target.blur(); toggleBm(); };
  }
  function drawFig(q) {
    var box = document.getElementById('fig'), exts = ['png', 'jpg', 'jpeg', 'webp'], k = 0;
    function ph() { box.innerHTML = '<div class="ph">🖼 그림 자리 — ' + esc(q.img) + '<br><small>' + esc(q.id) + '.png 로 넣으면 표시됩니다</small></div>'; }
    function tryNext() {
      if (k >= exts.length) return ph();
      var im = new Image(); im.alt = q.img;
      im.onload = function () { box.innerHTML = ''; box.appendChild(im); };
      im.onerror = tryNext;
      im.src = '' + q.id + '.' + exts[k++];
    }
    tryNext();
  }
  function grade(sel, dk) {
    var q = cur(); if (Q.ans[q.id]) return;
    var ok = !dk && E.isCorrect(q, sel);
    Q.ans[q.id] = { sel: sel.slice(), dk: !!dk, correct: ok };
    Q.pend = [];
    if (!ok && store.add(q.id)) toast('★ 북마크에 자동 추가');
    else if (ok && store.remove(q.id)) toast('정답! 북마크에서 자동 해제');
    quiz();
  }
  function pick(no) {
    var q = cur(); if (Q.ans[q.id] || no > q.opts.length) return;
    if (q.ans.length === 1) Q.pend = (Q.pend[0] === no) ? [] : [no];   // 단일정답: 하나만 선택 (다시 누르면 해제)
    else { var i = Q.pend.indexOf(no); if (i >= 0) Q.pend.splice(i, 1); else Q.pend.push(no); }
    quiz();
  }
  function submit() { if (Q.pend.length) grade(Q.pend, false); else toast('번호를 먼저 선택하세요'); }
  function dontKnow() { grade([], true); }
  function toggleBm(force) {
    var q = cur(), has = store.has(q.id);
    if (force === 'add' || (force === undefined && !has)) { store.add(q.id); toast('★ 북마크 추가'); }
    else if (force === 'del' || has) { store.remove(q.id); toast('북마크 해제'); }
    quiz();
  }
  function move(d) {
    var q = cur();
    Q.pend = [];
    var ni = Q.i + d;
    if (ni < 0) return;
    if (ni >= Q.deck.length) return go('#/result');
    Q.i = ni; quiz();
  }

  document.addEventListener('keydown', function (e) {
    if (view !== 'quiz' || !Q || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return;
    var k = e.key, handled = true;
    if (k >= '1' && k <= '5') pick(+k);
    else if (k === '0') dontKnow();
    else if (k === 'h' || k === 'H') { showHachi = !showHachi; var mc2 = document.getElementById('mascot'); if (mc2) mc2.hidden = !showHachi; }
    else if (k === '9') { if (store.has(cur().id)) toggleBm('del'); else toast('북마크에 없는 문제입니다'); }
    else if (k === '8') toggleBm('add');
    else if (k === 'Enter') { if (Q.ans[cur().id]) move(1); else if (Q.pend.length) submit(); }
    else if (k === 'ArrowRight' || k === 'ArrowDown') move(1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') move(-1);
    else handled = false;
    if (handled) e.preventDefault();
  });

  /* ---------- 결과 ---------- */
  function result() {
    view = 'result'; updCount();
    var s = E.summarize(Q.deck, Q.ans);
    app.innerHTML = '<h1>결과</h1><div class="card"><div class="stat">' +
      '<div><b>' + s.correct + '</b>정답</div><div><b>' + s.wrong + '</b>오답</div><div><b>' + s.dk + '</b>모름</div><div><b>' + s.skipped + '</b>안 푼 문제</div></div>' +
      '<p>' + s.total + '문항 중 ' + s.correct + '문항 정답 (' + Math.round(s.correct / s.total * 100) + '%). 오답·모름은 자동으로 북마크되었습니다.</p>' +
      '<div class="row"><button id="back">마지막 문제로</button><button id="retry"' + (s.wrongIds.length ? '' : ' disabled') + '>틀린/모름 다시 풀기 (' + s.wrongIds.length + ')</button>' +
      '<button id="setup">설정으로</button><button class="primary" id="home">처음으로</button></div></div>';
    document.getElementById('back').onclick = function () { go('#/quiz'); };
    document.getElementById('retry').onclick = function () { start(Q.s, E.buildDeck(Q.s, { onlyIds: s.wrongIds }), '틀린 문제 복습'); };
    document.getElementById('setup').onclick = function () { go('#/s/' + Q.s.id); };
    document.getElementById('home').onclick = function () { go('#/'); };
  }

  /* ---------- 북마크 ---------- */
  function bookmarks() {
    view = 'bookmarks'; updCount();
    var ids = E.sortIds(store.list(), order);
    var known = ids.filter(function (i) { return qById[i]; });
    var h = '<p><a href="#/">← 홈</a></p><h1>★ 북마크 (' + known.length + ')</h1><div class="card"><div class="row">' +
      '<button id="exp"' + (ids.length ? '' : ' disabled') + '>내보내기 (txt)</button>' +
      '<label class="btn">불러오기 (txt)<input type="file" id="file" accept=".txt,text/plain" hidden></label>' +
      '<label class="chk"><input type="checkbox" id="rep">기존 북마크 덮어쓰기</label><span style="flex:1"></span>' +
      '<button id="clr"' + (ids.length ? '' : ' disabled') + '>전체 삭제</button></div>' +
      '<p class="sub">내보낸 txt에는 문제 고유번호만 들어 있습니다. 다른 기기·브라우저에서 불러오기로 복원하세요.</p></div>';
    subjects.forEach(function (s) {
      var mine = known.filter(function (i) { return qById[i].s.id === s.id; });
      if (!mine.length) return;
      h += '<div class="card"><div class="row"><h2 style="margin:0">' + esc(s.name) + ' (' + mine.length + ')</h2><span style="flex:1"></span><button class="primary" data-run="' + s.id + '">이 북마크만 풀기</button></div>' +
        mine.map(function (i) {
          var q = qById[i].q;
          return '<div class="bmitem"><code>' + esc(i) + '</code><span>' + esc(q.q.replace(/\s+/g, ' ').slice(0, 90)) + '</span><button data-del="' + esc(i) + '">해제</button></div>';
        }).join('') + '</div>';
    });
    if (!known.length) h += '<p class="sub">북마크가 없습니다. 틀리거나 모름으로 체크한 문제는 자동으로 들어옵니다.</p>';
    app.innerHTML = h;
    app.querySelectorAll('[data-run]').forEach(function (b) { b.onclick = function () { var s = byId[b.dataset.run]; start(s, E.buildDeck(s, { onlyIds: store.list() }), '★ 북마크'); }; });
    app.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { store.remove(b.dataset.del); bookmarks(); }; });
    var ex = document.getElementById('exp'); if (ex) ex.onclick = exportTxt;
    document.getElementById('clr').onclick = function () { if (confirm('북마크를 모두 삭제할까요?')) { store.clear(); bookmarks(); } };
    document.getElementById('file').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var p = E.parseImport(String(r.result), validIds);
        if (!p.ids.length) return toast('복원할 유효한 번호가 없습니다' + (p.unknown.length ? ' (알 수 없는 ' + p.unknown.length + '개)' : ''));
        store.replace(E.mergeBookmarks(store.list(), p.ids, document.getElementById('rep').checked ? 'replace' : 'merge'));
        bookmarks();
        toast(p.ids.length + '개 복원' + (p.unknown.length ? ' · 알 수 없는 번호 ' + p.unknown.length + '개 무시' : ''));
      };
      r.readAsText(f, 'utf-8');
    };
  }
  function exportTxt() {
    var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    var name = 'bookmarks_' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.txt';
    var blob = new Blob([E.formatExport(store.list(), order, d)], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('내보냈습니다: ' + name);
  }

  route();
})();

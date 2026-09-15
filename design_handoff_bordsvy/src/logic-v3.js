/* ── Iteration 3: B med stolar ─────────────────────────────────────────
   Spelarväxeln Me · spelare 1–3 · All. Den valda spelarens matta blir stor
   och de andra krymper i samma rörelse — motståndarna till smala kolumner,
   mitt bord till en list. Byter man från en spelare till en annan glider
   kolumnerna i sidled. Varje matta har egen zoom, pan och fit, och högarna
   ser ut och beter sig som i appen (MES-125): graveyard i en gul streckad
   ram med solfjäder på hover, library i en blå ram med tre baksidor. */
var W3 = 1041, H3 = 804, G3 = 56, STRIP3 = 46, GAP3 = 10, MINW3 = 112;
var PILE_W = 238, PILE_H = 165, PILE_BOT = 71;
var TRANS3 = 'left .5s cubic-bezier(.22,.8,.26,1), top .5s cubic-bezier(.22,.8,.26,1), width .5s cubic-bezier(.22,.8,.26,1), height .5s cubic-bezier(.22,.8,.26,1), opacity .3s';
var TRANS3_S = 'transform .5s cubic-bezier(.22,.8,.26,1), opacity .25s';

/* Landhögarna som i appen i dag: varje kort 26 px ner och 26 px åt sidan. */
(function () {
  function b(list) { return list.map(function (a) { return { k: a[0], x: a[1], y: a[2], t: a[3] ? 1 : 0, z: a[4] }; }); }
  PL.me.board = b([['danitha', 0, 0], ['pharika', 215, 0, 1], ['pikemaster', 450, 0], ['nighthawk', 660, 0],
    ['plains', 60, 300, 0, 200], ['plains', 86, 326, 0, 201], ['swamp', 320, 300, 0, 202], ['swamp', 346, 326, 0, 203], ['swamp', 580, 300, 0, 204]]);
  PL.erik.board = b([['serra', 0, 0], ['swiftspear', 235, 0, 1], ['anthem', 490, 0],
    ['mountain', 60, 300, 0, 200], ['mountain', 86, 326, 0, 201], ['mountain', 560, 300, 0, 202], ['plains', 320, 300, 0, 203], ['plains', 346, 326, 0, 204]]);
  PL.sara.board = b([['delver', 0, 0], ['phoenix', 235, 0, 1], ['island', 40, 300, 0, 200], ['island', 66, 326, 0, 201], ['mountain', 300, 300, 0, 202]]);
  PL.linus.board = b([['llanowar', 0, 0, 1], ['woodelves', 250, 0], ['forest', 40, 300, 0, 200], ['forest', 66, 326, 0, 201], ['forest', 300, 300, 0, 202]]);
  PL.me.grav = ['pharika', 'swamp'];
  PL.me.exil = [];
})();

function pileScale(r) { return clamp(Math.min(r.w / 1000, r.h / 600), 0.6, 1); }
function insVals(st) {
  var h = st.hover || st.last || { pid: 'me', k: 'danitha' };
  var d = CARDS[h.k], p = PL[h.pid], mine = h.pid === 'me';
  var label = h.grav ? (mine ? 'From your graveyard' : 'From ' + p.name + '’s graveyard')
    : mine ? (st.hover ? 'Pointing at' : 'Last card') : p.name + '’s card';
  return {
    im: 'im-' + h.k, name: d.name, type: d.type, kw: d.kw.map(function (l) { return { label: l }; }),
    label: label, col: mine ? '#f0a52a' : p.color, line: mine ? '#3a2c10' : p.color + '40'
  };
}
/* Bara mattor i full storlek tar emot hjulet; en kolumn eller list zoomas inte. */
function hitMat(self, pt) {
  var R = V2(self).rects, bast = null;
  Object.keys(R).forEach(function (pid) {
    var rr = R[pid];
    if (rr.form !== 'full') return;
    if (pt.x < rr.r.x || pt.x > rr.r.x + rr.r.w || pt.y < rr.r.y || pt.y > rr.r.y + rr.r.h) return;
    if (!bast || rr.z > R[bast].z) bast = pid;
  });
  return bast;
}
/* Ett klick var som helst i en spelares ruta gör den stor, som ett klick på
   namnet. Ett drag gör det inte: det flyttar mattan (Pan), markerar (lasso på
   min egen) eller flyttar ett av mina kort. Mina kort tappas av ett klick. */
function valjRuta(self, pid) { if (self._valt !== pid) valjAv(self, pid); }
function klickValj(self, pid, e) {
  var x0 = e.clientX, y0 = e.clientY, flyttad = false;
  function mv(ev) { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 4) flyttad = true; }
  function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (!flyttad) valjRuta(self, pid); }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function matDown(self, pid, e) {
  if (e.button === 1 || e.button === 2 || panAktiv(self)) { startPan(self, pid, e); return; }
  if (e.button !== 0) return;
  var rr = V2(self).rects.me;
  if (pid === 'me' && rr && rr.form === 'full') { startLasso(self, e); return; }
  klickValj(self, pid, e);
}
function startPan(self, pid, e) {
  var rr = V2(self).rects[pid]; if (!rr) return;
  e.preventDefault(); e.stopPropagation();
  var v0 = vyOf(self, pid), x0 = e.clientX, y0 = e.clientY, sc = scaleOf(self), knapp = e.button, flyttad = false;
  self.setState({ panning: pid });
  function mv(ev) {
    if (!flyttad && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) <= 4) return;
    flyttad = true;
    setVy(self, pid, klampVy(rr, { px: v0.px + (ev.clientX - x0) / sc, py: v0.py + (ev.clientY - y0) / sc, z: v0.z }));
  }
  function up() {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    self.setState({ panning: null });
    if (!flyttad && knapp === 0) valjRuta(self, pid);
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function startLasso(self, e) {
  var rr = V2(self).rects.me; if (!rr) return;
  e.preventDefault();
  var p0 = areaPt(self, e), x0 = p0.x - rr.r.x, y0 = p0.y - rr.r.y, bas = e.shiftKey ? (S(self).sel || []) : [], rorde = false;
  function mv(ev) {
    var p = areaPt(self, ev), x = p.x - rr.r.x, y = p.y - rr.r.y;
    if (!rorde && Math.abs(x - x0) + Math.abs(y - y0) < 4) return;
    rorde = true;
    self.setState({ lasso: { x: Math.min(x, x0), y: Math.min(y, y0), w: Math.abs(x - x0), h: Math.abs(y - y0) } });
  }
  function up() {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    var L = S(self).lasso;
    if (!rorde || !L) { self.setState({ lasso: null, sel: bas }); if (!rorde) valjRuta(self, 'me'); return; }
    var hits = bas.slice();
    PL.me.board.forEach(function (c, i) {
      var k = 'me:' + i; if (c.gone || hits.indexOf(k) >= 0) return;
      var b = kortRuta(self, rr, i);
      if (b.x < L.x + L.w && b.x + b.w > L.x && b.y < L.y + L.h && b.y + b.h > L.y) hits.push(k);
    });
    self.setState({ lasso: null, sel: hits });
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
/* Drag ett av mina kort — eller alla markerade. Släpps det över graveyard
   eller library hamnar det där; ett klick utan drag tappar det. */
var HOG_LUFT3 = { grav: { l: 54, r: 10, t: 66, b: 40 }, bib: { l: 10, r: 44, t: 66, b: 40 } };
function hogUnder3(self, ev) {
  var h = (V2(self).hogar || {}).me; if (!h) return null;
  var pt = areaPt(self, ev), bast = null, bd = Infinity;
  ['grav', 'bib'].forEach(function (k) {
    var q = h[k], l = HOG_LUFT3[k];
    if (pt.x < q.x - l.l || pt.x > q.x + q.w + l.r || pt.y < q.y - l.t || pt.y > q.y + q.h + l.b) return;
    var d = Math.abs(pt.x - (q.x + q.w / 2)) + Math.abs(pt.y - (q.y + q.h / 2));
    if (d < bd) { bd = d; bast = k; }
  });
  return bast;
}
function cardDown(self, pid, i, e) {
  if (pid !== 'me' || e.button !== 0 || panAktiv(self)) return;
  e.stopPropagation(); e.preventDefault();
  dragKort(self, pid, i, e.clientX, e.clientY, false);
}
function dragKort(self, pid, i, x0, y0, direkt) {
  var key = pid + ':' + i, sel = S(self).sel || [], grupp = sel.indexOf(key) >= 0 ? sel : [key];
  var rr = V2(self).rects[pid], s = rr.s, sc = scaleOf(self), flyttad = !!direkt, start = {};
  grupp.forEach(function (k) { start[k] = posOf(self, pid, +k.split(':')[1]); });
  var topz = V2(self).topz = (V2(self).topz || 500) + 1;
  if (direkt) { var zz0 = Object.assign({}, S(self).zz || {}); zz0[key] = topz; self.setState({ held: key, zz: zz0 }); }
  function mv(ev) {
    var dx = (ev.clientX - x0) / sc, dy = (ev.clientY - y0) / sc;
    if (!flyttad && Math.abs(dx) + Math.abs(dy) < 4) return;
    flyttad = true;
    var pos = Object.assign({}, S(self).pos || {}), zz = Object.assign({}, S(self).zz || {});
    grupp.forEach(function (k) { pos[k] = { x: start[k].x + dx / s, y: start[k].y + dy / s }; zz[k] = topz; });
    self.setState({ pos: pos, zz: zz, held: key, over: hogUnder3(self, ev) });
  }
  function up(ev) {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    if (!flyttad) {
      var tap = Object.assign({}, S(self).tap || {}); tap[key] = !tapOf(self, pid, i);
      self.setState({ tap: tap, held: null });
      return;
    }
    var over = hogUnder3(self, ev);
    self.setState({ held: null, over: null });
    if (over) laggPaHog(self, grupp, over);
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function laggPaHog(self, grupp, over) {
  grupp.forEach(function (key) {
    var c = PL.me.board[+key.split(':')[1]]; if (!c || c.gone) return;
    c.gone = true;
    if (over === 'grav') PL.me.grav.unshift(c.k); else PL.me.lib += 1;
  });
  self.setState({ sel: [], bump: over === 'grav' ? 'me' : null, hover: null });
  clearTimeout(self._bumpT); self._bumpT = setTimeout(function () { self.setState({ bump: null }); }, 500);
}
function landa(self, key) {
  self.setState({ landar: key });
  clearTimeout(self._landT); self._landT = setTimeout(function () { self.setState({ landar: null }); }, 480);
}
/* Solfjädern (GRAVEYARD_ANIMATION.md §4): två steg — korten monteras på
   högen och fälls ut 24 ms senare — och stängningen väntar 130 ms så att
   man hinner från högen till ett kort. */
function fanGeo(n, ned, fri) {
  var steg = n > 1 ? Math.min(96, 828 / (n - 1), fri / (n - 1)) : 0;
  return function (i) {
    var t = n > 1 ? i / (n - 1) : 0, dx = i * steg, dy = -64 - Math.sin(t * Math.PI) * 30, a = -9 + t * 18;
    return ned ? { dx: -dx, dy: -dy, a: -a } : { dx: dx, dy: dy, a: a };
  };
}
function fanTf(g, hov, ned) {
  var lyft = hov ? (ned ? 20 : -20) : 0;
  return 'translate(' + Math.round(g.dx) + 'px,' + Math.round(g.dy + lyft) + 'px) rotate(' + g.a.toFixed(1) + 'deg) scale(' + (hov ? 1.1 : 1) + ')';
}
function fanOpen(self, pid) {
  clearTimeout(self._fanT);
  if (!PL[pid].grav.length || S(self).held) return;
  var f = S(self).fan;
  if (f && f.pid === pid && f.on) return;
  if (!f || f.pid !== pid) self.setState({ fan: { pid: pid, on: false, hov: null } });
  self._fanT = setTimeout(function () { self.setState({ fan: { pid: pid, on: true, hov: null } }); }, 24);
}
function fanCloseSoon(self) {
  clearTimeout(self._fanT);
  self._fanT = setTimeout(function () {
    var f = S(self).fan; if (!f) return;
    self.setState({ fan: { pid: f.pid, on: false, hov: null } });
    self._fanT = setTimeout(function () { self.setState({ fan: null }); }, 240);
  }, 130);
}
function fanHov(self, pid, i) {
  clearTimeout(self._fanT);
  var f = S(self).fan; if (!f || f.pid !== pid) return;
  self.setState({ fan: { pid: pid, on: true, hov: i }, hover: { pid: pid, k: PL[pid].grav[i], grav: true } });
}
function tillbaka(self, i) {
  var k = PL.me.grav.splice(i, 1)[0]; if (!k) return;
  var rr = V2(self).rects.me, v = vyOf(self, 'me');
  var bx = rr.bcx + (rr.r.w / 2 + 80 - rr.cx - v.px) / rr.s, by = rr.bcy + (rr.r.h / 2 - rr.cy - v.py) / rr.s;
  PL.me.board.push({ k: k, x: bx - CW / 2, y: by - CH / 2 });
  landa(self, 'me:' + (PL.me.board.length - 1));
  self.setState({ fan: PL.me.grav.length ? { pid: 'me', on: true, hov: null } : null, hover: null });
}
function exila(self, i) {
  var k = PL.me.grav.splice(i, 1)[0]; if (!k) return;
  PL.me.exil.unshift(k);
  self.setState({ fan: PL.me.grav.length ? { pid: 'me', on: true, hov: null } : null, hover: null });
}
/* Dra ett kort ur min solfjäder: efter 6 px blir det ett kort på mattan
   under pekaren, och det vanliga draget tar över. */
function fanDown(self, pid, i, e) {
  if (pid !== 'me' || e.button !== 0) return;
  e.stopPropagation(); e.preventDefault();
  var x0 = e.clientX, y0 = e.clientY, klar = false;
  function bort() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', bort); }
  function mv(ev) {
    if (klar || Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return;
    klar = true; bort();
    var pt = areaPt(self, ev), rr = V2(self).rects.me, v = vyOf(self, 'me');
    var bx = rr.bcx + (pt.x - rr.r.x - rr.cx - v.px) / rr.s, by = rr.bcy + (pt.y - rr.r.y - rr.cy - v.py) / rr.s;
    var k = PL.me.grav.splice(i, 1)[0];
    PL.me.board.push({ k: k, x: bx - CW / 2, y: by - CH / 2 });
    self.setState({ fan: null, hover: null });
    dragKort(self, 'me', PL.me.board.length - 1, ev.clientX, ev.clientY, true);
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', bort);
}

/* En matta i iteration 3. form: full, kol (smal kolumn) eller strip (list). */
function mat3(self, pid, r, rot, o) {
  var p = PL[pid], mine = pid === 'me', turn = turnOf(self), st = S(self);
  if (!mine && rot === 180 && turn === 'board upright') rot = 0;
  var vand = !mine && rot === 180 && turn === 'cards upright', speg = !mine && rot === 180;
  var form = r.h < 90 ? 'strip' : r.w < 200 ? 'kol' : 'full', full = form === 'full';
  var ps = pileScale(r), pw = 22 + PILE_W * ps + 24;
  var ins = mine ? { l: pw, t: 56, r: 20, b: 20 } : speg ? { l: 20, t: 46, r: pw, b: 50 } : { l: pw, t: 46, r: 20, b: 50 };
  var box = boxOf(p.board), f = fit2(r, rot, box, ins, 0.8);
  var v = vyOf(self, pid), s = f.s * v.z;
  V2(self).rects[pid] = { r: r, rot: rot, cx: f.cx, cy: f.cy, bcx: f.bcx, bcy: f.bcy, s: s, sFit: f.s, ew: f.ew, eh: f.eh,
    op: full ? 1 : 0, z: o.z || 1, form: form };
  var hogX = speg ? r.w - 22 - PILE_W * ps : 22, hogY = speg ? 16 : r.h - (PILE_BOT + PILE_H) * ps;
  var gx = speg ? hogX + 130 * ps : hogX, bx = speg ? hogX : hogX + 130 * ps;
  V2(self).hogar = V2(self).hogar || {};
  V2(self).hogar[pid] = full ? { grav: { x: r.x + gx, y: r.y + hogY, w: 108 * ps, h: 144 * ps }, bib: { x: r.x + bx, y: r.y + hogY, w: 108 * ps, h: 144 * ps } } : null;
  var sel = st.sel || [], zz = st.zz || {};
  var cards = p.board.map(function (c, i) {
    var d = CARDS[c.k], land = /Land/.test(d.type), key = pid + ':' + i, q = posOf(self, pid, i);
    return {
      cls: (c.gone ? 'borta ' : '') + (tapOf(self, pid, i) ? 'tappad ' : '') + (land ? 'land ' : '') + (vand ? 'vand ' : '')
        + (sel.indexOf(key) >= 0 ? 'vald ' : '') + (st.held === key ? 'held ' : '') + (st.landar === key ? 'landar' : ''),
      im: 'im-' + c.k, x: px(q.x), y: px(q.y), z: zz[key] || c.z || (10 + i),
      kwShow: !land && d.kw.length > 0, kw: d.kw.slice(0, 3).map(function (l) { return { label: l }; }),
      ptShow: d.pow != null, pt: d.pow != null ? d.pow + '/' + d.tou : '',
      enter: function () { self.setState({ hover: { pid: pid, k: c.k, i: i } }); },
      leave: function () { self.setState({ hover: null, last: { pid: pid, k: c.k } }); },
      down: function (e) { cardDown(self, pid, i, e); }
    };
  });
  var g = p.grav || [], ng = g.length, fan = st.fan && st.fan.pid === pid ? st.fan : null;
  var lager = [];
  for (var k = Math.min(ng - 1, 3); k >= 1; k--) lager.push({ cls: 'k' + k });
  var geo = fanGeo(ng, speg, Math.max(240, r.w / ps - 190));
  var fanCards = fan ? g.map(function (kk, i) {
    var hov = fan.on && fan.hov === i;
    return {
      im: 'im-' + kk, cls: hov ? 'hov' : '', z: hov ? 60 : i + 1, tf: fan.on ? fanTf(geo(i), hov, speg) : 'none',
      tr: 'transform .3s cubic-bezier(.2,.9,.3,1) ' + (i * 22) + 'ms',
      enter: function () { fanHov(self, pid, i); }, leave: function () { fanCloseSoon(self); },
      down: function (e) { fanDown(self, pid, i, e); }
    };
  }) : [];
  var fakt = mine && fan && fan.on && fan.hov != null && fan.hov < ng, fg = fakt ? geo(fan.hov) : { dx: 0, dy: 0 };
  var hallen = st.held && st.held.indexOf('me:') === 0 ? PL.me.board[+st.held.split(':')[1]] : null;
  var namnH = hallen ? CARDS[hallen.k].name : '';
  var col = mine ? '#e8b33a' : p.color;
  return {
    key: pid, x: px(r.x), y: px(r.y), w: px(r.w), h: px(r.h), z: o.z || 1, op: 1, pe: 'auto',
    cls: (mine ? '' : 'las ') + (rot === 180 ? 'upp ' : '') + (panAktiv(self) ? 'panlage ' : '') + (st.panning === pid ? 'panorerar ' : '') + 'f-' + form,
    shadow: 'inset 0 0 90px 20px #00000066, inset 0 0 0 ' + (o.valt ? '1.5px ' + (mine ? '#f0a52a99' : p.color) : '1px ' + (mine ? '#28313f' : p.color + '66')),
    tf: 'translate(' + px(f.cx + v.px) + ',' + px(f.cy + v.py) + ') rotate(' + rot + 'deg) scale(' + (Math.round(s * 1000) / 1000) + ') translate(' + px(-f.bcx) + ',' + px(-f.bcy) + ')',
    bodyOp: full ? 1 : 0, bodyPe: full ? 'auto' : 'none',
    cards: cards, down: function (e) { matDown(self, pid, e); }, stop: stopp, enter: null, leave: null,
    lassoShow: mine && !!st.lasso, lx: st.lasso && mine ? px(st.lasso.x) : '0px', ly: st.lasso && mine ? px(st.lasso.y) : '0px',
    lw: st.lasso && mine ? px(st.lasso.w) : '0px', lh: st.lasso && mine ? px(st.lasso.h) : '0px',
    hogCls: speg ? 'speg' : '', hogX: px(hogX), hogY: px(hogY), ps: Math.round(ps * 1000) / 1000,
    gravKolCls: (mine && st.over === 'grav' ? 'over ' : '') + (fan && fan.on ? 'fanpa ' : '') + (st.bump === pid ? 'bump' : ''),
    gravCls: ng ? '' : 'tom', lager: lager, gravHas: ng > 0, gravIm: ng ? 'im-' + g[0] : '', gravN: String(ng), bumpShow: st.bump === pid,
    gravTitle: ng ? ng + (ng === 1 ? ' card' : ' cards') + ' in the graveyard — point at it to look through' : 'Cards that have been played end up here',
    gravEnter: function () { fanOpen(self, pid); }, gravLeave: function () { fanCloseSoon(self); },
    gravClick: function () { var ff = S(self).fan; if (ff && ff.pid === pid) self.setState({ fan: null }); else fanOpen(self, pid); },
    fanShow: !!fan, fanCls: speg ? 'ned' : '', fanCards: fanCards, fanTxt: mine ? 'Drag one back out' : 'Point at one to read it',
    faktShow: !!fakt, faktX: px(fg.dx - 30), faktY: px(fg.dy - 20 - 44),
    onAter: function () { var ff = S(self).fan; if (ff && ff.hov != null) tillbaka(self, ff.hov); },
    onExil: function () { var ff = S(self).fan; if (ff && ff.hov != null) exila(self, ff.hov); },
    slappShow: mine && !!st.held && !!st.over,
    slappTxt: st.over === 'bib' ? 'Let go — ' + namnH + ' goes back into your library' : 'Let go — ' + namnH + ' lands face up on top',
    bibCls: mine && st.over === 'bib' ? 'over' : '', libN: String(p.lib),
    bibTitle: mine ? 'My deck — ' + p.lib + ' cards not played yet. Drop a card here to put it back' : p.name + '’s library — ' + p.lib + ' cards',
    exilShow: mine && p.exil.length > 0, exilN: String(mine ? p.exil.length : 0),
    plateShow: !mine && full, plateCls: r.w < 380 ? 'smal' : '', plateClick: function () { valjAv(self, pid); },
    name: mine ? 'You' : p.name, color: col, pips: (p.colors || []).map(function (c) { return { cls: 'pip-' + c }; }),
    onTable: p.board.filter(function (c) { return !c.gone; }).length + ' on the table',
    turnTxt: TURN_TXT[turn], turnClick: function (e) { if (e) e.stopPropagation(); vandNasta(self); },
    chromeShow: full && r.w >= 420 && r.h >= 200, chromeCls: mine ? '' : 'br', mineTools: mine,
    toolSel: toolOf(self) === 'valj' ? 'on' : '', toolPan: toolOf(self) === 'pan' ? 'on' : '',
    zoomTxt: Math.round(s * 100) + '%' + (v.z === 1 && !v.px && !v.py ? ' fit' : ''), zoomCls: v.z === 1 && !v.px && !v.py ? '' : 'manuell',
    onSel: function () { self.setState({ tool: 'valj' }); }, onPan: function () { self.setState({ tool: 'pan' }); },
    onZin: function () { zoomAt(self, pid, 1.25); }, onZut: function () { zoomAt(self, pid, 0.8); },
    onFit: function () { setVy(self, pid, { px: 0, py: 0, z: 1 }); },
    onUntap: function () { var t = {}; PL.me.board.forEach(function (c, i) { t['me:' + i] = false; }); self.setState({ tap: t }); },
    onTidy: function () { self.setState({ pos: {}, zz: {}, sel: [] }); setVy(self, 'me', { px: 0, py: 0, z: 1 }); },
    stripShow: form === 'strip', stripName: mine ? 'Your table' : p.name, thumbs: p.board.filter(function (c) { return !c.gone; }).map(function (c) { return { cls: 'im-' + c.k + (c.t ? ' tappad' : '') }; }),
    stripHint: mine ? 'Your cards' : '', stripKey: o.kbd, stripClick: function () { valjAv(self, pid); },
    kolShow: form === 'kol', kolKey: o.kbd, kolClick: function () { valjAv(self, pid); }, kolTitle: p.name + '’s table big (' + o.kbd + ')',
    gravNk: String(ng), libNk: String(p.lib)
  };
}

/* Växeln: vilka som finns, vem som är vald, och stegen mellan lägena. */
function valtOf(self, cfg) {
  var s = S(self).valt; if (s) return s;
  var v = self.props.view;
  return cfg.ids.indexOf(v) >= 0 ? v : cfg.def;
}
function valjAv(self, v) {
  var ch = { valt: v, fan: null };
  if (v !== 'me' && v !== 'all') ch.sist = v;
  self.setState(ch);
}
function nivaOf(v) { return v === 'me' ? 0 : v === 'all' ? 1 : 2; }
/* Kantens läge i varje nivå: mina (motståndarna som listor), alla, en vald. */
function nivaH(n) { return n === 0 ? STRIP3 : n === 1 ? (H3 - G3) / 2 : H3 - STRIP3 - G3; }
function stegTill(self, cfg, n) {
  var mitt = cfg.opps[Math.floor((cfg.opps.length - 1) / 2)];
  valjAv(self, n === 0 ? 'me' : n === 1 ? 'all' : (S(self).sist || mitt));
}
function stegNiva(self, cfg, d) { stegTill(self, cfg, clamp(nivaOf(valtOf(self, cfg)) + d, 0, 2)); }
function sidled(self, cfg, d) {
  var v = valtOf(self, cfg), o = cfg.opps, i = o.indexOf(v);
  if (i < 0) i = d > 0 ? -1 : o.length;
  valjAv(self, o[(i + d + o.length) % o.length]);
}
/* Tangenterna: siffrorna är bara motståndarna, i den ordning de sitter
   (1 Sara, 2 Erik, 3 Linus); M = mitt bord, A = alla. */
function seatKnapp(cfg, id) { return id === 'me' ? 'M' : id === 'all' ? 'A' : String(cfg.opps.indexOf(id) + 1); }
function seatKeys(self, cfg, e) {
  var k = e.key, lower = k.toLowerCase(), n = +k;
  if (lower === 'm') { valjAv(self, 'me'); return true; }
  if (lower === 'a') { valjAv(self, 'all'); return true; }
  if (n >= 1 && n <= cfg.opps.length) { valjAv(self, cfg.opps[n - 1]); return true; }
  if (k === 'ArrowUp') { stegNiva(self, cfg, 1); return true; }
  if (k === 'ArrowDown') { stegNiva(self, cfg, -1); return true; }
  if (k === 'ArrowRight' || (k === 'Tab' && !e.shiftKey)) { sidled(self, cfg, 1); return true; }
  if (k === 'ArrowLeft' || (k === 'Tab' && e.shiftKey)) { sidled(self, cfg, -1); return true; }
  if (k === 'Escape' && S(self).fan) { self.setState({ fan: null }); return true; }
  return false;
}
/* Kanten med spelarväxeln mitt på (som B1): dra var som helst på kanten —
   också från en spelare i växeln — så följer kanten pekaren, och vid släpp
   går den till närmaste nivå åt det håll man drog (14 px räcker). Ett klick
   på kanten växlar mellan mitt bord och alla; ett klick på en spelare väljer
   den (växelns onClick — ett drag som började på knappen sväljer klicket). */
function kantDown(self, cfg, e, franSeg) {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (!franSeg) e.preventDefault();
  var n0 = nivaOf(valtOf(self, cfg)), h0 = nivaH(n0), y0 = e.clientY, sc = scaleOf(self), flyttad = false, live = h0;
  function mv(ev) {
    var dy = (ev.clientY - y0) / sc;
    if (!flyttad && Math.abs(dy) <= 4) return;
    flyttad = true;
    live = clamp(h0 + dy, STRIP3, H3 - STRIP3 - G3);
    self.setState({ kantLive: live, fan: null });
  }
  function up(ev) {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    var dy = (ev.clientY - y0) / sc;
    if (!flyttad) { if (!franSeg) valjAv(self, n0 === 0 ? 'all' : 'me'); return; }
    if (franSeg) { self._nyssDrag = true; setTimeout(function () { self._nyssDrag = false; }, 0); }
    self.setState({ kantLive: null });
    if (Math.abs(dy) < 14) return;
    var kand = [0, 1, 2].filter(function (n) { return dy > 0 ? n > n0 : n < n0; });
    if (!kand.length) return;
    stegTill(self, cfg, kand.reduce(function (a, b) { return Math.abs(nivaH(b) - live) < Math.abs(nivaH(a) - live) ? b : a; }));
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function seatLayout(self, cfg) {
  var st = S(self), v = valtOf(self, cfg), o = cfg.opps, n = o.length, niva = nivaOf(v);
  self._valt = v;
  var drar = st.kantLive != null, oppH = drar ? st.kantLive : nivaH(niva);
  var mats = [], x = 0;
  o.forEach(function (pid, i) {
    var w = niva === 2 ? (pid === v ? W3 - (n - 1) * (MINW3 + GAP3) : MINW3) : (W3 - (n - 1) * GAP3) / n;
    mats.push(mat3(self, pid, { x: x, y: 0, w: w, h: oppH }, 180, { valt: pid === v, kbd: seatKnapp(cfg, pid), z: 2 }));
    x += w + GAP3;
  });
  var meY = oppH + G3;
  mats.push(mat3(self, 'me', { x: 0, y: meY, w: W3, h: H3 - meY }, 0, { valt: v === 'me', kbd: 'M', z: 1 }));
  var segs = cfg.ids.map(function (id) {
    var p = PL[id], me = id === 'me', all = id === 'all', kbd = seatKnapp(cfg, id);
    return {
      label: me ? 'Me' : all ? cfg.allLabel : p.name, kbd: kbd, dot: me ? '#e8b33a' : all ? 'transparent' : p.color,
      hasDot: !all, isAll4: all && n > 1, isAll2: all && n === 1, cls: (v === id ? 'on ' : '') + (me ? 'mine' : all ? 'alla' : 't-' + id),
      title: me ? 'Your table big, the others as strips (M)'
        : all ? (n > 1 ? 'Everyone at once (A)' : 'Both of you (A)') : p.name + '’s table big (' + kbd + ')',
      go: function () { if (self._nyssDrag) { self._nyssDrag = false; return; } valjAv(self, id); },
      down: function (e) { kantDown(self, cfg, e, true); }
    };
  });
  return {
    mats: mats, segs: segs, stop: stopp,
    trans: drar ? 'none' : TRANS3,
    transS: st.panning || st.held || drar ? 'none' : TRANS3_S,
    kant: { y: px(oppH), cls: drar ? 'drar' : '', trans: drar ? 'none' : 'top .5s cubic-bezier(.22,.8,.26,1)' },
    kantDown: function (e) { kantDown(self, cfg, e, false); }
  };
}

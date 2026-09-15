
var CW = 178, CH = 248;
var CARDS = {"danitha":{"name":"Danitha Capashen, Paragon","type":"Legendary Creature — Human Knight","pow":"2","tou":"2","kw":["Lifelink","Vigilance","First strike"]},"pharika":{"name":"Pharika's Chosen","type":"Creature — Snake","pow":"1","tou":"1","kw":["Deathtouch"]},"pikemaster":{"name":"Faithful Pikemaster","type":"Creature — Rhino Monk Soldier","pow":"3","tou":"4","kw":[]},"nighthawk":{"name":"Vampire Nighthawk","type":"Creature — Vampire Shaman","pow":"2","tou":"3","kw":["Deathtouch","Flying","Lifelink"]},"swamp":{"name":"Swamp","type":"Basic Land — Swamp","pow":null,"tou":null,"kw":[]},"plains":{"name":"Plains","type":"Basic Land — Plains","pow":null,"tou":null,"kw":[]},"serra":{"name":"Serra Angel","type":"Creature — Angel","pow":"4","tou":"4","kw":["Flying","Vigilance"]},"swiftspear":{"name":"Monastery Swiftspear","type":"Creature — Human Monk","pow":"1","tou":"2","kw":["Prowess","Haste"]},"anthem":{"name":"Glorious Anthem","type":"Enchantment","pow":null,"tou":null,"kw":[]},"mountain":{"name":"Mountain","type":"Basic Land — Mountain","pow":null,"tou":null,"kw":[]},"bolt":{"name":"Lightning Bolt","type":"Instant","pow":null,"tou":null,"kw":[]},"island":{"name":"Island","type":"Basic Land — Island","pow":null,"tou":null,"kw":[]},"delver":{"name":"Delver of Secrets","type":"Creature — Human Wizard","pow":"1","tou":"1","kw":["Flying"]},"phoenix":{"name":"Arclight Phoenix","type":"Creature — Phoenix","pow":"3","tou":"2","kw":["Flying","Haste"]},"llanowar":{"name":"Llanowar Elves","type":"Creature — Elf Druid","pow":"1","tou":"1","kw":[]},"woodelves":{"name":"Wood Elves","type":"Creature — Elf Scout","pow":"1","tou":"1","kw":[]},"forest":{"name":"Forest","type":"Basic Land — Forest","pow":null,"tou":null,"kw":[]}};
var TRANS = 'left .46s cubic-bezier(.2,.8,.3,1), top .46s cubic-bezier(.2,.8,.3,1), width .46s cubic-bezier(.2,.8,.3,1), height .46s cubic-bezier(.2,.8,.3,1), opacity .3s';
var TRANS_S = 'transform .52s cubic-bezier(.2,.8,.3,1), opacity .25s';
var PL = {
  me: { name: 'Jesper', color: '#e8b33a', deck: 'My deck', colors: [], lib: 32, grav: [],
    board: [
      { k: 'danitha', x: 0, y: 0 }, { k: 'pharika', x: 215, y: 0, t: 1 }, { k: 'pikemaster', x: 450, y: 0 }, { k: 'nighthawk', x: 660, y: 0 },
      { k: 'plains', x: 60, y: 300, z: 200 }, { k: 'plains', x: 77, y: 374, z: 201 },
      { k: 'swamp', x: 320, y: 300, z: 202 }, { k: 'swamp', x: 337, y: 374, z: 203 }, { k: 'swamp', x: 580, y: 300, z: 204 }
    ] },
  erik: { name: 'Erik', color: '#6b8cff', fg: '#ccd7ff', deck: 'Boros Angels', colors: ['W', 'R'], lib: 34, grav: ['bolt', 'bolt'],
    board: [
      { k: 'serra', x: 0, y: 0 }, { k: 'swiftspear', x: 235, y: 0, t: 1 }, { k: 'anthem', x: 490, y: 0 },
      { k: 'mountain', x: 60, y: 300, z: 200 }, { k: 'mountain', x: 77, y: 374, z: 201 }, { k: 'mountain', x: 560, y: 300, z: 202 },
      { k: 'plains', x: 320, y: 300, z: 203 }, { k: 'plains', x: 337, y: 374, z: 204 }
    ] },
  sara: { name: 'Sara', color: '#b782ff', fg: '#e6d6ff', deck: 'Izzet Phoenix', colors: ['U', 'R'], lib: 38, grav: ['phoenix'],
    board: [
      { k: 'delver', x: 0, y: 0 }, { k: 'phoenix', x: 235, y: 0, t: 1 },
      { k: 'island', x: 40, y: 300, z: 200 }, { k: 'island', x: 57, y: 374, z: 201 }, { k: 'mountain', x: 300, y: 300, z: 202 }
    ] },
  linus: { name: 'Linus', color: '#57c785', fg: '#c6f0d6', deck: 'Mono-Green Elves', colors: ['G'], lib: 40, grav: [],
    board: [
      { k: 'llanowar', x: 0, y: 0, t: 1 }, { k: 'woodelves', x: 250, y: 0 },
      { k: 'forest', x: 40, y: 300, z: 200 }, { k: 'forest', x: 57, y: 374, z: 201 }, { k: 'forest', x: 300, y: 300, z: 202 }
    ] }
};
function px(n) { return (Math.round(n * 10) / 10) + 'px'; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rectOf(c) {
  if (!c.t) return { x: c.x, y: c.y, w: CW, h: CH };
  var cx = c.x + CW / 2, cy = c.y + CH / 2;
  return { x: cx - CH / 2, y: cy - CW / 2, w: CH, h: CW };
}
function boxOf(b) {
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  b.forEach(function (c) { var r = rectOf(c); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
  var p = 22;
  return { x0: x0 - p, y0: y0 - p, w: x1 - x0 + 2 * p, h: y1 - y0 + 2 * p };
}
/* Samma idé som mattans fit: hela brädet i bild, centrerat i ytan innanför
   insets. rot vrider hela brädet — 180 = motståndaren mitt emot. */
function fitTf(r, rot, box, ins, cap) {
  var aw = Math.max(10, r.w - ins.l - ins.r), ah = Math.max(10, r.h - ins.t - ins.b);
  var side = Math.abs(rot) % 180 === 90;
  var ew = side ? box.h : box.w, eh = side ? box.w : box.h;
  var s = Math.max(0.05, Math.min(aw / ew, ah / eh, cap));
  var cx = ins.l + aw / 2, cy = ins.t + ah / 2;
  return { s: s, tf: 'translate(' + px(cx) + ',' + px(cy) + ') rotate(' + rot + 'deg) scale(' + (Math.round(s * 1000) / 1000) + ') translate(' + px(-(box.x0 + box.w / 2)) + ',' + px(-(box.y0 + box.h / 2)) + ')' };
}
function cardList(self, pid) {
  return PL[pid].board.map(function (c, i) {
    var d = CARDS[c.k], land = /Land/.test(d.type);
    return {
      cls: (c.t ? 'tappad ' : '') + (land ? 'land' : ''), im: 'im-' + c.k,
      x: px(c.x), y: px(c.y), z: c.z || (10 + i),
      kwShow: !land && d.kw.length > 0, kw: d.kw.slice(0, 3).map(function (l) { return { label: l }; }),
      ptShow: d.pow != null, pt: d.pow != null ? d.pow + '/' + d.tou : '',
      enter: function () { self.setState({ hover: { pid: pid, k: c.k } }); },
      leave: function () { self.setState({ hover: null, last: { pid: pid, k: c.k } }); }
    };
  });
}
function thumbs(pid) {
  return PL[pid].board.map(function (c) { return { cls: 'im-' + c.k + (c.t ? ' tappad' : '') }; });
}
function insVals(st) {
  var h = st.hover || st.last || { pid: 'me', k: 'danitha' };
  var d = CARDS[h.k], p = PL[h.pid], mine = h.pid === 'me';
  return {
    im: 'im-' + h.k, name: d.name, type: d.type, kw: d.kw.map(function (l) { return { label: l }; }),
    label: mine ? (st.hover ? 'Pointing at' : 'Last card') : p.name + '’s card',
    col: mine ? '#f0a52a' : p.color, line: mine ? '#3a2c10' : p.color + '40'
  };
}
/* En matta. r i ytans koordinater, o = { ins, cap, piles, plate, chrome, band, op, bodyOp, z, cls }. */
function matObj(self, pid, r, rot, o) {
  var p = PL[pid], mine = pid === 'me', box = boxOf(p.board);
  var f = fitTf(r, rot, box, o.ins || { l: 20, t: 14, r: 20, b: 14 }, o.cap || 0.8);
  var g = p.grav || [];
  var m = {
    key: pid, x: px(r.x), y: px(r.y), w: px(r.w), h: px(r.h),
    op: o.op == null ? 1 : o.op, z: o.z || 1, pe: o.op === 0 ? 'none' : 'auto',
    cls: (mine ? '' : 'las ') + (rot === 180 ? 'upp ' : '') + (o.cls || ''),
    shadow: 'inset 0 0 90px 20px #00000066, inset 0 0 0 1px ' + (mine ? '#28313f' : p.color + '66'),
    tf: f.tf, s: f.s, zoomTxt: Math.round(f.s * 100) + '% fit', bodyOp: o.bodyOp == null ? 1 : o.bodyOp,
    cards: cardList(self, pid),
    pilesShow: !!o.piles, pileCls: o.piles || '', lib: p.lib,
    gravHas: g.length > 0, gravTom: g.length === 0, gravIm: g.length ? 'im-' + g[g.length - 1] : '',
    gravTxt: g.length ? g.length + (g.length === 1 ? ' card' : ' cards') : 'Empty',
    chrome: !!o.chrome, plateShow: !!o.plate, bandShow: !!o.band, bandX: o.bandX || '12px',
    name: p.name, color: p.color, deck: p.deck,
    pips: (p.colors || []).map(function (c) { return { cls: 'pip-' + c }; }),
    onTable: p.board.length + ' on the table',
    bandBg: p.color + '1f', bandBd: p.color + '6b', bandFg: p.fg || '#e7ecf4',
    bandTxt: 'You are looking at ' + p.name + '’s table — you can look, not change',
    plateClick: o.plateClick || null, enter: o.enter || null, leave: o.leave || null
  };
  return m;
}
/* Kortbilderna: läs de dolda <img>-ernas färdiga src och skriv .im-*-regler.
   Först efter en stund, och en bild per steg i en egen liten <style>: allt
   på en gång (en megabyte bilddata i en regel) höll artboardens tråd så
   länge att editorn slutade få svar ("Preview stopped"). */
function bildCss(n) {
  if (n == null) { setTimeout(function () { bildCss(0); }, 1200); return; }
  var ims = document.querySelectorAll('img[data-im]');
  var klar = ims.length > 0 && Array.prototype.every.call(ims, function (im) { return (im.getAttribute('src') || '').indexOf(':') > 0; });
  if (!klar && n < 40) { setTimeout(function () { bildCss(n + 1); }, 150); return; }
  var lista = Array.prototype.slice.call(ims), i = 0;
  (function nasta() {
    if (i >= lista.length) return;
    var im = lista[i++], k = im.getAttribute('data-im'), id = 'im-css-' + k;
    if (!document.getElementById(id)) {
      var el = document.createElement('style'); el.id = id;
      el.textContent = '.im-' + k + '{background-image:url("' + (im.getAttribute('src') || im.currentSrc) + '")!important}';
      document.head.appendChild(el);
    }
    setTimeout(nasta, 40);
  })();
}
function skriver(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return true;
  var t = e.target;
  return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
}

/* ── Iteration 2: Select/Pan i mattorna, hjulet, lasso, vända motståndarens kort ──
   Samma regler som appen (index.html, hjulet och satMatVerktyg): touchpaden
   flyttar mattan, nypning och mushjul zoomar mot pekaren, S växlar Select/Pan,
   mellanslag hållet eller mitten-/högerknappen flyttar i båda lägena. */
var NYP_FART = Math.log(3.5) / Math.log(1.5);
var HJUL = { NYP: 0.01 * NYP_FART, HACK: Math.log(1.65) / 100, RAD: 33, SIDA: 800, MAX_NYP: 50, MAX_HJUL: 150 };
var TURNS = ['upside down', 'cards upright', 'board upright'];
var TURN_TXT = { 'upside down': 'Upside down', 'cards upright': 'Cards upright', 'board upright': 'Board upright' };

function S(self) { return self.state || {}; }
function V2(self) { if (!self._v2) self._v2 = { rects: {}, gest: { t: 0, tp: false } }; return self._v2; }
function vyOf(self, pid) { return (S(self).vy || {})[pid] || { px: 0, py: 0, z: 1 }; }
function setVy(self, pid, v) { var all = Object.assign({}, S(self).vy || {}); all[pid] = { px: v.px, py: v.py, z: v.z }; self.setState({ vy: all }); }
function posOf(self, pid, i) { var c = PL[pid].board[i]; return (S(self).pos || {})[pid + ':' + i] || { x: c.x, y: c.y }; }
function tapOf(self, pid, i) { var t = (S(self).tap || {})[pid + ':' + i]; return t == null ? !!PL[pid].board[i].t : t; }
function turnOf(self) { return S(self).turn || self.props.turn || 'cards upright'; }
function toolOf(self) { return S(self).tool || 'valj'; }
function panAktiv(self) { return toolOf(self) === 'pan' || !!S(self).space; }
function scaleOf(self) { var a = self.area; return a ? (a.getBoundingClientRect().width / 1041) || 1 : 1; }
function areaPt(self, ev) {
  var a = self.area; if (!a) return { x: 0, y: 0, sc: 1 };
  var r = a.getBoundingClientRect(), sc = r.width / 1041 || 1;
  return { x: (ev.clientX - r.left) / sc, y: (ev.clientY - r.top) / sc, sc: sc };
}
function areaRef(self) { if (!self._ar) self._ar = function (el) { self.area = el; }; return self._ar; }
function stopp(e) { if (e) e.stopPropagation(); }

function fit2(r, rot, box, ins, cap) {
  var aw = Math.max(10, r.w - ins.l - ins.r), ah = Math.max(10, r.h - ins.t - ins.b);
  var side = Math.abs(rot) % 180 === 90, ew = side ? box.h : box.w, eh = side ? box.w : box.h;
  return { s: Math.max(0.05, Math.min(aw / ew, ah / eh, cap)), cx: ins.l + aw / 2, cy: ins.t + ah / 2,
    bcx: box.x0 + box.w / 2, bcy: box.y0 + box.h / 2, ew: ew, eh: eh };
}
/* Hur långt mattan får flyttas: så långt att hela brädet går att nå, plus
   lite luft. I fit ryms allt, så där är det bara luften. */
function klampVy(rr, v) {
  var cw = rr.ew * rr.sFit * v.z, ch = rr.eh * rr.sFit * v.z;
  var mx = Math.max(0, (cw - rr.r.w) / 2) + 30, my = Math.max(0, (ch - rr.r.h) / 2) + 30;
  return { px: clamp(v.px, -mx, mx), py: clamp(v.py, -my, my), z: v.z };
}
/* Zooma med punkten q (i mattans koordinater) kvar under pekaren. */
function zoomAt(self, pid, f, qx, qy) {
  var rr = V2(self).rects[pid]; if (!rr) return;
  var v = vyOf(self, pid), nz = clamp(v.z * f, 1, Math.max(1, 1.8 / rr.sFit));
  if (qx == null) { qx = rr.r.w / 2; qy = rr.r.h / 2; }
  var k = nz / v.z, ox = rr.cx + v.px, oy = rr.cy + v.py;
  var nv = nz <= 1.0001 ? { px: 0, py: 0, z: 1 } : { px: qx - rr.cx - (qx - ox) * k, py: qy - rr.cy - (qy - oy) * k, z: nz };
  setVy(self, pid, klampVy(rr, nv));
}
function hitMat(self, pt) {
  var R = V2(self).rects, bast = null;
  Object.keys(R).forEach(function (pid) {
    var rr = R[pid];
    if (rr.op < 0.05 || rr.r.w < 2 || rr.r.h < 2) return;
    if (pt.x < rr.r.x || pt.x > rr.r.x + rr.r.w || pt.y < rr.r.y || pt.y > rr.r.y + rr.r.h) return;
    if (!bast || rr.z > R[bast].z) bast = pid;
  });
  return bast;
}
/* Hjulet, som i appen. hooks.wheel(ev, pt) får ta händelsen först (kanten);
   hooks.overscroll(pid, rest) får det som blev över när mattan tog stopp. */
function v2Wheel(self, ev, hooks) {
  ev.preventDefault();
  var v2 = V2(self), pt = areaPt(self, ev), nu = performance.now();
  if (nu - v2.gest.t > 220) v2.gest.tp = ev.deltaMode === 0 && (ev.deltaX !== 0 || (ev.wheelDeltaY ? ev.wheelDeltaY % 120 !== 0 : !Number.isInteger(ev.deltaY)));
  v2.gest.t = nu;
  if (hooks && hooks.wheel && hooks.wheel(ev, pt, v2.gest.tp)) return;
  var pid = hitMat(self, pt); if (!pid) return;
  var rr = v2.rects[pid], qx = pt.x - rr.r.x, qy = pt.y - rr.r.y;
  if (ev.ctrlKey) { zoomAt(self, pid, Math.exp(-clamp(ev.deltaY, -HJUL.MAX_NYP, HJUL.MAX_NYP) * HJUL.NYP), qx, qy); return; }
  if (ev.shiftKey || v2.gest.tp) {
    var v = vyOf(self, pid), dx = ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX, dy = ev.shiftKey ? 0 : ev.deltaY;
    var want = { px: v.px - dx, py: v.py - dy, z: v.z }, nv = klampVy(rr, want);
    if (nv.px !== v.px || nv.py !== v.py) setVy(self, pid, nv);
    var rest = want.py - nv.py;
    if (rest !== 0 && hooks && hooks.overscroll) hooks.overscroll(pid, rest);
    return;
  }
  var d = ev.deltaY * (ev.deltaMode === 1 ? HJUL.RAD : ev.deltaMode === 2 ? HJUL.SIDA : 1);
  zoomAt(self, pid, Math.exp(-clamp(d, -HJUL.MAX_HJUL, HJUL.MAX_HJUL) * HJUL.HACK), qx, qy);
}
function matDown(self, pid, e) {
  if (e.button === 1 || e.button === 2 || panAktiv(self)) { startPan(self, pid, e); return; }
  if (pid === 'me' && e.button === 0) startLasso(self, e);
}
function startPan(self, pid, e) {
  var rr = V2(self).rects[pid]; if (!rr) return;
  e.preventDefault(); e.stopPropagation();
  var v0 = vyOf(self, pid), x0 = e.clientX, y0 = e.clientY, sc = scaleOf(self);
  self.setState({ panning: pid });
  function mv(ev) { setVy(self, pid, klampVy(rr, { px: v0.px + (ev.clientX - x0) / sc, py: v0.py + (ev.clientY - y0) / sc, z: v0.z })); }
  function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); self.setState({ panning: null }); }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
/* Select: dra ett kort (eller alla markerade), klick = tappa/untappa. Bara på
   den egna mattan — någon annans bord går att titta på, inte ändra. */
function cardDown(self, pid, i, e) {
  if (pid !== 'me' || e.button !== 0 || panAktiv(self)) return;
  e.stopPropagation(); e.preventDefault();
  var key = pid + ':' + i, sel = S(self).sel || [], grupp = sel.indexOf(key) >= 0 ? sel : [key];
  var rr = V2(self).rects[pid], s = rr.s, sc = scaleOf(self), x0 = e.clientX, y0 = e.clientY, flyttad = false, start = {};
  grupp.forEach(function (k) { start[k] = posOf(self, pid, +k.split(':')[1]); });
  var topz = V2(self).topz = (V2(self).topz || 500) + 1;
  function mv(ev) {
    var dx = (ev.clientX - x0) / sc, dy = (ev.clientY - y0) / sc;
    if (!flyttad && Math.abs(dx) + Math.abs(dy) < 4) return;
    flyttad = true;
    var pos = Object.assign({}, S(self).pos || {}), zz = Object.assign({}, S(self).zz || {});
    grupp.forEach(function (k) { pos[k] = { x: start[k].x + dx / s, y: start[k].y + dy / s }; zz[k] = topz; });
    self.setState({ pos: pos, zz: zz, held: key });
  }
  function up() {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    if (flyttad) { self.setState({ held: null }); return; }
    var tap = Object.assign({}, S(self).tap || {}); tap[key] = !tapOf(self, pid, i);
    self.setState({ tap: tap, held: null });
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function kortRuta(self, rr, i) {
  var p = posOf(self, 'me', i), t = tapOf(self, 'me', i), v = vyOf(self, 'me');
  var sx = rr.cx + v.px + rr.s * (p.x + CW / 2 - rr.bcx), sy = rr.cy + v.py + rr.s * (p.y + CH / 2 - rr.bcy);
  var hw = (t ? CH : CW) / 2 * rr.s, hh = (t ? CW : CH) / 2 * rr.s;
  return { x: sx - hw, y: sy - hh, w: 2 * hw, h: 2 * hh };
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
    if (!rorde || !L) { self.setState({ lasso: null, sel: bas }); return; }
    var hits = bas.slice();
    PL.me.board.forEach(function (c, i) {
      var k = 'me:' + i; if (hits.indexOf(k) >= 0) return;
      var b = kortRuta(self, rr, i);
      if (b.x < L.x + L.w && b.x + b.w > L.x && b.y < L.y + L.h && b.y + b.h > L.y) hits.push(k);
    });
    self.setState({ lasso: null, sel: hits });
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
function vandNasta(self) { var i = TURNS.indexOf(turnOf(self)); self.setState({ turn: TURNS[(i + 1) % TURNS.length] }); }

/* En matta i iteration 2: matObj plus vy (pan/zoom), korten var de dragits,
   Select/Pan, lasso och hur motståndarens kort vänds. */
function mat2(self, pid, r, rot, o) {
  var p = PL[pid], mine = pid === 'me', turn = turnOf(self), st = S(self);
  if (!mine && rot === 180 && turn === 'board upright') rot = 0;
  var vand = !mine && rot === 180 && turn === 'cards upright';
  var box = boxOf(p.board), f = fit2(r, rot, box, o.ins || { l: 20, t: 14, r: 20, b: 14 }, o.cap || 0.8);
  var v = vyOf(self, pid), s = f.s * v.z;
  V2(self).rects[pid] = { r: r, rot: rot, cx: f.cx, cy: f.cy, bcx: f.bcx, bcy: f.bcy, s: s, sFit: f.s, ew: f.ew, eh: f.eh,
    op: o.op == null ? 1 : o.op, z: o.z || 1 };
  var m = matObj(self, pid, r, rot, o);
  m.tf = 'translate(' + px(f.cx + v.px) + ',' + px(f.cy + v.py) + ') rotate(' + rot + 'deg) scale(' + (Math.round(s * 1000) / 1000) + ') translate(' + px(-f.bcx) + ',' + px(-f.bcy) + ')';
  m.s = s;
  var fitNu = v.z === 1 && !v.px && !v.py;
  m.zoomTxt = Math.round(s * 100) + '%' + (fitNu ? ' fit' : '');
  m.zoomCls = fitNu ? '' : 'manuell';
  m.cls += (panAktiv(self) ? ' panlage' : '') + (st.panning === pid ? ' panorerar' : '');
  var sel = st.sel || [], zz = st.zz || {};
  m.cards = p.board.map(function (c, i) {
    var d = CARDS[c.k], land = /Land/.test(d.type), key = pid + ':' + i, q = posOf(self, pid, i);
    return {
      cls: (tapOf(self, pid, i) ? 'tappad ' : '') + (land ? 'land ' : '') + (vand ? 'vand ' : '') + (sel.indexOf(key) >= 0 ? 'vald ' : '') + (st.held === key ? 'held' : ''),
      im: 'im-' + c.k, x: px(q.x), y: px(q.y), z: zz[key] || c.z || (10 + i),
      kwShow: !land && d.kw.length > 0, kw: d.kw.slice(0, 3).map(function (l) { return { label: l }; }),
      ptShow: d.pow != null, pt: d.pow != null ? d.pow + '/' + d.tou : '',
      enter: function () { self.setState({ hover: { pid: pid, k: c.k, i: i } }); },
      leave: function () { self.setState({ hover: null, last: { pid: pid, k: c.k } }); },
      down: function (e) { cardDown(self, pid, i, e); }
    };
  });
  m.down = function (e) { matDown(self, pid, e); };
  m.stop = stopp;
  var L = st.lasso;
  m.lassoShow = mine && !!L;
  m.lx = L && mine ? px(L.x) : '0px'; m.ly = L && mine ? px(L.y) : '0px'; m.lw = L && mine ? px(L.w) : '0px'; m.lh = L && mine ? px(L.h) : '0px';
  m.toolSel = toolOf(self) === 'valj' ? 'on' : ''; m.toolPan = toolOf(self) === 'pan' ? 'on' : '';
  m.onSel = function () { self.setState({ tool: 'valj' }); };
  m.onPan = function () { self.setState({ tool: 'pan' }); };
  m.onZin = function () { zoomAt(self, pid, 1.25); };
  m.onZut = function () { zoomAt(self, pid, 0.8); };
  m.onFit = function () { setVy(self, pid, { px: 0, py: 0, z: 1 }); };
  m.onUntap = function () { var t = {}; PL.me.board.forEach(function (c, i) { t['me:' + i] = false; }); self.setState({ tap: t }); };
  m.onTidy = function () { self.setState({ pos: {}, zz: {}, sel: [] }); setVy(self, 'me', { px: 0, py: 0, z: 1 }); };
  m.turnTxt = TURN_TXT[turn];
  m.turnClick = function (e) { if (e) e.stopPropagation(); vandNasta(self); };
  m.plateCls = r.w < 380 ? 'smal' : '';
  m.stripShow = false; m.stripOp = 0; m.stripPe = 'none'; m.thumbs = []; m.others = [];
  m.stripName = ''; m.stripHint = ''; m.stripKey = ''; m.stripClick = null;
  return m;
}

function hovPid(self) { var h = S(self).hover; return h ? h.pid : 'me'; }
function v2Key(self, e) {
  var k = e.key, lower = k.toLowerCase();
  if (lower === 's') { self.setState({ tool: toolOf(self) === 'pan' ? 'valj' : 'pan' }); return true; }
  if (k === ' ') { if (!S(self).space) self.setState({ space: true }); return true; }
  if (k === '0') { self.setState({ vy: {} }); return true; }
  if (k === '+' || k === '=') { zoomAt(self, hovPid(self), 1.25); return true; }
  if (k === '-' || k === '_') { zoomAt(self, hovPid(self), 0.8); return true; }
  if (lower === 'u') { vandNasta(self); return true; }
  if (lower === 't') {
    var h = S(self).hover;
    if (h && h.pid === 'me' && h.i != null) { var tap = Object.assign({}, S(self).tap || {}); tap['me:' + h.i] = !tapOf(self, 'me', h.i); self.setState({ tap: tap }); }
    return true;
  }
  if (k === 'Escape' && (S(self).sel || []).length) { self.setState({ sel: [] }); return true; }
  return false;
}
function v2Mount(self, onKey, onKeyUp, hooks) {
  bildCss();
  self._k = function (e) { if (skriver(e)) return; if ((onKey && onKey(e)) || v2Key(self, e)) e.preventDefault(); };
  self._ku = function (e) { if (onKeyUp) onKeyUp(e); if (e.key === ' ' && S(self).space) self.setState({ space: false }); };
  self._w = function (e) { v2Wheel(self, e, hooks); };
  window.addEventListener('keydown', self._k);
  window.addEventListener('keyup', self._ku);
  if (self.area) self.area.addEventListener('wheel', self._w, { passive: false });
}
function v2Unmount(self) {
  window.removeEventListener('keydown', self._k);
  window.removeEventListener('keyup', self._ku);
  if (self.area) self.area.removeEventListener('wheel', self._w);
}
function v2Common(self) {
  var t = toolOf(self);
  return {
    trans: S(self).drag ? 'none' : TRANS,
    transS: S(self).drag || S(self).panning || S(self).held ? 'none' : TRANS_S,
    ins: insVals(S(self)), areaRef: areaRef(self),
    noMenu: function (e) { e.preventDefault(); },
    toolTxt: t === 'pan' ? 'Pan' : 'Select', turnTxt: TURN_TXT[turnOf(self)]
  };
}


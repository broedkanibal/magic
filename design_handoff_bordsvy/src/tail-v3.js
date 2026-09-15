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

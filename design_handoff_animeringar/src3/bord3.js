/* ── Bordet: scenerna ──────────────────────────────────────────────────
   En scen är vad spelaren gör vid det fysiska bordet (händer, kort), vad
   kameran ser och när, och vad mattan då gör. Kamerans tider är grova
   riktvärden ur mätningarna, inte löften:
     VILA      från att kortet släpps tills kameran ser att det ligger still
     HANDBORT  från att handen lämnat ett område tills det syns fritt
     TAPSAKER  från att kortet syns tappat tills domen är säker */
const VILA = 300, HANDBORT = 300, TAPSAKER = 250;
const PUNKT = { flytt: [1100, 200], tackt: [470, 140], zoom: [1420, 150] };
const LAND = ['forest1', 'forest2', 'plains1', 'plains2'];

const SCEN = {
  utspel:     { knapp: 'Lägg ut ett kort', under: 'namnet efter: se Tweaks' },
  utanNamn:   { knapp: 'Ett kort utan namn', under: 'du fyller i det på kortet' },
  flytt:      { knapp: 'Flytta, andra handen kvar', under: 'bärs dit när kortet vilar' },
  hand:       { knapp: 'Handen över korten', under: 'ingenting ändras' },
  tillHanden: { knapp: 'Ta upp i handen', under: 'glider ut genom nederkanten' },
  tackt:      { knapp: 'Lägg ett kort över ett annat', under: 'täckt är inte borta' },
  grav:       { knapp: 'Till graveyard', under: 'flyger dit när högen växer' },
  tappa:      { knapp: 'Tappa land i din takt', under: 'samma ordning och tempo' },
  untap:      { knapp: 'Untappa med ett svep', under: 'varje land så fort handen gått vidare' },
  zoom:       { knapp: 'Lägg ut långt till höger', under: 'ett zoomsteg, samma rörelse' },
  knuff:      { knapp: 'Rätta till ett kort', under: 'en liten knuff syns inte' },
};

class Bord {
  /* opt: minskad(), namnMs(), troskel(), ring(), logga(rad), rensaLogg(),
     gravN(n), zoomTxt(t), rad(r), markera(m) */
  constructor(m, opt) { this.m = m; this.opt = opt; this.t0 = 0; this.radTok = 0; this.sel = null; }
  spec() { return this.opt.minskad() ? SPEC.R : SPEC.E; }
  fys(id) { return this.m.o['f:' + id]; }
  mat(id) { return this.m.o['m:' + id]; }

  /* ── förbered ── */
  aterstall() {
    const m = this.m;
    m.tom();
    for (const k in m.o) { const ob = m.o[k]; ob.v = GRUND[ob.typ](ob.id); }
    if (m.rot) {
      for (const el of m.rot.querySelectorAll('[data-hog]')) el.removeAttribute('src');
      const okand = this.mat('okand');
      for (const e of okand.els) e.face.src = BILD.okand;
    }
    for (const k in m.o) m.mala(m.o[k]);
    this.radTok++;
    this.opt.gravN(2); this.opt.zoomTxt('100 %'); this.opt.rad({ visa: false }); this.opt.markera({ visa: false });
  }
  kor(id) {
    this.aterstall();
    this.opt.rensaLogg();
    this.sel = id;
    this.t0 = this.m.klocka;
    this[id]();
    this.m.igang();
  }

  /* ── tid och logg ── */
  at(rel, fn) { this.m.senare(this.t0 + rel, fn); }
  rel() { return this.m.nu() - this.t0; }
  logg(rel, kol, txt) { this.at(rel, () => this.opt.logga({ t: rel, kol, txt })); }
  loggNu(kol, txt) { this.opt.logga({ t: this.rel(), kol, txt }); }

  /* ── det fysiska bordet ── */
  till(ob, p, v, rel, dur, e) { this.m.till(ob, p, v, this.t0 + rel, dur, e); }
  fysTill(id, pos, rel, dur, e) { const f = this.fys(id); this.till(f, 'x', pos[0], rel, dur, e); this.till(f, 'y', pos[1], rel, dur, e); }
  fysVrid(id, r, rel) { this.till(this.fys(id), 'r', r, rel, 220, 'INOUT'); }
  lyft(id, rel, upp) { const f = this.fys(id); this.till(f, 's', upp ? 1.06 : 1, rel, 120, 'OUT'); this.till(f, 'lift', upp ? 1 : 0, rel, 120, 'OUT'); if (upp) f.v.z = ++this.m.topZ; }
  /* Handen över ett kort vars övre vänstra hörn är p. */
  over(p) { return [p[0] - 16, p[1] + 54]; }
  handTill(h, p, rel, dur, e) { const o = this.m.o[h]; this.till(o, 'x', p[0], rel, dur, e); this.till(o, 'y', p[1], rel, dur, e); }
  handIn(h, p, rel, dur) {
    const o = this.m.o[h];
    this.till(o, 'x', p[0], rel, 0); this.till(o, 'y', CH + 60, rel, 0); this.till(o, 'o', 1, rel, 0);
    this.till(o, 'y', p[1], rel, dur || 450, 'OUT');
  }
  handUt(h, rel, dur) { const o = this.m.o[h]; dur = dur || 450; this.till(o, 'y', CH + 80, rel, dur, 'IN'); this.till(o, 'o', 0, rel + dur, 0); }
  /* Handen bär in ett kort från spelarens kant och släpper det på p. */
  barIn(id, p, slapp) {
    const f = this.fys(id), start = [p[0], CH + 110];
    this.till(f, 'x', start[0], 0, 0); this.till(f, 'y', start[1], 0, 0); this.till(f, 'o', 1, 0, 0);
    this.till(f, 's', 1.06, 0, 0); this.till(f, 'lift', 1, 0, 0); f.v.z = ++this.m.topZ;
    const h = this.m.o.h1, hs = this.over(start);
    this.till(h, 'x', hs[0], 0, 0); this.till(h, 'y', hs[1], 0, 0); this.till(h, 'o', 1, 0, 0);
    this.handTill('h1', this.over(p), 0, slapp, 'INOUT'); this.fysTill(id, p, 0, slapp, 'INOUT');
    this.lyft(id, slapp, false);
    this.handUt('h1', slapp + 100);
  }

  /* ── mattan ── */
  ctx(id, extra) {
    const y = this.m.o.yta.v, k = this.mat(id).v;
    return Object.assign({ hem: BAS[id].hem, ut: [k.x, y.vy + BH / y.zf + 40], hog: FHOG, hogS: 1, bib: FBIB, bibS: 1 }, extra || {});
  }
  fas(kind, id, extra) {
    const m = this.m, nu = m.nu(), kort = this.mat(id), ctx = this.ctx(id, extra), ring = this.opt.ring();
    if (kind === 'namn' || kind === 'oframkallad') {
      Object.assign(kort.v, { x: ctx.mal[0], y: ctx.mal[1] + IN_DY, o: 0, blur: kind === 'oframkallad' ? 1 : 0, ring: 1, glow: 0 });
      kort.v.z = ++m.topZ; m.mala(kort);
    }
    if (kind === 'flytt' || kind === 'grav' || kind === 'tillHanden') { kort.v.z = ++m.topZ; m.mala(kort); }
    if (kind === 'tap') kort.v.tappad = true;
    if (kind === 'untap') kort.v.tappad = false;
    const spar = this.spec()[kind] || [];
    if (kind === 'grav') {
      const hogT = spar.filter(t => /^hog/.test(t[0])).map(t => t[2][0][0]);
      m.senare(nu + (hogT.length ? Math.min(...hogT) : 0), () => {
        if (m.rot) for (const el of m.rot.querySelectorAll('[data-hog]')) el.src = el.dataset.src;
        Object.assign(m.o.hog.v, GRUND.hog()); m.mala(m.o.hog);
        this.opt.gravN(3);
      });
    }
    const mal = { kort, hog: m.o.hog, hogring: m.o.hogring, hogtal: m.o.hogtal, bib: m.o.bib, yta: m.o.yta };
    for (const t of spar) { if (t[3] === 'ring' && !ring) continue; m.lagg(t, mal[t[0]], nu, ctx); }
    m.igang();
  }
  /* Behöver kortet på p ett zoomsteg? Utsnittet ska rymma alla kort på
     bordet och ungefär två kort till åt det håll bordet växer, och aldrig
     mer än hela kamerabilden. */
  zoomFor(p, id) {
    const y = this.m.o.yta.v, vw = BW / y.zf, vh = BH / y.zf;
    const inne = p[0] >= y.vx + 10 && p[1] >= y.vy + 10 && p[0] + KW <= y.vx + vw - 10 && p[1] + KH <= y.vy + vh - 10;
    if (inne) return null;
    /* Högarna räknas som kort: de ligger på bordet och ska synas. */
    let x0 = Math.min(p[0], FHOG[0]), y0 = Math.min(p[1], FHOG[1]), x1 = Math.max(p[0] + KW, FBIB[0] + KW), y1 = Math.max(p[1] + KH, FHOG[1] + KH + 30);
    for (const kid in BAS) {
      const k = this.mat(kid).v; if (kid === id || k.o < .5) continue;
      x0 = Math.min(x0, k.x); y0 = Math.min(y0, k.y); x1 = Math.max(x1, k.x + KW); y1 = Math.max(y1, k.y + KH);
    }
    if (p[0] + KW > y.vx + vw) x1 += MARG; if (p[0] < y.vx) x0 -= MARG; if (p[1] < y.vy) y0 -= MARG;
    /* Utsnittet centreras kring korten och högarna. */
    const utsnitt = zf => {
      const nw = BW / zf, nh = BH / zf;
      const vx = Math.max(0, Math.min(CW - nw, (x0 + x1) / 2 - nw / 2));
      const vy = Math.max(0, Math.min(CH - nh, Math.min(y0 - 20, (y0 + y1) / 2 - nh / 2)));
      return { zf, vx, vy, ryms: x0 >= vx && x1 <= vx + nw && y1 + 20 <= vy + nh };
    };
    for (const z of ZSTEG) { if (z >= y.zf) continue; const u = utsnitt(z); if (u.ryms) return u; }
    return utsnitt(ZSTEG[ZSTEG.length - 1]);
  }
  laggNed(id, p, kind) {
    const z = this.zoomFor(p, id);
    if (z) {
      const fore = Math.round(this.m.o.yta.v.zf * 100), efter = Math.round(z.zf * 100);
      this.fas('zoom', id, { yta: z });
      this.opt.zoomTxt(efter + ' %');
      this.loggNu('mat', `Kortet får inte plats → ett zoomsteg, ${fore} % → ${efter} %, i samma rörelse som kortet läggs ned`);
    }
    this.fas(kind, id, { mal: p });
    this.loggNu('mat', kind === 'namn' ? `${BAS[id].namn} läggs ned färdigt, 400 ms` : 'Det oframkallade kortet läggs ned, 400 ms: ramen skarp, kamerans foto suddigt');
  }

  /* ── utspel: gemensamt för fyra scener ── */
  spelaUt(id, p, utanNamn) {
    const slapp = 650, n = this.opt.namnMs(), tr = this.opt.troskel(), namn = BAS[id].namn;
    this.barIn(id, p, slapp);
    this.logg(0, 'du', utanNamn ? 'Du lägger ut ett kort' : `Du lägger ut ${namn}`);
    this.logg(slapp, 'du', 'Du släpper kortet');
    this.logg(slapp + VILA, 'kam', 'Ett nytt kort ligger still → namnet läses');
    if (!utanNamn && n <= tr) {
      this.at(slapp + Math.max(VILA, n), () => { this.loggNu('kam', `Namnet: ${namn}, ${sek(n)} efter släppet`); this.laggNed(id, p, 'namn'); });
      return;
    }
    this.at(slapp + Math.max(VILA, tr), () => { this.loggNu('kam', `Inget namn efter ${sek(tr)}`); this.laggNed(id, p, 'oframkallad'); });
    if (utanNamn) {
      this.logg(slapp + 1500, 'kam', 'Kameran frågar Claude');
      this.at(slapp + 3200, () => {
        this.loggNu('kam', 'Claude hittar inget säkert namn');
        this.loggNu('mat', 'Kortet ligger kvar oframkallat, med "Name this card" — klicka på det');
        this.visaMarkering(id);
      });
      return;
    }
    if (n >= 2500) this.logg(slapp + 1500, 'kam', 'Kameran frågar Claude');
    this.at(slapp + n, () => { this.loggNu('kam', `Namnet: ${namn}, ${sek(n)} efter släppet`); this.fas('framkalla', id); this.loggNu('mat', 'Kortet framkallas, 300 ms'); });
  }
  visaMarkering(id) {
    const y = this.m.o.yta.v, k = this.mat(id).v, z = ZM * y.zf;
    this.opt.markera({ visa: true, id, x: (k.x + KW / 2 - y.vx) * z, y: (k.y + KH - y.vy) * z, topp: (k.y - y.vy) * z, vanster: (k.x - y.vx) * z, hoger: (k.x + KW - y.vx) * z });
  }
  namnGivet(id, namn) {
    const bild = BILD[BILD_AV[namn]] || BILD[id];
    for (const e of this.mat(id).els) e.face.src = bild;
    this.opt.markera({ visa: false });
    this.loggNu('du', `Du väljer ${namn}`);
    this.fas('framkalla', id);
    this.loggNu('mat', 'Kortet framkallas, 300 ms');
  }

  /* ── scenerna ── */
  utspel() { this.spelaUt('anthem', BAS.anthem.hem, false); }
  utanNamn() { this.spelaUt('okand', BAS.okand.hem, true); }
  zoom() { this.spelaUt('anthem', PUNKT.zoom, false); }
  tackt() {
    this.spelaUt('anthem', PUNKT.tackt, false);
    this.logg(650, 'kam', 'Llanowar Elves syns inte längre, men ett kort ligger över platsen');
    this.logg(650, 'mat', 'Llanowar Elves ligger kvar orört: täckt är inte borta');
  }
  flytt() {
    const L = BAS.llanowar.hem, S = BAS.serra.hem, M = PUNKT.flytt;
    this.handIn('h2', this.over(S), 0, 500);
    this.handIn('h1', this.over(L), 300, 600);
    this.lyft('llanowar', 900, true);
    this.handTill('h1', this.over(M), 1000, 800, 'INOUT'); this.fysTill('llanowar', M, 1000, 800, 'INOUT');
    this.lyft('llanowar', 1800, false);
    this.handUt('h1', 1900); this.handUt('h2', 3000, 500);
    this.logg(0, 'du', 'Ena handen vilar över Serra Angel');
    this.logg(900, 'du', 'Du lyfter Llanowar Elves med den andra');
    this.logg(1800, 'du', 'Du lägger ned den på en ny plats');
    this.logg(500, 'kam', 'Serra Angel skymd → fryst');
    this.logg(900, 'kam', 'Llanowar Elves skymd → fryst');
    this.logg(1100, 'kam', 'Något bärs över bordet → inga slutsatser');
    this.logg(1800 + VILA, 'kam', 'Ett kort vilar på ny plats, och Llanowar Elves plats är tom → samma kort');
    this.at(1800 + VILA, () => { this.fas('flytt', 'llanowar', { mal: M }); this.loggNu('mat', 'Llanowar Elves bärs dit, 450 ms. Handen över Serra Angel spelar ingen roll'); });
    this.logg(1800 + VILA + Math.max(300, this.opt.namnMs()), 'kam', 'Namnet bekräftar Llanowar Elves');
    this.logg(3500 + HANDBORT, 'kam', 'Handen borta från Serra Angel: den ligger kvar');
    this.logg(3500 + HANDBORT, 'mat', 'Ingenting ändras');
  }
  hand() {
    const p = [519, 124];
    this.handIn('h1', p, 0, 500);
    this.handTill('h1', [559, 134], 900, 400); this.handTill('h1', p, 1300, 400);
    this.handUt('h1', 2200);
    this.logg(0, 'du', 'Handen vilar över Llanowar Elves och Serra Angel');
    this.logg(500, 'kam', 'Båda skymda → fryst');
    this.logg(500, 'mat', 'Ingenting ändras: inga "Moving…", inga grå kort');
    this.logg(2650 + HANDBORT, 'kam', 'Handen borta: båda ligger kvar');
    this.logg(2650 + HANDBORT, 'mat', 'Ingenting ändras');
  }
  tillHanden() {
    const W = BAS.woodelves.hem, ner = [W[0], CH + 150];
    this.handIn('h1', this.over(W), 0, 500);
    this.lyft('woodelves', 550, true);
    this.handTill('h1', this.over(ner), 650, 700, 'IN'); this.fysTill('woodelves', ner, 650, 700, 'IN');
    this.till(this.m.o.h1, 'o', 0, 1350, 0);
    this.logg(0, 'du', 'Du tar upp Wood Elves');
    this.logg(650, 'du', 'Du bär den till handen');
    this.logg(500, 'kam', 'Wood Elves skymd → fryst');
    this.logg(700, 'kam', 'Något bärs → inga slutsatser');
    const nar = 1350 + HANDBORT;
    this.logg(nar, 'kam', 'Händerna borta. Platsen syns och är tom, och graveyard växte inte');
    this.at(nar, () => { this.fas('tillHanden', 'woodelves'); this.loggNu('mat', 'Wood Elves glider ut genom nederkanten, 450 ms'); });
    this.at(nar + 450, () => this.visaRad('woodelves'));
  }
  visaRad(id) {
    const tok = ++this.radTok;
    this.opt.rad({ visa: true, id, namn: BAS[id].namn, txt: 'went to your hand', val: true });
    const r = this.m.o.rad; r.v.p = 1; this.m.mala(r);
    this.m.till(r, 'p', 0, this.m.nu(), 6000, 'LIN');
    this.loggNu('mat', 'Raden vid nederkanten i 6 s: Exile · Still on the table · Library');
    this.m.senare(this.m.nu() + 6000, () => {
      if (tok !== this.radTok) return;
      this.opt.rad({ visa: false });
      this.loggNu('mat', 'Inget val på 6 s → handen står fast');
    });
  }
  radVal(val) {
    const tok = ++this.radTok, id = 'woodelves', namn = BAS[id].namn;
    this.m.glom(this.m.o.rad);
    this.m.o.rad.v.p = 0; this.m.mala(this.m.o.rad);
    const k = this.mat(id).v;
    if (val === 'exile') { this.opt.rad({ visa: true, namn, txt: 'went to exile', val: false }); this.loggNu('du', 'Du väljer Exile'); this.loggNu('mat', `${namn} → exile`); }
    if (val === 'kvar') { this.opt.rad({ visa: true, namn, txt: 'is back on the table', val: false }); this.loggNu('du', 'Du väljer Still on the table'); this.fas('tillbaka', id, { ut: [k.x, k.y] }); this.loggNu('mat', `${namn} flyger tillbaka till sin plats, 450 ms`); }
    if (val === 'bib') { this.opt.rad({ visa: true, namn, txt: 'went to your library', val: false }); this.loggNu('du', 'Du väljer Library'); this.fas('tillBib', id, { ut: [k.x, k.y] }); this.loggNu('mat', `${namn} glider till library-högen, 450 ms`); }
    this.m.senare(this.m.nu() + 1800, () => { if (tok === this.radTok) this.opt.rad({ visa: false }); });
    this.m.igang();
  }
  grav() {
    const W = BAS.woodelves.hem;
    this.handIn('h1', this.over(W), 0, 500);
    this.lyft('woodelves', 550, true);
    this.handTill('h1', this.over(FHOG), 650, 650, 'INOUT'); this.fysTill('woodelves', FHOG, 650, 650, 'INOUT');
    this.lyft('woodelves', 1300, false);
    this.handUt('h1', 1400);
    this.logg(0, 'du', 'Du tar Wood Elves');
    this.logg(1300, 'du', 'Du lägger den på graveyard-högen');
    this.logg(500, 'kam', 'Wood Elves skymd → fryst');
    this.logg(1300 + VILA, 'kam', 'Graveyard-högen (du har svarat Yes) växte 2 → 3, och platsen där Wood Elves låg är tom');
    this.at(1300 + VILA, () => { this.fas('grav', 'woodelves'); this.loggNu('mat', 'Wood Elves flyger till högen och landar som toppkort, 400 ms'); });
  }
  tappa() {
    const ord = [['plains1', 450], ['forest1', 1050], ['plains2', 1500]];
    this.handIn('h1', this.over(BAS.plains1.hem), 0, 450);
    this.handTill('h1', this.over(BAS.forest1.hem), 700, 300, 'INOUT');
    this.handTill('h1', this.over(BAS.plains2.hem), 1250, 200, 'INOUT');
    this.handUt('h1', 1750);
    let fore = null;
    for (const [id, t] of ord) {
      this.fysVrid(id, 90, t);
      this.logg(t, 'du', `Du tappar ${BAS[id].namn}` + (fore != null ? ` (${sek(t - fore)} efter)` : ''));
      const saker = t + 250 + TAPSAKER;
      this.logg(saker, 'kam', `${BAS[id].namn}: säkert tappat`);
      this.at(saker, () => { this.fas('tap', id); this.loggNu('mat', `${BAS[id].namn} vrids, 240 ms`); });
      fore = t;
    }
  }
  untap() {
    for (const id of LAND) { this.fys(id).v.r = 90; this.mat(id).v.r = 90; this.mat(id).v.tappad = true; this.m.mala(this.fys(id)); this.m.mala(this.mat(id)); }
    /* Svepet går från höger. Varje land syns för kameran så fort handen gått
       vidare från det, och vrids då — också mitt i svepet (Jesper 2026-10-06).
       Bara kort som är skymda samtidigt kommer på en gång. */
    const ord = ['plains2', 'plains1', 'forest2', 'forest1'], steg = 150, forst = 420;
    this.handIn('h1', this.over(BAS.plains2.hem), 0, 400);
    ord.forEach((id, i) => {
      const t = forst + steg * i;
      if (i) this.handTill('h1', this.over(BAS[id].hem), t - steg, steg, 'INOUT');
      this.fysVrid(id, 0, t);
    });
    const sist = forst + steg * (ord.length - 1);
    this.handUt('h1', sist + 130);
    this.logg(0, 'du', 'Du untappar alla land i ett svep, från höger');
    ord.forEach((id, i) => {
      const fri = i < ord.length - 1 ? forst + steg * (i + 1) : sist + 130 + 150;   // när handen lämnat landet
      const saker = fri + TAPSAKER;
      this.logg(saker, 'kam', `${BAS[id].namn}: handen har gått vidare → säkert otappat`);
      this.at(saker, () => { this.fas('untap', id); this.loggNu('mat', `${BAS[id].namn} vrids, 240 ms`); });
    });
  }
  knuff() {
    const S = BAS.serra.hem, a = [S[0] + 12, S[1]], b = [S[0] + 24, S[1] + 80], h = [S[0] - 16, S[1] + 164];
    this.handIn('h1', h, 0, 450);
    this.fysTill('serra', a, 500, 200); this.handTill('h1', [h[0] + 12, h[1]], 500, 200);
    this.fysTill('serra', b, 1200, 250); this.handTill('h1', [h[0] + 24, h[1] + 80], 1200, 250);
    this.handUt('h1', 1550);
    this.logg(500, 'du', 'Du rättar till Serra Angel lite');
    this.logg(700 + VILA, 'kam', 'Serra Angel flyttad 12 px: under dödzonen (27 px, 15 % av kortet)');
    this.logg(700 + VILA, 'mat', 'Ingenting ändras');
    this.logg(1200, 'du', 'Du skjuter den en bit');
    this.logg(1450 + VILA, 'kam', 'Serra Angel flyttad 83 px');
    this.at(1450 + VILA, () => { this.fas('knuff', 'serra', { mal: b }); this.loggNu('mat', 'Serra Angel glider dit, 220 ms'); });
  }
}

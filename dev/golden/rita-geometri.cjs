/* Geometrin i ritverktyget för facit (MES-286). Mätverktyg, inte appkod.

   Samma fil läses av rita.html (som <script>) och av node (rita-kontroll.cjs,
   rita-prov.cjs), så att det som räknas fram när Jesper ritar är exakt det
   kontrollen räknar om. Inget annat än hörnen och ordningen går in; allt
   framräknat går att göra om ur dem.

   Ett kort är fyra hörn i andelar av bilden, MEDSOLS FRÅN NAMNRADENS BÖRJAN:
   0 = övre vänstra hörnet i läsriktningen, 1 = övre högra (namnradens slut),
   2 = nedre högra, 3 = nedre vänstra. Kortet är 63 × 88 mm, så två klick på
   de övre hörnen räcker: resten räknas ut, också det som ligger under ett
   annat kort. z är ordningen — högre z ligger överst.

   Geometrin räknas i bildens pixlar (andelen × bredd/höjd), annars blir ett
   kort i en 16:9-bild snett. Därför bär varje ritning bildens bredd och höjd.

   Framräknat per kort (raknaKort):
     synlig   andelen av kortet som syns: inne i bilden och inte under ett
              kort med högre z
     namnrad  andelen av namnraden som syns, på samma sätt
     dold     namnrad < 0,5 — mindre än halva namnraden syns (Jespers beslut)
     tappad   namnraden står mer än 45° från grundläget
     avskuret mer än 2 % av kortet ligger utanför bilden
     x y w h  lådan runt kortets synliga del, i andelar (det golden mäter
              plats och tap-läge mot)
     hog      bokstaven för högen kortet ligger i: kort som ligger omlott
              utan att vara fästa. null = ingen hög
   fast (vilket kort ett equipment eller en aura är fäst vid) räknas INTE
   fram — det föreslås (fastForslag) och bekräftas av den som ritar.

   Körs som <script> hamnar allt på window.RitaGeo; i node är det
   module.exports. .cjs eftersom package.json säger "type": "module". */
(function (rot) {
'use strict';

const KORT_B = 63, KORT_H = 88, KVOT = KORT_H / KORT_B;
/* Namnraden i mm från kortets övre vänstra hörn i läsriktningen: titelrutan
   på ett kort med dagens ram (M15), från svarta kanten till manakostnadens
   slut. Ett basland har samma ruta. */
const NAMNRAD = { x0: 4, x1: 59, y0: 3.5, y1: 9.5 };
const PROV_MM = 1;           // provpunkternas täthet över hela kortet (63 × 88 punkter)
const PROV_NAMN_MM = 0.25;   // tätare i namnraden (220 × 24 punkter)
const DOLD_UNDER = 0.5;      // Jespers beslut: dold när mindre än halva namnraden syns
const TAPP_GRANS = 45;       // grader från grundläget
const AVSKUREN_OVER = 0.02;  // andel av kortet utanför bilden innan det räknas som avskuret
const OVERLAPP_MIN = 0.03;   // andel av det minsta kortets yta: under det är två kort bara kant i kant
const AB = [[0, 0], [1, 0], [1, 1], [0, 1]];   // hörnens läge längs namnraden (a) och nedåt (b)

const runda = (v, n = 4) => { const f = 10 ** n; return Math.round(v * f) / f; };

/* ── Kortnamnen ─────────────────────────────────────────────────────────
   Tre sorters namn: lekens (ur lek.txt), "token <typ>" och "baksida". Bara
   lekens kort hör hemma i facits kort[] — det är dem kor.html räknar. */
const arToken = n => /^token\s+\S/i.test(String(n || '').trim());
const arBaksida = n => /^baksida$/i.test(String(n || '').trim());
const arLekkort = n => !!String(n || '').trim() && !arToken(n) && !arBaksida(n);
/* typAv: 'equipment' | 'aura' | 'creature' | 'land' | 'token' | 'baksida' | 'annat' | null
   (null = typen okänd: namnet saknas i typfilen). */
function typAv(namn, typer) {
  const n = String(namn || '').trim();
  if (!n) return null;
  if (arToken(n)) return 'token';
  if (arBaksida(n)) return 'baksida';
  const rad = typer && typer[n];
  if (!rad) return null;
  if (/\bEquipment\b/.test(rad)) return 'equipment';
  if (/\bAura\b/.test(rad)) return 'aura';
  if (/\bCreature\b/.test(rad)) return 'creature';
  if (/\bLand\b/.test(rad)) return 'land';
  return 'annat';
}
const kanFastas = t => t === 'equipment' || t === 'aura';
const kanBaraFast = t => t === 'creature' || t === 'token';

/* ── Hörnen ─────────────────────────────────────────────────────────────── */
const tillPx = (h, W, H) => h.map(([x, y]) => [x * W, y * H]);
const tillAndel = (p, W, H) => p.map(([x, y]) => [x / W, y / H]);

/* Fyra hörn ur namnradens början p0 och u (namnradens riktning och längd), i px. */
function hornPx(p0x, p0y, ux, uy) {
  const dx = -uy * KVOT, dy = ux * KVOT;
  return [[p0x, p0y], [p0x + ux, p0y + uy], [p0x + ux + dx, p0y + uy + dy], [p0x + dx, p0y + dy]];
}
/* Två klick: namnradens början och slut (andelar) → fyra hörn (andelar). */
function hornUrTva(p0, p1, W, H) {
  return tillAndel(hornPx(p0[0] * W, p0[1] * H, (p1[0] - p0[0]) * W, (p1[1] - p0[1]) * H), W, H);
}
/* Ett hörn dras: hörn i hamnar i pi medan hörn j står kvar i pj (andelar).
   Med j diagonalt mitt emot bestämmer de två punkterna både vinkel och
   storlek. langd (px, valfri) låser namnradens längd — då vrids kortet bara. */
function hornUrPar(i, pi, j, pj, W, H, langd) {
  const [ai, bi] = AB[i], [aj, bj] = AB[j], da = ai - aj, c = (bi - bj) * KVOT;
  const vx = (pi[0] - pj[0]) * W, vy = (pi[1] - pj[1]) * H;
  const det = da * da + c * c;
  if (!det || (!vx && !vy)) return null;
  let ux = (da * vx + c * vy) / det, uy = (-c * vx + da * vy) / det;
  if (langd) { const l = Math.hypot(ux, uy); if (l) { ux *= langd / l; uy *= langd / l; } }
  const cj = bj * KVOT;
  return tillAndel(hornPx(pj[0] * W - aj * ux + cj * uy, pj[1] * H - aj * uy - cj * ux, ux, uy), W, H);
}
function flytta(h, dx, dy) { return h.map(([x, y]) => [x + dx, y + dy]); }
function mitt(h) { return [(h[0][0] + h[2][0]) / 2, (h[0][1] + h[2][1]) / 2]; }
/* Vrid runt mitten, grader medsols (y nedåt i bilden). */
function vrid(h, grader, W, H) {
  const [mx, my] = mitt(h), r = grader * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return h.map(([x, y]) => { const px = (x - mx) * W, py = (y - my) * H; return [mx + (px * c - py * s) / W, my + (px * s + py * c) / H]; });
}
/* Namnradens längd i px: kortets bredd. */
function bredd(h, W, H) { return Math.hypot((h[1][0] - h[0][0]) * W, (h[1][1] - h[0][1]) * H); }
/* Namnradens riktning i grader, 0 = läses från vänster till höger, 90 = uppifrån och ner. */
function vinkel(h, W, H) {
  const v = Math.atan2((h[1][1] - h[0][1]) * H, (h[1][0] - h[0][0]) * W) * 180 / Math.PI;
  return (v + 360) % 360;
}
/* grund: 'v' = ett otappat kort står lodrätt i bilden (namnraden vågrät), 'h' = det ligger vågrätt. */
function arTappad(h, W, H, grund) {
  const v = ((vinkel(h, W, H) - (grund === 'h' ? 90 : 0)) % 180 + 180) % 180;
  return Math.min(v, 180 - v) > TAPP_GRANS;
}
const rundaHorn = h => h.map(([x, y]) => [runda(x), runda(y)]);

/* ── Polygoner ──────────────────────────────────────────────────────────── */
function lada(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
const ladorMots = (a, b) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
function yta(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; }
/* Punkten i en konvex fyrhörning, oavsett varv. */
function iPolygon(p, x, y) {
  let pos = false, neg = false;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    const c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    if (c > 0) pos = true; else if (c < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}
/* Två konvexa polygoners gemensamma yta (Sutherland–Hodgman). */
function snittYta(a, b) {
  const tecken = yta(b) >= 0 ? 1 : -1;
  let ut = a;
  for (let i = 0; i < b.length && ut.length; i++) {
    const [ax, ay] = b[i], [bx, by] = b[(i + 1) % b.length];
    const inne = ([x, y]) => tecken * ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) >= 0;
    const skar = ([x1, y1], [x2, y2]) => {
      const d1 = (bx - ax) * (y1 - ay) - (by - ay) * (x1 - ax), d2 = (bx - ax) * (y2 - ay) - (by - ay) * (x2 - ax);
      const t = d1 / (d1 - d2);
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    };
    const in_ = ut; ut = [];
    for (let k = 0; k < in_.length; k++) {
      const p = in_[k], q = in_[(k + 1) % in_.length];
      if (inne(q)) { if (!inne(p)) ut.push(skar(p, q)); ut.push(q); }
      else if (inne(p)) ut.push(skar(p, q));
    }
  }
  return ut.length >= 3 ? Math.abs(yta(ut)) : 0;
}
/* Hur mycket två kort ligger omlott, som andel av det minsta kortets yta. */
function overlapp(ha, hb, W, H) {
  const a = tillPx(ha, W, H), b = tillPx(hb, W, H);
  if (!ladorMots(lada(a), lada(b))) return 0;
  const m = Math.min(Math.abs(yta(a)), Math.abs(yta(b)));
  return m ? snittYta(a, b) / m : 0;
}

/* ── Synligheten ────────────────────────────────────────────────────────
   Provpunkter i kortets eget rutnät (mm), räknade i bildens pixlar: en punkt
   syns om den ligger inne i bilden och inte i något kort med högre z. Ett
   rutnät i stället för exakt polygonklippning — det är deterministiskt,
   samma i webbläsaren och i node, och en millimeter räcker gott. */
function synlighet(kort, i, W, H) {
  const k = kort[i], q = tillPx(k.horn, W, H), bq = lada(q);
  const over = [];
  for (const o of kort) {
    if (o === k || !(o.z > k.z)) continue;
    const p = tillPx(o.horn, W, H), b = lada(p);
    if (ladorMots(b, bq)) over.push({ p, b });
  }
  const [p0x, p0y] = q[0], ux = q[1][0] - p0x, uy = q[1][1] - p0y, dx = q[3][0] - p0x, dy = q[3][1] - p0y;
  const tackt = (x, y) => over.some(o => x >= o.b.x0 && x <= o.b.x1 && y >= o.b.y0 && y <= o.b.y1 && iPolygon(o.p, x, y));
  const ute = (x, y) => x < 0 || y < 0 || x > W || y > H;
  const ns = Math.round(KORT_B / PROV_MM), nt = Math.round(KORT_H / PROV_MM);
  let syns = 0, utanfor = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, sx = 0, sy = 0;
  for (let a = 0; a < ns; a++) for (let b = 0; b < nt; b++) {
    const s = (a + 0.5) / ns, t = (b + 0.5) / nt, x = p0x + s * ux + t * dx, y = p0y + s * uy + t * dy;
    if (ute(x, y)) { utanfor++; continue; }
    if (tackt(x, y)) continue;
    syns++; sx += x; sy += y;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const nx = Math.round((NAMNRAD.x1 - NAMNRAD.x0) / PROV_NAMN_MM), ny = Math.round((NAMNRAD.y1 - NAMNRAD.y0) / PROV_NAMN_MM);
  let namn = 0, nsx = 0, nsy = 0;
  for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
    const s = (NAMNRAD.x0 + (a + 0.5) * PROV_NAMN_MM) / KORT_B, t = (NAMNRAD.y0 + (b + 0.5) * PROV_NAMN_MM) / KORT_H;
    const x = p0x + s * ux + t * dx, y = p0y + s * uy + t * dy;
    if (!ute(x, y) && !tackt(x, y)) { namn++; nsx += x; nsy += y; }
  }
  const alla = ns * nt;
  /* Lådan: helt synligt kort = polygonens egen låda; annars provpunkternas
     låda, utökad med en halv provcell åt varje håll men aldrig utanför
     kortets egen låda. Klämd till bilden. */
  let bx;
  if (!syns) bx = null;
  else if (syns === alla) bx = { x0: bq.x0, y0: bq.y0, x1: bq.x1, y1: bq.y1 };
  else {
    const halv = 0.5 * Math.hypot(ux, uy) / ns;
    bx = { x0: Math.max(bq.x0, x0 - halv), y0: Math.max(bq.y0, y0 - halv), x1: Math.min(bq.x1, x1 + halv), y1: Math.min(bq.y1, y1 + halv) };
  }
  if (bx) bx = { x0: Math.max(0, bx.x0), y0: Math.max(0, bx.y0), x1: Math.min(W, bx.x1), y1: Math.min(H, bx.y1) };
  /* Var en etikett ska stå: mitt i det synliga av namnraden om hälften syns,
     annars i tyngdpunkten av det synliga (px). Står inte i filerna. */
  const etikett = namn >= 0.5 * nx * ny ? [nsx / namn, nsy / namn] : syns ? [sx / syns, sy / syns] : null;
  return { synlig: syns / alla, namnrad: namn / (nx * ny), utanfor: utanfor / alla, lada: bx, etikett };
}

/* ── Högar ───────────────────────────────────────────────────────────────
   Kort som ligger omlott (minst OVERLAPP_MIN) och inte är fästa vid
   varandra hänger ihop; en klump med två kort eller fler är en hög. Kort i
   en zon (graveyard, library) och baksidor räknas inte — de ligger inte i
   spel. Bokstaven: samma som klumpens kort hade i läget före (flest röster),
   annars nästa bokstav som aldrig använts — en hög behåller sin bokstav hela
   filmen, som i händelsefacit. Utan läget före delas bokstäverna ut i
   ordningen efter klumpens understa kort. */
const iSpel = k => !k.zon && !arBaksida(k.namn);
function bokstav(n) { let s = ''; n++; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }
function hogar(kort, W, H, tidigare = {}, anvanda = []) {
  const idx = kort.map((k, i) => i).filter(i => iSpel(kort[i]));
  const far = new Map(idx.map(i => [i, i]));
  const rot_ = i => { while (far.get(i) !== i) { far.set(i, far.get(far.get(i))); i = far.get(i); } return i; };
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
    const ka = kort[idx[a]], kb = kort[idx[b]];
    if ((ka.fast != null && ka.fast === kb.id) || (kb.fast != null && kb.fast === ka.id)) continue;
    if (overlapp(ka.horn, kb.horn, W, H) >= OVERLAPP_MIN) far.set(rot_(idx[a]), rot_(idx[b]));
  }
  const klumpar = new Map();
  for (const i of idx) { const r = rot_(i); if (!klumpar.has(r)) klumpar.set(r, []); klumpar.get(r).push(i); }
  const lista = [...klumpar.values()].filter(g => g.length >= 2)
    .sort((a, b) => Math.min(...a.map(i => kort[i].z)) - Math.min(...b.map(i => kort[i].z)));
  const tagna = new Set(anvanda), iLaget = new Set(), ut = {};
  const nasta = () => { let n = 0; while (tagna.has(bokstav(n)) || iLaget.has(bokstav(n))) n++; return bokstav(n); };
  for (const g of lista) {
    const roster = {};
    for (const i of g) { const b = tidigare[kort[i].id]; if (b) roster[b] = (roster[b] || 0) + 1; }
    const arv = Object.keys(roster).filter(b => !iLaget.has(b)).sort((a, b) => roster[b] - roster[a] || (a < b ? -1 : 1))[0];
    const b = arv || nasta();
    iLaget.add(b);
    for (const i of g) ut[kort[i].id] = b;
  }
  return ut;
}

/* ── Fäst ─────────────────────────────────────────────────────────────────
   Ett equipment eller en aura som ligger omlott med en varelse eller en
   token föreslås som fäst vid den som täcker mest. Förslaget bekräftas av
   den som ritar (tangenten F); i passet 2026-09-22 tas det ur händelsefacits
   kolumn till. */
function fastForslag(kort, W, H, typer) {
  const ut = {};
  for (const k of kort) {
    if (k.fast != null || k.zon || !kanFastas(typAv(k.namn, typer))) continue;
    let bast = null, bastV = 0;
    for (const o of kort) {
      if (o === k || o.zon || !kanBaraFast(typAv(o.namn, typer))) continue;
      const v = overlapp(k.horn, o.horn, W, H);
      if (v >= OVERLAPP_MIN && v > bastV) { bast = o; bastV = v; }
    }
    if (bast) ut[k.id] = bast.id;
  }
  return ut;
}

/* ── Allt framräknat för en bild ─────────────────────────────────────────
   kort: [{ id, namn, horn, z, fast?, zon? }]; W, H: bildens storlek i px;
   grund: 'v' | 'h'. tidigare/anvanda: högbokstäverna i läget före (video).
   Svaret per id: fälten som står i filen, avrundade som där. */
function raknaKort(kort, { W, H, grund = 'v', tidigare = {}, anvanda = [] }) {
  const hog = hogar(kort, W, H, tidigare, anvanda);
  const ut = {};
  kort.forEach((k, i) => {
    const s = synlighet(kort, i, W, H);
    ut[k.id] = {
      synlig: runda(s.synlig, 2),
      namnrad: runda(s.namnrad, 2),
      dold: s.namnrad < DOLD_UNDER,
      tappad: arTappad(k.horn, W, H, grund),
      avskuret: s.utanfor > AVSKUREN_OVER,
      x: s.lada ? runda(s.lada.x0 / W) : null,
      y: s.lada ? runda(s.lada.y0 / H) : null,
      w: s.lada ? runda((s.lada.x1 - s.lada.x0) / W) : null,
      h: s.lada ? runda((s.lada.y1 - s.lada.y0) / H) : null,
      hog: hog[k.id] || null,
      etikett: s.etikett ? [s.etikett[0] / W, s.etikett[1] / H] : null,   // bara för ritverktyget
    };
  });
  return ut;
}

/* Fäst som inte håller: värden finns inte, eller korten ligger inte omlott. */
function fastFel(kort, W, H) {
  const fel = [];
  for (const k of kort) {
    if (k.fast == null) continue;
    const v = kort.find(o => o.id === k.fast);
    if (!v) fel.push({ id: k.id, namn: k.namn, fel: `fäst vid id ${k.fast}, som inte finns` });
    else if (v === k) fel.push({ id: k.id, namn: k.namn, fel: 'fäst vid sig självt' });
    else if (overlapp(k.horn, v.horn, W, H) < OVERLAPP_MIN) fel.push({ id: k.id, namn: k.namn, fel: `fäst vid ${v.namn} men ligger inte omlott med det` });
  }
  return fel;
}

/* ── Filformatet ──────────────────────────────────────────────────────────
   Ett kort per rad, som markera.html skriver facit: JSON.stringify(…, 2)
   hade brett ut varje kort över tjugo rader och gjort en diff oläslig.
   Varje del görs ändå med JSON.stringify, så att filen alltid går att läsa. */
const primitiv = v => v === null || typeof v !== 'object';
const platt = v => primitiv(v) || (Array.isArray(v) && v.every(e => primitiv(e) || (Array.isArray(e) && e.every(primitiv))));
const kompakt = v => Array.isArray(v) ? JSON.stringify(v)
  : '{ ' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + (primitiv(x) || platt(x) ? JSON.stringify(x) : kompakt(x))).join(', ') + ' }';
function formatera(v, ind = '') {
  if (primitiv(v)) return JSON.stringify(v);
  const varden = Array.isArray(v) ? v : Object.values(v);
  if (Array.isArray(v) && v.length && v.every(e => e && typeof e === 'object' && !Array.isArray(e) && Object.values(e).every(platt)))
    return '[\n' + v.map(e => ind + '  ' + kompakt(e)).join(',\n') + '\n' + ind + ']';
  if (varden.every(platt) && !varden.some(x => typeof x === 'string' && x.length > 60) && kompakt(v).length + ind.length <= 100) return kompakt(v);
  if (Array.isArray(v)) return v.length ? '[\n' + v.map(e => ind + '  ' + formatera(e, ind + '  ')).join(',\n') + '\n' + ind + ']' : '[]';
  const n = Object.keys(v);
  return n.length ? '{\n' + n.map(k => ind + '  ' + JSON.stringify(k) + ': ' + formatera(v[k], ind + '  ')).join(',\n') + '\n' + ind + '}' : '{}';
}

const G = {
  KORT_B, KORT_H, KVOT, NAMNRAD, DOLD_UNDER, TAPP_GRANS, AVSKUREN_OVER, OVERLAPP_MIN,
  runda, rundaHorn, arToken, arBaksida, arLekkort, typAv, kanFastas, kanBaraFast,
  tillPx, tillAndel, hornUrTva, hornUrPar, flytta, mitt, vrid, bredd, vinkel, arTappad,
  lada, iPolygon, snittYta, overlapp, synlighet, hogar, bokstav, fastForslag, raknaKort, fastFel,
  formatera,
};
if (typeof module === 'object' && module.exports) module.exports = G; else rot.RitaGeo = G;
})(typeof window !== 'undefined' ? window : this);

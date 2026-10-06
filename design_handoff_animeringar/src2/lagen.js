/* ── Alla lägen: varje händelse som stillbilder ──────────────────────
   Varje ruta körs genom samma motor och samma SPEC som prototypen, utan
   skärm, och bilderna tas vid de tider som står under dem. Ingenting rör
   sig på den här artboarden. */
const SC_BANA = 414 / 920;                  // hela mattan i rutan
const SC_REMSA = .44;                       // ett kort i en ruta i remsan
const CELLER = [
  { id: 'utspel', fas: 'namn', typ: 'remsa', tider: [60, 160, 260, 400], rub: 'Utspel', forst: 'Kortet spelades just ut', fore: 'Före: ingenting, 0,3–2 s (upp till 5 s)' },
  { id: 'knuff', fas: 'knuff', typ: 'remsa', tider: [0, 60, 120, 220], rub: 'Knuff', forst: 'Kortet sköts en bit', fore: 'Kameran har kortet hela tiden' },
  { id: 'flytt', fas: 'flytt', typ: 'bana', tider: [80, 160, 240, 320], rub: 'Flytt', forst: 'Samma kort, på en ny plats', fore: 'Före: står kvar orört i 1–5 s' },
  { id: 'avbrott', fas: 'flytt', typ: 'bana', tider: [70, 140, 210, 280, 350, 420], rub: 'Flytt, avbruten', forst: 'Tar ny riktning utan att börja om', fore: 'Ny rapport vid 210 ms: längre bort, tappat' },
  { id: 'tappat', fas: 'nedtonad', typ: 'remsa', tider: [0, 160, 320, 480], rub: 'Nedtonat', forst: 'Kameran ser inte kortet', fore: 'Före: står kvar orört i 5 s' },
  { id: 'tillbaka', fas: 'tillbaka', typ: 'remsa', tider: [0, 90, 180, 300], rub: 'Tillbaka', forst: 'Kortet är tillbaka', fore: 'Före: nedtonat' },
  { id: 'tillbakaNy', fas: 'tillbakaNy', typ: 'bana', tider: [80, 160, 240, 320], rub: 'Tillbaka, ny plats', forst: 'Kortet är tillbaka, på en ny plats', fore: 'Före: nedtonat' },
  { id: 'grav', fas: 'grav', typ: 'bana', tider: [80, 160, 240, 320], rub: 'Till graveyard', forst: 'Kortet lämnade bordet', fore: 'Före: står kvar orört tills högen växer' },
  { id: 'tap', fas: 'tap', typ: 'remsa', tider: [0, 80, 160, 240], rub: 'Tap', forst: 'Kortet användes', fore: 'Bara när kameran är säker' },
];
const LAGER = ['sh', 'face', 'lost', 'ring', 'glow'];
const stilar = (v, extra) => {
  const s = kortStil(v, 0), ut = {};
  ut.el = stilText(Object.assign({}, s.el, extra || {}));
  for (const l of LAGER) ut[l] = stilText(s[l]);
  return ut;
};

/* Kör en händelse utan skärm och ta bilder vid tiderna. */
function simulera(c) {
  let gravN = 2;
  const m = new Motor(null, { fart: () => 1, huvuden() {}, huvudenIgang: () => false });
  m.igang = () => {};
  const b = new Bord(m, { minskad: () => false, namnMs: () => 1200, logga() {}, gravN: n => { gravN = n; } });
  const S = SCEN[c.id], kort = m.o[S.kort];
  b.kor(c.id);
  const f = b.faser(c.id).find(x => x.kind === c.fas || (c.fas === 'tap' && x.kind === 'untap'));
  const start = m.klocka + f.at;
  m.spola(start - 16);
  const fore = Object.assign({}, kort.v);
  const bilder = c.tider.map(t => { m.spola(start + t); return { t, v: Object.assign({}, kort.v) }; });
  m.spola(start + 1300);
  return { fore, bilder, efter: Object.assign({}, kort.v), alla: Object.fromEntries(Object.keys(BAS).map(id => [id, Object.assign({}, m.o[id].v)])), gravN, kortId: S.kort };
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.celler = CELLER.map(c => this.cell(c, simulera(c)));
  }
  cell(c, sim) {
    const ut = { rub: c.rub, forst: c.forst, fore: c.fore, bana: c.typ === 'bana', remsa: c.typ === 'remsa' };
    if (c.typ === 'remsa') {
      /* Varje bild: kortet kring rutans mitt, förskjutet som det rör sig. */
      const mx = c.id === 'knuff' ? (sim.fore.x + sim.efter.x) / 2 : sim.efter.x, my = c.id === 'knuff' ? (sim.fore.y + sim.efter.y) / 2 : sim.efter.y;
      ut.bilder = sim.bilder.map(({ t, v }) => {
        const w = Object.assign({}, v, { x: 0, y: 0, s: v.s * SC_REMSA });
        const dx = (v.x - mx) * SC_REMSA, dy = (v.y - my) * SC_REMSA;
        const s = kortStil(w, 0);
        s.el.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${v.r.toFixed(1)}deg) scale(${w.s.toFixed(3)})`;
        const st = { el: stilText(s.el) }; for (const l of LAGER) st[l] = stilText(s[l]);
        return { t: t + ' ms', st, bild: BILD[sim.kortId] };
      });
    } else {
      /* Hela mattan: alla kort där de hamnade, kortet som rörde sig som spöken
         längs vägen, en streckad ram där det låg och det hela där det landar. */
      const kort = sim.kortId;
      ut.kort = Object.keys(BAS).map(id => {
        const v = sim.alla[id];
        return { id, st: stilar(v), bild: BILD[id] };
      });
      ut.spoken = sim.bilder.map(({ v }) => ({ st: stilar(v, { opacity: .3, zIndex: 90, boxShadow: 'none' }), bild: BILD[kort] }));
      const f = sim.fore;
      ut.ram = `transform: translate(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px) rotate(${f.r}deg)`;
      ut.gravN = sim.gravN;
      ut.gravNy = c.id === 'grav';
      ut.hogSt = c.id === 'grav' ? 'opacity: 1' : 'opacity: 0';
      ut.efterTxt = c.id === 'grav' ? 'landar som högens toppkort vid 400 ms' : c.id === 'avbrott' ? 'landar tappat vid 530 ms' : 'landar vid 450 ms';
    }
    return ut;
  }
  renderVals() {
    return { rotRef: null, celler: this.celler };
  }
}

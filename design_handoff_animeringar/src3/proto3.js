/* ── Prototypen: bordet och mattan sida vid sida ──────────────────────
   Knapparna är vad spelaren gör vid bordet. Tweaks styr tempot, när namnet
   kommer, tröskeln för framkallningen, hur suddigt kamerans foto är, den
   gröna ringen och minskad rörelse. */
const TEMPO = { '1×': 1, '½×': .5, '¼×': .25 };
const NAMN_MS = { '0,3 s': 300, '1,2 s': 1200, '4 s': 4000 };
const TROSKEL_MS = { '0,3 s': 300, '0,5 s': 500, '0,8 s': 800 };
const SUDD = { 'Låg': 6, 'Mellan': 12, 'Hög': 20 };
const KOL = { du: 'du', kam: 'kam', mat: 'mat' };

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { sel: null, logg: [], gravN: 2, zoomTxt: '100 %', rad: { visa: false }, mark: { visa: false }, sok: { visa: false, q: '' } };
    this.rotRef = el => { this.rotEl = el; };
    this.korFn = {}; for (const id in SCEN) this.korFn[id] = () => this.kor(id);
    this.spelaIgen = () => { if (this.state.sel) this.kor(this.state.sel); };
    this.aterstall = () => { if (this.b) { this.b.aterstall(); this.setState({ sel: null, logg: [], sok: { visa: false, q: '' } }); } };
    this.radExile = () => this.b && this.b.radVal('exile');
    this.radKvar = () => this.b && this.b.radVal('kvar');
    this.radBib = () => this.b && this.b.radVal('bib');
    this.markKlick = () => this.setState({ sok: { visa: true, q: '' } });
    this.sokSkriv = e => this.setState({ sok: { visa: true, q: e && e.target ? e.target.value : '' } });
    this.sokStang = () => this.setState({ sok: { visa: false, q: '' } });
  }
  fart() { return TEMPO[this.props.tempo] || 1; }
  componentDidMount() {
    if (!this.rotEl) return;
    this.m = new Motor(this.rotEl, { fart: () => this.fart(), sudd: () => SUDD[this.props.sudd] || 12 });
    this.b = new Bord(this.m, {
      minskad: () => this.props.rorelse === 'Minskad',
      namnMs: () => NAMN_MS[this.props.namn] || 1200,
      troskel: () => TROSKEL_MS[this.props.troskel] || 500,
      ring: () => this.props.ring !== 'Av',
      logga: r => this.setState(s => ({ logg: s.logg.concat(r).slice(-11) })),
      rensaLogg: () => this.setState({ logg: [] }),
      gravN: n => this.setState({ gravN: n }),
      zoomTxt: t => this.setState({ zoomTxt: t }),
      rad: r => this.setState({ rad: r }),
      markera: mk => this.setState({ mark: mk, sok: { visa: false, q: '' } }),
    });
    this.b.aterstall();
  }
  componentDidUpdate(prev) {
    if (this.m && this.rotEl && this.m.rot !== this.rotEl) this.m.fastna(this.rotEl);
    if (this.m && prev && prev.sudd !== this.props.sudd) for (const k in this.m.o) if (this.m.o[k].typ === 'kort') this.m.mala(this.m.o[k]);
  }
  componentWillUnmount() { if (this.m) this.m.stopp(); }
  kor(id) { if (!this.b) return; this.setState({ sel: id, sok: { visa: false, q: '' } }); this.b.kor(id); }

  traffar() {
    const q = (this.state.sok.q || '').trim().toLowerCase();
    return LEKEN.filter(n => !q || n.toLowerCase().includes(q)).slice(0, 6).map(n => {
      const i = q ? n.toLowerCase().indexOf(q) : -1;
      return {
        a: i < 0 ? n : n.slice(0, i), b: i < 0 ? '' : n.slice(i, i + q.length), c: i < 0 ? '' : n.slice(i + q.length),
        valj: () => { const id = this.state.mark.id; this.setState({ sok: { visa: false, q: '' } }); if (this.b && id) this.b.namnGivet(id, n); },
      };
    });
  }

  renderVals() {
    const st = this.state, mk = st.mark, tr = this.traffar();
    const markX = mk.visa ? Math.max(70, Math.min(792 - 70, mk.x)) : 0;
    return {
      rotRef: this.rotRef,
      knappar: Object.keys(SCEN).map(id => ({ namn: SCEN[id].knapp, under: SCEN[id].under, cls: id === st.sel ? 'vald' : '', kor: this.korFn[id] })),
      spelaIgen: this.spelaIgen,
      aterstall: this.aterstall,
      logg: st.logg.map(r => ({ t: sek(Math.max(0, Math.round(r.t / 10) * 10)), du: r.kol === 'du' ? r.txt : '', kam: r.kol === 'kam' ? r.txt : '', mat: r.kol === 'mat' ? r.txt : '', cls: 'r-' + KOL[r.kol] })),
      loggTom: !st.logg.length,
      gravN: st.gravN,
      zoomTxt: st.zoomTxt,
      rad: Object.assign({ namn: '', txt: '', val: false }, st.rad, { exile: this.radExile, kvar: this.radKvar, bib: this.radBib }),
      mark: { visa: !!mk.visa && !st.sok.visa, stil: `left: ${markX.toFixed(0)}px; top: ${((mk.y || 0) - 34).toFixed(0)}px`, klick: this.markKlick },
      sok: {
        visa: !!mk.visa && st.sok.visa,
        /* Bredvid kortet, inte över det: till vänster om det får plats, annars till höger. */
        stil: `left: ${(mk.vanster >= 300 ? mk.vanster - 292 : Math.min(792 - 288, (mk.hoger || 0) + 12)).toFixed(0)}px; top: ${Math.max(8, Math.min(499 - 262, mk.topp || 0)).toFixed(0)}px`,
        q: st.sok.q, skriv: this.sokSkriv, stang: this.sokStang, traffar: tr, ingen: !tr.length,
      },
    };
  }
}

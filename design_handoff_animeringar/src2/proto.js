/* ── Prototypen: spela upp ett läge ──────────────────────────────────
   Tweaks (Tempo, Rörelse, Namnet efter) styr uppspelningen; knapparna i
   artboarden är händelserna. Tidslinjen under bordet är samma data som
   rörelsen. */
const TEMPO = { '1×': 1, '½×': .5, '¼×': .25 };
const NAMN_MS = { '0,5 s': 500, '1,2 s': 1200, '4 s': 4000 };

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { sel: 'flytt', logg: [], gravN: 2 };
    this.rotRef = el => { this.rotEl = el; };
    this.korFn = {}; for (const id in SCEN) this.korFn[id] = () => this.kor(id);
    this.hoppa = () => { if (this.m) this.m.hoppa(); };
    this.aterstall = () => { if (this.b) { this.b.aterstallAllt(); this.setState({ logg: [] }); this.huvuden(this.m.klocka); } };
  }
  fart() { return TEMPO[this.props.tempo] || 1; }
  minskad() { return this.props.rorelse === 'Minskad'; }
  namnMs() { return NAMN_MS[this.props.namn] || 1200; }
  componentDidMount() {
    if (!this.rotEl) return;
    this.m = new Motor(this.rotEl, { fart: () => this.fart(), huvuden: T => this.huvuden(T), huvudenIgang: T => this.huvudenIgang(T) });
    this.b = new Bord(this.m, {
      minskad: () => this.minskad(), namnMs: () => this.namnMs(),
      logga: (txt, t) => this.setState(s => ({ logg: s.logg.concat({ t: sek(Math.max(0, Math.round(t / 10) * 10)), txt }).slice(-6) })),
      gravN: n => this.setState({ gravN: n }),
    });
  }
  componentDidUpdate() { if (this.m && this.rotEl && this.m.rot !== this.rotEl) this.m.fastna(this.rotEl); }
  componentWillUnmount() { if (this.m) this.m.stopp(); }

  kor(id) {
    if (!this.b) return;
    const S = SCEN[id];
    this.b.kor(id);
    this.setState({ sel: id, logg: S.ingenSetup ? this.state.logg : [] });
  }
  spec() { return this.minskad() ? SPEC.R : SPEC.D; }
  faser(id) { return this.b ? this.b.faser(id) : new Bord({ o: { llanowar: { v: {} } } }, { namnMs: () => this.namnMs(), minskad: () => this.minskad() }).faser(id); }
  axlar(id) {
    const sp = this.spec();
    return this.faser(id).map(f => {
      const spar = (sp[f.kind] || []).filter(t => t[3] !== 'intern');
      const slut = spar.reduce((a, t) => Math.max(a, t[2][t[2].length - 1][0]), 0);
      return Math.max(500, Math.ceil((slut + 1) / 100) * 100);
    });
  }
  huvuden(T) {
    if (!this.rotEl) return;
    const el = this.rotEl.querySelectorAll('.tl-head');
    const lopp = this.b && this.b.lopp && this.b.lopp.id === this.state.sel ? this.b.lopp : null;
    const ax = lopp ? this.axlar(lopp.id) : [];
    el.forEach((h, i) => {
      const f = lopp && lopp.faser[i], d = f ? T - f.at : -1;
      if (!f || d < 0 || d > ax[i]) { h.style.opacity = 0; return; }
      h.style.opacity = 1;
      h.style.transform = `translateX(${(d / ax[i] * 380).toFixed(1)}px)`;
    });
  }
  huvudenIgang(T) {
    const l = this.b && this.b.lopp; if (!l) return false;
    const ax = this.axlar(l.id);
    return l.faser.some((f, i) => T - f.at <= ax[i] + 50);
  }

  tidslinje() {
    const id = this.state.sel, sp = this.spec(), faser = this.faser(id), ax = this.axlar(id);
    const visa = v => typeof v === 'number' ? tal(v) : { cur: 'nu', mal: 'nya platsen', in: 'platsen + 90 px', mal2: 'rättade platsen', hog: 'högen', hogS: 'högens storlek (' + tal(92 / (KW * Z)) + ')' }[v] || v;
    return faser.map((f, i) => {
      const A = ax[i];
      const spar = (sp[f.kind] || []).filter(t => t[3] !== 'intern');
      const steg = A <= 600 ? 100 : A <= 1000 ? 200 : 500;
      const ticks = [];
      for (let t = 0; t <= A; t += steg) ticks.push({ stil: `left: ${(t / A * 100).toFixed(2)}%`, txt: t === 0 ? '0 ms' : String(t) });
      const rader = spar.map(([malId, prop, k, flagga]) => {
        const bitar = [];
        if (k.length === 1) bitar.push({ cls: 'tl-d', stil: `left: ${(k[0][0] / A * 100).toFixed(2)}%` });
        for (let j = 0; j < k.length - 1; j++) {
          const a = k[j][0], b = k[j + 1][0];
          bitar.push({ cls: 'tl-b' + (k[j][2] === 'STEP' ? ' hopp' : ''), stil: `left: ${(a / A * 100).toFixed(2)}%; width: ${Math.max(.6, (b - a) / A * 100).toFixed(2)}%` });
          if (j > 0) bitar.push({ cls: 'tl-k', stil: `left: ${(a / A * 100).toFixed(2)}%` });
        }
        const grad = prop === 'r' ? '°' : '';
        const varden = k.map(x => visa(x[1]) + (typeof x[1] === 'number' ? grad : '')).join(' → ');
        const tid = k.length === 1 ? (k[0][0] ? 'vid ' + k[0][0] + ' ms' : 'direkt') : (k[0][0] ? k[0][0] + '–' : '') + k[k.length - 1][0] + ' ms';
        const eases = [...new Set(k.slice(0, -1).map(x => x[2] || 'LIN'))].join('/');
        const extra = f.kind === 'avbrott' && k[0][1] === 'cur' && ['pos', 's', 'r'].includes(prop) ? ' · farten tas med' : flagga === 'svag' ? ' · inte mitt i en flytt' : '';
        return { cls: 'm-' + malId, lbl: MAL[malId] + ' · ' + EGENSKAP[prop], bitar, txt: varden + ' · ' + tid + (k.length > 1 ? ' · ' + eases : '') + extra };
      });
      return { titel: FAS[f.kind], nar: (i === 0 ? 'vid ' : '+') + sek(f.at), ticks, rader, harRader: !!rader.length, tom: !rader.length, tomTxt: TOM[f.kind] || 'Ingenting rör sig.' };
    });
  }

  renderVals() {
    const st = this.state;
    return {
      rotRef: this.rotRef,
      knappar: Object.keys(SCEN).map(id => ({ namn: SCEN[id].knapp, under: SCEN[id].under, cls: id === st.sel ? 'vald' : '', kor: this.korFn[id] })),
      logg: st.logg,
      loggTom: !st.logg.length,
      gravN: st.gravN,
      tl: this.tidslinje(),
      tlTitel: SCEN[st.sel].knapp + (this.minskad() ? ' · minskad rörelse' : ''),
      hoppa: this.hoppa,
      aterstall: this.aterstall,
    };
  }
}

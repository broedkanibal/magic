/* Provhjälp för bordsvyn (MES-133). Appen laddar den aldrig: den hämtas från
   konsolen i förhandsvisningen (stub-servern) och körs med eval, som
   recepten i minnet "kamerans datorsida provas utan telefon":

     await fetch('/dev/bordsvy-prov.js').then(r => r.text()).then(eval)

   provBord(n)    spelläge utan server och n påhittade motståndare (0–8), med
                  kort på mattan, i graveyard och en lek. Mitt bord får fyra
                  kort om det är tomt.
   provFjarr(i)   en fjärrändring för motståndare i (sittordning, 0 = den
                  första): ett kort flyttas och tappas, som när hen spelar.

   Utan inloggning når skrivningarna aldrig servern (sparBord köar om), så
   "The others can't see your latest change" kan stå i foten. */
(() => {
  const NAMN = ['Sara', 'Erik', 'Linus', 'Maja', 'Olle', 'Nora', 'Ivar', 'Tove'];
  const FARG = ['#b782ff', '#6b8cff', '#57c785', '#e2606a', '#4fc3d9', '#f28cc0', '#c9b458', '#8fa3b8'];
  const LEKAR = [
    { namn: 'Izzet Phoenix', farger: ['U', 'R'], kort: ['Delver of Secrets', 'Arclight Phoenix', 'Island', 'Island', 'Mountain'], grav: ['Lightning Bolt'] },
    { namn: 'Boros Angels', farger: ['W', 'R'], kort: ['Serra Angel', 'Monastery Swiftspear', 'Glorious Anthem', 'Mountain', 'Mountain', 'Plains', 'Plains'], grav: ['Lightning Bolt', 'Lightning Bolt'] },
    { namn: 'Mono-Green Elves', farger: ['G'], kort: ['Llanowar Elves', 'Wood Elves', 'Forest', 'Forest', 'Forest'], grav: [] }
  ];
  const LAND = /^(Island|Mountain|Plains|Forest|Swamp)$/;
  const cid = () => 'prov' + Math.random().toString(36).slice(2, 10);
  function kortFor(lek) {
    let x = 40, lx = 60;
    const ut = lek.kort.map((name, i) => {
      const land = LAND.test(name);
      const c = { cid: cid(), name, x: land ? lx : x, y: land ? 330 : 60, z: i + 1, tapped: i === 1 ? 1 : 0, cts: [] };
      if (land) lx += 200; else x += 220;
      return c;
    });
    return ut.concat(lek.grav.map(name => ({ cid: cid(), name, zon: 'grav', cts: [] })));
  }
  window.provBord = (n = 1) => {
    visaVy('app');
    const mig = player();
    spelLage = { id: 'prov', kod: 'PROV01', namn: 'Prov', vard: mig.id, mig: mig.id };
    mig.plats = 1;
    if (!mig.cards.length) mig.cards = ['Danitha Capashen, Paragon', 'Vampire Nighthawk', 'Plains', 'Swamp']
      .map((name, i) => normaliseraKort({ cid: cid(), name, x: 60 + i * 220, y: i < 2 ? 70 : 340, z: i + 1, tapped: 0, cts: [] }, i));
    state.players = [mig].concat(Array.from({ length: Math.max(0, Math.min(8, n)) }, (_, i) => {
      const lek = LEKAR[i % LEKAR.length];
      return normalisera({
        id: 'prov-' + i, name: NAMN[i], color: FARG[i], plats: i + 2, lage: i % 2 ? 'bord' : 'skarm',
        lekId: 'lek-' + i, lek: { namn: lek.namn, farger: lek.farger, antal: 60 },
        cards: kortFor(lek), shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1
      }, i + 1);
    }));
    state.active = mig.id;
    renderAll(true); resolveAll();
    return motstandare().map(p => p.name);
  };
  window.provFjarr = (i = 0) => {
    const p = motstandare()[i]; if (!p) return null;
    const kort = p.cards.map(c => Object.assign({}, c));
    const k = kort.find(c => c.zon !== 'grav' && !LAND.test(c.name)) || kort[0];
    k.x = (k.x || 0) + 120; k.tapped = k.tapped ? 0 : 1;
    fjarrBord({ game_id: spelLage.id, user_id: p.id, kort, version: (p.version || 0) + 1 });
    return k.name + (k.tapped ? ' tapped' : ' untapped');
  };
})();

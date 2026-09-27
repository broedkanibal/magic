/* Provhjälp för datorns lekfoto (MES-322): en påhittad telefon som talar
   formatet vid BLOCK: LEKKANALEN (MES-321), så att lekens sida går att prova
   utan telefon. Appen laddar den aldrig; den körs från konsolen i
   förhandsvisningen, efter dev/lekfoto-prov.js (kontot och lekarna):

     await fetch('/dev/lekfoto-prov.js').then(r => r.text()).then(eval)
     await fetch('/dev/lekfoto-dator-prov.js').then(r => r.text()).then(eval)
     await provLek('New deck 3'); provM.hej()

     await provM.foto(['Lightning Bolt', 'Sol Ring'], { koll: ['Sol Ring'], okanda: 1, olasta: 2 })
     await provM.tomt('inga')            // LC3: inga kort
     await provM.tomt('inganamn', 6)     // LC4: 6 kort, inga namn
     await provM.omtag(fid, ['Serra Angel'])   // J7/J8: fotot tas om
     await provM.laser()                 // nästa foto läses (N4)
     provM.bort(fid)                     // Remove photo på telefonen (LB1)
     provM.foton                         // telefonens lista

   Telefonen svarar på datorns meddelanden som formatet säger: hej (hela
   listan och bilderna igen), fotobort, fotoater, omtag och klar. */
(() => {
  const uid2 = () => Math.random().toString(36).slice(2, 7);
  const tel = { foton: new Map(), nr: 1, fas: 'lagg' };
  const lekId = () => leksida.yta && leksida.yta.id;
  const sag = m => lekKanalMot(Object.assign({ lekId: lekId() }, m));
  const nasta = () => 1 + [...tel.foton.values()].filter(f => f.lage !== 'bort' && f.lage !== 'ersatt').reduce((m, f) => Math.max(m, f.nr), 0);
  const skickaFoto = f => sag({ typ: 'foto', foto: JSON.parse(JSON.stringify(f)) });

  /* En påhittad bild: korten som ljusa titelrader i kolumner, x/y i tusendelar. */
  function bild(n) {
    const cv = document.createElement('canvas'); cv.width = 480; cv.height = 640;
    const c = cv.getContext('2d');
    c.fillStyle = '#2a3440'; c.fillRect(0, 0, 480, 640);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const col = i % 3, rad = Math.floor(i / 3), x = 30 + col * 150, y = 30 + rad * 70;
      c.fillStyle = '#39475a'; c.fillRect(x, y, 130, 180);
      c.fillStyle = '#e7e0cf'; c.fillRect(x + 6, y + 6, 100, 16);
      pos.push({ x: Math.round((x + 56) / 480 * 1000), y: Math.round((y + 14) / 640 * 1000) });
    }
    return { url: cv.toDataURL('image/jpeg', 0.6), b: 480, h: 640, pos };
  }

  /* Ett foto som landar med kort: kamera → laser → sparat i leken → foto (klar). */
  async function foto(namn, o = {}) {
    provKonto();
    const nr = o.nr || nasta(), fid = nr + ':' + uid2(), koll = new Set(o.koll || []);
    sag({ typ: 'kamera', foto: nr, fid, ersatter: o.ersatter || null });
    sag({ typ: 'laser', foto: nr, fid, ersatter: o.ersatter || null });
    const f = { fid, nr, ersatter: o.ersatter || null, lage: 'laser', hittade: 0, kanda: 0, koll: 0, okanda: 0, olasta: 0, poster: 0, kort: [], ts: 0 };
    tel.foton.set(fid, f); skickaFoto(f);
    const b = bild(namn.length + (o.okanda || 0));
    const ops = [], kort = [];
    let i = 0;
    for (const n of namn) {
      let k; try { k = await lookup(n); } catch (e) { continue; }
      const mall = { name: k.name, sid: k.id, small: imgOf(k, 0, 'small') || null, ci: k.ci || [] };
      if (koll.has(n)) mall.koll = { las: k.name.replace(/[aeio]/i, 'x'), kalla: 'Photo ' + nr };
      ops.push({ typ: 'antal', name: k.name, sb: false, d: 1, kort: mall, foto: fid });
      kort.push(Object.assign({ name: k.name, las: mall.koll ? mall.koll.las : k.name }, b.pos[i++], mall.koll ? { koll: true } : {}));
    }
    for (let j = 0; j < (o.okanda || 0); j++) {
      const p = lekOkandKort('', 'Photo ' + nr, null, uid2());
      ops.push({ typ: 'antal', name: p.name, sb: false, d: 1, kort: p, foto: fid });
      kort.push(Object.assign({ name: p.name, las: '', okand: true, koll: true }, b.pos[i++]));
    }
    if (o.ersatter) ops.push({ typ: 'fotobort', foto: o.ersatter });
    const bas = await lekHamtaRad(lekId());
    const res = await lekSparaKo(lekId(), bas, ops);
    Object.assign(f, { lage: 'klar', hittade: kort.length, kanda: kort.filter(k => !k.koll).length, koll: kort.filter(k => k.koll).length,
                       okanda: o.okanda || 0, olasta: o.olasta || 0, poster: kort.length + (o.olasta || 0), kort, ts: res.rad ? res.rad.ts : Date.now() });
    if (o.ersatter) { const g = tel.foton.get(o.ersatter); if (g) { g.lage = 'ersatt'; skickaFoto(g); } }
    tel.fas = 'resultat';
    skickaFoto(f);
    sag({ typ: 'fotobild', fid, foto: nr, bild: { url: b.url, b: b.b, h: b.h } });
    sag({ typ: 'sparad', foto: nr, antal: res.rad ? res.rad.antal : 0, nya: kort.length, koll: f.koll, ts: res.rad ? res.rad.ts : Date.now() });
    return fid;
  }
  /* Ett foto som inte gav några kort (LC3, LC4): numret tas ändå. */
  function tomt(lage = 'inga', poster = 0) {
    provKonto();
    const nr = nasta(), fid = nr + ':' + uid2();
    sag({ typ: 'laser', foto: nr, fid });
    const f = { fid, nr, ersatter: null, lage, hittade: 0, kanda: 0, koll: 0, okanda: 0, olasta: 0, poster, kort: [], undan: false, ts: 0 };
    tel.foton.set(fid, f); skickaFoto(f);
    sag({ typ: 'fotobild', fid, foto: nr, bild: (({ url, b, h }) => ({ url, b, h }))(bild(poster)) });
    return fid;
  }
  function laser() { const nr = nasta(), fid = nr + ':' + uid2(); sag({ typ: 'laser', foto: nr, fid }); return fid; }
  async function omtag(gammal, namn, o = {}) {
    const g = tel.foton.get(gammal); if (!g) throw new Error('inget foto ' + gammal);
    return foto(namn, Object.assign({}, o, { nr: g.nr, ersatter: gammal }));
  }
  /* Remove photo på telefonen (LB1): fotobort i leken, sedan meddelandena. */
  async function bort(fid) {
    const f = tel.foton.get(fid); if (!f) return;
    const bas = await lekHamtaRad(lekId());
    const res = await lekSparaKo(lekId(), bas, [{ typ: 'fotobort', foto: fid }]);
    f.lage = 'bort';
    sag({ typ: 'fotobort', fid, fran: 'tel' });
    skickaFoto(f);
    sag({ typ: 'sparad', foto: f.nr, antal: res.rad ? res.rad.antal : 0, nya: 0, koll: 0, ts: res.rad ? res.rad.ts : Date.now() });
  }
  function hej(svar = false) {
    sag({ typ: 'hej', roll: 'tel', svar, fas: tel.fas, foto: nasta() });
  }

  /* Telefonen hör datorn: meddelandena går genom Moln.sandLek. */
  provKonto();
  if (!Moln.__provM) {
    Moln.__provM = true;
    const sand = Moln.sandLek;
    Moln.sandLek = d => {
      const r = sand(d);
      setTimeout(() => svara(d || {}), 40);
      return r;
    };
  }
  function svara(d) {
    if (d.lekId && d.lekId !== lekId()) return;
    if (d.typ === 'hej' && d.roll === 'dator' && !d.svar) {
      hej(true);
      for (const f of tel.foton.values()) skickaFoto(f);
      return;
    }
    /* Som MES-321:s telefon (telfotoAndrat): läget ändras, men posten skickas
       inte om. Datorn får veta det först med telefonens nästa post. */
    const f = d.fid && tel.foton.get(d.fid);
    if (d.typ === 'fotobort' && f) { f.lage = 'bort'; }
    else if (d.typ === 'fotoater' && f && (f.lage === 'bort' || f.lage === 'ersatt')) { f.lage = 'klar'; }
    else if (d.typ === 'omtag' && f) { tel.fas = 'kamera'; sag({ typ: 'kamera', foto: f.nr, fid: f.nr + ':' + uid2(), ersatter: f.fid }); }
    else if (d.typ === 'klar') { tel.fas = 'klar'; }
  }

  window.provM = { foto, tomt, omtag, laser, bort, hej, tel, get foton() { return [...tel.foton.values()]; } };
  console.log('provM: foto(namn, {koll, okanda, olasta}), tomt(lage, poster), omtag(fid, namn), laser(), bort(fid), hej()');
})();

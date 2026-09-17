/* Provhjälp för telefonens lekfoton (MES-172). Appen laddar den aldrig: den
   hämtas från konsolen i förhandsvisningen (stub-servern) och körs med eval,
   som recepten i minnet "kamerans datorsida provas utan telefon":

     await fetch('/dev/lekfoto-prov.js').then(r => r.text()).then(eval)

   Stubben har ingen inloggning, och både Phone-fliken och telefonens vy
   kräver ett konto: telefonen når leken genom det. Harnessen ger ett
   PÅHITTAT konto vars lekar ligger i webbläsaren (lekLokal) — samma väg som
   utan konto, men med Moln.inloggad() sann, så att koden som körs är den
   riktiga.

     provKonto()          slår på det påhittade kontot (görs av de andra)
     provLek(namn)        öppnar lekens sida med en ny lek och ett kort i
     provTel(m)           matar lekkanalen med ett meddelande från telefonen
     provAnsluten()       telefonen säger hej
     provFoto(n, koll)    hela cykeln: kamera → laser → sparad, n nya kort
     provTelefon(id)      öppnar TELEFONENS vy för leken (390×844)
     provSagt             allt datorn skickat på kanalen */
(() => {
  const uid2 = () => Math.random().toString(36).slice(2, 10);
  window.provSagt = [];
  let kanalCb = null;

  window.provKonto = () => {
    if (Moln.__prov) return;
    Moln.__prov = true;
    Moln.inloggad = () => true;
    Moln.minId = () => 'prov-user';
    Moln.mittNamn = () => 'Jesper';
    Moln.hamtaLekar = async () => lekLokal.lista().map(l => ({ id: l.id, namn: l.namn, farger: l.farger || [], antal: l.antal || 0, ts: l.ts || 0 }));
    Moln.hamtaLekRad = async id => lekLokal.rad(id);
    Moln.skapaLek = async (namn, kort, farger, antal) => {
      const rad = { id: 'prov:' + uid2(), namn: namn || 'New deck', kort: kort || [], farger: farger || [], antal: antal || 0, ts: Date.now() };
      lekLokal.spara(rad);
      return rad;
    };
    Moln.sparaLek = async (id, data, sedd) => {
      const gammal = lekLokal.rad(id);
      if (!gammal) return { ok: false, borta: true };
      if (sedd && gammal.ts && gammal.ts > sedd) return { konflikt: true, rad: gammal };
      const rad = Object.assign({}, gammal, data, { ts: Date.now() });
      lekLokal.spara(rad);
      return { ok: true, rad };
    };
    Moln.raderaLek = async id => lekLokal.radera(id);
    Moln.lekKanal = async cb => { kanalCb = cb; return true; };
    Moln.lamnaLekKanal = async () => { kanalCb = null; };
    Moln.sandLek = d => { provSagt.push(d); return true; };
    Moln.valjLek = async () => {};
    Moln.sandKam = () => {};
    console.log('prov: påhittat konto på, lekarna ligger i webbläsaren');
  };

  window.provLek = async (namn = 'Boros Blades') => {
    provKonto();
    await oppnaLeksida(null, { fran: 'hem', namn });
    /* En lek finns först när den har ett kort: Phone-fliken behöver raden. */
    const y = leksida.yta._y;
    y.skapaTomt = true;
    await leksida.yta.sparaNu();
    document.querySelector('[data-ls-flik="tel"]').click();
    return leksida.yta.id;
  };

  window.provTel = m => { lekKanalMot(Object.assign({ lekId: leksida.yta && leksida.yta.id }, m)); };
  window.provAnsluten = (foto = 1) => provTel({ typ: 'hej', roll: 'tel', foto });

  /* Hela fotocykeln som telefonen kör den. `nya` kort läggs verkligen in i
     leken, så att kortytan och To check kan granskas. */
  window.provFoto = async (nya = 4, koll = 1, foto = null) => {
    provKonto();
    const yta = leksida.yta, y = yta._y;
    const nr = foto || y.tel.foto || 1;
    provTel({ typ: 'kamera', foto: nr });
    provTel({ typ: 'laser', foto: nr });
    const NAMN = ['Lightning Bolt', 'Monastery Swiftspear', 'Glorious Anthem', 'Serra Angel', 'Boros Charm', 'Sol Ring'];
    const ops = [];
    for (let i = 0; i < nya; i++) {
      const namn = NAMN[(nr * 3 + i) % NAMN.length];
      let k; try { k = await lookup(namn); } catch (e) { continue; }
      const kort = { name: k.name, sid: k.id, small: (imgOf(k, 0, 'small') || null), ci: k.ci || [] };
      if (i < koll) kort.koll = { las: k.name.replace(/o/i, '0'), kalla: 'Photo ' + nr };
      ops.push({ typ: 'antal', name: k.name, sb: false, d: 1, kort });
    }
    const bas = await lekHamtaRad(yta.id);
    const res = await lekSparaKo(yta.id, bas, ops);
    provTel({ typ: 'sparad', foto: nr, antal: res.rad ? res.rad.antal : 0, nya: ops.length, koll, ts: res.rad ? res.rad.ts : Date.now() });
    return res.ok;
  };

  window.provTelefon = async id => {
    provKonto();
    await oppnaLekfoto(id || (leksida.yta && leksida.yta.id));
  };

  console.log('prov: provLek(), provAnsluten(), provFoto(n, koll), provTelefon(id), provTel(m)');
})();

/* Provhjälp för telefonens lekfoton (MES-172). Appen laddar den aldrig: den
   hämtas från konsolen i förhandsvisningen (stub-servern) och körs med eval,
   som recepten i minnet "kamerans datorsida provas utan telefon":

     await fetch('/dev/lekfoto-prov.js').then(r => r.text()).then(eval)

   Stubben har ingen inloggning, och både Phone-fliken och telefonens vy
   kräver ett konto: telefonen når leken genom det. Harnessen ger ett
   PÅHITTAT konto vars lekar ligger i webbläsaren (lekLokal) — samma väg som
   utan konto, men med Moln.inloggad() sann, så att koden som körs är den
   riktiga.

   Lekkanalen blir en BroadcastChannel mellan flikarna, så att datorns
   Phone-flik i en flik och telefonens vy i en annan verkligen talar med
   varandra — lekarna ligger i localStorage och är gemensamma.

     provKonto()          slår på det påhittade kontot (görs av de andra)
     provLek(namn)        öppnar lekens sida med en ny lek och ett kort i
     provTel(m)           matar lekkanalen med ett meddelande från telefonen
     provAnsluten()       telefonen säger hej
     provFoto(n, koll)    hela cykeln: kamera → laser → sparad, n nya kort
     provTelefon(id)      öppnar TELEFONENS vy för leken (390×844)
     provDuk()            en påhittad fotoduk att mata telfotoLas med
     provSagt             allt den här fliken skickat på kanalen */
(() => {
  const uid2 = () => Math.random().toString(36).slice(2, 10);
  window.provSagt = [];
  let kanalCb = null, kanal = null;

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
    /* Kanalen mellan flikarna. BroadcastChannel skickar aldrig tillbaka
       till avsändaren, precis som vi vill: datorn ska inte höra sitt eget. */
    kanal = new BroadcastChannel('mesa-provlek');
    kanal.onmessage = e => lekKanalMot(e.data || {});
    Moln.lekKanal = async cb => { kanalCb = cb; return true; };
    Moln.lamnaLekKanal = async () => { kanalCb = null; };
    Moln.sandLek = d => { provSagt.push(d); kanal.postMessage(Object.assign({ av: 'prov-user' }, d)); return true; };
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
    await telfotoOppna(id || (leksida.yta && leksida.yta.id) || (lekLokal.lista()[0] || {}).id);
  };

  /* En påhittad fotoduk: 25 kort i fem kolumner med en ljus namnrad var,
     samma form som läggningsguiden ber om. Stubben (STUB_LEK=kort) svarar
     ändå med sin egen lista, men duken går genom hela vägen — beskärning,
     nedskalning, b64, remsor. */
  window.provDuk = (b = 2400, h = 1500) => {
    const cv = document.createElement('canvas');
    cv.width = b; cv.height = h;
    const c = cv.getContext('2d');
    c.fillStyle = '#20303f'; c.fillRect(0, 0, b, h);
    const kb = Math.round(b / 5.2), kh = Math.round(kb * 1.39), off = Math.round(h / 6.2);
    for (let i = 0; i < 25; i++) {
      const x = 20 + (i % 5) * (kb + 12), y = 20 + Math.floor(i / 5) * off;
      c.fillStyle = '#31404f'; c.fillRect(x, y, kb, kh);
      c.fillStyle = '#dde6f2'; c.fillRect(x + kb * 0.05, y + kh * 0.03, kb * 0.7, kh * 0.045);
    }
    return cv;
  };

  console.log('prov: provLek(), provAnsluten(), provFoto(n, koll), provTelefon(id), provTel(m), provDuk()');
})();

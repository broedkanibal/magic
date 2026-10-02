/* Provhjälp för dold information (MES-305). Appen laddar den aldrig: den
   hämtas från konsolen i förhandsvisningen (stub-servern) och körs med eval,
   som dev/bordsvy-prov.js:

     await fetch('/dev/dold-prov.js').then(r => r.text()).then(eval)

   provDold(rad)   Ett spel med EN motståndare (Erik) vars bordsrad kommer in
                   den väg en rad från servern kommer (fjarrBord), med ett
                   nedvänt kort i. rad = { name, sid } ger raden namn och
                   tryckning som klienter före MES-305 skickar; utelämnas den
                   kommer kortet utan namn, som slimDelat skickar sedan dess.
                   Pekaren läggs på kortet (inspektorn), förstoringen öppnas,
                   och svaret säger var namnet syns:
                     { namn, i: { dom, kort, inspektor, fokus, tumme } }
                   — varje fält är true om namnet står där. Allt false = tätt.
                   I en dold flik ritas bordsvyn inte (ingen layout); då ritas
                   kortet och miniatyrerna direkt med kortHtml/bordTummar,
                   samma funktioner som bordsvyn använder, och `via` säger det.
   provSlim()      Vad slimDelat skickar för (a) ett nedvänt vanligt kort,
                   (b) ett nedvänt dubbelsidigt kort, (c) ett nedvänt okänt
                   kort, (d) ett nedvänt kort i graveyard, (e) ett uppvänt
                   kort — och vad doldaKort ger ägaren.
   provOrd()       Mitt eget nedvända kort på mattan: ritas nyckelord eller
                   P/T ovanpå baksidan? { kw, pt } — true = ritas (fel).

   Korten är riktiga Scryfall-kort så att uppslagningen fungerar utan konto:
   Serra Angel (nyckelord Flying, Vigilance; 4/4) och Delver of Secrets
   (dubbelsidigt). */
(() => {
  const cid = () => 'prov' + Math.random().toString(36).slice(2, 10);
  const HEMLIGT = 'Serra Angel';
  const vanta = ms => new Promise(r => setTimeout(r, ms));
  async function tillsUppslaget(namn, ms = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (cardFor(namn)) return true; await vanta(100); }
    return false;
  }
  function spelMedErik() {
    visaVy('app');
    const mig = player();
    spelLage = { id: 'prov-dold', kod: 'PROV05', namn: 'Prov', vard: mig.id, mig: mig.id };
    mig.plats = 1; mig.cards = [];
    const erik = normalisera({
      id: 'prov-erik', name: 'Erik', color: '#6b8cff', plats: 2, lage: 'bord',
      lekId: 'lek-erik', lek: { namn: 'Angels', farger: ['W'], antal: 60 },
      cards: [], shots: [], shotIdx: 0, pending: [], pane: null, namnkalla: 'anvandare', version: 1
    }, 1);
    state.players = [mig, erik];
    state.active = mig.id;
    Object.assign(bord, { valt: 'all', sist: null, kantLive: null });
    renderAll(true);
    return erik;
  }
  const rita = html => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  window.provDold = async (rad) => {
    const erik = spelMedErik();
    /* Raden "från servern": ett nedvänt kort på mattan, med eller utan namn. */
    const k = Object.assign({ cid: cid(), flipped: 1, tapped: 0, x: 120, y: 80, z: 1, cts: [] }, rad || {});
    fjarrBord({ game_id: spelLage.id, user_id: erik.id, kort: [k, { cid: cid(), name: 'Plains', x: 120, y: 340, z: 2, tapped: 0, cts: [] }], version: 2 });
    if (rad && rad.name) await tillsUppslaget(rad.name);
    await tillsUppslaget('Plains');
    await vanta(300);
    try { matResize(); renderBord(); } catch (e) {}
    /* Inspektorn: pekaren på hans kort. Förstoringen på samma kort. */
    oppHover = { pid: erik.id, cid: k.cid, grav: false }; renderInspektor();
    fokusOpp = { pid: erik.id, i: 0 }; focusOpen = true; renderFocus();
    const mottaget = erik.cards.find(c => c.cid === k.cid);
    let kortEl = document.querySelector(`.omatta .card[data-cid="${k.cid}"]`), via = 'bordsvyn';
    if (!kortEl) { kortEl = rita(kortHtml(mottaget, 0, '', { x: 0, y: 0, z: 1 }, [], true)).firstElementChild; via = 'kortHtml direkt — bordsvyn ritas inte i en dold flik'; }
    let tummar = [...document.querySelectorAll('.othumb')].map(t => t.title).join('|');
    if (!tummar) tummar = [...rita(bordTummar(erik.cards, 12)).querySelectorAll('.othumb')].map(t => t.title).join('|');
    const insp = ($('#insBody') || {}).textContent || '', fok = (($('#fxSide') || {}).textContent || '') + ' ' + (($('#fxStrip') || {}).innerHTML || '');
    const img = kortEl.querySelector('img');
    const ut = {
      namn: HEMLIGT, via,
      mottagetKort: { name: mottaget.name, sid: mottaget.sid, flipped: mottaget.flipped },
      i: { dom: document.body.innerHTML.includes(HEMLIGT), kort: kortEl.outerHTML.includes(HEMLIGT),
           inspektor: insp.includes(HEMLIGT), fokus: fok.includes(HEMLIGT), tumme: tummar.includes(HEMLIGT) },
      visat: { kortAria: kortEl.getAttribute('aria-label'), kortAlt: img ? img.alt : null, bildArBaksida: !!img && img.src === BAKSIDA,
               kwPaKortet: !!kortEl.querySelector('.kwkort'), ptPaKortet: !!kortEl.querySelector('.pt'), skelett: kortEl.className.includes('pending'),
               inspektor: insp.trim().slice(0, 60), fokus: (($('#fxSide') || {}).textContent || '').trim().slice(0, 60), tumme: tummar }
    };
    focusOpen = false; fokusOpp = null; oppHover = null;
    return ut;
  };
  window.provSlim = async () => {
    await Promise.all([lookup('Serra Angel'), lookup('Delver of Secrets'), lookup('Plains')]).catch(() => {});
    const kort = [
      { cid: 'a', name: 'Serra Angel', flipped: 1, x: 0, y: 0, z: 1, cts: [] },
      { cid: 'b', name: 'Delver of Secrets', flipped: 1, x: 0, y: 0, z: 2, cts: [] },
      { cid: 'c', name: 'Ett kort som inte finns xyz', flipped: 1, x: 0, y: 0, z: 3, cts: [] },
      { cid: 'd', name: 'Serra Angel', flipped: 1, zon: 'grav', cts: [] },
      { cid: 'e', name: 'Serra Angel', flipped: 0, x: 0, y: 0, z: 5, cts: [] }
    ];
    return { delat: slimDelat(kort).map(c => ({ cid: c.cid, name: c.name, sid: c.sid, flipped: c.flipped, zon: c.zon })),
             dolda: typeof doldaKort === 'function' ? doldaKort(kort) : '(doldaKort finns inte)' };
  };
  window.provOrd = async () => {
    spelMedErik();
    const mig = player();
    mig.cards = [normaliseraKort({ cid: cid(), name: 'Serra Angel', flipped: 1, x: 60, y: 70, z: 1, tapped: 0, cts: [] }, 0)];
    renderAll(true); resolveAll();
    await tillsUppslaget('Serra Angel'); await vanta(400); renderAll(true);
    let el = document.querySelector(`#grid .card[data-cid="${mig.cards[0].cid}"]`), via = 'mattan';
    if (!el) { el = rita(kortHtml(mig.cards[0], 0, '', null, [], false)).firstElementChild; via = 'kortHtml direkt — mattan ritas inte i en dold flik'; }
    const img = el.querySelector('img');
    return { via, kw: !!el.querySelector('.kwkort'), pt: !!el.querySelector('.pt'), bildArBaksida: !!img && img.src === BAKSIDA };
  };
})();

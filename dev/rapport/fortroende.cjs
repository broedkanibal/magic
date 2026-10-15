/* Förtroendet för facit (dev/plan/granskning-skala.md, avsnitt 3 och steg 3), i skugga: grön, gul eller röd per
   rättelse, räknat ur vittnen som inte är Jesper. Granskningssidan visar nivån och loggar den med beslutet
   (beslutslogg.cjs); ingenting styr av den förrän grinden klarats (0 av Jespers namnändringar bland de gröna, på
   minst 200 granskade — granska-matt.cjs räknar).

   Vittnena:
     A  namnet finns exakt hos Scryfall
     B  namnet finns i spelarens lek i partiet (decks via game_players.lek_id), eller telefonen läste det själv i ett
        av spelarens tidigare partier (kort_handelser: typ namn/sent_namn, kalla 'telefon', ett annat game_id)
     C  namnet var en av telefonens kandidater för kortet (rattelse.json.kandidater; finns bara i rättelser sparade
        efter 2026-10-15 — saknas de är vittnet okänt, inte nej)
     D  telefonen läste samma namn själv senare i partiet (kort_handelser, samma spelare, efter rättelsen), och det
        kortet bytte inte namn igen. kort_handelser säger inte om det är samma fysiska kort, bara samma namn.
   Motsägelser:
     – spelaren bytte namn på samma kort igen (kort_handelser 'bytt' från namnet, eller en senare rättelse av samma
       spår vars gissning är namnet)
     – telefonen läste senare samma kort som ett annat namn
     – leken är känd och hel (≥ 60 kort utanför sidbrädan) men namnet finns inte i den
   Nivån: grön = A + minst två av B, C, D och ingen motsägelse; gul = A + ett; röd = en motsägelse, eller bara A,
   eller namnet finns inte hos Scryfall. '?' = Scryfall svarade inte (A okänt). null = inget namn att lita på.

   Lucka (2026-10-15): service role får inte läsa decks, så leken blir okänd (null) och B kommer bara ur tidigare
   partier tills den får läsrätt (Jespers beslut, dev/plan/granskning-skala.md).

   Inget vittne är ett svar från Claude (CLAUDE.md: Claude aldrig ett villkor): kort_handelser med kalla 'claude'
   eller 'minne' räknas inte (minnet kan ha lärt sig spelarens eget namn och Claudes säkra), och appen tar inte med
   Claudes namn eller minnets bland kandidaterna (Rattelse.kandidaterFor i index.html). Appen loggar minnets svar
   som kalla 'minne' först sedan 2026-10-15; äldre rader säger 'telefon' också för dem, så vittne D och B:s tidigare
   partier kan där vara minnets eko. Inget här frågar Claude. */
'use strict';

const RATTELSE_KH_MS = 60000;   // en rättelses rad i kort_handelser (bytt/namngiven) skickas inom ~5 s; 60 s räcker gott
const HEL_LEK = 60;
const forsta = n => String(n || '').split(' // ')[0].trim();
/* Samma kort: exakt namn, eller samma framsida för dubbelsidiga ("A // B" mot "A"). */
const samma = (a, b) => !!a && !!b && (a === b || forsta(a) === forsta(b));
const telefonensNamn = h => (h.typ === 'namn' || h.typ === 'sent_namn') && h.kalla === 'telefon';
const ms = v => typeof v === 'number' ? v : Date.parse(v);

/* r: { ratt, gissning, spar, t (ms), handelse, kandidater }.
   u: { scry: true | false | null, lek: { namn: [..], hel: bool } | false (ingen lek i partiet) | null (okänd), minne: [namn] | null,
        kh: spelarens rader i partiet [{ tid, kort, typ, namn, fran, kalla, rapport }] | null,
        senare: partiets andra rättelser [{ kod, spar, gissning, ratt, t, handelse }] | null } */
function bedom(r, u) {
  u = u || {};
  if (!r || !r.ratt) return { niva: null, vittnen: {}, motsagelser: [], skal: 'inget namn att lita på' };
  const ratt = r.ratt, t = ms(r.t);
  const V = {};
  /* A */
  V.A = u.scry === true ? { ja: true, skal: 'finns hos Scryfall' } : u.scry === false ? { ja: false, skal: 'finns inte hos Scryfall' } : { ja: null, skal: 'Scryfall svarade inte' };
  /* B */
  const iLeken = u.lek && u.lek.namn.some(n => samma(n, ratt));
  const iMinnet = u.minne && u.minne.some(n => samma(n, ratt));
  /* okänt (null) är aldrig ett nej: en lek som inte gick att läsa kan ha namnet */
  V.B = iLeken ? { ja: true, skal: 'i spelarens lek' } : iMinnet ? { ja: true, skal: 'telefonen läste det i ett tidigare parti' }
    : u.lek == null && u.minne == null ? { ja: null, skal: 'leken och tidigare partier okända' }
    : u.lek == null ? { ja: null, skal: 'inte i tidigare partier; leken gick inte att läsa' }
    : u.minne == null ? { ja: null, skal: `${u.lek ? 'inte i leken' : 'ingen lek'}; tidigare partier okända` }
    : { ja: false, skal: u.lek ? 'inte i leken eller tidigare partier' : 'ingen lek; inte i tidigare partier' };
  /* C */
  const k = Array.isArray(r.kandidater) ? r.kandidater.filter(x => x && x.namn) : null;
  V.C = !k || !k.length ? { ja: null, skal: 'telefonens kandidater saknas (äldre rättelse eller inget spår)' }
    : k.some(x => samma(x.namn, ratt)) ? { ja: true, skal: `kandidat ${k.findIndex(x => samma(x.namn, ratt)) + 1} av ${k.length}` } : { ja: false, skal: `inte bland telefonens ${k.length} kandidater` };
  /* Kortet rättelsen gällde, i kort_handelser: raden spelaren skrev i samma ögonblick. */
  const kh = Array.isArray(u.kh) ? u.kh.slice().sort((a, b) => ms(a.tid) - ms(b.tid)) : null;
  let kort = null;
  if (kh && isFinite(t)) {
    const nara = h => Math.abs(ms(h.tid) - t) <= RATTELSE_KH_MS;
    const typ = r.handelse === 'namnbyte' ? 'bytt' : r.handelse === 'name_this_card' ? 'namngiven' : null;
    const kand = typ ? kh.filter(h => h.typ === typ && samma(h.namn, ratt) && nara(h) && (typ !== 'bytt' || !r.gissning || samma(h.fran, r.gissning))
      && (typ !== 'namngiven' || r.spar == null || !h.rapport || h.rapport.spar == null || h.rapport.spar === r.spar)) : [];
    kand.sort((a, b) => Math.abs(ms(a.tid) - t) - Math.abs(ms(b.tid) - t));
    kort = kand.length ? kand[0].kort : null;
  }
  /* D */
  if (!kh) V.D = { ja: null, skal: 'partiets händelser okända' };
  else if (!isFinite(t)) V.D = { ja: null, skal: 'rättelsens tid okänd' };
  else {
    const omdopt = (h) => kh.some(x => x.typ === 'bytt' && x.kort === h.kort && samma(x.fran, ratt) && ms(x.tid) > ms(h.tid));
    const las = kh.filter(h => telefonensNamn(h) && samma(h.namn, ratt) && ms(h.tid) > t + 1000 && !omdopt(h));
    V.D = las.length ? { ja: true, skal: `telefonen läste ${ratt} ${las.length === 1 ? 'en gång' : las.length + ' gånger'} senare i partiet` } : { ja: false, skal: 'ingen senare läsning med samma namn' };
  }
  /* Motsägelserna */
  const M = [];
  if (kh && kort != null) {
    const igen = kh.find(h => h.typ === 'bytt' && h.kort === kort && samma(h.fran, ratt) && ms(h.tid) > t);
    if (igen) M.push(`spelaren bytte namn igen, till ${igen.namn || '?'}`);
    const annat = kh.find(h => telefonensNamn(h) && h.kort === kort && h.namn && !samma(h.namn, ratt) && ms(h.tid) > t);
    if (annat) M.push(`telefonen läste senare kortet som ${annat.namn}`);
  }
  if (Array.isArray(u.senare) && r.spar != null && isFinite(t)) {
    const igen = u.senare.find(x => x.spar === r.spar && ms(x.t) > t && x.handelse === 'namnbyte' && samma(x.gissning, ratt) && x.ratt && !samma(x.ratt, ratt));
    if (igen && !M.some(m => m.startsWith('spelaren bytte'))) M.push(`spelaren bytte namn igen, till ${igen.ratt} (${igen.kod})`);
  }
  if (u.lek && u.lek.hel && !iLeken) M.push(`leken är hel men ${ratt} finns inte i den`);
  /* Nivån */
  const andra = ['B', 'C', 'D'].filter(x => V[x].ja === true);
  let niva;
  if (V.A.ja === false) niva = 'rod';
  else if (V.A.ja == null) niva = '?';
  else if (M.length) niva = 'rod';
  else niva = andra.length >= 2 ? 'gron' : andra.length === 1 ? 'gul' : 'rod';
  const skal = niva === '?' ? 'Scryfall svarade inte' : V.A.ja === false ? 'namnet finns inte hos Scryfall'
    : M.length ? M.join('; ') : `A${andra.length ? ' + ' + andra.join(' + ') : ' ensamt'}`;
  return { niva, vittnen: V, motsagelser: M, skal, kort };
}

/* Underlaget ur tabellerna, med service role (supa.cjs). Varje del som inte går att läsa blir null (okänt), och
   felet sparas i fel — ett okänt vittne är inte ett nej. Cachat i några minuter: listan ritas om efter varje val. */
function skapaUnderlag(S, opt) {
  const TTL = (opt && opt.ttl) || 5 * 60 * 1000, minne = new Map(), fel = new Map();
  async function cache(nyckel, f) {
    const c = minne.get(nyckel);
    if (c && Date.now() - c.nar < TTL) return c.v;
    let v = null;
    try { v = await f(); fel.delete(nyckel); } catch (e) { fel.set(nyckel, String(e && e.message || e).slice(0, 200)); }
    minne.set(nyckel, { nar: Date.now(), v });
    return v;
  }
  const kh = (game, user) => !game || !user ? Promise.resolve(null) : cache(`kh|${game}|${user}`, () =>
    S.rest('GET', `kort_handelser?game_id=eq.${encodeURIComponent(game)}&user_id=eq.${encodeURIComponent(user)}&select=tid,kort,typ,namn,fran,kalla,rapport&order=tid.asc&limit=5000`));
  /* false = ingen lek i partiet (Mirror utan lekval, ingen rad), null = okänd (tabellen gick inte att läsa) */
  const lek = (game, user) => !game || !user ? Promise.resolve(false) : cache(`lek|${game}|${user}`, async () => {
    const [gp] = await S.rest('GET', `game_players?game_id=eq.${encodeURIComponent(game)}&user_id=eq.${encodeURIComponent(user)}&select=lek_id`);
    if (!gp || !gp.lek_id) return false;
    const [d] = await S.rest('GET', `decks?id=eq.${encodeURIComponent(gp.lek_id)}&select=kort`);
    if (!d || !Array.isArray(d.kort)) return false;   // leken raderad (on delete set null hinner inte alltid)
    const kort = d.kort.filter(k => k && k.name);
    return { namn: kort.map(k => k.name), hel: kort.filter(k => !k.sb).reduce((s, k) => s + (+k.n || 1), 0) >= HEL_LEK };
  });
  const tidigare = (user, game) => !user ? Promise.resolve(null) : cache(`minne|${user}|${game || ''}`, async () => {
    const rader = await S.rest('GET', `kort_handelser?user_id=eq.${encodeURIComponent(user)}&kalla=eq.telefon&typ=in.(namn,sent_namn)&select=namn,game_id&limit=10000`);
    return [...new Set(rader.filter(h => h.namn && h.game_id !== game).map(h => h.namn))];
  });
  return { kh, lek, tidigare, fel: () => Object.fromEntries(fel) };
}

module.exports = { bedom, skapaUnderlag, samma, HEL_LEK };

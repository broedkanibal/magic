/* ══════════════════════════════════════════════════════════════════
   Serverfunktion för kortidentifiering.

   Nyckeln ligger HÄR, i en miljövariabel, och lämnar aldrig servern.
   Klienten skickar en bild och en lista kandidater och får tillbaka ett
   radnummer. Det är så en produkt normalt hanterar en API-nyckel: ingen
   användare har en egen, och ingen kan läsa din ur webbläsaren.

   Miljövariabler (Vercel → Settings → Environment Variables):
     ANTHROPIC_API_KEY   krävs
     ALLOWED_ORIGINS     kommaseparerad lista, t.ex. https://mesa.vercel.app
                         Utelämnad = alla ursprung tillåts (bara för test).
     ANTHROPIC_MODEL     valfritt, standard claude-opus-5
     RATE_PER_MIN        valfritt, standard 40 anrop per IP och minut
     RATE_PER_DAY        valfritt, standard 600 anrop per IP och dygn
   ══════════════════════════════════════════════════════════════════ */
import Anthropic from '@anthropic-ai/sdk';

const MAX_IMAGE_B64 = 900_000;          // ~650 kB bild
const MAX_NAMES = 25;
/* Kameraläget får hela leken, inte en topplista. Kandidatläget skickar de
   25 bästa ur den lokala matchningen; kameran vet inte vilka som är bäst —
   det är ju det som är osäkert — men vet vilken lek som ligger på bordet.
   Golden setets lek är 28 namn, en Commander-lek 100 kort varav landen
   upprepas. 80 rymmer de unika namnen i en sådan. Listan kostar lite:
   uppmätt med 28 namn gick den minsta beskärningen (171×240 px) på 1 274
   indatatokens och den största (701×891) på 2 048, ett helt foto
   (1080×1440) på 3 197 — den fasta delen, prompten med listan, är alltså
   under 1 300 tokens. */
const MAX_NAMES_KAMERA = 80;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
/* Rätt modell för rätt jobb. Att läsa ett användarnamn ur en etikett, eller
   ett tryckt kortnamn på en uppförstorad närbild, är inte det svåra — det
   svåra är att hitta ett kort som lampan bränt ut (rutläget) och att skilja
   en suddig dödskalle från ett suddigt träd (landläget). Närbilderna — läs
   det tryckta namnet på ett uppförstorat kort — får en snabbare modell.
   Uppmätt: 6,9 s per närbild på den tunga, 2,9 på den snabbare, och de var
   55 s av en avläsning på 93. Närbildens svar går dessutom genom två
   oberoende inramningar som måste vara överens innan något hamnar i handen,
   så en enskild sämre gissning stoppas där — det behövdes: den snabbare
   modellen läste commanderns namn ur överlägget på ett utbränt kort. */
const MODEL_KORT  = process.env.ANTHROPIC_MODEL_CARD || 'claude-sonnet-5';
/* Kameraläget: samma tunga modell som rutläget tills vidare, men med egen
   miljövariabel så att den går att byta för sig — mätningen i kameraläget
   nedan talar för den snabbare på beskärningarna. */
const MODEL_KAMERA = process.env.ANTHROPIC_MODEL_KAMERA || MODEL;
/* Höjs när promterna eller lägena ändras. Utan den gick det inte att skilja
   "modellen svarade så här" från "deployen hade inte hunnit ut" — det kostade
   två felaktiga slutsatser under utvecklingen. */
const PANE_PROMPT_V = 20;   // 20: kameraläget frågar lägena i pixlar och räknar om (19: kameraläget — beskärning + lekens namn in, ett namn ur listan per kort ut, usage i svaret)

/* De faktiska basländerna ur spelarnas set, att jämföra mot i stället för att
   lita på minnet. En suddig dödskalle och ett suddigt träd är båda en mörk
   klump på 80 pixlar — sida vid sida med facit går de att skilja åt. */
const BASLAND = [
  ['Plains',   'https://cards.scryfall.io/normal/front/a/2/a2125c3e-d52c-44b9-b9f1-89f02236d447.jpg'],
  ['Island',   'https://cards.scryfall.io/normal/front/0/e/0e443748-edf1-4499-9507-3649dd57ee95.jpg'],
  ['Swamp',    'https://cards.scryfall.io/normal/front/b/a/babd424c-38cf-45e8-9684-de7bfc1ed86a.jpg'],
  ['Mountain', 'https://cards.scryfall.io/normal/front/d/4/d4606809-7066-4413-9dfd-e929004a71bb.jpg'],
  ['Forest',   'https://cards.scryfall.io/normal/front/2/5/2581a074-00ab-4a2d-8699-25dcd8c76393.jpg']
];

/* Bilderna skickas som base64, inte som URL. Anthropics servrar får inte hämta
   dem själva — Scryfall svarar inte på deras hämtare, och anropet föll på
   "Unable to download the file". Servern hämtar i stället, med den
   användaragent Scryfall ber om, och behåller resultatet mellan anrop på en
   varm instans så att de fem bilderna bara hämtas en gång. */
const landCache = new Map();
/* De fem hämtas parallellt. En kall instans gjorde annars fem hämtningar i
   rad innan modellanropet ens hann börja. Varma instanser läser ur cachen och
   märker ingen skillnad. */
async function landBilder() {
  return Promise.all(BASLAND.map(async ([namn, url]) => {
    let b64 = landCache.get(url);
    if (!b64) {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mesa/1.0 (MTG-korthjalp)', 'Accept': 'image/jpeg' } });
      if (!r.ok) throw new Error('kunde inte hämta ' + namn + ': ' + r.status);
      b64 = Buffer.from(await r.arrayBuffer()).toString('base64');
      landCache.set(url, b64);
    }
    return [namn, b64];
  }));
}

/* Enkel takräkning i minnet. Den delas av anrop som råkar landa på samma
   instans och nollställs när en instans startas om — alltså ett hinder mot
   slarv och skenande loopar, inte mot en beslutsam angripare. Behöver du
   ett vattentätt tak: lägg Upstash Redis bakom och byt ut allow(). Det som
   verkligen begränsar kostnaden är utgiftsgränsen på nyckeln hos Anthropic. */
const buckets = new Map();
function allow(ip) {
  const perMin = +(process.env.RATE_PER_MIN || 40);
  const perDay = +(process.env.RATE_PER_DAY || 600);
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) { b = { min: [], day: [] }; buckets.set(ip, b); }
  b.min = b.min.filter(t => now - t < 60_000);
  b.day = b.day.filter(t => now - t < 86_400_000);
  if (b.min.length >= perMin) return { ok: false, retry: 60 };
  if (b.day.length >= perDay) return { ok: false, retry: 3600 };
  b.min.push(now); b.day.push(now);
  if (buckets.size > 5000) buckets.clear();      // enkel städning
  return { ok: true };
}

/* Sidan som ligger på servern ska ALLTID få anropa den. Första versionen
   jämförde Origin-strängen exakt mot listan, vilket gjorde att ett bortglömt
   https:// eller ett snedstreck för mycket blockerade appens egna anrop —
   precis det som hände. Nu jämförs värdnamn, och samma värd som servern
   själv släpps alltid igenom. Listan gäller därmed bara ANDRA webbplatser,
   vilket är vad den är till för. */
function hostOf(u) {
  try { return new URL(u).host; } catch (e) { return null; }
}
function originAllowed(origin, host) {
  if (!origin) return true;                       // inget Origin = inte en webbläsare
  const oHost = hostOf(origin);
  if (!oHost) return false;
  if (host && oHost === host) return true;        // samma ursprung som servern
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return true;                          // ingen lista satt = öppet
  return raw.split(',').map(s => s.trim()).filter(Boolean)
    .some(a => (hostOf(a) || hostOf('https://' + a)) === oHost);
}

/* Bildens mått ur JPEG-huvudet: första SOF-markören (C0–CF utom C4, C8,
   CC) bär höjd och bredd. Skannar markör för markör; ett trasigt huvud ger
   null, och då frågas lägena i 0–1000 i stället. */
function jpegMatt(b64) {
  try {
    const buf = Buffer.from(String(b64 || ''), 'base64');
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        const h = buf.readUInt16BE(i + 5), w = buf.readUInt16BE(i + 7);
        return w > 0 && h > 0 ? { w, h } : null;
      }
      i += 2 + len;
    }
  } catch (e) { /* trasigt huvud */ }
  return null;
}

/* Tokens ur modellens svar, i varje läge som frågar Claude. Kameraläget
   bar dem först (v19); datorns egna anrop — granskningen, fotot, leken,
   namnet — räknas nu med i sammanfattningen när auto stängs av, och den
   går inte att prisa utan tokens och modellens namn. Bara svarsfält:
   inga instruktioner rörs. */
const anvandning = msg => ({ input_tokens: (msg && msg.usage && msg.usage.input_tokens) || 0,
                             output_tokens: (msg && msg.usage && msg.usage.output_tokens) || 0 });

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const ok = originAllowed(origin, req.headers.host);
  if (origin && ok) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  /* Hälsokoll — klienten frågar vid start om servern finns, och slipper
     då kräva att någon redigerar en rad i koden för att slå på AI-hjälpen. */
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, ready: !!process.env.ANTHROPIC_API_KEY, model: MODEL,
      modeller: { pane: MODEL, land: MODEL, card: MODEL_KORT, namn: MODEL, lek: MODEL, kamera: MODEL_KAMERA }, promptv: PANE_PROMPT_V });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (origin && !ok) return res.status(403).json({ error: 'Origin not allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'The server is missing ANTHROPIC_API_KEY' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'okänd';
  const gate = allow(ip);
  if (!gate.ok) {
    res.setHeader('Retry-After', String(gate.retry));
    return res.status(429).json({ error: 'Too many requests — try again in a moment' });
  }

  const { image, names, mode, antal } = req.body || {};
  if (typeof image !== 'string' || !image)
    return res.status(400).json({ error: 'Send { image: base64 }' });
  if (image.length > MAX_IMAGE_B64) return res.status(413).json({ error: 'The image is too large' });

  /* ── Läsa av en hel videoruta ──────────────────────────────────────
     Den lokala igenkänningen bygger på att detektorn först hittar en
     kortformad rektangel. Ett urtvättat kort — lampan speglar sig i
     plastfickan — har inget inre mönster kvar att hitta, och då finns
     ingen beskärning att skicka vidare. Uppmätt på en riktig skärmdump:
     noll av åtta kort hittades i den rutan.

     Här skickas hela rutan i stället. En bildmodell behöver ingen
     rektangel: den ser att där ligger ett kort, läser namnet, och bryr
     sig varken om att kortet ligger upp och ner eller att kontrasten är
     borta. Den är inte heller bunden till den lokala kortpoolens 1026
     namn — svaren slås upp mot hela Scryfall efteråt. */
  /* Närbild på ETT kort. Egen prompt: modellen ska namnge kortet i mitten och
     inte grannarna som råkar komma med i beskärningen. Behövs för att rutläget
     inte namnger kort som är små i bildrutan — samma kort uppförstorat gick
     från namnlöst till "Swamp" med hög säkerhet. */
  /* Jämför ett kort mot de FAKTISKA basländerna. Modellen kallade en tydlig
     dödskalle för "Forest" — ur minnet är en suddig mörk symbol lätt att ta
     fel på. Med de fem korten bredvid i samma anrop blir det en jämförelse i
     stället för ett minnestest. */
  if (mode === 'land') {
    try {
      /* Överbelastning slog igenom till klienten fast anropet är litet och
         gärna får ta en stund till. Tre försök med växande paus. */
      const client = new Anthropic({ apiKey: key, maxRetries: 3 });
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        output_config: { effort: 'high' },
        system:
          'Du avgör vilket basland ett suddigt webbkamerafoto visar, genom att jämföra ' +
          'mot de fem riktiga korten. ' +
          'Ett basland känns igen på att textrutan är TOM — den innehåller bara den stora ' +
          'mana-symbolen och ingen regeltext alls. Ser du rader av text i rutan är det inte ' +
          'ett basland. ' +
          'Symbolerna: Plains är en vit sol med utstrålande spetsar. Island är en enda blå ' +
          'droppe, slät och rundad. Swamp är en svart dödskalle — rundad hjärnskål med två ' +
          'mörka ögonhålor och en käke under. Mountain är ett rött berg, en spetsig triangel. ' +
          'Forest är ett grönt träd med bred krona ovanpå en smal stam. ' +
          'Dödskalle och träd är båda mörka klumpar när bilden är suddig: skilj dem på ' +
          'ögonhålorna (skalle) mot stammen som sticker ned (träd). ' +
          'Kortet kan ligga upp och ner. Svara bara med JSON.',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Fotot att bedöma:' },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'De fem basländerna, i ordning Plains, Island, Swamp, Mountain, Forest:' },
            ...(await landBilder()).map(([, b64]) => ({
              type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } })),
            { type: 'text', text:
              'Vilket av de fem korten är fotot? Titta på symbolens form, inte på färgen — ' +
              'fotot kan vara urtvättat av lampans reflex.\n\n' +
              'Är det inget basland alls (regeltext i rutan, konstverk över hela kortet), ' +
              'svara med tom lista.\n\n' +
              'Svara med enbart JSON:\n' +
              '{"kort": [{"namn": "Plains"|"Island"|"Swamp"|"Mountain"|"Forest", ' +
              '"sakerhet": "hog"|"medel"|"lag"}]}' }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) return res.status(200).json({ kort: [], varfor: 'inget-json', promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
      const j = JSON.parse(m[0]);
      const namn = BASLAND.map(b => b[0]);
      const k = (Array.isArray(j.kort) ? j.kort : []).slice(0, 1)
        .filter(x => x && namn.includes(x.namn))
        .map(x => ({ namn: x.namn, x: 500, y: 500,
                     sakerhet: ['hog', 'medel', 'lag'].includes(x.sakerhet) ? x.sakerhet : 'medel' }));
      return res.status(200).json({ kort: k, promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/land:', s || '', (e && e.message) || e);
      if (s === 429) return res.status(429).json({ error: 'Too many requests right now' });
      /* Bara feltypen följer med, inte hela svaret — den räcker för att se
         vad som gick fel utan att skicka ut förfrågningsid och interna
         detaljer på en publik endpoint. */
      const typ = (String((e && e.message) || '').match(/"type":"(\w+_error)"/) || [])[1];
      return res.status(502).json({ error: 'Could not reach the image service',
        typ: typ || 'okant', promptv: PANE_PROMPT_V });
    }
  }

  /* ── Spelarnamnet ur videoöverlägget ─────────────────────────────────
     Egen prompt i stället för ett fält i rutläget: den promten säger
     uttryckligen att spelarnamn ska IGNORERAS, och formuleringen är
     intrimmad mot riktiga skärmdumpar. Att motsäga sig själv mitt i den
     vore att röra det som fungerar.

     Ett namn har heller ingen ifyllnadskö som ett kort har — ett okänt kort
     hamnar i granskningen, men ett namn går rakt upp på fliken. Därför
     duger bara hög säkerhet, och tom sträng är ett fullgott svar. */
  if (mode === 'namn') {
    try {
      const client = new Anthropic({ apiKey: key, maxRetries: 2 });
      /* Låg ansträngning. Att läsa ett användarnamn ur en etikett kräver ingen
         eftertanke, men med hög låg anropet på 15 sekunder — uppmätt två
         anrop på 30,5 s av en avläsning på 93 s. Svaret används bara när det
         är säkert, så en billigare gissning kostar ingenting i kvalitet. */
      /* Den tunga modellen ändå. Den snabba missade namnet på var annan bild,
         och namnläsningen kostar ingen väntetid: den startas parallellt med
         den lokala detekteringen (13 s) och är klar innan den behövs. Där
         latensen är gratis ska tillförlitligheten vinna. */
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 600,
        output_config: { effort: 'low' },
        system:
          'Du läser användarnamnet ur överlägget i ett videosamtal. Bilden är en videoruta från ' +
          'ett Magic-spelbord med ett överlägg ovanpå: användarnamnet står med fet stil i ' +
          'ett av de övre hörnen, ofta med commanderns namn i kursiv stil under sig och en ' +
          'stor siffra för livtotalen bredvid. ' +
          'Svara med ENBART användarnamnet. Livtotalen, commanderns namn, kortnamn, ' +
          'knapptexter och uppmaningar som "Click to add commander(s) and edit decklist" ' +
          'eller "Video is off" är inte användarnamn. ' +
          'Ser du inget användarnamn, svara med tom sträng — det är ett fullgott svar. ' +
          'Gissa aldrig: ett felaktigt namn hamnar direkt på spelarens flik utan kontroll. ' +
          'Svara bara med JSON, aldrig med förklarande text.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text:
              'Vilket användarnamn står i överlägget?\n\n' +
              'Svara med enbart JSON:\n' +
              '{"namn": "…", "sakerhet": "hog"|"medel"|"lag"}' }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) return res.status(200).json({ namn: '', varfor: 'inget-json', promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
      const j = JSON.parse(m[0]);
      return res.status(200).json({
        namn: String(j.namn == null ? '' : j.namn).slice(0, 40).trim(),
        sakerhet: ['hog', 'medel', 'lag'].includes(j.sakerhet) ? j.sakerhet : 'lag',
        promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL
      });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/namn:', s || '', (e && e.message) || e);
      if (s === 429) return res.status(429).json({ error: 'Too many requests right now' });
      const typ = (String((e && e.message) || '').match(/"type":"(\w+_error)"/) || [])[1];
      return res.status(502).json({ error: 'Could not reach the image service',
        typ: typ || 'okant', promptv: PANE_PROMPT_V });
    }
  }

  if (mode === 'card') {
    try {
      const client = new Anthropic({ apiKey: key });
      const stream = client.messages.stream({
        model: MODEL_KORT,
        max_tokens: 4000,
        output_config: { effort: 'medium' },
        system:
          'Du identifierar ETT Magic: the Gathering-kort på en närbild från en webbkamera ' +
          'ovanför ett spelbord. Bilden är uppförstorad ur en större bild och därför suddig. ' +
          'Kortet som ska namnges är det i MITTEN — grannkort i kanterna ska ignoreras. ' +
          'Kortet kan ligga upp och ner eller snett. ' +
          'Bildens kanter kan innehålla text ur videoappens gränssnitt som ligger OVANPÅ videon: ' +
          'spelarens namn, commanderns namn, livtotal, knappar. Det är inte kortet. Läs bara ' +
          'namnet som står tryckt PÅ kortet i mitten. Står det inget läsbart namn på själva ' +
          'kortet — svara med tom lista, gissa inte utifrån annan text i bilden. ' +
          'BASLÄNDER känns igen på att textrutan är TOM: den innehåller bara den stora ' +
          'mana-symbolen och ingen regeltext alls. Ser du rader av text i rutan är det inte ' +
          'ett basland. Symbolen avgör vilket: vit sol med spetsar = Plains, en blå droppe = ' +
          'Island, svart dödskalle med ögonhålor = Swamp, rött spetsigt berg = Mountain, ' +
          'grönt träd med krona och stam = Forest. Ser du symbolen tydligt är kortet ' +
          'identifierat med hög säkerhet, även om resten är utbränt av lampans reflex. ' +
          'Är det en baksida (enfärgat brun med ljus oval, inget konstverk och ingen textruta) ' +
          'eller inget kort alls, svara med tom lista. Svara bara med JSON.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text:
              'Vilket kort ligger i mitten?\n\n' +
              'namn: exakta engelska namnet, eller "" om du inte kan avgöra vilket kort det är.\n' +
              'sakerhet: "hog" när du läser namnet eller ser en baslandssymbol tydligt, ' +
              '"medel" när konstverket verkar stämma men namnet inte går att läsa, "lag" annars.\n\n' +
              'Svara med enbart JSON:\n' +
              '{"kort": [{"namn": "..." | "", "x": 500, "y": 500, "sakerhet": "hog"|"medel"|"lag"}]}' }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) return res.status(200).json({ kort: [], varfor: 'inget-json', promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL_KORT });
      const j = JSON.parse(m[0]);
      const k = (Array.isArray(j.kort) ? j.kort : [])
        .filter(x => x && typeof x.namn === 'string')
        .slice(0, 1)
        .map(x => ({ namn: String(x.namn).slice(0, 120).trim(), x: 500, y: 500,
                     sakerhet: ['hog', 'medel', 'lag'].includes(x.sakerhet) ? x.sakerhet : 'medel' }));
      return res.status(200).json({ kort: k, promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL_KORT });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/card:', s || '', (e && e.message) || e);
      if (s === 429) return res.status(429).json({ error: 'Too many requests right now' });
      return res.status(502).json({ error: 'Could not reach the image service' });
    }
  }

  if (mode === 'pane') {
    try {
      const client = new Anthropic({ apiKey: key });
      /* Strömmande anrop: adaptivt tänkande vid hög ansträngning kan hålla på
         länge, och ett icke-strömmande anrop riskerar då att slå i tidsgränsen
         innan svaret kommit. max_tokens måste också rymma tänkandet, inte bara
         den korta JSON-listan. */
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'high' },
        system:
          'Du läser av foton från webbkameror ovanför spelbord i Magic: the Gathering. ' +
          'Bildkvaliteten är dålig: kort kan vara små, suddiga, snedvridna, delvis skymda, ' +
          'ligga upp och ner, eller vara utbrända av lampans reflex i plastfickan. ' +
          'Din uppgift är att hitta VAR varje uppåtvänt spelkort ligger, och namnge det när ' +
          'du kan. Positionen är värdefull även utan namn: appen visar då en beskuren bild av ' +
          'kortet som användaren fyller i för hand. Utelämna alltså aldrig ett kort bara för ' +
          'att namnet inte går att läsa — lämna namnet tomt i stället. ' +
          'Räkna INTE med baksidor, kortaskar, lekar, tärningar, tangentbord, händer eller ' +
          'telefoner. Räkna inte heller med videoappens eget gränssnitt som ligger ovanpå ' +
          'videon: lila eller blå knappar, tre punkter i en rundad fyrkant, spelarnamn, ' +
          'livtotaler och siffror. En Magic-baksida känns igen på att den är enfärgat brun med en stor ' +
          'ljus oval i mitten och ingen text, inget konstverk och ingen ljus textruta — den ' +
          'ser likadan ut oavsett vilket kort det är. Har du inte sett något som liknar ' +
          'konstverk eller tryckt text på kortet är det en baksida, inte ett oläsbart kort. ' +
          'Gissa aldrig ett namn du inte har stöd för — ett påhittat namn med hög säkerhet ' +
          'hamnar direkt i spelarens hand utan kontroll. ' +
          'BASLÄNDER ÄR ETT UNDANTAG. Plains, Island, Swamp, Mountain och Forest identifieras ' +
          'på den stora mana-symbolen, inte på namnet: en vit sol, en blå droppe, en svart ' +
          'dödskalle, ett rött berg, ett grönt träd. Ser du symbolen tydligt är kortet ' +
          'identifierat — svara med hög säkerhet även om resten av kortet är utbränt av ' +
          'lampans reflex och namnet inte går att läsa. Symbolen är stödet. Kortet kan ligga ' +
          'upp och ner, så symbolen kan sitta i övre halvan. ' +
          'Svara bara med JSON, aldrig med förklarande text.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text:
              'Lista VARJE uppåtvänt Magic-kort i bilden — även de vars namn du inte kan läsa.\n\n' +
              /* Hörn testades och blev sämre: förhållandena spretade 1.18–2.24 mot
                 kortets riktiga 1.39, och den härledda mitten hamnade 70px fel mot
                 5px för en direkt angiven mittpunkt. Modellen är opålitlig på
                 koordinater i detalj men träffar mitten bra. Detektorn snappar
                 sedan till kortets verkliga kant och vinkel. */
              'För varje kort: kortets MITTPUNKT som heltal 0–1000 där x=0 är bildens ' +
              'vänsterkant och y=0 dess överkant, samt namnet.\n\n' +
              'namn: kortets exakta engelska namn, eller tom sträng "" om du inte kan avgöra ' +
              'vilket kort det är.\n' +
              'sakerhet: "hog" när du kan läsa kortnamnet eller känner igen konstverket utan ' +
              'tvekan — då läggs kortet till automatiskt. "medel" när konstverket verkar stämma ' +
              'men namnet inte går att läsa. "lag" när du mest gissar, och när namnet är tomt. ' +
              'Medel och låg hamnar i en lista användaren får bekräfta, så de kostar ingenting ' +
              'om de är fel.\n\n' +
              'Svara med enbart JSON. Finns inga kort alls i bilden: {"kort": []}\n' +
              '{"kort": [{"namn": "..." | "", "x": 0-1000, "y": 0-1000, ' +
              '"sakerhet": "hog"|"medel"|"lag"}]}' }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      /* Utan det här gick ett tomt svar inte att skilja från "modellen svarade
         något annat än JSON" — båda blev en tom lista, och felsökningen fastnade. */
      if (!m) {
        console.error('identify/pane: inget JSON i svaret',
          JSON.stringify({ stop: msg.stop_reason, detaljer: msg.stop_details, txt: txt.slice(0, 400) }));
        return res.status(200).json({ kort: [], varfor: 'inget-json',
          stop: msg.stop_reason || null, svar: txt.slice(0, 400), usage: anvandning(msg), modell: MODEL });
      }
      const j = JSON.parse(m[0]);
      const kort = (Array.isArray(j.kort) ? j.kort : []).slice(0, 40)
        .filter(k => k && typeof k.namn === 'string')      // tomt namn är ett giltigt svar
        .map(k => {
          const h4 = Array.isArray(k.horn) ? k.horn.slice(0, 4)
            .filter(p => Array.isArray(p) && p.length >= 2)
            .map(p => [Math.max(0, Math.min(1000, Number(p[0]) || 0)),
                       Math.max(0, Math.min(1000, Number(p[1]) || 0))]) : [];
          // mittpunkten härleds ur hörnen, med fallback till ett angivet x/y
          const mx = h4.length === 4 ? h4.reduce((a, p) => a + p[0], 0) / 4 : Number(k.x) || 0;
          const my = h4.length === 4 ? h4.reduce((a, p) => a + p[1], 0) / 4 : Number(k.y) || 0;
          return {
            namn: String(k.namn).slice(0, 120).trim(),
            horn: h4.length === 4 ? h4 : null,
            x: Math.max(0, Math.min(1000, mx)),
            y: Math.max(0, Math.min(1000, my)),
            sakerhet: ['hog', 'medel', 'lag'].includes(k.sakerhet) ? k.sakerhet : 'medel'
          };
        });
      return res.status(200).json({ kort, promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/pane:', s || '', (e && e.message) || e);
      if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
      if (s === 429) return res.status(429).json({ error: 'Too many requests right now' });
      if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
      return res.status(502).json({ error: 'Could not reach the image service' });
    }
  }

  /* ── Läsa av spelarens lek ur ett foto ─────────────────────────────
     Spelaren äger korten fysiskt och har ingen decklist att klistra in.
     Leken läggs därför ut på ett bord i högar som överlappar nedåt, så
     att bara titelraden syns av alla utom det nedersta i varje hög, och
     fotograferas.

     Det som skiljer det här läget från rutläget: där är positionen det
     värdefulla och namnet en bonus, här är det tvärtom. Konstverket syns
     knappt och regeltexten inte alls — den TRYCKTA TEXTEN är hela
     signalen. Positionen är ändå med, men bara för att klienten ska kunna
     klippa ut just den titelraden och visa den bredvid namnet när en rad
     behöver rättas.

     Och en sak till som rutläget inte har: här ska varje FYSISKT kort ge
     en egen post. Fyra Mountain är fyra rader, inte "Mountain x4".
     Klienten räknar förekomsterna själv. Att låta modellen räkna är den
     dyraste felkällan i uppgiften — den ser tjugo likadana överlappande
     kort och gissar ett jämnt tal. */
  if (mode === 'lek') {
    try {
      const client = new Anthropic({ apiKey: key });
      /* Den tunga modellen. Att läsa ett tryckt kortnamn på en NÄRBILD är
         lätt nog för den snabba (card-läget), men där finns två oberoende
         inramningar som måste vara överens innan något hamnar i handen.
         Här finns ingen sådan spärr — ett felläst namn hamnar i den lek
         kameran sedan identifierar MOT, och förgiftar hela kvällen. */
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        system:
          'Du läser av ett foto av en Magic: the Gathering-lek som ligger utlagd på ett bord. ' +
          'Korten ligger i lodräta högar bredvid varandra och överlappar nedåt, som en solfjäder: ' +
          'av varje kort syns bara den översta remsan med titelraden och manakostnaden, medan ' +
          'konstverket och regeltexten är dolda under nästa kort. Det nedersta kortet i varje hög ' +
          'syns helt. ' +
          'Din uppgift är att skriva av titelraden på varje kort, EN RAD PER FYSISKT KORT. ' +
          'Ligger fyra likadana kort i leken ska namnet stå fyra gånger, som fyra separata poster. ' +
          'Slå aldrig ihop lika kort till en post, och skriv aldrig antal, multiplikatorer eller ' +
          '"x4" — appen räknar själv hur många gånger ett namn förekommer. Det är den vanligaste ' +
          'och dyraste felkällan i den här uppgiften. ' +
          'Läs högarna i ordning: uppifrån och ned i den vänstra högen först, sedan nästa hög åt höger. ' +
          'Titelraden är det enda beviset. Konstverket syns knappt och regeltexten inte alls, så ' +
          'gissa aldrig ett kort utifrån den smala remsa färg som sticker fram. ' +
          'Går en titelrad inte att läsa — en reflex i plastfickan, en skugga, ett kort som ligger ' +
          'för långt över — svara med tom sträng som namn men BEHÅLL posten och ge den rätt ' +
          'position. Den tomma posten är värdefull: den säger att där ligger ett kort, appen visar ' +
          'en uppförstorad bild av just den remsan, och användaren fyller i namnet för hand på tre ' +
          'sekunder. Ett kort du utelämnar helt försvinner däremot ur leken utan att någon märker det. ' +
          'Hitta aldrig på ett kort för att fylla ut en hög till jämnt antal. Är högen nio kort djup ' +
          'ska det bli nio poster, inte tolv. ' +
          'Skriv namnet exakt som det står tryckt, med samma stavning, isärskrivning och skiljetecken. ' +
          'Dubbelsidiga kort har bara framsidans namn tryckt — skriv det. Delade kort har två namn ' +
          'med "//" emellan — skriv båda så som de står. Lägg inte till setnamn, samlarnummer eller utgåva. ' +
          'Räkna inte med något som inte är ett uppåtvänt Magic-kort: kortaskar, tärningar, spelmattan, ' +
          'händer, telefonen, kortryggar (enfärgat bruna med en ljus oval och ingen text) eller lösa ' +
          'plastfickor. ' +
          'Ett påhittat namn är värre än ett tomt. Appen slår upp varje namn mot Scryfall, och ett ' +
          'namn som råkar finnas men är fel hamnar i spelarens sparade lek — sedan letar kameran ' +
          'efter det kortet hela kvällen, och det ligger inte på bordet. ' +
          'Svara bara med JSON, aldrig med förklarande text.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text:
              'Skriv av titelraden på varje kort i bilden, ett kort per rad, i läsordning: uppifrån ' +
              'och ned i vänstra högen, sedan nästa hög åt höger. Ta med även de kort vars namn du ' +
              'inte kan läsa, då med tomt namn.\n\n' +
              'namn: kortets namn exakt som det står tryckt, eller tom sträng "" om titelraden inte ' +
              'går att läsa.\n' +
              'x, y: mittpunkten på kortets synliga TITELRAD som heltal 0–1000, där x=0 är bildens ' +
              'vänsterkant och y=0 dess överkant. Titelraden, inte kortets mitt — kortets mitt är ' +
              'skymd av nästa kort. Appen visar en uppförstorad bild av just den remsan bredvid ' +
              'namnet när användaren ska rätta det.\n' +
              'sakerhet: "hog" när du läser hela titelraden tecken för tecken utan tvekan, "medel" ' +
              'när du läser det mesta men gissar ett tecken eller ett ord, "lag" när du mest gissar. ' +
              'Är namnet tomt är säkerheten "lag". Allt som inte är "hog" hamnar i en lista ' +
              'användaren bekräftar, så "medel" och "lag" kostar ingenting.\n' +
              'otydliga: hur många kort du SER i bilden men inte har lagt in i listan alls. Noll är ' +
              'ett fullgott svar.\n\n' +
              'Svara med enbart JSON. Ligger inga kort i bilden: {"kort": [], "otydliga": 0}\n' +
              '{"kort": [{"namn": "..." | "", "x": 0-1000, "y": 0-1000, ' +
              '"sakerhet": "hog"|"medel"|"lag"}], "otydliga": 0}' }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error('identify/lek: inget JSON i svaret',
          JSON.stringify({ stop: msg.stop_reason, txt: txt.slice(0, 400) }));
        return res.status(200).json({ kort: [], varfor: 'inget-json',
          stop: msg.stop_reason || null, svar: txt.slice(0, 400), promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
      }
      /* JSON.parse ligger UTANFÖR anropets try-block i tanken: ett avhugget
         svar är inte ett nätverksfel, och att svara 502 på det skickar
         felsökningen åt fel håll. Här blir det ett 200 med skälet i klartext. */
      let j;
      try { j = JSON.parse(m[0]); }
      catch (e) {
        return res.status(200).json({ kort: [], varfor: 'trasigt-json',
          svar: m[0].slice(0, 400), promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
      }
      /* filter FÖRE slice: annars äter en handfull skräpposter upp taket och
         riktiga kort faller bort i stället för skräpet. Taket är 60 — fler
         kort än så får ändå inte plats i en bild med läsbar titelrad. */
      /* Taket är 60 — fler kort än så får ändå inte plats i en bild med
         läsbar titelrad. Men ett tak som KAPAR TYST ljuger: klienten visade
         "Fotot gav 60 kort" och användaren såg aldrig att femton kort fallit
         bort. De kapade räknas därför in i otydliga, som redan betyder
         "kort du inte fick med". */
      const alla = (Array.isArray(j.kort) ? j.kort : [])
        .filter(k => k && typeof k.namn === 'string');     // tomt namn är ett giltigt svar
      const kapade = Math.max(0, alla.length - 60);
      const kort = alla
        .slice(0, 60)
        .map(k => ({
          namn: String(k.namn).slice(0, 120).trim(),
          x: Math.max(0, Math.min(1000, Number(k.x) || 0)),
          y: Math.max(0, Math.min(1000, Number(k.y) || 0)),
          /* 'lag' som fallback, inte 'medel' som i rutläget: här är det ett
             namn som ska sparas, och bara "hog" går in utan att bekräftas. */
          sakerhet: ['hog', 'medel', 'lag'].includes(k.sakerhet) ? k.sakerhet : 'lag'
        }));
      return res.status(200).json({ kort,
        otydliga: Math.max(0, Math.min(200, (Number(j.otydliga) || 0) + kapade)),
        kapade,
        promptv: PANE_PROMPT_V, usage: anvandning(msg), modell: MODEL });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/lek:', s || '', (e && e.message) || e);
      if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
      if (s === 429) return res.status(429).json({ error: 'För många anrop just nu — vänta en stund' });
      if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
      return res.status(502).json({ error: 'Bildtjänsten gick inte att nå', promptv: PANE_PROMPT_V });
    }
  }

  /* ── Kameran: en beskärning (eller hela tavelbilden) mot lekens namn ──
     Kamerans lokala kedja (Matcher + ORB + namnläsaren mot lekens 28 kort)
     lämnade 10 av 24 beskärningar i golden setet osäkra: 6 var hela,
     läsbara kort där titelraden var under 40 px så att namnläsaren aldrig
     kördes, och 4 var klungor av 3–8 kort som skärlinjen inte fick isär.
     Rutläget på hela fotona gav 42 av 44 kort rätt och 0 fel — men det tar
     ingen lista och svarar med fri text för uppslag mot Scryfall, och
     kandidatläget tar en lista men svarar med ETT radnummer för ETT kort.
     En klunga behöver flera svar, och kameran vet vilken lek som ligger på
     bordet.

     Därför: bilden + hela leken in, en post per fysiskt kort ut, med namnet
     EXAKT ur listan eller tomt. Listan är hela beviset — ett namn utanför
     den blir tomt HÄR, på servern, inte en "hog"-gissning i spelarens hand;
     de bortkastade namnen följer med som `okanda` så att det syns när det
     händer (ett tak som kapar tyst ljuger, se lekläget). `antal` är
     kamerans egen gissning om hur många kort bilden rymmer (1 = ett kort)
     och ges som ledtråd, inte som facit: den är ju det som är osäkert.

     usage följer med i svaret. Rutlägets kostnad fick uppskattas ur
     svarstiderna eftersom ingen mätte, och LÄS-MIG kräver att ett AI-steg i
     provet bär modellens namn — priset går inte att räkna utan tokens.

     Uppmätt 2026-09-10 (scratchpad/kamera-prov.mjs, lokalt via stubben med
     MESA_AI=1) på de 24 beskärningarna med antal, plus de sex fotona hela
     utan antal, alla med lekens 28 namn:
       Opus 5:   75 av 75 rätt namn (74 hog), 0 missade, 0 namn utanför
                 listan, 2 dubbletter (ett extra Plains i en landhög: i
                 beskärning 02 #2 delade den kortet i två poster vid appens
                 gula ruta, i foto 03 räknade den den staplade högen som tre),
                 median 2,2 s per beskärning och 9,0 s per foto, $0,43 för 30.
       Sonnet 5: 74 av 75 (72 hog), 1 fel namn — Aphelia upp och ner med mörk
                 titelrad blev "Serpent Assassin" med medel — 0 dubbletter,
                 median 1,7 s per beskärning och 3,6 s per foto, $0,15 för 30.
     Indatatokens var identiska modellerna emellan (52 952 för de 30), så
     prisskillnaden är hela skillnaden. Räknat på det som når handen utan
     kontroll — fel namn MED hog — hade Opus 1 (det tredje Plains på foto 03)
     och Sonnet 0; Sonnets enda fel låg på medel och hade stannat i
     granskningen. På beskärningarna, som är kamerans verkliga fråga, var
     de lika (35/35) och Sonnet gav varken dubbletter eller tomma poster.
     Standard är ändå MODEL, som uppdraget sade; ANTHROPIC_MODEL_KAMERA
     byter bara det här läget. */
  if (mode === 'kamera') {
    if (!Array.isArray(names) || !names.length)
      return res.status(400).json({ error: 'Skicka { mode: "kamera", image: base64, names: [...] }' });
    /* Lägena frågas i PIXLAR och räknas om här. Uppmätt (kamera-prov.mjs):
       bedda om 0–1000 svarade modellerna ändå ibland i pixlar — Opus på 1
       av 6 foton, Sonnet på 4 av 6 — och klämningen vid 1000 förstörde då
       läget för korten längst ner. Med bildens mått ur JPEG-huvudet finns
       inget att blanda ihop; saknas måtten (trasigt huvud) gäller 0–1000. */
    const matt = jpegMatt(image);
    /* Dubbletter bort FÖRE taket: fyra Plains i en decklist ska inte äta upp
       fyra av åttio platser. Nyckeln för att para modellens svar med listan
       är okänslig för skiftläge, krullig apostrof och dubbla mellanslag —
       modellen skriver gärna ’ där listan har '. */
    const norm = s => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
    const lek = [...new Set(names.map(n => String(n).slice(0, 120).trim()).filter(Boolean))].slice(0, MAX_NAMES_KAMERA);
    const iLek = new Map(lek.map(n => [norm(n), n]));
    const tror = Number.isInteger(antal) && antal > 0 ? antal : 0;
    try {
      const client = new Anthropic({ apiKey: key });
      /* Medel ansträngning, som närbilden: uppgiften är att läsa en titelrad
         mot en kort lista, inte att hitta kort som lampan bränt ut. Uppmätt
         på Opus: 1,8–5,6 s per beskärning, 3,8–14,5 s per helt foto (rutläget
         med hög låg på 8–45 s för samma foton). 4000 tokens räckte: det
         längsta svaret var 1 205 utdatatokens (foto 03, tolv poster). */
      const stream = client.messages.stream({
        model: MODEL_KAMERA,
        max_tokens: 4000,
        output_config: { effort: 'medium' },
        system:
          'Du identifierar Magic: the Gathering-kort på en bild från en kamera ovanför ett spelbord. ' +
          'Bilden är oftast en automatisk beskärning runt det kameran tror är ETT kort, men den kan ' +
          'rymma flera kort kant i kant eller omlott, kanter av grannkort, eller vara hela tavelbilden. ' +
          'Leken är känd: du får listan över de kort som kan ligga på bordet, och BARA de namnen kan ' +
          'förekomma. Svara med namnet EXAKT som det står i listan. Är kortet inte något av dem, eller ' +
          'kan du inte avgöra vilket, svara med tom sträng "" som namn — hellre tomt än påhitt, ett ' +
          'fel namn hamnar i spelarens hand utan kontroll. ' +
          'Lista VARJE uppåtvänt kort som syns, även delvis täckta kort när titelraden eller ' +
          'tillräckligt av konstverket syns för att avgöra vilket kort det är. EN post per fysiskt ' +
          'kort: två likadana kort är två poster, skriv aldrig antal eller "x2". ' +
          'BASLÄNDER — Plains, Island, Swamp, Mountain, Forest — avgörs på den stora mana-symbolen i ' +
          'konstverket och namnet i titelraden: vit sol = Plains, blå droppe = Island, svart ' +
          'dödskalle = Swamp, rött berg = Mountain, grönt träd = Forest. Textrutan på ett basland är tom. ' +
          'Hoppa över baksidor (enfärgat bruna med en ljus oval, ingen text), tärningar, händer, ' +
          'bordet, och appens egna ritade gula rutor och streck som kan ligga inbakade i bilden. ' +
          'Kortet kan ligga upp och ner eller på sidan. Svara bara med JSON, aldrig med förklarande text.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text:
              'Leken — bara de här namnen kan förekomma:\n' + lek.join('\n') + '\n\n' +
              (tror ? `Kameran tror att bilden rymmer ${tror} kort${tror === 1 ? '' : ' (en klunga)'}, ` +
                      'men lita på det du ser: det kan vara fler eller färre.\n\n' : '') +
              'För varje kort: namn EXAKT ur listan (eller ""), kortets MITTPUNKT x och y som heltal ' +
              (matt ? `i PIXLAR — bilden är ${matt.w}×${matt.h} px, x=0 är vänsterkanten och y=0 överkanten — `
                    : '0–1000 där x=0 är bildens vänsterkant och y=0 dess överkant, ') +
              'samt sakerhet.\n' +
              'sakerhet: "hog" när du läser namnet i titelraden eller ser baslandssymbolen tydligt — ' +
              'då läggs kortet till automatiskt. "medel" när konstverket eller ramen stämmer med ett ' +
              'namn i listan men namnet inte går att läsa. "lag" när du mest gissar, och alltid när ' +
              'namnet är tomt.\n\n' +
              'Svara med enbart JSON. Finns inget kort i bilden: {"kort": []}\n' +
              (matt ? '{"kort": [{"namn": "..." | "", "x": <px>, "y": <px>, "sakerhet": "hog"|"medel"|"lag"}]}'
                    : '{"kort": [{"namn": "..." | "", "x": 0-1000, "y": 0-1000, "sakerhet": "hog"|"medel"|"lag"}]}') }
          ]
        }]
      });
      const msg = await stream.finalMessage();
      const usage = { input_tokens: (msg.usage && msg.usage.input_tokens) || 0,
                      output_tokens: (msg.usage && msg.usage.output_tokens) || 0 };
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error('identify/kamera: inget JSON i svaret',
          JSON.stringify({ stop: msg.stop_reason, txt: txt.slice(0, 400) }));
        return res.status(200).json({ kort: [], varfor: 'inget-json', stop: msg.stop_reason || null,
          svar: txt.slice(0, 400), promptv: PANE_PROMPT_V, usage, modell: MODEL_KAMERA });
      }
      let j;
      try { j = JSON.parse(m[0]); }
      catch (e) {
        return res.status(200).json({ kort: [], varfor: 'trasigt-json', svar: m[0].slice(0, 400),
          promptv: PANE_PROMPT_V, usage, modell: MODEL_KAMERA });
      }
      const okanda = [];
      const kort = (Array.isArray(j.kort) ? j.kort : [])
        .filter(k => k && typeof k.namn === 'string')      // tomt namn är ett giltigt svar
        .slice(0, 40)
        .map(k => {
          const givet = String(k.namn).slice(0, 120).trim();
          const namn = givet ? (iLek.get(norm(givet)) || '') : '';
          if (givet && !namn) okanda.push(givet);
          /* 'lag' som fallback, och alltid 'lag' på ett tomt namn: här är det
             ett namn som ska in i handen, och bara "hog" går in utan att
             bekräftas. */
          const sakerhet = namn && ['hog', 'medel', 'lag'].includes(k.sakerhet) ? k.sakerhet : 'lag';
          const px = Number(k.x) || 0, py = Number(k.y) || 0;
          return { namn,
            x: Math.max(0, Math.min(1000, Math.round(matt ? px * 1000 / matt.w : px))),
            y: Math.max(0, Math.min(1000, Math.round(matt ? py * 1000 / matt.h : py))),
            sakerhet };
        });
      return res.status(200).json({ kort, okanda: okanda.slice(0, 10), promptv: PANE_PROMPT_V, usage, modell: MODEL_KAMERA });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/kamera:', s || '', (e && e.message) || e);
      if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
      if (s === 429) return res.status(429).json({ error: 'För många anrop just nu — vänta en stund' });
      if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
      return res.status(502).json({ error: 'Bildtjänsten gick inte att nå', promptv: PANE_PROMPT_V });
    }
  }

  if (!Array.isArray(names) || !names.length)
    return res.status(400).json({ error: 'Skicka { image: base64, names: [...] }' });

  const list = names.slice(0, MAX_NAMES).map(n => String(n).slice(0, 120));

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      output_config: { effort: 'low' },
      /* Beskärningen kommer från en automatisk detektor som ibland tar fel:
         en kortask, en mobil, en kaffekopp eller en bit bord kan se kortlik ut.
         Utan att det sägs rakt ut väljer modellen helst NÅGOT ur listan, och
         då hamnar ett påhittat kort i spelarens hand. Därför står det både att
         0 är ett fullgott svar och vad "hog" faktiskt ska betyda. */
      system: 'Du identifierar Magic: the Gathering-kort på suddiga webbkamerafoton. ' +
        'Du får en beskuren bild och en numrerad lista med kandidater ur spelarnas set. ' +
        'Bilden är automatiskt utklippt och föreställer INTE alltid ett kort — det kan ' +
        'vara en kortask, en tärning, en telefon, en hand eller bara bordet. Den kan ' +
        'också vara ett kort som inte finns i listan. I båda fallen är 0 rätt svar. ' +
        'Att gissa fel är sämre än att svara 0, för svaret hamnar direkt i spelarens ' +
        'hand utan kontroll. Svara bara med JSON.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text:
            `Vilket av dessa kort är på bilden?\n\n${list.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n` +
            `Titta på konstverket, ramfärgen och kortnamnet.\n\n` +
            `Svara 0 om bilden inte föreställer ett Magic-kort, eller om kortet inte ` +
            `finns bland kandidaterna.\n\n` +
            `Säkerhet:\n` +
            `- "hog" bara när du kan läsa kortnamnet, eller känner igen konstverket utan tvekan\n` +
            `- "medel" när konstverket verkar stämma men du inte kan läsa namnet\n` +
            `- "lag" när du mest gissar\n\n` +
            `Svara med enbart JSON:\n` +
            `{"n": <radnummer 1-${list.length}, eller 0>, "sakerhet": "hog"|"medel"|"lag"}` }
        ]
      }]
    });

    const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return res.status(200).json({ n: 0, sakerhet: 'lag', usage: anvandning(msg), modell: MODEL });
    const j = JSON.parse(m[0]);
    return res.status(200).json({
      n: Number(j.n) || 0,
      sakerhet: ['hog', 'medel', 'lag'].includes(j.sakerhet) ? j.sakerhet : 'medel',
      usage: anvandning(msg), modell: MODEL
    });
  } catch (e) {
    const s = e && e.status;
    // Felmeddelanden från leverantören kan innehålla detaljer om kontot —
    // klienten får en generell text, orsaken hamnar i serverloggen.
    console.error('identify:', s || '', (e && e.message) || e);
    if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
    if (s === 429) return res.status(429).json({ error: 'Too many requests right now' });
    if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
    return res.status(502).json({ error: 'Could not reach the image service' });
  }
}

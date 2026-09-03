/* ══════════════════════════════════════════════════════════════════
   Serverfunktion för kortidentifiering.

   Nyckeln ligger HÄR, i en miljövariabel, och lämnar aldrig servern.
   Klienten skickar en bild och en lista kandidater och får tillbaka ett
   radnummer. Det är så en produkt normalt hanterar en API-nyckel: ingen
   användare har en egen, och ingen kan läsa din ur webbläsaren.

   Miljövariabler (Vercel → Settings → Environment Variables):
     ANTHROPIC_API_KEY   krävs
     ALLOWED_ORIGINS     kommaseparerad lista, t.ex. https://handvy.vercel.app
                         Utelämnad = alla ursprung tillåts (bara för test).
     ANTHROPIC_MODEL     valfritt, standard claude-opus-5
     RATE_PER_MIN        valfritt, standard 40 anrop per IP och minut
     RATE_PER_DAY        valfritt, standard 600 anrop per IP och dygn
   ══════════════════════════════════════════════════════════════════ */
import Anthropic from '@anthropic-ai/sdk';

const MAX_IMAGE_B64 = 900_000;          // ~650 kB bild
const MAX_NAMES = 25;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
/* Höjs när helrutspromten ändras. Utan den gick det inte att skilja "modellen
   svarade så här" från "deployen hade inte hunnit ut" — det kostade två
   felaktiga slutsatser under utvecklingen. */
const PANE_PROMPT_V = 8;

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
    return res.status(200).json({ ok: true, ready: !!process.env.ANTHROPIC_API_KEY, model: MODEL, promptv: PANE_PROMPT_V });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST krävs' });
  if (origin && !ok) return res.status(403).json({ error: 'Otillåtet ursprung' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Servern saknar ANTHROPIC_API_KEY' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'okänd';
  const gate = allow(ip);
  if (!gate.ok) {
    res.setHeader('Retry-After', String(gate.retry));
    return res.status(429).json({ error: 'För många anrop — försök igen om en stund' });
  }

  const { image, names, mode } = req.body || {};
  if (typeof image !== 'string' || !image)
    return res.status(400).json({ error: 'Skicka { image: base64 }' });
  if (image.length > MAX_IMAGE_B64) return res.status(413).json({ error: 'Bilden är för stor' });

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
      const client = new Anthropic({ apiKey: key });
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
            ...BASLAND.map(([, url]) => ({ type: 'image', source: { type: 'url', url } })),
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
      if (!m) return res.status(200).json({ kort: [], varfor: 'inget-json', promptv: PANE_PROMPT_V });
      const j = JSON.parse(m[0]);
      const namn = BASLAND.map(b => b[0]);
      const k = (Array.isArray(j.kort) ? j.kort : []).slice(0, 1)
        .filter(x => x && namn.includes(x.namn))
        .map(x => ({ namn: x.namn, x: 500, y: 500,
                     sakerhet: ['hog', 'medel', 'lag'].includes(x.sakerhet) ? x.sakerhet : 'medel' }));
      return res.status(200).json({ kort: k, promptv: PANE_PROMPT_V });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/land:', s || '', (e && e.message) || e);
      if (s === 429) return res.status(429).json({ error: 'För många anrop just nu' });
      return res.status(502).json({ error: 'Kunde inte nå bildtjänsten' });
    }
  }

  if (mode === 'card') {
    try {
      const client = new Anthropic({ apiKey: key });
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        output_config: { effort: 'high' },
        system:
          'Du identifierar ETT Magic: the Gathering-kort på en närbild från en webbkamera ' +
          'ovanför ett spelbord. Bilden är uppförstorad ur en större bild och därför suddig. ' +
          'Kortet som ska namnges är det i MITTEN — grannkort i kanterna ska ignoreras. ' +
          'Kortet kan ligga upp och ner eller snett. ' +
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
      if (!m) return res.status(200).json({ kort: [], varfor: 'inget-json', promptv: PANE_PROMPT_V });
      const j = JSON.parse(m[0]);
      const k = (Array.isArray(j.kort) ? j.kort : [])
        .filter(x => x && typeof x.namn === 'string')
        .slice(0, 1)
        .map(x => ({ namn: String(x.namn).slice(0, 120).trim(), x: 500, y: 500,
                     sakerhet: ['hog', 'medel', 'lag'].includes(x.sakerhet) ? x.sakerhet : 'medel' }));
      return res.status(200).json({ kort: k, promptv: PANE_PROMPT_V });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/card:', s || '', (e && e.message) || e);
      if (s === 429) return res.status(429).json({ error: 'För många anrop just nu' });
      return res.status(502).json({ error: 'Kunde inte nå bildtjänsten' });
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
          'telefoner. Räkna inte heller med SpellTables eget gränssnitt som ligger ovanpå ' +
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
          stop: msg.stop_reason || null, svar: txt.slice(0, 400) });
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
      return res.status(200).json({ kort, promptv: PANE_PROMPT_V });
    } catch (e) {
      const s = e && e.status;
      console.error('identify/pane:', s || '', (e && e.message) || e);
      if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
      if (s === 429) return res.status(429).json({ error: 'För många anrop just nu' });
      if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
      return res.status(502).json({ error: 'Kunde inte nå bildtjänsten' });
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
    if (!m) return res.status(200).json({ n: 0, sakerhet: 'lag' });
    const j = JSON.parse(m[0]);
    return res.status(200).json({
      n: Number(j.n) || 0,
      sakerhet: ['hog', 'medel', 'lag'].includes(j.sakerhet) ? j.sakerhet : 'medel'
    });
  } catch (e) {
    const s = e && e.status;
    // Felmeddelanden från leverantören kan innehålla detaljer om kontot —
    // klienten får en generell text, orsaken hamnar i serverloggen.
    console.error('identify:', s || '', (e && e.message) || e);
    if (s === 401) return res.status(503).json({ error: 'Serverns nyckel avvisades' });
    if (s === 429) return res.status(429).json({ error: 'För många anrop just nu' });
    if (s === 400) return res.status(400).json({ error: 'Bilden kunde inte behandlas' });
    return res.status(502).json({ error: 'Kunde inte nå bildtjänsten' });
  }
}

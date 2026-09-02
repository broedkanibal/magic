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
    return res.status(200).json({ ok: true, ready: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
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

  const { image, names } = req.body || {};
  if (typeof image !== 'string' || !Array.isArray(names) || !names.length)
    return res.status(400).json({ error: 'Skicka { image: base64, names: [...] }' });
  if (image.length > MAX_IMAGE_B64) return res.status(413).json({ error: 'Bilden är för stor' });

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

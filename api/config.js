/* ══════════════════════════════════════════════════════════════════
   Publik klientkonfiguration.

   Supabase-projektets adress och anon-nyckel behöver nå webbläsaren.
   Ingen av dem är hemlig — anon-nyckeln är gjord för att ligga i
   klientkod, och det som skyddar data är radsäkerheten i databasen,
   inte att nyckeln är svår att hitta. Men de ligger ändå i
   miljövariabler i stället för i index.html: då går det att byta
   Supabase-projekt, eller köra ett eget för test, utan att röra koden
   eller committa något projektspecifikt.

   Miljövariabler (Vercel → Settings → Environment Variables):
     SUPABASE_URL        t.ex. https://abcdefgh.supabase.co
     SUPABASE_ANON_KEY   anon public-nyckeln

   Saknas de svarar rutten ändå, med konfigurerad: false. Appen ska
   kunna starta i lokalt läge utan Supabase — inloggningen är då
   avstängd, inte trasig.
   ══════════════════════════════════════════════════════════════════ */

const hostOf = u => { try { return new URL(u).host.toLowerCase(); } catch { return ''; } };

function originAllowed(origin, host) {
  if (!origin) return true;
  const oHost = hostOf(origin);
  if (!oHost) return false;
  if (host && oHost === String(host).toLowerCase()) return true;
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return true;                          // ingen lista satt = öppet
  return raw.split(',').map(s => s.trim()).filter(Boolean)
    .some(a => (hostOf(a) || hostOf('https://' + a)) === oHost);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin && originAllowed(origin, req.headers.host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  /* Kort cache: adressen ändras i praktiken aldrig, men byter man
     projekt vill man inte vänta en timme på att klienterna märker det. */
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ fel: 'Bara GET' });

  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();

  res.status(200).json({
    ok: true,
    konfigurerad: !!(url && key),
    supabaseUrl: url || null,
    supabaseAnonKey: key || null
  });
}

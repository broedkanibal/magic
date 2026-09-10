/* Liten teststubb: serverar mappen och svarar på /api/identify utan att
   anropa Anthropic. Används för att verifiera klientkopplingen.

   VIKTIGT: stubben svarade tidigare {n:1, sakerhet:'hog'} på allt, utan att
   ens titta på bilden. Klienten lägger till kort automatiskt vid 'hog', så
   varje osäkert område stämplades som säkert och hamnade i handen med den
   lokala matchningens toppgissning. Det gav falska kort som såg ut att komma
   från Claude. En testdubbel som ljuger är värre än ingen alls.

   Nu svarar den som en försiktig modell: 0 = "inget av kandidaterna passar",
   vilket låter kortet ligga kvar i granskningslistan. Sätt STUB_AI=accept för
   att medvetet testa acceptvägen, eller STUB_AI=medel för mellanläget. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname + '/..';
/* PORT går att sätta. Standard 8232, som förut — men två attrapper med olika
   STUB_-lägen ska kunna köras samtidigt, och en glömd gammal instans på 8232
   ska inte hindra att den nya koden går att prova. */
const PORT = +(process.env.PORT || 8232);
/* MESA_AI=1 (eller flaggan --ai): /api/identify går till den RIKTIGA handlern i
   api/identify.js, med nyckeln ur .env.local, i stället för attrappen. Utan
   den beter sig stubben exakt som förut. Varför inte `vercel dev`: den
   serverar inte dev/bilder (gitignorerad), och golden setet (kor.cjs)
   startar just den här stubben på en egen port — kameraläget mättes så,
   60 anrop mot leken utan Vercel emellan. Nyckeln läses in i processen och
   skrivs aldrig ut; ANTHROPIC_MODEL i miljön styr modellen som vanligt. */
const AI = process.env.MESA_AI === '1' || process.argv.includes('--ai');
let handlerP = null;
function laddaHandler() {
  if (!handlerP) handlerP = (async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      let env = '';
      try { env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8'); } catch (e) {}
      /* Vercel CLI skriver värdet inom citattecken; en handskriven rad har inga. */
      const m = env.match(/^\s*ANTHROPIC_API_KEY\s*=\s*("?)(.*?)\1\s*$/m);
      if (m && m[2]) process.env.ANTHROPIC_API_KEY = m[2];
    }
    /* Dynamisk import: package.json säger "type": "module", så handlern är en
       ES-modul och stubben en .cjs — require() går inte. */
    return (await import(require('url').pathToFileURL(path.join(ROOT, 'api', 'identify.js')).href)).default;
  })();
  return handlerP;
}
/* Handlern är skriven för Vercel: req.body är redan JSON-parsad och res har
   status().json(). Nodes egna req/res saknar det — en liten adapter, inget
   mer, så att samma fil kör här som där. */
function riktig(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    req.body = null;
    if (body) {
      try { req.body = JSON.parse(body); }
      catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'trasig JSON' })); }
    }
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    res.send = d => { res.end(typeof d === 'string' || Buffer.isBuffer(d) ? d : JSON.stringify(d)); return res; };
    try { await (await laddaHandler())(req, res); }
    catch (e) {
      console.error('stub/ai: handlern kastade', e && e.message);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'handlern kastade' })); }
      else res.end();
    }
  });
}
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.md':'text/markdown',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.css':'text/css' };
http.createServer((req, res) => {
  try { hantera(req, res); }
  catch (e) { console.error('stub: fel i begäran', e && e.message); try { res.writeHead(500); res.end('500'); } catch (e2) {} }
}).listen(PORT, () => {
  const mode = process.env.STUB_AI || 'none';
  console.log('stub på http://localhost:' + PORT);
  if (AI) {
    console.log('MESA_AI=1: /api/identify går till api/identify.js med nyckeln ur .env.local — RIKTIGA anrop, kostar pengar.');
    console.log(`     ANTHROPIC_MODEL=${process.env.ANTHROPIC_MODEL || '(standard i api/identify.js)'}`);
    laddaHandler().then(() => console.log('     handlern laddad' + (process.env.ANTHROPIC_API_KEY ? '' : ' — MEN INGEN NYCKEL hittades i miljön eller .env.local, svaren blir 503')),
                        e => console.error('     kunde inte ladda api/identify.js:', e && e.message));
    return;
  }
  console.log('OBS: /api/identify är en ATTRAPP och tittar inte på bilden.');
  console.log(`     STUB_AI=${mode} — ` + (mode === 'accept'
    ? 'svarar alltid kandidat 1 med hög säkerhet (kort läggs till automatiskt!)'
    : mode === 'medel' ? 'svarar kandidat 1 med medelsäkerhet (hamnar i granskningslistan)'
    : 'svarar "inget passar" — kort stannar i granskningslistan, som med en försiktig modell'));
  console.log(`     STUB_LEK=${process.env.STUB_LEK || 'tomt'} — ` + (process.env.STUB_LEK === 'kort'
    ? 'lekfotot svarar med elva kort, dubbletter och en trasig rad'
    : process.env.STUB_LEK === 'trasigt' ? 'lekfotot svarar utan JSON'
    : 'lekfotot svarar "inga kort" — sätt STUB_LEK=kort för att prova listan'));
  console.log('     Riktig igenkänning testas mot produktionsdeployen, inte här.');
});
/* Ett kastat undantag i lyssnaren dödar annars processen — en enda konstig
   GET från nätet räckte (granskningen: ett huvud med tecken utanför Latin-1). */
function hantera(req, res) {
  const u = new URL(req.url, 'http://x');
  /* Klienten frågar efter Supabase-nycklarna vid varje start. Utan den här
     rutten får den 404, tolkar det som "inte konfigurerad" och visar
     landningssidan med inloggningen avstängd — vilket är rätt beteende, men
     stubben kan lika gärna svara ärligt. Vill man testa inloggningen lokalt
     sätter man SUPABASE_URL och SUPABASE_ANON_KEY i miljön innan start. */
  if (u.pathname === '/api/config') {
    const url = (process.env.SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_ANON_KEY || '').trim();
    res.writeHead(200, Object.assign({ 'Content-Type':'application/json' }, cors()));
    return res.end(JSON.stringify({
      ok: true, konfigurerad: !!(url && key),
      supabaseUrl: url || null, supabaseAnonKey: key || null
    }));
  }
  if (u.pathname === '/api/identify' && AI) return riktig(req, res);
  if (u.pathname === '/api/identify') {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
    if (req.method === 'GET') {
      res.writeHead(200, Object.assign({ 'Content-Type':'application/json' }, cors()));
      /* promptv följer med. Utan den ser attrappen frisk ut i driftkollen
         utan att kunna svara på den enda fråga kollen ställer: kör den
         version av instruktionerna som ligger i koden? */
      return res.end(JSON.stringify({ ok:true, ready:true, model:'stub-model', promptv:20 }));
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let names = [];
      try { const j = JSON.parse(body); names = j.names || [];
            console.log(`stub: ${names.length} kandidater, bild ${Math.round((j.image||'').length/1024)} kB`); }
      catch (e) { console.log('stub: trasig body'); }
      // helrutsläget: svara med några kort på kända platser så att
      // koordinatmappningen går att kontrollera utan att betala för ett anrop
      let body2 = null;
      try { body2 = JSON.parse(body); } catch (e) {}
      /* Namnläget. STUB_NAMN sätter vad som svaras, så både "läste ett namn"
         och "såg inget" går att prova utan att betala för ett anrop.
         Standard är tomt: en försiktig modell som inte gissar. */
      if (body2 && body2.mode === 'namn') {
        const n = process.env.STUB_NAMN || '';
        const svar = n ? { namn: n, sakerhet: 'hog' } : { namn: '', sakerhet: 'lag' };
        console.log(`stub/namn: svarar ${JSON.stringify(svar)} (STUB_NAMN=${n || 'tomt'})`);
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors()));
        return res.end(JSON.stringify(svar));
      }
      /* Lekläget. Att fotografera hundra kort för att prova gränssnittet är
         inte rimligt, och ett riktigt anrop kostar pengar varje gång man
         flyttar en knapp. Standard är TOMT — en modell som inte ser några
         kort — så att den vägen inte råkar se ut att fungera.

         STUB_LEK=kort ger ett svar med den form som är svår att bygga rätt
         mot: fyra likadana Mountain som SKA bli en rad med antalet fyra,
         ett namn med kommatecken, ett tomt namn som ska hamna i
         ifyllnadslistan, ett namn som inte finns på Scryfall, och ett
         'medel' som ska bekräftas trots att det slås upp utan fel.
         STUB_LEK=trasigt svarar utan JSON, för felvägen. */
      if (body2 && body2.mode === 'lek') {
        const lage = process.env.STUB_LEK || 'tomt';
        const rad = (namn, x, y, sakerhet) => ({ namn, x, y, sakerhet });
        const svar = lage === 'trasigt' ? { kort: [], varfor: 'inget-json', promptv: 20 }
          : lage !== 'kort' ? { kort: [], otydliga: 0, promptv: 20 }
          : { kort: [
                rad('Sol Ring',            170, 120, 'hog'),
                rad('Arcane Signet',       170, 240, 'hog'),
                rad('Thalia, Guardian of Thraben', 170, 360, 'hog'),
                rad('',                    170, 480, 'lag'),
                rad('Lightning Bolt',      500, 120, 'medel'),
                rad('Mountain',            500, 240, 'hog'),
                rad('Mountain',            500, 360, 'hog'),
                rad('Mountain',            500, 480, 'hog'),
                rad('Mountain',            500, 600, 'hog'),
                rad('Blixtpil',            830, 120, 'lag'),
                rad('Swords to Plowshares', 830, 240, 'hog')
              ], otydliga: 2, promptv: 20 };
        console.log(`stub/lek: bild ${Math.round((body2.image||'').length/1024)} kB, svarar ${svar.kort.length} kort (STUB_LEK=${lage})`);
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors()));
        return res.end(JSON.stringify(svar));
      }
      if (body2 && (body2.mode === 'pane' || body2.mode === 'card')) {
        const narbild = body2.mode === 'card';
        const lage = process.env.STUB_PANE || 'none';
        /* Härmar det verkliga beteendet: en hel ruta ger positioner utan namn,
           en närbild ger ett namn. Det är så tvåstegsflödet går att prova
           utan att betala för riktiga anrop. */
        const svar = lage !== 'kort' ? { kort: [] }
          : narbild
            ? { kort: [ { namn: 'Swamp', x: 500, y: 500, sakerhet: 'hog' },
                        { namn: 'Grannkort', x: 900, y: 500, sakerhet: 'lag' } ] }
            : { kort: [ { namn: '',      x: 250, y: 300, sakerhet: 'lag' },
                        { namn: '',      x: 500, y: 500, sakerhet: 'lag' },
                        { namn: 'Plains', x: 750, y: 700, sakerhet: 'hog' } ] };
        console.log(`stub/pane: bild ${Math.round((body2.image||'').length/1024)} kB, svarar ${svar.kort.length} kort (STUB_PANE=${process.env.STUB_PANE || 'none'})`);
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors()));
        return res.end(JSON.stringify(svar));
      }
      const mode = process.env.STUB_AI || 'none';
      const svar = !names.length ? { n: 0, sakerhet: 'lag' }
        : mode === 'accept' ? { n: 1, sakerhet: 'hog' }
        : mode === 'medel'  ? { n: 1, sakerhet: 'medel' }
        : { n: 0, sakerhet: 'lag' };
      console.log(`stub: svarar ${JSON.stringify(svar)} (STUB_AI=${mode})`);
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors()));
      res.end(JSON.stringify(svar));
    });
    return;
  }
  // pathname är URL-kodad: filnamn med mellanslag kom fram som %20 och gav 404
  let rel;
  try { rel = decodeURIComponent(u.pathname); } catch (e) { rel = u.pathname; }
  /* Inga punktfiler eller punktmappar, någonstans i sökvägen: .env.local med
     nyckeln ligger i roten, och servern lyssnar på alla gränssnitt så att
     telefonen når den. Kontrollen på hela sökvägen — inte bara namnet i en
     listning — så att '/.git/' och '/dev/..%2f' inte kommer runt den. */
  if (rel.split('/').some(seg => seg.startsWith('.'))) { res.writeHead(403); return res.end('403'); }
  const rot = path.resolve(ROOT);
  const f = path.resolve(rot, '.' + (rel === '/' ? '/index.html' : rel));
  if (f !== rot && !f.startsWith(rot + path.sep)) { res.writeHead(403); return res.end('403'); }
  /* En mapp svarar med sitt innehåll som JSON. Golden setet (dev/golden/kor.html)
     hittar sina fall genom att lista dev/golden/fall/: ett fall är en mapp, och
     att lägga till ett ska inte kräva en lista som hålls i handen — den listan
     hade legat ett fall efter så snart någon glömt den. Pythons http.server
     listar mappar som HTML; kor.html läser båda formerna. Roten listas inte:
     den är index.html. */
  let st = null; try { st = fs.statSync(f); } catch (e2) {}
  if (st && st.isDirectory() && f !== rot) {
    /* Location byggs av den KODADE sökvägen: ett avkodat tecken utanför
       Latin-1 i ett huvud får writeHead att kasta, och undantaget tar hela
       processen med sig. */
    if (!rel.endsWith('/')) { res.writeHead(301, { Location: u.pathname + '/' }); return res.end(); }
    let poster = [];
    try { poster = fs.readdirSync(f, { withFileTypes: true }).filter(e2 => !e2.name.startsWith('.')).map(e2 => ({ namn: e2.name, mapp: e2.isDirectory() })); } catch (e2) {}
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors()));
    return res.end(JSON.stringify(poster));
  }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    /* Även statiska filer får CORS. Testbilderna ligger i dev/bilder som är
       gitignorerad, och vercel dev serverar därför inte den mappen — vill man
       köra sidan mot riktiga Claude måste bilden gå att hämta härifrån. */
    res.writeHead(200, Object.assign(
      { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }, cors()));
    res.end(d);
  });
}
function cors(){ return { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type,X-Group-Password' }; }

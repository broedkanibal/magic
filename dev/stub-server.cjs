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
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.md':'text/markdown',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.css':'text/css' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/identify') {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
    if (req.method === 'GET') {
      res.writeHead(200, Object.assign({ 'Content-Type':'application/json' }, cors()));
      return res.end(JSON.stringify({ ok:true, ready:true, model:'stub-model' }));
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
  const f = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!f.startsWith(path.resolve(ROOT))) { res.writeHead(403); return res.end('403'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(8232, () => {
  const mode = process.env.STUB_AI || 'none';
  console.log('stub på http://localhost:8232');
  console.log('OBS: /api/identify är en ATTRAPP och tittar inte på bilden.');
  console.log(`     STUB_AI=${mode} — ` + (mode === 'accept'
    ? 'svarar alltid kandidat 1 med hög säkerhet (kort läggs till automatiskt!)'
    : mode === 'medel' ? 'svarar kandidat 1 med medelsäkerhet (hamnar i granskningslistan)'
    : 'svarar "inget passar" — kort stannar i granskningslistan, som med en försiktig modell'));
  console.log('     Riktig igenkänning testas mot produktionsdeployen, inte här.');
});
function cors(){ return { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type,X-Group-Password' }; }

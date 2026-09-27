// Kör varje fråga mot Scryfall sorterad på EDHREC-rank och räknar träffar bland topp 2000 (rank <= 2011).
const fs = require('fs');
const Q = require('./fragor.js');
const GRANS = 2011;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = { 'User-Agent': 'MesaResearch/1.0', 'Accept': 'application/json' };
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;

async function get(url) {
  for (let f = 0; f < 6; f++) {
    try {
      const r = await fetch(url, { headers: H });
      await sleep(1000);
      if (r.status === 429 || r.status >= 500) { console.error("status", r.status); await sleep(30000); continue; }
      return await r.json();
    } catch (e) { console.error('fel', e.message); await sleep(3000); }
  }
  throw new Error('gav upp: ' + url);
}

(async () => { await sleep(+(process.env.VANTA||0));
  const utfil = 'fraga-res.json';
  const ut = fs.existsSync(utfil) ? JSON.parse(fs.readFileSync(utfil)) : {};
  for (const [grupp, namn, expr] of Q) {
    if (only && !only.test(namn)) continue;
    if (process.env.SAKNAS && ut[namn]) continue;
    const q = 'f:commander ' + expr;
    let url = 'https://api.scryfall.com/cards/search?order=edhrec&q=' + encodeURIComponent(q);
    let total = 0, hits = [], err = null, warn = [], ex0 = [];
    for (let p = 0; p < 8 && url; p++) {
      const j = await get(url);
      if (j.object === 'error') { if (j.status === 404) { total = 0; } else err = j.details; break; }
      if (p === 0) { total = j.total_cards; warn = j.warnings || []; ex0 = j.data.slice(0, 4).map(c => c.name + " (" + c.edhrec_rank + ")"); }
      let stop = false;
      for (const c of j.data) {
        if (c.edhrec_rank != null && c.edhrec_rank <= GRANS) hits.push({ n: c.name, r: c.edhrec_rank });
        else stop = true;
      }
      url = (!stop && j.has_more) ? j.next_page : null;
    }
    const rec = { grupp, namn, q, total, n: hits.length, t100: hits.filter(h => h.r <= 100).length, t500: hits.filter(h => h.r <= 501).length, err, warn, hits, ex0 };
    ut[namn] = rec;
    console.log(`${namn} | ${rec.n} / ${total}${err ? ' ERR ' + err : ''}${warn.length ? ' WARN ' + warn.join(';') : ''} | ${hits.slice(0, 5).map(h => h.n).join('; ')}`);
    fs.writeFileSync(utfil, JSON.stringify(ut, null, 1));
  }
})();

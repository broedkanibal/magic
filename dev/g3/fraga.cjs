'use strict';
/* MES-364 (G3): Claude som lärare på appens 61 riktiga beskärningar.
   Kortlägets instruktioner läses ur api/identify.js (mode === 'card') och används oförändrade.

     node dev/g3/fraga.cjs <konfig> <körning> [--antal N] [--tak USD]
     konfig: opus5-medium | opus55-medium | opus55-low | sonnet55-medium | sonnet55-low | haiku55-medium | sonnet5-medium

   Resultat: dev/g3/resultat/<konfig>-k<körning>.json. Kostnaden loggas i dev/g3/resultat/kostnad.jsonl och
   alla körningar stoppar när summan nått taket (förval 4,90 USD av de 5 som Jesper godkänt). */
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const ROT = path.resolve(__dirname, '..', '..');
const RES = path.join(__dirname, 'resultat');
const LEDGER = path.join(RES, 'kostnad.jsonl');

const KONFIG = {
  'opus5-medium':    { model: 'claude-opus-5',     effort: 'medium' },
  'opus55-medium':   { model: 'claude-opus-5-5',   effort: 'medium' },
  'opus55-low':      { model: 'claude-opus-5-5',   effort: 'low' },
  'sonnet55-medium': { model: 'claude-sonnet-5-5', effort: 'medium' },
  'sonnet55-low':    { model: 'claude-sonnet-5-5', effort: 'low' },
  'haiku55-medium':  { model: 'claude-haiku-5-5',  effort: 'medium' },
  'sonnet5-medium':  { model: 'claude-sonnet-5',   effort: 'medium' },   // kodens förval för kortläget (MODEL_KORT)
};
// USD per miljon token (indata, utdata). Haiku 5.5: upp till 100 000 token i prompten.
const PRIS = { 'claude-opus-5': [5, 25], 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-sonnet-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5] };

function kostnad(model, u) {
  const [i, o] = PRIS[model];
  const ind = (u.input_tokens || 0) + 1.25 * (u.cache_creation_input_tokens || 0) + 0.1 * (u.cache_read_input_tokens || 0);
  return (ind * i + (u.output_tokens || 0) * o) / 1e6;
}
function summa() {
  try { return fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).reduce((s, r) => s + JSON.parse(r).usd, 0); } catch (e) { return 0; }
}

/* Kortlägets system- och frågetext, exakt som i api/identify.js. */
function kortprompt() {
  const src = fs.readFileSync(path.join(ROT, 'api', 'identify.js'), 'utf8');
  const a = src.indexOf("if (mode === 'card') {");
  const b = src.indexOf('const msg = await stream.finalMessage()', a);
  const blk = src.slice(a, b);
  const s0 = blk.indexOf('system:') + 'system:'.length, s1 = blk.indexOf('messages: [');
  const system = new Function('return (' + blk.slice(s0, blk.lastIndexOf(',', s1)) + ')')();
  const t0 = blk.indexOf("{ type: 'text', text:") + "{ type: 'text', text:".length, t1 = blk.indexOf('}\n          ]', t0);
  const fraga = new Function('return (' + blk.slice(t0, t1) + ')')();
  const mm = blk.match(/max_tokens: (\d+)/);
  return { system, fraga, maxTokens: +mm[1] };
}

function env() {
  for (const r of fs.readFileSync(path.join(ROT, '.env.local'), 'utf8').split('\n')) {
    const m = r.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

(async () => {
  const pos = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const arg = (n, f) => { const i = process.argv.indexOf('--' + n); return i < 0 ? f : process.argv[i + 1]; };
  const [namn, kor] = pos;
  const K = KONFIG[namn];
  if (!K || !kor) { console.error('node dev/g3/fraga.cjs <konfig> <körning>\nkonfig: ' + Object.keys(KONFIG).join(' | ')); process.exit(2); }
  const TAK = +arg('tak', '4.9'), ANTAL = +arg('antal', '0');
  env();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { system, fraga, maxTokens } = kortprompt();
  const man = JSON.parse(fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', 'manifest.json'), 'utf8'));
  const lista = ANTAL ? man.slice(0, ANTAL) : man;
  const ut = [];
  const fil = path.join(RES, `${namn}-k${kor}.json`);
  console.error(`${namn} körning ${kor}: ${K.model}, effort ${K.effort}, ${lista.length} beskärningar, max_tokens ${maxTokens}; hittills ${summa().toFixed(3)} USD`);
  for (const p of lista) {
    if (summa() >= TAK) { console.error('KOSTNADSTAKET NÅTT, stoppar'); break; }
    const bild = fs.readFileSync(path.join(ROT, 'dev', 'embed', 'riktiga', p.fil)).toString('base64');
    const t0 = Date.now();
    const rad = { fil: p.fil, facit: p.namn, skymd: p.skymd };
    try {
      const stream = client.messages.stream({
        model: K.model, max_tokens: maxTokens, output_config: { effort: K.effort }, system,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: bild } },
          { type: 'text', text: fraga }] }],
      });
      const msg = await stream.finalMessage();
      rad.ms = Date.now() - t0;
      const txt = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      rad.text = txt.slice(0, 600); rad.stop = msg.stop_reason; rad.usage = msg.usage;
      const m = txt.match(/\{[\s\S]*\}/);
      try {
        const j = JSON.parse(m[0]);
        const k = (Array.isArray(j.kort) ? j.kort : []).filter(x => x && typeof x.namn === 'string')[0];
        rad.namn = k ? String(k.namn).slice(0, 120).trim() : ''; rad.sakerhet = k ? k.sakerhet : null;
      } catch (e) { rad.namn = ''; rad.fel = 'inget-json'; }
      rad.usd = kostnad(K.model, msg.usage);
      fs.appendFileSync(LEDGER, JSON.stringify({ konfig: namn, kor, fil: p.fil, usd: rad.usd }) + '\n');
    } catch (e) {
      rad.ms = Date.now() - t0; rad.fel = (e && e.status ? e.status + ' ' : '') + String((e && e.message) || e).slice(0, 300); rad.namn = ''; rad.usd = 0;
      console.error('  FEL', p.fil, rad.fel);
      if (e && (e.status === 400 || e.status === 404 || e.status === 401)) { ut.push(rad); break; }   // fel i konfigurationen: ingen idé att fortsätta
    }
    ut.push(rad);
    if (ut.length % 10 === 0) console.error(`  ${ut.length}/${lista.length}, ${summa().toFixed(3)} USD`);
  }
  fs.writeFileSync(fil, JSON.stringify({ konfig: namn, kor, ...K, tid: new Date().toISOString(), rader: ut }, null, 1));
  const ok = ut.filter(r => !r.fel);
  console.error(`klart ${namn} k${kor}: ${ok.length} svar, ${ut.length - ok.length} fel, ${ut.reduce((s, r) => s + (r.usd || 0), 0).toFixed(3)} USD, median ${ok.map(r => r.ms).sort((a, b) => a - b)[ok.length >> 1]} ms -> ${path.relative(ROT, fil)}`);
})();

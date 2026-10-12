/* Problemrapporten (MES-365): Supabase med service role, för hamta.cjs,
   lista.cjs och gallra.cjs. Nyckeln läses ur miljön eller .env.local och
   skrivs aldrig ut. Bara fetch — inga paket. */
'use strict';
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..', '..');

function lasEnv() {
  const env = Object.assign({}, process.env), fil = path.join(ROT, '.env.local');
  if (fs.existsSync(fil)) for (const rad of fs.readFileSync(fil, 'utf8').split('\n')) {
    const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2];
  }
  return env;
}

function supa() {
  const env = lasEnv();
  const url = (env.SUPABASE_URL || '').replace(/\/$/, ''), nyckel = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !nyckel) { console.error('Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY (miljön eller .env.local).'); process.exit(2); }
  const h = (extra) => Object.assign({ apikey: nyckel, Authorization: 'Bearer ' + nyckel }, extra || {});
  async function rest(metod, vag, kropp, extra) {
    const r = await fetch(`${url}/rest/v1/${vag}`, { method: metod, headers: h(Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, extra)), body: kropp ? JSON.stringify(kropp) : undefined });
    const t = await r.text();
    if (!r.ok) throw new Error(`${metod} ${vag.split('?')[0]}: ${r.status} ${t.slice(0, 300)}`);
    return t ? JSON.parse(t) : null;
  }
  /* Allt under en mapp i hinken scans, rekursivt: [{ namn (relativt mappen), storlek }]. */
  async function lista(mapp) {
    const ut = [];
    async function gaa(prefix, rel) {
      const r = await fetch(`${url}/storage/v1/object/list/scans`, { method: 'POST', headers: h({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix: prefix + '/', limit: 1000, offset: 0 }) });
      if (!r.ok) throw new Error('storage list: ' + r.status + ' ' + (await r.text()).slice(0, 200));
      for (const o of await r.json()) {
        if (o.id == null) await gaa(prefix + '/' + o.name, rel + o.name + '/');   // en mapp
        else ut.push({ namn: rel + o.name, storlek: (o.metadata && o.metadata.size) || null });
      }
    }
    await gaa(mapp, '');
    return ut;
  }
  async function hamtaFil(sokvag) {
    const r = await fetch(`${url}/storage/v1/object/scans/${sokvag.split('/').map(encodeURIComponent).join('/')}`, { headers: h() });
    if (!r.ok) throw new Error('storage ' + sokvag + ': ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  async function laggUpp(sokvag, buf, typ) {
    const r = await fetch(`${url}/storage/v1/object/scans/${sokvag.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: h({ 'Content-Type': typ || 'application/octet-stream', 'x-upsert': 'false' }), body: buf });
    if (!r.ok) throw new Error('storage upp ' + sokvag + ': ' + r.status + ' ' + (await r.text()).slice(0, 200));
  }
  async function radera(sokvagar) {
    if (!sokvagar.length) return;
    const r = await fetch(`${url}/storage/v1/object/scans`, { method: 'DELETE', headers: h({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: sokvagar }) });
    if (!r.ok) throw new Error('storage radera: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  }
  /* Namn och e-post ur kontot (auth.users), för att Jesper ska kunna höra av sig. */
  const konton = new Map();
  async function konto(id) {
    if (!id) return null;
    if (konton.has(id)) return konton.get(id);
    let k = null;
    try {
      const r = await fetch(`${url}/auth/v1/admin/users/${id}`, { headers: h() });
      if (r.ok) { const u = await r.json(), m = u.user_metadata || {}; k = { namn: m.full_name || m.name || null, epost: u.email || null }; }
    } catch (e) {}
    konton.set(id, k);
    return k;
  }
  return { rest, lista, hamtaFil, laggUpp, radera, konto };
}

module.exports = { supa, lasEnv, ROT };

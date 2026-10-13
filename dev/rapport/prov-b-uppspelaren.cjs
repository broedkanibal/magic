/* Problemrapporten B (MES-366), DoD 1: en rapport med telefonens stillbilder genom hamta.cjs och uppspelaren.

   Kör:  node dev/rapport/prov-b-uppspelaren.cjs [--fall g09] [--ut <mapp>] [--bilder <mapp>]

   Det finns ingen inspelad rapport från en riktig telefon än. Provet bygger därför en med appens egen
   ringbuffert: golden-fallets video (dev/golden/fall/…/video.mp4) spelas i huvudlös Chrome med
   index.html, varje ruta ritas i analysbildens storlek (360 px) och går genom Stillbilder.steg() med
   spåren ur fallets riktiga bordslogg (dev/mattest/underlag, telefonens kedja utan Claude) — samma
   rutor som telefonen skickade. Klockan är videons (Date.now = start + videotid). Ringbufferten
   lämnas ut som A:s uppladdning gör (Rapport.stillbilder → bilder/ + index.json), paketet får
   bordsloggen och fallets händelser som mattans ändringar, och hamta.cjs bygger mappen
   (stillbilder.json). Sist: skärmdumpar ur uppspelaren (kor.cjs --rapport --bilder).

   Vad som INTE provas här: att Kamera anropar Stillbilder.steg i sitt steg (det gör golden-körningen:
   res.stillbilder per fall), och telefonens klocka mot datorns (offset 0 här; A:s prov mäter offset). */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROT = path.join(__dirname, '..', '..');
const { server, chrome, vanta } = require('../mattest/chrome.cjs');
const { lasFall } = require('../mattest/fall.cjs');
const { bygg, stillbilder } = require('./hamta.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const FALL = arg('--fall', 'g09');
const UT = path.resolve(arg('--ut', path.join(ROT, 'dev', 'diagnos', 'rapporter', 'R-PROVB')));
const BILDER = arg('--bilder', '');

(async () => {
  const f = lasFall(FALL);
  if (!f.media || f.media.slag !== 'video') { console.error('prov-b-uppspelaren: fallet har ingen video'); process.exit(2); }
  const T0 = Date.parse('2026-10-13T00:00:00Z');
  const srv = await server(path.join(ROT, 'index.html'), { '/__b/rader.json': () => JSON.stringify(f.rader) });
  const c = await chrome({ storlek: [1200, 900] });
  let ut;
  try {
    await c.cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/?debug` });
    for (let i = 0; i < 300; i++) { if (await c.ev("document.readyState === 'complete' && typeof Stillbilder === 'object'").catch(() => false)) break; await vanta(100); }
    ut = await c.ev(`(async () => {
      const rader = await (await fetch('/__b/rader.json')).json();
      const v = document.createElement('video'); v.muted = true; v.src = '/${f.media.fil}'; v.preload = 'auto';
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('videon')); });
      const AW = 360, AH = Math.round(AW * v.videoHeight / v.videoWidth);
      const c = document.createElement('canvas'); c.width = AW; c.height = AH; const x = c.getContext('2d', { willReadFrequently: true });
      const sok = s => new Promise(res => { const k = () => { v.removeEventListener('seeked', k); res(); }; v.addEventListener('seeked', k); v.currentTime = s; setTimeout(res, 3000); });
      const verklig = Date.now; Stillbilder.glom();
      const slut = Math.min(v.duration, rader[rader.length - 1].s + 1);
      let ri = 0, rad = null;
      for (let vt = 0; vt <= slut; vt += 0.25) {
        while (ri < rader.length && rader[ri].s <= vt + 1e-6) rad = rader[ri++];
        await sok(vt); x.drawImage(v, 0, 0, AW, AH);
        const spar = ((rad && rad.spar) || []).map(t => ({ id: t.id, namn: t.namn || null, saker: !!t.saker, tappad: !!t.tappad, tillstand: t.tillstand || 'klar', varfor: t.varfor || null,
          box: { x: t.x * AW, y: t.y * AH, w: t.w * AW, h: t.h * AH }, vilaX: t.vx != null ? t.vx * AW : null, vilaY: t.vy != null ? t.vy * AH : null }));
        Date.now = () => ${T0} + Math.round(vt * 1000);
        Stillbilder.steg(c, vt * 1000, spar, AW, AH);
        Date.now = verklig;
        for (let i = 0; i < 200 && Stillbilder.ko; i++) await new Promise(r => setTimeout(r, 2));
      }
      Date.now = () => ${T0} + Math.round(slut * 1000);
      const lista = Stillbilder.stillbilder();
      Date.now = verklig;
      const b64 = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(b); });
      const filer = [];
      for (const b of lista) filer.push({ namn: b.namn, data: await b64(b.blob) });
      return { filer, stat: Stillbilder.stat(), aw: AW, ah: AH, slut };
    })()`);
  } finally { await c.stang(); srv.close(); }

  /* Mappen som hamta.cjs skriver, ur ett paket som A:s uppladdning hade gett. */
  fs.rmSync(UT, { recursive: true, force: true });
  fs.mkdirSync(path.join(UT, 'bilder'), { recursive: true });
  for (const b of ut.filer) fs.writeFileSync(path.join(UT, 'bilder', b.namn), Buffer.from(b.data, 'base64'));
  const frys = T0 + Math.round(ut.slut * 1000);
  const lada = (f.facit || []).map(h => ({ t: T0 + Math.round(h.t * 1000), slag: 'matta', typ: h.typ, kort: h.kort, till: h.till || undefined, kalla: 'golden-facit' }));
  const p = { kod: 'R-PROVB', text: 'prov: golden ' + FALL + ' genom ringbufferten', tagg: null, kalla: 'rapport', frys, frysIso: new Date(frys).toISOString(), sida: 'dator',
    vy: { lage: 'bord', kamAnsluten: true }, miljo: { build: 'prov-b', spel: 'PROVB1' }, lada, matta: { mig: [] }, bordLogg: { start: T0, id: FALL, kapad: false, rader: f.rader },
    telefon: { svarade: true, offset: 0, rtt: 0, lada: [], miljo: { kamera: { upplosning: f.upplosning } } } };
  const sparade = ut.filer.map(b => 'bilder/' + b.namn);
  if (stillbilder(p, UT)) sparade.push('stillbilder.json');
  bygg(p, null, sparade, UT, null);
  const sb = JSON.parse(fs.readFileSync(path.join(UT, 'stillbilder.json'), 'utf8'));
  const medRutor = sb.bilder.filter(b => b.spar.length).length;
  console.log(`prov-b-uppspelaren: ${FALL}, ${sb.bilder.length} stillbilder (${sb.bilder.filter(b => b.orsak === 'tid').length} tid, ${sb.bilder.filter(b => b.orsak === 'handelse').length} händelse), ${medRutor} med spårens rutor, ${ut.stat.bytes} B → ${path.relative(process.cwd(), UT)}`);
  const okk = sb.bilder.length > 10 && medRutor > 5 && sb.bilder.every((b, i, l) => !i || l[i - 1].t <= b.t) && sb.bilder.every(b => b.finns);
  console.log(`${okk ? 'OK ' : 'FEL'}  stillbilder.json på datorns klocka, sorterad, varje bild finns, rutor på bilderna`);
  if (BILDER) {
    const s = [Math.round(ut.slut * 0.35 * 10) / 10, Math.round(ut.slut * 0.8 * 10) / 10];
    execFileSync(process.execPath, [path.join(ROT, 'dev', 'mattest', 'kor.cjs'), '--rapport', UT, '--bilder', path.resolve(BILDER), '--vid', s.map(x => 'rapport:' + x).join(',')], { stdio: 'inherit' });
  }
  process.exit(okk ? 0 : 1);
})().catch(e => { console.error('prov-b-uppspelaren: ' + e.message); process.exit(2); });

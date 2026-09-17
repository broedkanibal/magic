#!/usr/bin/env node
/* Inspelningsprovet (MES-190): sammanfattar passens loggar och dömer B mot A.

     node dev/insp/sammanfatta.cjs <logg.json> [<logg.json> …] [--md]

   Filerna är de som "Download recording + log" sparar (<pass>-logg.json:
   { telefon, dator }). Passets typ (A/B/C) läses ur loggen. Finns både A
   och B från samma telefon döms B mot gränserna som bestämdes före
   mätningen (planen, avsnitt 2). --md skriver tabellerna som markdown,
   färdiga för kommentaren på MES-190. */
const fs = require('fs');

const arg = process.argv.slice(2);
const md = arg.includes('--md');
const filer = arg.filter(a => a !== '--md');
if (!filer.length) { console.error('node dev/insp/sammanfatta.cjs <logg.json> [<logg.json> …] [--md]'); process.exit(1); }

const kv = (a, q) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const med = a => kv(a, 0.5);
const r1 = x => x == null ? '–' : (Math.round(x * 10) / 10).toString();
const r0 = x => x == null ? '–' : Math.round(x).toString();

function telefonNamn(ua) {
  if (!ua) return '?';
  const ios = /iPhone OS ([\d_]+)/.exec(ua), and = /Android ([\d.]+)[^)]*?; ([^;)]+)\)/.exec(ua);
  if (ios) return 'iPhone, iOS ' + ios[1].replace(/_/g, '.');
  if (and) return and[2].trim() + ', Android ' + and[1];
  return ua.slice(0, 60);
}

function sammanfatta(fil) {
  const logg = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const tel = logg.telefon || null, dat = logg.dator || null;
  const typ = (tel && tel.typ) || (dat && dat.typ) || '?';
  const tick = ((tel && tel.tick) || (dat && dat.tick) || []).slice(1);   // första fönstret är uppstart
  const s = { fil, id: logg.id || (tel && tel.id), typ, telefon: telefonNamn((tel && tel.ua) || (dat && dat.startad && dat.startad.ua)) };

  s.mime = tel ? tel.mime : dat && dat.startad && dat.startad.mime;
  const spa = tick.length ? tick[tick.length - 1].spa : tel && tel.spa;
  s.upplosning = spa && spa.w ? `${spa.w}×${spa.h}` : '–';
  s.kamera_fps = spa && spa.fps;
  s.langd_s = tick.length ? tick[tick.length - 1].s : null;

  s.steg_s = med(tick.map(t => t.steg_s));
  s.steg_ms = med(tick.map(t => t.steg_ms));
  s.steg_p95 = med(tick.map(t => t.steg_p95));
  s.steg_p95_max = kv(tick.map(t => t.steg_p95), 1);
  s.dia_ms = med(tick.map(t => t.dia_ms));
  /* Avkodade rutor i första hand: requestVideoFrameCallback (rutor_s) stryps
     när videon inte syns, och den mörka skärmen krymper videon till en prick. */
  const fps = t => t.kval_s != null ? t.kval_s : t.rutor_s;
  s.rutor_s = med(tick.map(fps));
  s.sek_under_12fps = tick.filter(t => fps(t) != null && fps(t) < 12).reduce((a, t) => a + (t.fonster_s || 5), 0);
  let lag = 0;
  for (let i = 1; i < tick.length; i++) if (tick[i].steg_s < 4 && tick[i - 1].steg_s < 4) lag++;
  s.fonster_under_4 = lag;
  const perMin = {};
  for (const t of tick) (perMin[Math.floor(t.s / 60)] = perMin[Math.floor(t.s / 60)] || []).push(t.steg_s);
  s.steg_s_per_min = Object.keys(perMin).sort((a, b) => a - b).map(k => med(perMin[k]));

  if (tel && tel.rec_start) {
    const slut = tel.rec_stopp || tel.stoppad || tick.length && tick[tick.length - 1].t;
    const min = (slut - tel.rec_start) / 60000;
    s.mb = tel.bytes / 1e6;
    s.mb_min = min > 0 ? s.mb / min : null;
    s.mbit_s = min > 0 ? tel.bytes * 8 / (min * 60) / 1e6 : null;
    const d = tel.delar || [];
    s.delar = d.length;
    s.bit_intervall_s = med(d.slice(1).map((x, i) => (x.t - d[i].t) / 1000));
    s.upp_ms = med(d.map(x => x.ms));
    s.upp_ms_max = kv(d.map(x => x.ms), 1);
    s.omforsok = d.filter(x => x.forsok > 0).length;
    s.ko_max = kv(tick.map(t => t.ko), 1);
    s.ej_uppladdade = tel.kvar_i_ko || 0;
    s.bit_mb_max = kv(d.map(x => x.bytes / 1e6), 1);
  }
  const bat = tick.map(t => t.batteri).filter(Boolean);
  if (bat.length >= 2) {
    const min = (tick[tick.length - 1].s - tick[0].s) / 60;
    s.batteri = `${bat[0].niva} → ${bat[bat.length - 1].niva} %` + (bat.some(b => b.laddar) ? ' (laddade!)' : '');
    s.batteri_10min = min > 0 ? (bat[0].niva - bat[bat.length - 1].niva) / min * 10 : null;
  }
  const ping = ((dat && dat.ping) || []).filter(p => p.tTel != null);
  if (ping.length) {
    const b = ping.reduce((a, p) => p.rtt < a.rtt ? p : a);
    s.klocka_ms = b.off; s.klocka_fel_ms = b.rtt / 2;
    const bra = ping.filter(p => p.rtt <= Math.max(2 * b.rtt, b.rtt + 40));
    s.klocka_drift_ms = bra.length > 1 ? kv(bra.map(p => p.off), 1) - kv(bra.map(p => p.off), 0) : null;
  }
  s.morka = (tel && tel.morka || []).length;
  const kort = ((dat && dat.tick) || []).filter(t => t.kort != null);
  if (kort.length) {
    s.kort_max = Math.max(...kort.map(t => t.kort));
    const fem = kort.find(t => t.kort >= 5);
    s.fem_kort_s = fem ? fem.s : null;
  }
  s.fel = [].concat((tel && tel.fel) || [], (dat && dat.klar && dat.klar.fel) || []).map(f => f.fel);
  s.stopp = tel ? tel.orsak : dat && dat.orsak;
  return s;
}

const pass = filer.map(sammanfatta);

const rader = [
  ['Telefon', p => p.telefon], ['Pass', p => p.typ], ['Längd (s)', p => r0(p.langd_s)],
  ['Format', p => p.mime || '–'], ['Upplösning', p => p.upplosning], ['Kamerans takt (getSettings)', p => r1(p.kamera_fps)],
  ['Steg/s (median)', p => r1(p.steg_s)], ['Stegtid median (ms)', p => r1(p.steg_ms)],
  ['Stegtid p95 (ms, typisk / värsta)', p => `${r1(p.steg_p95)} / ${r1(p.steg_p95_max)}`], ['dia.ms (median)', p => r1(p.dia_ms)],
  ['Rutor/s (median)', p => r1(p.rutor_s)], ['Sek under 12 rutor/s', p => r0(p.sek_under_12fps)],
  ['10 s-fönster under 4 steg/s', p => r0(p.fonster_under_4)], ['Steg/s per minut', p => p.steg_s_per_min.map(r1).join(' ')],
  ['MB / MB per min', p => p.mb == null ? '–' : `${r1(p.mb)} / ${r1(p.mb_min)}`], ['Bithastighet (Mbit/s)', p => r1(p.mbit_s)],
  ['Bitar / sek mellan bitar / största bit (MB)', p => p.delar == null ? '–' : `${p.delar} / ${r1(p.bit_intervall_s)} / ${r1(p.bit_mb_max)}`],
  ['Uppladdning per bit (ms, median / max)', p => p.upp_ms == null ? '–' : `${r0(p.upp_ms)} / ${r0(p.upp_ms_max)}`],
  ['Omförsök / längsta kö / ej uppladdade', p => p.delar == null ? '–' : `${p.omforsok} / ${r0(p.ko_max)} / ${p.ej_uppladdade}`],
  ['Batteri (Android)', p => p.batteri ? `${p.batteri}, ${r1(p.batteri_10min)} %/10 min` : '– (läs av själv)'],
  ['Klockan telefon − dator (ms)', p => p.klocka_ms == null ? '–' : `${r0(p.klocka_ms)} ±${r0(p.klocka_fel_ms)}, drift ${r0(p.klocka_drift_ms)}`],
  ['Mörka markeringar', p => String(p.morka)], ['Kort på mattan (max) / 5 kort vid s', p => p.kort_max == null ? '–' : `${p.kort_max} / ${r0(p.fem_kort_s)}`],
  ['Stoppades av', p => p.stopp || '–'], ['Fel', p => p.fel.length ? [...new Set(p.fel)].join('; ') : '–']
];

function tabell(huvud, kropp) {
  if (md) {
    console.log('| ' + huvud.join(' | ') + ' |');
    console.log('|' + huvud.map(() => '---').join('|') + '|');
    for (const r of kropp) console.log('| ' + r.join(' | ') + ' |');
  } else {
    const b = huvud.map((h, i) => Math.max(h.length, ...kropp.map(r => String(r[i]).length)));
    const rad = r => r.map((c, i) => String(c).padEnd(b[i])).join('  ');
    console.log(rad(huvud)); console.log(b.map(n => '─'.repeat(n)).join('  '));
    for (const r of kropp) console.log(rad(r));
  }
  console.log('');
}

tabell(['', ...pass.map(p => p.id || p.fil)], rader.map(([namn, f]) => [namn, ...pass.map(f)]));

/* Domen: B mot A från samma telefon. */
for (const b of pass.filter(p => p.typ === 'B')) {
  const a = pass.find(p => p.typ === 'A' && p.telefon === b.telefon);
  if (!a) { console.log(`Ingen A-logg från ${b.telefon} att döma ${b.id} mot.\n`); continue; }
  const gr = [
    ['Steg/s (median) minst 90 % av A', b.steg_s >= 0.9 * a.steg_s, `${r1(b.steg_s)} mot ${r1(a.steg_s)}`],
    ['Stegtid p95 högst 1,25 × A', b.steg_p95 <= 1.25 * a.steg_p95, `${r1(b.steg_p95)} mot ${r1(a.steg_p95)} ms`],
    ['Under 12 rutor/s högst 30 s (när A inte var det)', !(b.sek_under_12fps > 30 && a.sek_under_12fps <= 30), `${r0(b.sek_under_12fps)} s mot ${r0(a.sek_under_12fps)} s`],
    ['Inget 10 s-fönster under 4 steg/s som A saknar', !(b.fonster_under_4 > 0 && a.fonster_under_4 === 0), `${b.fonster_under_4} mot ${a.fonster_under_4}`],
    /* Korten läggs ut under passets första minut och ska stå på mattan
       inom 30 s efter det: senast 90 s in i passet, i båda. */
    ['5 kort på mattan senast 90 s in i passet, i båda', a.fem_kort_s != null && a.fem_kort_s <= 90 && b.fem_kort_s != null && b.fem_kort_s <= 90, `A ${r0(a.fem_kort_s)} s, B ${r0(b.fem_kort_s)} s`]
  ];
  console.log(`Domen för ${b.telefon}: ${b.id} mot ${a.id}`);
  tabell(['Gräns', 'Uppfylld', 'Siffror'], gr.map(([g, ok, t]) => [g, ok ? 'ja' : 'NEJ', t]));
}

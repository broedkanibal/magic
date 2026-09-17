'use strict';
/* Riktiga beskärningar med facit, ur golden-fallen — utan att köra kedjan.

   Golden-baslinjerna (dev/golden/senaste-ai.json och senaste.json) bär varje
   spårs låda i bilden och namnet det fick. AI-baslinjen har rätt namn på alla
   57 kort (kontrollerat mot facit av kor.cjs), så dess lådor + namn ÄR facit
   per beskärning. Lådorna skärs ur fallets bild.jpg på samma sätt som
   Kamera.beskar() i index.html: 8 % marginal runt lådan, liggande kort vrids
   −90°, bredden högst 720 px. Den lokala körningens lådor (lite andra kanter)
   tas med som varianter när de överlappar en AI-låda (IoU ≥ 0,5).

     node dev/embed/riktiga.cjs          skriver dev/embed/riktiga/*.jpg + manifest.json
     node dev/embed/riktiga.cjs --ark    skriver också kontaktark (cache/riktiga-ark.jpg) */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GOLDEN = path.join(__dirname, '..', 'golden');
const UT = path.join(__dirname, 'riktiga');
const BESKAR_BREDD = 720, MARGINAL = 0.08;

const iou = (a, b) => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const s = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return s / (a.w * a.h + b.w * b.h - s);
};

async function beskar(bild, meta, t) {
  const W = meta.width, H = meta.height;
  let x = (t.x - t.w * MARGINAL) * W, y = (t.y - t.h * MARGINAL) * H, w = t.w * (1 + 2 * MARGINAL) * W, h = t.h * (1 + 2 * MARGINAL) * H;
  /* Utanför bilden blir svart i appen (genomskinligt → jpeg); här klipps lådan
     och fylls ut med svart så att kortets läge i beskärningen blir detsamma. */
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
  let s = sharp(bild).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .extend({ left: x0 - Math.round(x) > 0 ? x0 - Math.round(x) : 0, top: y0 - Math.round(y) > 0 ? y0 - Math.round(y) : 0,
              right: Math.max(0, Math.round(x + w) - W), bottom: Math.max(0, Math.round(y + h) - H), background: '#000' });
  let buf = await s.png().toBuffer();
  const liggande = w > h;
  if (liggande) buf = await sharp(buf).rotate(-90).png().toBuffer();
  const bredd = liggande ? h : w;
  const skala = Math.min(1, BESKAR_BREDD / bredd);
  const m = await sharp(buf).metadata();
  return sharp(buf).resize(Math.round(m.width * skala), Math.round(m.height * skala)).jpeg({ quality: 93 }).toBuffer({ resolveWithObject: true });
}

(async () => {
  fs.mkdirSync(UT, { recursive: true });
  const ai = Object.values(JSON.parse(fs.readFileSync(path.join(GOLDEN, 'senaste-ai.json'), 'utf8')));
  const lokal = Object.values(JSON.parse(fs.readFileSync(path.join(GOLDEN, 'senaste.json'), 'utf8')));
  const manifest = [];
  for (const fall of ai) {
    const mapp = path.join(GOLDEN, 'fall', fall.id);
    const facit = JSON.parse(fs.readFileSync(path.join(mapp, 'facit.json'), 'utf8'));
    const bild = fs.readFileSync(path.join(mapp, 'bild.jpg'));
    const meta = await sharp(bild).metadata();
    const kvar = facit.kort.map(k => k.namn);                     // facits namn, ett per exemplar
    const kortNr = fall.id.slice(0, 2);
    const mina = [];
    fall.spar.forEach((t, i) => {
      if (!t.namn || t.tillstand === 'skrap' || !t.saker) return;
      const j = kvar.indexOf(t.namn); if (j < 0) return;          // ett falskt spår (dubblett) — inte facit
      kvar.splice(j, 1);
      mina.push({ t, nr: i + 1, kalla: 'ai' });
    });
    const lok = lokal.find(f => f.id === fall.id);
    const varianter = [];
    for (const u of (lok ? lok.spar : [])) {
      if (u.tillstand === 'skrap') continue;
      let bast = null, bi = 0;
      for (const m of mina) { const v = iou(m.t, u); if (v > bi) { bi = v; bast = m; } }
      if (bast && bi >= 0.5 && bi < 0.98) varianter.push({ t: Object.assign({}, u, { namn: bast.t.namn }), nr: bast.nr, kalla: 'lokal', lokalNamn: u.namn, lokalSaker: !!u.saker });
    }
    for (const m of mina.concat(varianter)) {
      const r = await beskar(bild, meta, m.t);
      const fil = `${kortNr}-${String(m.nr).padStart(2, '0')}-${m.kalla}.jpg`;
      fs.writeFileSync(path.join(UT, fil), r.data);
      manifest.push({ fil, fall: fall.id, namn: m.t.namn, kalla: m.kalla, bredd: r.info.width, hojd: r.info.height,
                      kortsidaPx: Math.round(Math.min(m.t.w * meta.width, m.t.h * meta.height)),
                      skymd: !!m.t.skymd, helbild: !!(m.t.ai && m.t.ai.helbild), viaAi: m.t.varfor === 'ai' || m.t.varfor === 'helbild',
                      varfor: m.t.varfor, lada: { x: m.t.x, y: m.t.y, w: m.t.w, h: m.t.h } });
    }
    console.log(`${fall.id}: ${mina.length} kort + ${varianter.length} varianter${kvar.length ? ' — utan låda: ' + kvar.join(', ') : ''}`);
  }
  fs.writeFileSync(path.join(UT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`${manifest.filter(m => m.kalla === 'ai').length} beskärningar + ${manifest.filter(m => m.kalla !== 'ai').length} varianter → ${path.relative(process.cwd(), UT)}`);

  if (process.argv.includes('--ark')) {
    const cell = 150, kol = 10, rader = Math.ceil(manifest.length / kol);
    const delar = [];
    for (let i = 0; i < manifest.length; i++) {
      const b = await sharp(path.join(UT, manifest[i].fil)).resize(cell, Math.round(cell * 1.4), { fit: 'contain', background: '#222' }).toBuffer();
      delar.push({ input: b, left: (i % kol) * cell, top: Math.floor(i / kol) * Math.round(cell * 1.4) });
    }
    fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
    await sharp({ create: { width: kol * cell, height: rader * Math.round(cell * 1.4), channels: 3, background: '#222' } }).composite(delar).jpeg({ quality: 85 }).toFile(path.join(__dirname, 'cache', 'riktiga-ark.jpg'));
    manifest.forEach((m, i) => console.log(String(i).padStart(3), m.fil, m.namn, m.kortsidaPx + 'px', m.skymd ? 'skymd' : '', m.helbild ? 'helbild' : ''));
  }
})().catch(e => { console.error('FEL', e); process.exit(1); });

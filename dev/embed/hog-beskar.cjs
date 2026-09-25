'use strict';
/* Högbänkens fall som beskärningar för bänken (MES-287): stresstestet för
   den uträtade jämförelsen. Facit är högbänkens (dev/hogbank/facit.json på
   grenen mes-250-hoglasning, kopierad till cache/hog-facit.json): 68 lådor
   i golden-foton och rutor ur passet 2026-09-22 — högar, kort på kort, en
   hand över, ensamma kort. Lådorna skärs som Kamera.beskar() gör det (8 %
   marginal, liggande vrids −90°, bredd högst 720 px), samma som riktiga.cjs.

   Per fall skrivs vilka namn som är RÄTT att svara: spårets namn (kortet
   överst), `over`, `under` och `annat` ur facit. Ett säkert namn utanför den
   mängden är ett säkert FEL. Fall utan något känt namn (namn null, inget
   under/over/annat) räknas bara som "får inte bli säkert".

     git show mes-250-hoglasning:dev/hogbank/facit.json > dev/embed/cache/hog-facit.json
     node dev/embed/hog-beskar.cjs          → dev/embed/cache/hog/*.jpg + manifest.json

   Rutorna ur videon tas fram med dev/golden/video/ruta.swift (dev/material
   är gitignorerad — symlänka in den i en worktree). */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const HAR = __dirname, ROT = path.join(HAR, '..', '..'), UT = path.join(HAR, 'cache', 'hog');
const BESKAR_BREDD = 720, MARGINAL = 0.08;

async function beskar(bild, meta, t) {
  const W = meta.width, H = meta.height;
  const x = (t.x - t.w * MARGINAL) * W, y = (t.y - t.h * MARGINAL) * H, w = t.w * (1 + 2 * MARGINAL) * W, h = t.h * (1 + 2 * MARGINAL) * H;
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

function bildFor(facit, f) {
  const k = facit.kallor[f.kalla];
  if (!k) throw new Error(f.id + ': okänd källa ' + f.kalla);
  if (k.bild) return path.join(ROT, k.bild);
  const mapp = path.join(ROT, 'dev', 'material', 'hogbank');
  fs.mkdirSync(mapp, { recursive: true });
  const ut = path.join(mapp, `${f.kalla}-${String(f.s).replace('.', '_')}.jpg`);
  if (!fs.existsSync(ut)) {
    const video = path.join(ROT, k.video);
    if (!fs.existsSync(video)) throw new Error(f.id + ': videon saknas: ' + k.video);
    const r = spawnSync('swift', [path.join(ROT, 'dev', 'golden', 'video', 'ruta.swift'), video, String(f.s), ut], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(ut)) throw new Error(f.id + ': ruta.swift misslyckades: ' + (r.stderr || r.stdout));
  }
  return ut;
}

(async () => {
  const facit = JSON.parse(fs.readFileSync(path.join(HAR, 'cache', 'hog-facit.json'), 'utf8'));
  fs.mkdirSync(UT, { recursive: true });
  const manifest = [];
  for (const f of facit.fall.filter(f => !f.av)) {
    const fil = bildFor(facit, f), bild = fs.readFileSync(fil), meta = await sharp(bild).metadata();
    const r = await beskar(bild, meta, f.lada);
    const namn = `${f.id}.jpg`;
    fs.writeFileSync(path.join(UT, namn), r.data);
    const v = f.vantat || {};
    const ratta = [...new Set([f.namn, v.topp, v.over].concat(v.under || []).concat(f.annat || []).filter(Boolean))];
    manifest.push({ fil: namn, typ: f.typ, kalla: f.kalla, namn: f.namn || v.topp || null, ratta, vantat: v, nullOk: !!f.nullOk, bredd: r.info.width, hojd: r.info.height,
                    kortsidaPx: Math.round(Math.min(f.lada.w * meta.width, f.lada.h * meta.height)), lada: f.lada });
    console.log(f.id.padEnd(40), f.typ.padEnd(6), `${r.info.width}×${r.info.height}`, 'rätta:', ratta.join(' | ') || '—');
  }
  fs.writeFileSync(path.join(UT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`${manifest.length} beskärningar → ${path.relative(process.cwd(), UT)}`);
})().catch(e => { console.error('FEL', e); process.exit(1); });

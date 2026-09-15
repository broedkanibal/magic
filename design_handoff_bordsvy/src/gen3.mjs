import fs from 'fs';
import path from 'path';

/* Sida 3 i "Mesa Table Seating": två nya artboards byggda på B. De åtta
   befintliga (sida 1–2) tas oförändrade ur den senast sparade canvasen. */
const S = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.join(S, '..');
const PREV = path.join(ROOT, '..', 'fix', 'work');
const OUT = path.join(ROOT, 'out');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
const rd = f => fs.readFileSync(path.join(S, f), 'utf8');
const parts = src => Object.fromEntries([...src.matchAll(/<!--@(\w+)-->([\s\S]*?)<!--@end-->/g)].map(m => [m[1], m[2].trim()]));
const frags = parts(rd('frags3.html'));
const attr = o => JSON.stringify(o).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const TURNS = ['upside down', 'cards upright', 'board upright'];

const ME = ['danitha', 'pharika', 'pikemaster', 'nighthawk', 'plains', 'swamp'];
const ERIK = ['serra', 'swiftspear', 'anthem', 'mountain', 'plains', 'bolt'];
const SARA = ['delver', 'phoenix', 'island', 'mountain'];
const LINUS = ['llanowar', 'woodelves', 'forest'];
const set = (...g) => [...new Set(g.flat())].sort();
const kat = ids => '<div class="imgkat" style="display:none">' + ids.map(k => `<img data-im="${k}" loading="lazy" src="${k}.jpg" alt="">`).join('') + '</div>';

const NYA = [
  { file: 'Seats4.dc.html', src: 'S4', x: 0, y: 0, title: 'B · Seats, four players', views: ['me', 'sara', 'erik', 'linus', 'all'], imgs: set(ME, ERIK, SARA, LINUS, ['baksida']) },
  { file: 'Seats2.dc.html', src: 'S2', x: 1560, y: 0, title: 'B · Seats, two players', views: ['me', 'erik', 'all'], imgs: set(ME, ERIK, ['baksida']) }
];
for (const o of NYA) {
  const p = parts(rd(o.src + '.html'));
  let body = p.body
    .replace('@@HEADLEFT@@', rd('headleft.html')).replace('@@HEADRIGHT@@', rd('headright.html'))
    .replace('@@MAT3@@', frags.mat3).replace('@@KANT@@', frags.kant).replace('@@FOOT@@', frags.foot)
    .replace('@@INSPECTOR@@', rd('inspector.html').replace('@@IMGKAT@@', kat(o.imgs)));
  if (/@@\w+@@/.test(body)) throw new Error(o.src + ': leftover slot ' + body.match(/@@\w+@@/)[0]);
  const props = { view: { editor: 'enum', options: o.views, default: 'all' }, turn: { editor: 'enum', options: TURNS, default: 'cards upright' }, $preview: { width: 1440, height: 900 } };
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
${rd('base.css')}
${rd('v3.css')}
${p.css || ''}
  </style>
</helmet>
${body}
</x-dc>
<script data-dc-script data-props='${attr(props)}'>
${rd('base.js')}
${rd('logic-v3.js')}
${rd(o.src + '.js')}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, o.file), html);
}

/* De befintliga artboardsen och bilderna, och canvasen med en tredje sida. */
const gamla = fs.readdirSync(PREV).filter(f => f.endsWith('.dc.html'));
for (const f of gamla) fs.copyFileSync(path.join(PREV, f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(PREV, 'img'))) fs.copyFileSync(path.join(PREV, 'img', f), path.join(OUT, 'img', f));
fs.copyFileSync(path.join(ROOT, 'img', 'baksida.jpg'), path.join(OUT, 'img', 'baksida.jpg'));
const canvas = JSON.parse(fs.readFileSync(path.join(PREV, 'canvas.json'), 'utf8'));
canvas.pages = (canvas.pages || []).filter(p => p.id !== 'p3').concat([{ id: 'p3', name: '3 · B with seats' }]);
canvas.artboards = canvas.artboards.filter(a => a.page !== 'p3').concat(NYA.map(o => ({ file: o.file, x: o.x, y: o.y, w: 1440, h: 900, title: o.title, is_interactive: true, page: 'p3' })));
const notes = JSON.parse(rd('notes3.json')).map(({ for: _f, ...n }) => ({ ...n, page: 'p3' }));
canvas.annotations = (canvas.annotations || []).filter(n => n.page !== 'p3').concat(notes);
canvas.launch = { view: 'canvas', page: 'p3' };
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2));
fs.writeFileSync(path.join(OUT, 'artboards.txt'), [...gamla.filter(f => !NYA.some(o => o.file === f)), ...NYA.map(o => o.file)].join('\n') + '\n');
console.log('built', NYA.map(o => o.file).join(', '), '+', gamla.length, 'existing ·', fs.readdirSync(path.join(OUT, 'img')).length, 'images');

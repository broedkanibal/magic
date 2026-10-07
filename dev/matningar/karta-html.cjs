#!/usr/bin/env node
/* Kartan som webbsida: läser dev/matningar/KARTA.md och skriver en HTML-sida
   (för Artifact-publicering) där markdownen renderas i webbläsaren med marked.
   KARTA.md är källan — sidan har ingen egen text.

     node dev/matningar/karta-html.cjs <ut.html> */
'use strict';
const fs = require('fs'), path = require('path');
const ut = process.argv[2];
if (!ut) { console.error('Ange utfil: node dev/matningar/karta-html.cjs <ut.html>'); process.exit(2); }
const md = fs.readFileSync(path.join(__dirname, 'KARTA.md'), 'utf8');

const sida = `<title>Mesas mätkarta</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: en läskolumn (~70 tecken) med innehållsförteckning överst; tabeller rullar i sin egen ruta. */
:root {
  --bg: #f4f6f4; --yta: #ffffff; --fg: #1b2420; --dim: #5a6862; --linje: #d6ddd8;
  --filt: #1f6a4e; --filt-svag: #e3efe9; --kod: #eef1ee;
  --f-rubrik: "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
  --f-text: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-kod: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #111614; --yta: #182019; --fg: #e3eae6; --dim: #9aa8a1; --linje: #2c3631;
  --filt: #72c9a4; --filt-svag: #1d2e27; --kod: #1d2622; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #111614; --yta: #182019; --fg: #e3eae6; --dim: #9aa8a1; --linje: #2c3631;
  --filt: #72c9a4; --filt-svag: #1d2e27; --kod: #1d2622; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.6 var(--f-text); padding-inline: 16px; padding-block: 28px 64px; }
.sida { max-width: 46rem; margin: 0 auto; display: grid; gap: 4px; }
.sida > * { min-width: 0; }
h1, h2, h3 { font-family: var(--f-rubrik); text-wrap: balance; line-height: 1.2; letter-spacing: -0.01em; }
h1 { font-size: 2.1rem; margin: 0 0 4px; }
h2 { font-size: 1.4rem; margin: 40px 0 6px; padding-top: 14px; border-top: 1px solid var(--linje); }
h3 { font-size: 1.1rem; margin: 26px 0 4px; color: var(--filt); }
p, li { max-width: 68ch; }
a { color: var(--filt); }
code { font-family: var(--f-kod); font-size: 0.86em; background: var(--kod); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
pre { background: var(--kod); padding: 12px 14px; border-radius: 6px; overflow-x: auto; }
pre code { background: none; padding: 0; }
strong { font-weight: 600; }
.tabell { overflow-x: auto; margin: 10px 0 14px; border: 1px solid var(--linje); border-radius: 6px; background: var(--yta); }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 7px 10px; border-bottom: 1px solid var(--linje); }
tr:last-child td { border-bottom: 0; }
th { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dim); font-weight: 600; background: var(--filt-svag); }
td:first-child { min-width: 8rem; }
.inledning { color: var(--dim); }
nav.toc { background: var(--yta); border: 1px solid var(--linje); border-radius: 6px; padding: 10px 14px; margin: 14px 0 6px; }
nav.toc b { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dim); }
nav.toc ol { margin: 6px 0 0; padding-left: 0; list-style: none; display: grid; gap: 2px; }
nav.toc a { text-decoration: none; }
nav.toc a:hover, nav.toc a:focus-visible { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--filt); outline-offset: 2px; }
</style>
<main class="sida" id="sida"><p>Laddar kartan…</p></main>
<script type="text/plain" id="kalla">${md.replace(/<\/script/gi, '<\\/script')}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script>
(function () {
  const md = document.getElementById('kalla').textContent;
  const el = document.getElementById('sida');
  el.innerHTML = marked.parse(md, { gfm: true });
  el.querySelectorAll('table').forEach(t => { const w = document.createElement('div'); w.className = 'tabell'; t.replaceWith(w); w.appendChild(t); });
  const h1 = el.querySelector('h1'); const forsta = h1 && h1.nextElementSibling;
  if (forsta && forsta.tagName === 'P') forsta.classList.add('inledning');
  const slug = s => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rubriker = [...el.querySelectorAll('h2')];
  rubriker.forEach(h => { h.id = slug(h.textContent); });
  if (rubriker.length && forsta) {
    const nav = document.createElement('nav'); nav.className = 'toc';
    nav.innerHTML = '<b>Innehåll</b><ol>' + rubriker.map(h => '<li><a href="#' + h.id + '">' + h.textContent + '</a></li>').join('') + '</ol>';
    forsta.after(nav);
  }
})();
</script>
`;
fs.writeFileSync(ut, sida);
console.log('Skrev', ut);

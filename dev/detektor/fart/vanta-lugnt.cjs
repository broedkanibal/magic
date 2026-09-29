'use strict';
/* Väntar tills datorn är lugn nog för tidmätning: ingen golden-körning, inget
   av detektorns tunga Python-jobb (larare/), och 1-minuterslasten under en
   gräns. Tider tagna under last är inte jämförbara.

     node dev/detektor/fart/vanta-lugnt.cjs [--grans 4] [--max-min 90] */
const { execSync } = require('child_process');
const os = require('os');
const argv = process.argv.slice(2);
const varde = (n, f) => { const i = argv.indexOf('--' + n); return i < 0 ? f : +argv[i + 1]; };
const GRANS = varde('grans', 4), MAX = varde('max-min', 90) * 60e3, t0 = Date.now();
const upptaget = () => { try { return execSync("pgrep -fl 'larare/|kor.cjs|mesa-golden-profil'", { encoding: 'utf8' }).trim(); } catch (e) { return ''; } };
(function titta() {
  const last = os.loadavg()[0], u = upptaget();
  if (!u && last < GRANS) { console.log(`lugnt efter ${Math.round((Date.now() - t0) / 1000)} s, last ${last.toFixed(2)}`); process.exit(0); }
  if (Date.now() - t0 > MAX) { console.log(`gav upp efter ${MAX / 60e3} min: last ${last.toFixed(2)}${u ? ', upptaget: ' + u.split('\n')[0].slice(0, 120) : ''}`); process.exit(1); }
  setTimeout(titta, 20e3);
})();

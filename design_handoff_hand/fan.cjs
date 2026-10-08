// Räknar solfjäderns lägen som appens hfLage (R 1300, kort 124x173).
const R = 1300, CW = 124, CH = 173;
function fan(name, { N, CX, H = 702, sp, f = null, first = [], z0 = 1 }) {
  sp = sp ?? Math.min(35, 4 + N * 2.1);
  const gw = Array.from({ length: N }, (_, i) => f == null ? 0 : Math.exp(-((i - f) ** 2) / (2 * 1.3 * 1.3)));
  const c = [0];
  for (let i = 1; i < N; i++) c.push(c[i - 1] + 1 + 0.9 * (gw[i - 1] + gw[i]) + (first.includes(i) ? 1.1 : 0));
  const tot = c[N - 1] || 1;
  console.log('## ' + name + '  sp=' + sp.toFixed(1));
  for (let i = 0; i < N; i++) {
    const th = N > 1 ? -sp / 2 + sp * c[i] / tot : 0, rad = th * Math.PI / 180;
    const g = gw[i], sc = 1 + 0.34 * g, lift = 58 * g;
    const px = CX + R * Math.sin(rad), py = H - 44 + R - R * Math.cos(rad);
    const z = z0 + i + (g > 0.5 ? 200 + Math.round(g * 60) : 0);
    console.log(i + ': style="left:' + (px - CW / 2).toFixed(0) + 'px;top:' + (py - CH).toFixed(0) + 'px;transform:rotate(' + th.toFixed(1) + 'deg)' + (g > 0.02 ? ' translateY(-' + lift.toFixed(0) + 'px) scale(' + sc.toFixed(2) + ')' : '') + ';z-index:' + z + '"');
  }
}
fan('hand6 (Main, HandC-raised)', { N: 6, CX: 600 });
fan('hand6 focus0 (HandA2)', { N: 6, CX: 600, f: 0 });
fan('open7 (O2)', { N: 7, CX: 620 });
fan('T1 blue2 focus1', { N: 2, CX: 440, f: 1 });
fan('T1 hand5', { N: 5, CX: 820, sp: 11 });
fan('Look blue5 focus2', { N: 5, CX: 470, sp: 11, f: 2 });
fan('Look hand5', { N: 5, CX: 850, sp: 9 });
fan('Reveal blue3 focus2', { N: 3, CX: 450, sp: 9, f: 2 });
fan('S1 lib9 focus7', { N: 9, CX: 600, f: 7, first: [5, 6, 7] });
fan('S1 lib9 nofocus', { N: 9, CX: 600, first: [5, 6, 7] });
fan('Sara hand5 H=372', { N: 5, CX: 600, H: 372 });
fan('hand5 (after Pikemaster) CX600', { N: 5, CX: 600 });
console.log('\n=== omgång 2 ===');
fan('hand6 focus1 CX620 (HandA2)', { N: 6, CX: 620, f: 1 });
fan('open7 CX640 (O2)', { N: 7, CX: 640 });
fan('Sara hand5 H=349 CX620', { N: 5, CX: 620, H: 349 });
console.log('\n=== omgång 3 ===');
fan('T1 hand5 sp9 CX514', { N: 5, CX: 514, sp: 9 });
fan('T1 blue2 f1 CX850', { N: 2, CX: 850, f: 1 });
fan('Look hand5 sp8 CX503', { N: 5, CX: 503, sp: 8 });
fan('Look blue5 sp10.5 f2 CX842', { N: 5, CX: 842, sp: 10.5, f: 2 });
fan('Reveal blue3 sp9 f2 CX850', { N: 3, CX: 850, sp: 9, f: 2 });
fan('S1 lib9 sp16 f7 CX785', { N: 9, CX: 785, sp: 16, f: 7, first: [5, 6, 7] });
fan('S1b lib9 sp16 CX785', { N: 9, CX: 785, sp: 16, first: [5, 6, 7] });
fan('handstack5 sp3 CX436', { N: 5, CX: 436, sp: 3 });
fan('handstack6 sp3.6 CX440', { N: 6, CX: 440, sp: 3.6 });
console.log('\n=== omgång 4 ===');
fan('S1 lib9 sp14 f7 CX766', { N: 9, CX: 766, sp: 14, f: 7, first: [5, 6, 7] });
fan('S1b lib9 sp14 CX766', { N: 9, CX: 766, sp: 14, first: [5, 6, 7] });

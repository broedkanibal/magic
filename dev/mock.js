/* Syntetisk SpellTable-skärmdump för att testa hela kedjan:
   2×2-rutnät, en helsvart "video off"-ruta, sidopanel, och kort på bord
   med perspektiv, oskärpa, lampglans och brus. */
(function (g) {
  const IDX = [4, 19, 37, 58, 73, 96, 111, 130, 152, 171];
  async function cards() {
    if (g.__P) return;
    const r = await fetch('https://api.scryfall.com/cards/search?q=set%3Aj25&unique=art&order=name');
    const d = await r.json();
    g.__P = IDX.map(i => d.data[i]).map(c => ({ name: c.name, normal: c.image_uris.normal }));
    g.__I = await Promise.all(g.__P.map(p => new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = p.normal;
    })));
  }
  function persp(c, img, w, h, tilt) {
    const N = 56, sh = img.naturalHeight / N, sw = img.naturalWidth;
    let tot = 0; for (let i = 0; i < N; i++) tot += (1 - tilt * (1 - i / (N - 1)) * 0.42);
    let y = -h / 2;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), dh = h * (1 - tilt * (1 - t) * 0.42) / tot, ww = w * (1 - tilt * (1 - t) * 0.30);
      c.drawImage(img, 0, i * sh, sw, sh, -ww / 2, y, ww, dh + 0.7); y += dh;
    }
  }
  function pane(c, px, py, pw, ph, idx, layout, glare, o) {
    c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
    const bg = c.createRadialGradient(px + pw * 0.35, py + ph * 0.2, 20, px + pw * 0.5, py + ph * 0.5, pw * 0.8);
    bg.addColorStop(0, '#f6efe0'); bg.addColorStop(1, '#8d8476');
    c.fillStyle = bg; c.fillRect(px, py, pw, ph);
    const truth = [];
    layout.forEach((L, i) => {
      const k = idx[i];
      c.save(); c.translate(px + L.x * pw, py + L.y * ph); c.rotate(L.r * Math.PI / 180);
      c.filter = 'blur(0.7px)'; c.shadowColor = '#0007'; c.shadowBlur = 9; c.shadowOffsetY = 4;
      persp(c, g.__I[k], L.w * pw, (L.w * pw) / 0.716, 0.22);
      c.restore(); c.filter = 'none';
      truth.push({ name: g.__P[k].name, cx: px + L.x * pw, cy: py + L.y * ph, w: L.w * pw });
    });
    const gg = c.createRadialGradient(px + pw * 0.30, py + ph * 0.30, 5, px + pw * 0.30, py + ph * 0.30, pw * 0.42);
    gg.addColorStop(0, `rgba(255,252,240,${glare})`); gg.addColorStop(1, 'rgba(255,252,240,0)');
    c.fillStyle = gg; c.fillRect(px, py, pw, ph);

    /* Störningar som finns i varje riktig SpellTable-ruta och som tidigare
       testbilder helt saknade: tangentbord, mus, och SpellTables eget
       överlägg med spelarnamn, kommandantnamn och en stor livtotal. Det var
       precis de sakerna detektorn plockade upp som "kort". */
    if (o.clutter !== false) {
      // tangentbord
      const kx = px + pw * 0.02, ky = py + ph * 0.10, kw = pw * 0.20, kh = ph * 0.42;
      c.fillStyle = '#d8d4cc'; c.fillRect(kx, ky, kw, kh);
      c.fillStyle = '#2b2b2e';
      for (let r = 0; r < 5; r++) for (let q = 0; q < 6; q++)
        c.fillRect(kx + kw * (0.06 + q * 0.155), ky + kh * (0.07 + r * 0.185), kw * 0.125, kh * 0.14);
      // mus
      c.fillStyle = '#232326';
      c.beginPath(); c.ellipse(px + pw * 0.09, py + ph * 0.80, pw * 0.045, ph * 0.10, 0, 0, 7); c.fill();
      // SpellTables överlägg
      c.fillStyle = 'rgba(0,0,0,0.62)';
      c.fillRect(px, py, pw, ph * 0.115);
      c.fillStyle = '#fff';
      c.font = `700 ${Math.round(ph * 0.055)}px sans-serif`;
      c.textAlign = 'right';
      c.fillText('Xepman', px + pw * 0.86, py + ph * 0.055);
      c.font = `italic ${Math.round(ph * 0.040)}px sans-serif`;
      c.fillText('Zur, Eternal Schemer', px + pw * 0.86, py + ph * 0.102);
      c.font = `700 ${Math.round(ph * 0.10)}px sans-serif`;
      c.fillText(String(o.life == null ? 20 : o.life), px + pw * 0.97, py + ph * 0.095);
      c.textAlign = 'left';
    }
    c.restore();
    return truth;
  }
  g.buildMock = async function (opt) {
    const o = Object.assign({ glare: 0.42, noise: 13, q: 0.78 }, opt || {});
    await cards();
    const W = 2000, H = 1150, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    /* Kortlayout som i en riktig SpellTable-ruta: korten ligger OMLOTT i
       rader, inte isär. Det var precis det de tidiga testbilderna missade —
       en detektor som letar mörk ram runt om hittar då springorna MELLAN
       korten i stället för korten själva. */
    const ov = o.ov == null ? 0.43 : o.ov;      // hur stor del av kortet grannen täcker
    const fan = (x0, y, n, w, rot0, drot) =>
      Array.from({ length: n }, (_, i) => ({ x: x0 + i * w * (1 - ov), y: y + (i % 2) * 0.012, w, r: rot0 + i * drot }));
    const LB = o.overlap
      ? fan(0.18, 0.30, 3, 0.15, -16, 3).concat(fan(0.20, 0.68, 3, 0.15, 12, -3))
      : [{ x: .20, y: .30, w: .11, r: -7 }, { x: .36, y: .27, w: .11, r: 4 }, { x: .52, y: .29, w: .11, r: -3 },
         { x: .24, y: .66, w: .11, r: 9 }, { x: .42, y: .68, w: .11, r: -5 }, { x: .60, y: .65, w: .11, r: 6 }];
    const LD = o.overlap
      ? fan(0.26, 0.48, 4, 0.16, 14, -4)
      : [{ x: .28, y: .45, w: .13, r: 5 }, { x: .47, y: .42, w: .13, r: -8 },
         { x: .66, y: .47, w: .13, r: 2 }, { x: .47, y: .72, w: .13, r: 11 }];
    const tB = pane(c, 850, 20, 890, 570, [0, 1, 2, 3, 4, 5], LB, o.glare, o);
    const tD = pane(c, 850, 595, 890, 555, [6, 7, 8, 9], LD, o.glare * 0.7, Object.assign({}, o, { life: 4 }));
    c.fillStyle = '#151b26'; c.fillRect(1750, 0, 250, H);
    c.fillStyle = '#f0a52a'; c.font = 'bold 22px sans-serif'; c.fillText('Cards', 1800, 45);
    c.fillStyle = '#8d9bb0'; c.font = '17px sans-serif'; c.fillText('Game Log', 1800, 85);
    for (let i = 0; i < 4; i++) c.drawImage(g.__I[i], 1800, 190 + i * 170, 150, 209);
    const im = c.getImageData(0, 0, W, H), p = im.data;
    for (let i = 0; i < p.length; i += 4) {
      const n = (Math.random() - 0.5) * o.noise;
      p[i] = Math.min(255, p[i] * 1.07 + n); p[i + 1] = Math.min(255, p[i + 1] + n); p[i + 2] = Math.min(255, p[i + 2] * 0.88 + n);
    }
    c.putImageData(im, 0, 0);
    g.__TRUTH = [tB, tD];
    g.__MOCK = await new Promise(res => cv.toBlob(res, 'image/jpeg', o.q));
    g.__MOCKIMG = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = URL.createObjectURL(g.__MOCK); });
    return { rutor: 2, kort: tB.length + tD.length };
  };

  /* Hela kedjan synkront — ingen väntan, så bakgrundsstrypning stör inte mätningen */
  g.runPipeline = function (opts) {
    const o = Object.assign({ keep: 40, refine: 8 }, opts || {});
    const t0 = performance.now();
    const panes = Detect.findPanes(g.__MOCKIMG);
    const out = [];
    let scans = 0, scanMs = 0;
    panes.forEach((pn, pi) => {
      const { proposals } = Detect.proposeCards(g.__MOCKIMG, pn, { want: o.want || 16 });
      const acc = [], pend = [];
      for (const pr of proposals) {
        const box = { x: pr.cx - pr.w / 2, y: pr.cy - pr.h / 2, w: pr.w, h: pr.h };
        const t = performance.now();
        const r = Matcher.scan(g.__MOCKIMG, box, Pool.idx, { keep: o.keep, refine: o.refine, hint: pr.deg });
        scanMs += performance.now() - t; scans++;
        const b = r.results[0] || { name: '?', score: 0 };
        const rec = { name: b.name, score: b.score, margin: r.confidence, cx: pr.cx, cy: pr.cy, cands: r.results.slice(0, 5).map(x => x.name) };
        if (b.score >= CONF.accept && r.confidence >= CONF.margin) acc.push(rec); else pend.push(rec);
      }
      out.push({ pi, acc, pend, n: proposals.length, props: proposals });
    });
    return { out, panes, ms: Math.round(performance.now() - t0), scans, scanMs: Math.round(scanMs / Math.max(1, scans)) };
  };
  g.report = function (res) {
    const L = [];
    res.out.forEach((r, pi) => {
      const truth = (g.__TRUTH[pi] || []).map(t => t.name);
      const got = r.acc.map(a => a.name);
      const right = got.filter(n => truth.includes(n));
      const wrong = got.filter(n => !truth.includes(n));
      const missed = truth.filter(n => !got.includes(n));
      const pendHasIt = r.pend.filter(p => truth.includes(p.cands[0]) || p.cands.some(c => truth.includes(c)));
      L.push(`ruta ${pi + 1}: ${r.n} förslag → ${r.acc.length} auto (${right.length} rätt, ${wrong.length} FEL), ${r.pend.length} osäkra`);
      if (wrong.length) L.push('   felaktigt tillagda: ' + wrong.join(', '));
      if (missed.length) L.push('   missade: ' + missed.join(', ') + `  (varav ${pendHasIt.length} finns bland osäkra)`);
    });
    L.push(`totalt ${res.ms} ms · ${res.scans} matchningar · ${res.scanMs} ms/st`);
    return L.join('\n');
  };
})(window);

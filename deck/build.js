const fs = require('fs');
const path = require('path');
const { makeLib, prepIcons, THEME } = require('./lib');
const { applyTheme } = require('./theme');
const D = require('./data');
const DIMS = JSON.parse(fs.readFileSync(path.join(__dirname, 'img/dims.json'), 'utf8'));

(async () => {
  const src = ['lib.js', 'build.js', 'partA.js', 'partC.js', 'partD.js'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  const names = [...new Set(src.match(/'Md[A-Za-z]+'/g).map((s) => s.slice(1, -1)))];
  await prepIcons(names);
  const L = makeLib();
  const { pres, C, SH, MUTED } = L;

  // step progress chips (S0..S8) shown on step slides
  const STEPS = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
  L.steps = (s, act) => {
    STEPS.forEach((t, i) => {
      const on = act.includes(t); const done = !on && STEPS.indexOf(act[0]) > i;
      s.addText(t, { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.14, x: 7.4 + i * 0.59, y: 0.18, w: 0.53, h: 0.28,
        fill: { color: on ? C.accent2 : done ? C.accent1 : C.background2, transparency: done ? 55 : 0 }, line: { color: on ? C.accent2 : done ? C.accent1 : C.background2 },
        fontSize: 10, bold: on, color: on ? C.text1 : done ? C.background1 : MUTED, align: 'center', valign: 'middle', margin: 0 });
    });
  };
  // image fit into a box keeping aspect ratio
  L.img = (s, file, x, y, w, h, alt) => {
    const [iw, ih] = DIMS[file]; const r = Math.min(w / iw, h / ih); const ww = iw * r, hh = ih * r;
    s.addImage({ path: path.join(__dirname, 'img', file), x: x + (w - ww) / 2, y: y + (h - hh) / 2, w: ww, h: hh, altText: alt || file });
    s.addShape(SH.RECTANGLE, { x: x + (w - ww) / 2, y: y + (h - hh) / 2, w: ww, h: hh, fill: { type: 'none' }, line: { color: L.BORDER, width: 0.75 } });
  };
  // heatmap of answerable ratio per category
  L.heat = (s, rows, o) => {
    const bucket = (r) => (r >= 0.99 ? '9FD3B0' : r >= 0.75 ? 'CBE7D3' : r >= 0.5 ? 'F6E3BE' : r >= 0.25 ? 'F5CBB8' : 'EBA9A0');
    const head = [{ text: '段階', options: { bold: true, color: 'FFFFFF', fill: { color: L.HEX.dk2 } } }].concat(D.cats.map((c, i) => ({ text: `${c}\n${D.catNames[i]}`, options: { bold: true, color: 'FFFFFF', fill: { color: L.HEX.dk2 }, fontSize: 9, align: 'center' } })))
      .concat([{ text: '合計\n/48', options: { bold: true, color: 'FFFFFF', fill: { color: L.HEX.dk2 }, align: 'center', fontSize: 10 } }]);
    const body = rows.map((r) => [{ text: `${r[0]} ${r[1]}`, options: { bold: true, fontSize: 11 } }]
      .concat(r[3].map((v, i) => ({ text: `${v}/${D.catN[i]}`, options: { align: 'center', fill: { color: bucket(v / D.catN[i]) }, fontSize: 11 } })))
      .concat([{ text: String(r[2]), options: { align: 'center', bold: true, fontSize: 12 } }]));
    s.addTable([head].concat(body), { x: o.x, y: o.y, w: o.w, colW: o.colW, rowH: o.rowH || 0.36, fontSize: 11, valign: 'middle', border: { type: 'solid', pt: 0.5, color: 'FFFFFF' }, margin: [0.02, 0.05, 0.02, 0.05], color: L.HEX.dk1 });
  };
  L.D = D;

  require('./partA')(L); require('./partC')(L); require('./partD')(L);
  const out = process.argv[2] || 'AdvancedRAG_適用指針書_FMEAケーススタディ.pptx';
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('wrote', out);
})().catch((e) => { console.error(e); process.exit(1); });

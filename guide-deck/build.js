const fs = require('fs');
const { makeLib, prepIcons, THEME } = require('./lib');
const { applyTheme } = require('../deck/theme');
(async () => {
  const src = ['lib.js', 'part1.js', 'part2.js', 'part3.js', 'part4.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const names = [...new Set(src.match(/'Md[A-Za-z]+'/g).map((s) => s.slice(1, -1)))];
  await prepIcons(names);
  const L = makeLib();
  require('./part1')(L); require('./part2')(L); require('./part3')(L);
  const out = process.argv[2] || 'AdvancedRAG_実践ガイド.pptx';
  await L.pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('wrote', out);
})().catch((e) => { console.error(e); process.exit(1); });

const fs = require('fs');
['ar.ts', 'en.ts'].forEach(f => {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const keys = lines
    .filter(l => /^  [a-zA-Z0-9_]+:/.test(l))
    .map(l => l.trim().split(':')[0]);
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  const unique = [...new Set(dups)];
  console.log(f, '- duplicates:', unique.length === 0 ? 'none ✅' : unique.join(', '));
});

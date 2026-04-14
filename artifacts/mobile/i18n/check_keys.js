const fs = require('fs');

// Extract flat key paths from translation objects
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys.push(...extractKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Load both files (strip TypeScript syntax)
function loadTS(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Remove "export const ar = " or "export const en = " wrapper
  code = code.replace(/^export const \w+ = /, '');
  // Remove trailing ";\nexport type..."
  code = code.replace(/;\s*export type.*$/s, '');
  // Replace TypeScript 'as const' 
  code = code.replace(/as const/g, '');
  return eval('(' + code + ')');
}

try {
  const ar = loadTS('ar.ts');
  const en = loadTS('en.ts');
  
  const arKeys = new Set(extractKeys(ar));
  const enKeys = new Set(extractKeys(en));
  
  console.log('AR total keys:', arKeys.size);
  console.log('EN total keys:', enKeys.size);
  
  // Find keys in AR but not EN
  const inArNotEn = [...arKeys].filter(k => !enKeys.has(k));
  if (inArNotEn.length) console.log('\nIn AR but not EN:', inArNotEn.slice(0, 20).join(', '));
  
  // Find keys in EN but not AR
  const inEnNotAr = [...enKeys].filter(k => !arKeys.has(k));
  if (inEnNotAr.length) console.log('\nIn EN but not AR:', inEnNotAr.slice(0, 20).join(', '));
  
  if (!inArNotEn.length && !inEnNotAr.length) console.log('\n✅ Both files are in sync!');
} catch(e) {
  console.error('Error:', e.message);
}

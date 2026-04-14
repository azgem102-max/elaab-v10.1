const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replaceFonts(file) {
  if (!file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  content = content.replace(/fontFamily:\s*['"]Cairo_900Black['"]/g, 'fontFamily: typography.displaySm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_800ExtraBold['"]/g, 'fontFamily: typography.displaySm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_700Bold['"]/g, 'fontFamily: typography.headlineSm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_600SemiBold['"]/g, 'fontFamily: typography.bodyLg.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_500Medium['"]/g, 'fontFamily: typography.body.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_400Regular['"]/g, 'fontFamily: typography.body.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_300Light['"]/g, 'fontFamily: typography.bodySm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_200ExtraLight['"]/g, 'fontFamily: typography.bodySm.fontFamily');
  
  if (original !== content && !content.includes('import { typography } from "@/constants/typography"')) {
      // Find a good place to insert import. After the last import or at the top.
      const importLine = 'import { typography } from "@/constants/typography";\n';
      const imports = content.match(/import .* from .*;/g);
      if (imports && imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          content = content.replace(lastImport, lastImport + '\n' + importLine);
      } else {
          content = importLine + content;
      }
  }

  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Replaced fonts in ${file}`);
  }
}

walkDir('app', replaceFonts);
walkDir('components', replaceFonts);

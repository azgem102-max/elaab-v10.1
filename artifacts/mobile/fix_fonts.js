const fs = require('fs');

function replaceFonts(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/fontFamily:\s*['"]Cairo_900Black['"]/g, 'fontFamily: typography.displaySm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_800ExtraBold['"]/g, 'fontFamily: typography.displaySm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_700Bold['"]/g, 'fontFamily: typography.headlineSm.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_600SemiBold['"]/g, 'fontFamily: typography.bodyLg.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_500Medium['"]/g, 'fontFamily: typography.body.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_400Regular['"]/g, 'fontFamily: typography.body.fontFamily');
  content = content.replace(/fontFamily:\s*['"]Cairo_300Light['"]/g, 'fontFamily: typography.bodySm.fontFamily');
  
  if (!content.includes('import { typography } from "@/constants/typography"')) {
      content = content.replace(/import { useTranslation } from "@\/i18n";/, 'import { useTranslation } from "@/i18n";\nimport { typography } from "@/constants/typography";');
  }

  fs.writeFileSync(file, content);
  console.log(`Replaced fonts in ${file}`);
}

['app/(tabs)/groups.tsx', 'app/(tabs)/explore.tsx', 'app/(tabs)/matches.tsx', 'app/notifications.tsx', 'app/settings.tsx'].forEach(f => {
  if (fs.existsSync(f)) {
    replaceFonts(f);
  }
});

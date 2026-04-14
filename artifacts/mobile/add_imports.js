const fs = require('fs');

['app/group-detail.tsx', 'app/profile-setup.tsx', 'app/create-match.tsx'].forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf-8');
    if (!c.includes('import { typography } from "@/constants/typography"')) {
      c = c.replace(/import { useTranslation } from "@\/i18n";/, 'import { useTranslation } from "@/i18n";\nimport { typography } from "@/constants/typography";');
      fs.writeFileSync(f, c);
    }
  }
});

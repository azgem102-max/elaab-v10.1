#!/bin/bash
set -e

# Script to automatically update dynamic sections in PROJECT_OVERVIEW.md
# Runs as part of post-merge setup

OVERVIEW_FILE="PROJECT_OVERVIEW.md"

if [ ! -f "$OVERVIEW_FILE" ]; then
  echo "WARNING: $OVERVIEW_FILE not found, skipping update."
  exit 0
fi

# Arabic month names
arabic_month() {
  case "$1" in
    01) echo "يناير" ;;
    02) echo "فبراير" ;;
    03) echo "مارس" ;;
    04) echo "أبريل" ;;
    05) echo "مايو" ;;
    06) echo "يونيو" ;;
    07) echo "يوليو" ;;
    08) echo "أغسطس" ;;
    09) echo "سبتمبر" ;;
    10) echo "أكتوبر" ;;
    11) echo "نوفمبر" ;;
    12) echo "ديسمبر" ;;
  esac
}

# Get current date parts
DAY=$(date +%d)
MONTH=$(date +%m)
YEAR=$(date +%Y)
MONTH_AR=$(arabic_month "$MONTH")
TODAY="${DAY} ${MONTH_AR} ${YEAR}"

# Count mobile app screens (non-layout, non-not-found tsx files)
SCREEN_COUNT=$(find artifacts/mobile/app -name "*.tsx" ! -name "_layout.tsx" ! -name "+not-found.tsx" 2>/dev/null | wc -l | tr -d ' ')

# Count API route files (excluding index.ts)
API_COUNT=$(find artifacts/api-server/src/routes -name "*.ts" ! -name "index.ts" 2>/dev/null | wc -l | tr -d ' ')

# Count DB schema tables (excluding index.ts)
DB_COUNT=$(find lib/db/src/schema -name "*.ts" ! -name "index.ts" 2>/dev/null | wc -l | tr -d ' ')

# Get last merged task number from .local/tasks directory if available
LAST_TASK=$(ls .local/tasks/ 2>/dev/null | grep -oP 'task-\d+' | sort -t- -k2 -n | tail -1 || echo "")

# Count finished tasks
TASK_COUNT=$(ls .local/tasks/ 2>/dev/null | grep -c 'task-' || echo "0")

# Build the dynamic block replacement
DYNAMIC_BLOCK="## 📊 إحصائيات المشروع (DYNAMIC-START)
- **آخر تحديث:** ${TODAY}
- **آخر مهمة مدموجة:** ${LAST_TASK:-غير متاح}
- **عدد المهام المنتهية:** ${TASK_COUNT}
- **عدد صفحات التطبيق:** ${SCREEN_COUNT}
- **عدد مسارات الـ API:** ${API_COUNT}
- **عدد جداول قاعدة البيانات:** ${DB_COUNT}
<!-- DYNAMIC-END -->"

# Replace the dynamic section using awk
awk -v block="$DYNAMIC_BLOCK" '
  /## 📊 إحصائيات المشروع \(DYNAMIC-START\)/ { 
    print block
    skip=1
    next
  }
  skip && /<!-- DYNAMIC-END -->/ { skip=0; next }
  skip { next }
  { print }
' "$OVERVIEW_FILE" > "${OVERVIEW_FILE}.tmp" && mv "${OVERVIEW_FILE}.tmp" "$OVERVIEW_FILE"

echo "✓ PROJECT_OVERVIEW.md updated (آخر تحديث: ${TODAY})"

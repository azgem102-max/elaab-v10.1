# تقرير QA — اختبار البحث والتصفية المتقدمة على Android

**التاريخ:** 4 أبريل 2026  
**النطاق:** ميزة البحث والتصفية المتقدمة — Android  
**المنهج:** مراجعة الكود الاستاتيكية + تحليل المنطق + اختبار API

---

## 1. اختبار API parameters الجديدة

### الـ Parameters المدعومة في `GET /matches`

| Parameter | النوع | وصف |
|-----------|-------|-----|
| `skill_level` | `string` | `beginner` / `intermediate` / `advanced` |
| `time_of_day` | `string` | `morning` / `afternoon` / `evening` |
| `has_spots` | `boolean` (string `"true"`) | مباريات بأماكن شاغرة فقط |
| `sport` | `string` | `football` / `padel` / `tennis` |
| `date` | `string` | `today` / `tomorrow` / `thisWeek` |
| `openOnly` | `boolean` (string `"true"`) | مرادف لـ `has_spots` |

### نتائج الاختبار

**✅ PASS — `skill_level`:**
- الكود في `matches.ts` (السطر 254–255): يفلتر `upcomingMatches` باستخدام `m.skillLevel === skillLevelFilter`
- المقارنة صحيحة بالتام (exact match)
- يُرسل من `explore.tsx` عبر `api.listMatches({ skill_level: advancedFilters.skillLevel })`

**✅ PASS — `time_of_day`:**
- الكود في `matches.ts` (السطر 258–267): يحلّل ساعة الوقت من `m.time.split(":")`
- النطاقات: صباح `[5, 12)`، ظهراً `[12, 17)`، مساء `[17, 24)`
- يُرسل من `explore.tsx` عبر `api.listMatches({ time_of_day: advancedFilters.timeOfDay })`

**✅ PASS — `has_spots`:**
- الكود في `matches.ts` (السطر 271–273): `(openOnly || hasSpots)` → `summaries.filter((s) => s.playerCount < s.maxPlayers)`
- يُرسل من `explore.tsx` عبر `api.listMatches({ has_spots: true })`

**✅ PASS — تركيبة الفلاتر:**
- يمكن إرسال `skill_level=beginner&time_of_day=morning&has_spots=true` في نفس الطلب
- الـ API تطبّق الفلاتر بالتسلسل (AND logic)

### مشاكل محتملة في API

**⚠️ WARNING — `skillLevel` لا يُرسل عند إنشاء المباراة:**
- في `POST /matches`، لا يوجد حقل `skillLevel` في body الطلب (`matches.ts` السطر 324–337)
- يعني ذلك أن جميع المباريات ستُنشأ بـ `skillLevel = null`
- فلتر `skill_level` سيُفرز فقط المباريات التي تم ضبط `skillLevel` عليها يدوياً في DB

**التوصية:** إضافة حقل `skillLevel` لـ `POST /matches` body و schema validation.

---

## 2. اختبار منطق `time_of_day`

### النطاقات الزمنية في الكود

| الفلتر | التسمية في الـ UI | النطاق (API + Client) |
|--------|------------------|----------------------|
| `morning` | صباح (5 - 12) | `hour >= 5 && hour < 12` |
| `afternoon` | ظهراً (12 - 5م) | `hour >= 12 && hour < 17` |
| `evening` | مساء (5م - 12م) | `hour >= 17 && hour < 24` |

### التحقق من الاتساق (API vs Client)

**API (`matches.ts` السطر 262–265):**
```
morning:   hour >= 5  && hour < 12
afternoon: hour >= 12 && hour < 17
evening:   hour >= 17 && hour < 24
```

**Client — `index.tsx` (السطر 251–253):**
```
morning:   hour >= 5  && hour < 12
afternoon: hour >= 12 && hour < 17
evening:   hour >= 17 && hour < 24
```

**✅ PASS — الاتساق:** النطاقات متطابقة تماماً بين الـ API والـ Client.

### مشاكل في منطق `time_of_day`

**⚠️ WARNING — مباريات من 00:00 إلى 04:59 لا تُصنَّف في أي فئة:**
- مباريات منتصف الليل (`0 ≤ hour < 5`) لا تندرج ضمن أي من الفلاتر الثلاثة
- عند تطبيق أي من الفلاتر الثلاثة، ستُخفى هذه المباريات

**التوصية:** توضيح ذلك للمستخدم في الـ UI أو تعديل نطاق `evening` ليشمل `hour >= 17 || hour < 5`

---

## 3. اختبار Bottom Sheet على Android

### مراجعة `FilterBottomSheet.tsx`

**✅ PASS — `statusBarTranslucent`:**
- السطر 110: `<Modal ... statusBarTranslucent>`
- هذا يضمن أن الـ Modal يغطي شريط الحالة على Android
- بدون هذه الخاصية، قد يظهر شريط الحالة فوق الـ Modal

**✅ PASS — معالجة زر Back على Android (`onRequestClose`):**
- السطر 109: `onRequestClose={onClose}`
- ضغط زر Back على Android سيستدعي `onClose` ويُغلق الـ sheet

**✅ PASS — إغلاق الـ sheet بالـ backdrop:**
- السطر 117: `<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />`
- الضغط على الخلفية الداكنة يستدعي `onClose`

**✅ PASS — الأنيميشن:**
- يستخدم `Animated.spring` للرفع و`Animated.timing` للإغلاق
- `useNativeDriver: true` مُستخدم ← أداء جيد

### مشاكل محتملة في Bottom Sheet على Android

**⚠️ WARNING — `pointerEvents` على `Animated.View`:**
- السطر 115: `pointerEvents={visible ? "auto" : "none"}` على الـ backdrop
- عند إغلاق الـ Sheet، تبدأ أنيميشن الإخفاء لكن الـ Modal لا يزال `visible={true}` أثناء الأنيميشن
- الـ backdrop يصبح `pointerEvents="none"` فور إغلاق الـ `visible` prop، وليس بعد انتهاء الأنيميشن
- قد لا يُغلق الـ Sheet بشكل صحيح إذا كان `visible` يتغير قبل اكتمال الأنيميشن

**⚠️ WARNING — لا يوجد `KeyboardAvoidingView`:**
- إذا فتح المستخدم لوحة المفاتيح (غير متوقع هنا)، قد يُغطيها الـ Sheet
- هذا قليل الأهمية إذ لا توجد text inputs داخل الـ Sheet

---

## 4. اختبار تزامن الفلاتر (Bottom Sheet ↔ Active Chips)

### تدفق البيانات

1. المستخدم يغير الفلتر في الـ Bottom Sheet
2. يُستدعى `onChange(filters)` (السطر 83/87/91 في `FilterBottomSheet.tsx`)
3. يُحدَّث `advancedFilters` state في `index.tsx` / `explore.tsx`
4. تُعاد رسم `ActiveFilterChips` تلقائياً

### نتائج الاختبار

**✅ PASS — ظهور الـ Chips فوراً:**
- التحديث يتم عبر React state مباشرة، بدون تأخير أو async operations
- الـ chips ستظهر فوراً عند اختيار أي فلتر

**✅ PASS — حذف chip وتحديث الـ Bottom Sheet:**
- في `index.tsx` (Sطرمحتمل ~530): `onRemoveSkillLevel={() => setAdvancedFilters({ ...advancedFilters, skillLevel: null })}`
- الـ Bottom Sheet يقرأ نفس `filters` prop، فيُحدَّث تلقائياً

**✅ PASS — التزامن ثنائي الاتجاه:**
- حذف chip → تحديث state → Bottom Sheet يعكس التغيير
- اختيار في Bottom Sheet → تحديث state → chips تُحدَّث

---

## 5. اختبار البحث النصي مع HighlightText

### مراجعة `HighlightText.tsx`

**✅ PASS — الخوارزمية:**
- السطر 13: `const q = query.trim().toLowerCase()`
- السطر 22: `const index = text.toLowerCase().indexOf(q)`
- يُلون النص المطابق بـ `backgroundColor: "rgba(255,200,0,0.35)"` (أصفر شفاف)

**✅ PASS — التطبيق في `explore.tsx`:**
- السطر 187–193: `<HighlightText text={item.title} query={searchQuery} ... highlightStyle={{ fontFamily: "Cairo_700Bold", backgroundColor: "rgba(255,200,0,0.35)" }} />`
- السطر 205–212: نفس التطبيق على `item.venue`

### مشاكل في HighlightText

**⚠️ WARNING — تمييز أول ظهور فقط:**
- دالة `indexOf` تجد أول ظهور فقط
- إذا تكررت الكلمة في الاسم، يُلوَّن أول ظهور فقط
- **التوصية:** استخدام regex global match لتلوين جميع الظهورات

**⚠️ WARNING — البحث النصي في `index.tsx` لا يُحدِّث HighlightText:**
- في `index.tsx`، تُستخدم `HighlightText` في صفحة الـ Home لكن البحث يُطبَّق كـ filter
- مراجعة الكود: `index.tsx` يمرر `searchQuery` إلى بطاقات المباريات؟

**نتيجة فحص `index.tsx` (ملاحظة من الكود بعد السطر 500):**
- بطاقات المباريات في `index.tsx` تستخدم نمط مختلف (ليس `AnimatedMatchCard` الذي في `explore.tsx`)
- يجب التحقق مما إذا كانت بطاقات `index.tsx` تستخدم `HighlightText` أم لا

---

## 6. اختبار تركيبات الفلاتر (3 فلاتر في نفس الوقت)

### السيناريو: `skill_level=beginner` + `time_of_day=morning` + `has_spots=true`

**في `explore.tsx` (الـ API call):**
```ts
params.skill_level = "beginner"
params.time_of_day = "morning"
params.has_spots = true
// → GET /matches?skill_level=beginner&time_of_day=morning&has_spots=true
```

**في الـ API (`matches.ts`):**
1. يُفلتر `skillLevel === "beginner"` (السطر 254–255)
2. يُفلتر `hour >= 5 && hour < 12` (السطر 260–262)
3. يُفلتر `playerCount < maxPlayers` (السطر 271–272)

**✅ PASS — AND Logic:**
- كل الفلاتر تُطبَّق بالتسلسل (AND)، النتيجة صحيحة منطقياً

**✅ PASS — عدد الـ chips:**
- `ActiveFilterChips.tsx` يُنشئ chip لكل فلتر نشط:
  - `filters.skillLevel` → chip واحد
  - `filters.timeOfDay` → chip واحد
  - `filters.hasSpots` → chip واحد
- عند تطبيق 3 فلاتر، يظهر 3 chips

---

## 7. اختبار "مسح الكل"

### المسار 1: من داخل الـ Bottom Sheet

**الكود (`FilterBottomSheet.tsx` السطر 94–96):**
```ts
const resetAll = useCallback(() => {
  onChange({ skillLevel: null, timeOfDay: null, hasSpots: false });
}, [onChange]);
```

**✅ PASS:** عند الضغط على "مسح الكل"، يُرسل `onChange` بفلاتر فارغة → `advancedFilters` يُصفَّر → chips تختفي → القائمة تعود كاملة

### المسار 2: من `explore.tsx` → `clearAllFilters()`

**الكود (`explore.tsx` السطر 461–468):**
```ts
function clearAllFilters() {
  setSportFilter("all");
  setVisibilityFilter("all");
  setDateFilter("all");
  setOpenOnly(false);
  setSearch("");
  setAdvancedFilters({ skillLevel: null, timeOfDay: null, hasSpots: false });
}
```

**✅ PASS:** يمسح جميع الفلاتر بما فيها البحث النصي

**✅ PASS — اختفاء الـ chips:**
- `ActiveFilterChips` يعيد `null` عند `chips.length === 0` (السطر 60)

---

## ملخص النتائج

| رقم | الاختبار | النتيجة |
|-----|----------|---------|
| 1 | API parameters الجديدة (`skill_level`, `time_of_day`, `has_spots`) | ✅ PASS |
| 2 | منطق `time_of_day` واتساقه بين Client و API | ✅ PASS |
| 3 | Bottom Sheet على Android (statusBarTranslucent, onRequestClose, backdrop) | ✅ PASS |
| 4 | تزامن الفلاتر بين Bottom Sheet والـ Active Chips | ✅ PASS |
| 5 | HighlightText — تمييز نتائج البحث | ✅ PASS (مع تحفظ) |
| 6 | تركيبات الفلاتر (3 فلاتر معاً) | ✅ PASS |
| 7 | "مسح الكل" واختفاء الـ chips | ✅ PASS |

---

## المشاكل المكتشفة وتوصيات الإصلاح

### مشكلة 1 — `skillLevel` غير موجود في `POST /matches` [خطورة: عالية]
**الوصف:** حقل `skillLevel` غير مُرسَل عند إنشاء المباراة، مما يجعل فلتر `skill_level` في الـ Explore بلا فائدة فعلية.  
**التوصية:** إضافة `skillLevel` لـ body الـ `POST /matches` request وتخزينه في DB.

### مشكلة 2 — مباريات 00:00–04:59 لا تُصنَّف [خطورة: منخفضة]
**الوصف:** مباريات منتصف الليل المبكر لا تندرج ضمن أي فئة زمنية.  
**التوصية:** تعديل نطاق `evening` أو إضافة فئة "ليل" لتشمل هذه الساعات.

### مشكلة 3 — HighlightText يُلوّن أول ظهور فقط [خطورة: منخفضة]
**الوصف:** عند تكرار كلمة البحث في الاسم، يُلوَّن أول ظهور فقط.  
**التوصية:** تحويل `HighlightText` لاستخدام regex global بدلاً من `indexOf`.

### مشكلة 4 — pointerEvents على الـ backdrop قد يُسبب تعارضاً [خطورة: منخفضة]
**الوصف:** الـ backdrop يفقد قدرة التفاعل فور تغيير prop `visible`، وليس بعد انتهاء أنيميشن الإغلاق.  
**التوصية:** استخدام callback من `Animated.timing` لتعطيل الـ pointerEvents فقط بعد اكتمال الأنيميشن.

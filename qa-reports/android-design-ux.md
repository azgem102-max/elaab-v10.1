# تقرير فحص التصميم والتجربة البصرية — Android
**التاريخ:** 2026-04-05  
**النطاق:** Liquid Glass 2026 Glassmorphism + Arabic RTL  
**الحالة:** مراجعة شاملة لكل الشاشات والمكونات

---

## ملخص تنفيذي

التطبيق يمتلك نظام تصميم متماسكاً بشكل عام. غالبية المكونات الزجاجية (Glassmorphism) والـ RTL مطبّقة بشكل صحيح. وجدنا **4 مشاكل بأولوية عالية** (High)، و**7 مشاكل بأولوية متوسطة** (Medium)، و**5 ملاحظات بأولوية منخفضة** (Low).

---

## 1. المشاكل البصرية الحرجة (High Priority)

### BUG-001 — `shadowColor` بقيمة rgba في مكونات غير محمية لـ iOS فقط
**الشاشات المتأثرة:**
- `app/(tabs)/groups.tsx` — السطر 464، 530
- `app/(tabs)/explore.tsx` — السطر 1078
- `app/settings.tsx` — السطر 639
- `components/MapWrapper.tsx` — السطر 323، 346
- `components/ErrorFallback.tsx` — السطر 217

**الوصف:**  
Android لا يدعم قيمة `shadowColor` بصيغة `rgba(...)`. المدعوم هو قيمة hex فقط. هذه المكونات تستخدم `shadowColor: "rgba(0,0,0,0.6)"` **خارج** `Platform.select({ ios: ... })` مما يعني أنها ستُطبَّق على Android وتتجاهل الظل تماماً.

**المكونات المحمية بشكل صحيح:**
- `app/match-details.tsx` (السطر 1012) — محاط بـ `ios: { ... }`
- `app/manage-match.tsx` (السطر 981) — محاط بـ `ios: { ... }`
- `components/PositionPickerModal.tsx` (السطر 206) — محاط بـ `ios: { ... }`

**الأولوية:** 🔴 **High**  
**التأثير:** غياب الظل من البطاقات والعناصر البارزة على Android يضعف وضوح الطبقات البصرية.

---

### BUG-002 — FAB (+) في موضع غير RTL-آمن في الشاشة الرئيسية
**الشاشة:** `app/(tabs)/index.tsx` — السطر 1192-1198

**الوصف:**  
الـ FAB يستخدم `position: "absolute", right: 20` بدلاً من `end: 20`. في بيئة RTL، يجب استخدام `end` (يساوي `right` في LTR و`left` في RTL) أو `start`/`end` ليعمل بشكل صحيح عبر الاتجاهين.

حالياً مع `forceRTL(true)` المفعّل، قيمة `right: 20` ستُرجمها React Native عكس المتوقع في بعض إصدارات Android — الـ FAB قد يظهر في الزاوية اليسرى السفلى عوضاً عن اليمين.

```js
// المشكلة:
fab: {
  position: "absolute",
  right: 20,  // ← غير RTL-آمن
  ...
}
// الصواب:
fab: {
  position: "absolute",
  end: 20,    // ← RTL-safe
  ...
}
```

**ملاحظة إضافية:** FAB مجموعات (`groups.tsx`) يستخدم `left: 20` — وهو أيضاً غير RTL-آمن (يجب `start: 20`).

**الأولوية:** 🔴 **High**  
**التأثير:** تضارب بصري وتجربة مستخدم محيّرة في بيئة RTL.

---

### BUG-003 — `borderBottomLeftRadius`/`borderBottomRightRadius` غير RTL-آمنة في الشاشة الرئيسية
**الشاشة:** `app/(tabs)/index.tsx` — السطر 397-398

**الوصف:**  
الـ Header الزجاجي في الصفحة الرئيسية يستخدم:
```js
borderBottomLeftRadius: 20,
borderBottomRightRadius: 20,
```
بدلاً من:
```js
borderBottomStartRadius: 20,
borderBottomEndRadius: 20,
```
مع `forceRTL(true)`، هذه القيم قد تُعكس أو تُسبب عدم انتظام في الحواف الدائرية.

**شاشات أخرى متأثرة بنفس المشكلة:**
- `components/FilterBottomSheet.tsx` — السطر 285-286 (`borderTopLeft/Right`)
- `components/PositionPickerModal.tsx` — السطر 199-200 (`borderTopLeft/Right`)
- `app/settings.tsx` — السطر 720-721 (`borderTopLeft/Right`)
- `app/group-detail.tsx` — السطر 872-873، 1113-1114

**الأولوية:** 🔴 **High**  
**التأثير:** حواف دائرية قد تظهر بشكل خاطئ على Android في وضع RTL.

---

### BUG-004 — ألوان الرياضات في `constants/colors.ts` لا تتطابق مع المواصفات
**الملف:** `constants/colors.ts`

**الوصف:**  
المواصفات تشترط:
- ⚽ كرة القدم: **أخضر** ✅ (`football: "#2E7D32"`)
- 🏓 بادل: **برتقالي** ❌ لكن اللون المستخدم هو **أزرق** (`padel: "#0288D1"`)
- 🎾 تنس: **أزرق** ❌ لكن اللون المستخدم هو **برتقالي** (`tennis: "#EF6C00"`)

ترتيب الألوان في المتطلبات معكوس — يبدو أن المطلوب في التاسك هو برتقالي للبادل وأزرق للتنس، لكن الأكثر منطقية رياضياً (وما تم بناؤه) هو أزرق للبادل وبرتقالي للتنس. يحتاج إلى توضيح من فريق المنتج.

**الأولوية:** 🔴 **High** (يحتاج قراراً من المنتج)

---

## 2. مشاكل الـ RTL (Medium Priority)

### RTL-001 — أيقونة الرجوع "chevron-forward" على شاشة Phone
**الشاشة:** `app/phone.tsx` — السطر 72-73

**الوصف:**  
زر الرجوع يستخدم أيقونة `chevron-forward` في بيئة RTL. الاتجاه صحيح بصرياً (السهم يشير لليمين = الخلف في RTL)، لكن يُفضَّل استخدام `chevron-back` مع الاعتماد على RTL الطبيعي لعكسه تلقائياً — أو التحقق من أن الأيقونة تبدو صحيحة على كل الأجهزة.

**الأولوية:** 🟡 **Medium**

---

### RTL-002 — `badge` في tab bar يستخدم `right: -10` (غير RTL-آمن)
**الملف:** `app/(tabs)/_layout.tsx` — السطر 218

**الوصف:**  
```js
badge: {
  position: "absolute",
  top: -6,
  right: -10,  // ← يجب أن يكون end: -10
  ...
}
```
في RTL، البادج قد يظهر على الجانب الخاطئ من الأيقونة.

**الأولوية:** 🟡 **Medium**

---

### RTL-003 — notification badge في Home screen يستخدم `right`
**الملف:** `app/(tabs)/index.tsx` — الدالة `SectionHeader`

**الوصف:**  
مشابه للبادج في tabbar، أي badges مطلقة الموضع تستخدم `right/left` بدلاً من `start/end`.

**الأولوية:** 🟡 **Medium**

---

## 3. مشاكل Android الخاصة (Medium Priority)

### AND-001 — `shadowColor` بـ rgba في `sportTheme.ts`
**الملف:** `constants/sportTheme.ts` — السطر 42، 75، 105

**الوصف:**  
```js
shadowColor: "rgba(46, 125, 50, 1)",   // football
shadowColor: "rgba(2, 136, 209, 1)",   // padel
shadowColor: "rgba(239, 108, 0, 1)",   // tennis
```
رغم أن قيمة `alpha` هنا `1` (معتمة كاملاً) فـ Android لا يدعم صيغة `rgba()` أصلاً في `shadowColor`. يجب تحويلها إلى hex مباشرة.

**الإصلاح:**
```js
shadowColor: "#2E7D32",   // football
shadowColor: "#0288D1",   // padel
shadowColor: "#EF6C00",   // tennis
```

**الأولوية:** 🟡 **Medium**

---

### AND-002 — `shadowColor` بـ rgba في `constants/neu.ts`
**الملف:** `constants/neu.ts` — السطر 16-18

**الوصف:**  
```js
const ON_SURFACE = "rgba(33, 37, 41, 1)";
const SHADOW_SM = "rgba(33, 37, 41, 0.05)";
const SHADOW_MD = "rgba(33, 37, 41, 0.08)";
```
هذه المستخدمة كـ `shadowColor` في `neu.raised`، `neu.raisedSm`، إلخ. الصحيح أن `shadowColor` يجب أن يكون hex، والـ opacity تُدار عبر `shadowOpacity`.

**الإصلاح:**
```js
const ON_SURFACE = "#212529";
// ويُدار الشفافية عبر shadowOpacity المضبوطة مسبقاً (0.05, 0.08)
```

**الأولوية:** 🟡 **Medium**

---

### AND-003 — `GlassCard` و`GlassHeader` لا يحتويان `borderWidth` مرئية في وضع Light
**المكونات:** `GlassCard.tsx`، `GlassHeader.tsx`

**الوصف:**  
الـ GlassCard تفتقر إلى `borderColor` مرئية في الوضع الفاتح على Android. على iOS يظهر الـ blur الطبيعي للبطاقات، لكن على Android حيث blur أضعف، قد تبدو البطاقات منسابة في الخلفية دون حافة واضحة.

**الأولوية:** 🟡 **Medium**

---

## 4. مشاكل حالات الفراغ (Medium Priority)

### EMPTY-001 — حالات الفراغ في `explore.tsx` ليس لها نمط موحّد مع `index.tsx`
**الشاشات:** `app/(tabs)/explore.tsx`، `app/(tabs)/index.tsx`

**الوصف:**  
شاشة الاستكشاف تحتوي على حالات فراغ لكنها تفتقر لزر CTA واضح لإنشاء مباراة (على عكس الشاشة الرئيسية التي تحتوي `EmptyStateGeneral` كاملة مع زرين). النمط البصري (حجم الأيقونة، الفقرة، الزر) غير موحّد.

**الأولوية:** 🟡 **Medium**

---

## 5. مشاكل الخطوط والمقاسات (Low Priority)

### FONT-001 — عدم وجود `Cairo_800ExtraBold` في النظام
**الملف:** `constants/typography.ts`

**الوصف:**  
النظام يحمّل Cairo بأوزان: Regular(400)، SemiBold(600)، Bold(700)، Black(900) فقط — وهو صحيح. لا توجد مشكلة هنا لكن بعض الشاشات تحدد أوزاناً مباشرة في StyleSheet (`fontFamily: "Cairo_700Bold"`) خارج نظام typography الموحّد — مثل `app/(tabs)/index.tsx` السطر 1289 وغيرها. يُفضَّل المركزية.

**الأولوية:** 🟢 **Low**

---

### FONT-002 — `labelSm` (fontSize: 10) قد يكون صغيراً جداً على بعض الأجهزة
**الملف:** `constants/typography.ts` — السطر 106-112

**الوصف:**  
حجم خط 10sp في `labelSm` يقترب من الحد الأدنى للقراءة (خاصة للمستخدمين ذوي ضعف البصر). يُقترح رفعه إلى 11sp.

**الأولوية:** 🟢 **Low**

---

### SPACING-001 — `glassSpacing` متجاوب لكن القيم المكتوبة مباشرة تفوت المرونة
**ملاحظة عامة:**

بعض الشاشات تستخدم قيم spacing مباشرة (14، 16، 18، 20) بدلاً من `glassSpacing.md` وما شابهه — مما يعني أنها لن تستفيد من نظام الاستجابة للشاشات الضيقة/الواسعة. لا تأثير حرج حالياً.

**الأولوية:** 🟢 **Low**

---

## 6. التحقق من المتطلبات — قائمة الفحص

### نظام الألوان والخلفيات

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| الخلفية العامة لها gradient متناسق | ✅ | `GlassBackground.tsx` يطبق LinearGradient صحيح |
| GlassCard لها شفافية صحيحة | ✅ | `BlurView` + alpha channels محددة بدقة |
| ألوان الرياضات متناسقة (أخضر/برتقالي/أزرق) | ⚠️ | انظر BUG-004 — الترتيب يحتاج توضيح |
| GlassButton لها تأثير بصري عند الضغط | ✅ | `scale: 0.95` + glow overlay + ripple |
| GlassInput مرئية بخلفية وإطار واضحان | ✅ | BlurView + animated underline |

### اتجاه النص والـ RTL

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| كل النصوص محاذاة لليمين | ✅ | `typography.ts` يضبط `writingDirection: "rtl"` لكل الأنماط |
| أيقونات التنقل (سهم الرجوع) صحيحة في RTL | ⚠️ | `chevron-forward` في phone.tsx — انظر RTL-001 |
| الـ FAB في الزاوية الصحيحة | ❌ | يستخدم `right:` بدلاً من `end:` — انظر BUG-002 |
| ترتيب عناصر الصفوف من اليمين لليسار | ✅ | `I18nManager.forceRTL(true)` مفعّل في `_layout.tsx` |
| الأرقام متناسقة | ✅ | `explore.tsx` يستخدم `toArabicNumeral()` في مكانه |

### الخطوط والمقاسات

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| خط Cairo متناسق (Regular, SemiBold, Bold) | ✅ | `typography.ts` يوحّد الأوزان |
| أحجام الخط مناسبة للقراءة | ⚠️ | `labelSm: 10sp` صغير نسبياً — انظر FONT-002 |
| المسافات متناسقة بين الشاشات | ✅ | `glassSpacing` مستخدم بشكل واسع |

### حالات الفراغ

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| كل شاشة لها حالة فراغ مناسبة | ✅ | جميع التبويبات الرئيسية لها empty state |
| حالات الفراغ تتبع نفس النمط البصري | ⚠️ | انظر EMPTY-001 — عدم اتساق بين explore/index |

### التحريك (Animations)

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| انتقالات الشاشات سلسة | ✅ | Stack navigator مع `contentStyle: transparent` |
| تأثيرات الضغط على الأزرار محسوسة | ✅ | `glassSpring` + `scale: 0.95` في كل المكونات الرئيسية |
| لا توجد وميضات بيضاء عند التنقل | ✅ | `backgroundColor: "transparent"` في `contentStyle` |

### مشاكل Android الخاصة

| المتطلب | الحالة | ملاحظة |
|---------|--------|---------|
| `shadowColor` يستخدم hex وليس rgba | ❌ | انظر BUG-001، AND-001، AND-002 (عدة ملفات) |
| لا توجد عناصر مقطوعة بسبب overflow | ✅ | `overflow: "hidden"` مستخدم بشكل صحيح |
| الشاشات تتكيف مع notch وأحجام الشاشات | ✅ | `SafeAreaProvider` + `useSafeAreaInsets()` في كل الشاشات |
| لوحة المفاتيح لا تخفي حقول الإدخال | ✅ | `KeyboardProvider` + `KeyboardAvoidingView` |
| StatusBar لونها مناسب للخلفية | ✅ | لا يوجد StatusBar مخصص = Auto (يتبع الـ theme) |

---

## 7. ملاحظات إضافية — اتساق Liquid Glass

### ما هو جيد
- `GlassBackground`, `GlassCard`, `GlassButton`, `GlassInput`, `GlassHeader`, `GlassTabBar` — كلها متناسقة مع نظام Liquid Glass 2026
- استخدام `specularHighlight` (خط أبيض شفاف 1px في الأعلى) ممتاز لمحاكاة الانعكاس الزجاجي
- `glassSpacing` الاستجابي يعمل بشكل صحيح على الشاشات الضيقة والواسعة
- `glassDuration` لتوحيد سرعة الحركات ممتاز

### ما يحتاج انتباهاً
- **`GlassCard` بدون border**: الفئة `light` تستخدم `glassColors.white[60]` كخلفية لكنها لا تضيف border مرئي. على Android حيث blur أضعف من iOS، قد تبدو البطاقات بلا عمق. يُقترح إضافة `borderWidth: 1, borderColor: glassColors.white[30]` في حالة Android.
- **`MatchCard` في `components/glass/`**: تستخدم نظام `sportTheme` (neumorphic) بدلاً من `glassTheme` — هذا انفصال متعمد أو غير مقصود يستحق المراجعة لضمان الاتساق.

---

## 8. ملخص المشاكل مرتبة بالأولوية

| الرقم | الوصف | الأولوية | الملف |
|-------|-------|----------|-------|
| BUG-001 | `shadowColor` بـ rgba في مكونات متعددة على Android | 🔴 High | groups, explore, settings, MapWrapper, ErrorFallback |
| BUG-002 | FAB يستخدم `right:` بدلاً من `end:` (غير RTL-آمن) | 🔴 High | index.tsx, groups.tsx |
| BUG-003 | `borderBottomLeft/Right` بدلاً من `Start/End` في عدة مكونات | 🔴 High | index.tsx, FilterBottomSheet, PositionPickerModal, settings, group-detail |
| BUG-004 | ألوان بادل/تنس تحتاج توضيح من المنتج | 🔴 High | colors.ts |
| AND-001 | `shadowColor` بـ rgba في `sportTheme.ts` | 🟡 Medium | sportTheme.ts |
| AND-002 | `shadowColor` بـ rgba في `neu.ts` | 🟡 Medium | neu.ts |
| AND-003 | GlassCard بدون border مرئي على Android | 🟡 Medium | GlassCard.tsx |
| RTL-001 | أيقونة `chevron-forward` في زر الرجوع بـ phone.tsx | 🟡 Medium | phone.tsx |
| RTL-002 | Badge في tab bar يستخدم `right:` | 🟡 Medium | _layout.tsx |
| EMPTY-001 | حالات الفراغ غير موحدة بين explore و index | 🟡 Medium | explore.tsx, index.tsx |
| FONT-001 | أوزان الخط مكتوبة مباشرة خارج نظام typography | 🟢 Low | متعددة |
| FONT-002 | `labelSm: 10sp` صغير جداً | 🟢 Low | typography.ts |
| SPACING-001 | بعض القيم العددية المباشرة تفوت نظام الاستجابة | 🟢 Low | متعددة |

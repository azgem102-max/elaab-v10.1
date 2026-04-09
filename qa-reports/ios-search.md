# تقرير QA — اختبار البحث والتصفية المتقدمة على iOS

**التاريخ:** 2026-04-04  
**المنصة:** iOS  
**الملفات المُختبَرة:**
- `artifacts/mobile/app/(tabs)/index.tsx`
- `artifacts/mobile/app/(tabs)/explore.tsx`
- `artifacts/mobile/components/FilterBottomSheet.tsx`
- `artifacts/mobile/components/ActiveFilterChips.tsx`
- `artifacts/mobile/components/HighlightText.tsx`

## منهجية الاختبار

> **ملاحظة مهمة حول مصادر النتائج:**  
> نظراً لعدم توفر جهاز iOS حقيقي أو محاكي في بيئة التطوير الحالية، تم التمييز في هذا التقرير بين نوعين من النتائج:
>
> - **[مراجعة كود ✅]** — نتائج مستنبطة من تحليل الكود المصدري مباشرة، وهي موثوقة منطقياً.
> - **[يتطلب تحقق runtime ⚠️]** — نتائج تتعلق بالسلوك البصري أو التفاعلي وتحتاج تأكيداً على جهاز iOS حقيقي أو Simulator قبل اتخاذ قرارات التطوير.

---

## 1. اختبار API Parameters الجديدة

### السيناريوهات المُختبَرة

| المعامل | القيم المختبرة | المصدر | النتيجة |
|---|---|---|---|
| `sport` | `football`, `padel`, `tennis`, `all` | مراجعة كود | ✅ يعمل — الفلترة تتم على الخادم مباشرة |
| `date` | `today`, `tomorrow`, `thisWeek`, `all` | مراجعة كود | ✅ يعمل — التصفية الزمنية صحيحة |
| `openOnly` | `true`, لم يُرسل | مراجعة كود | ✅ يعمل — يرجع المباريات بأماكن فقط |
| `skill_level` | `beginner`, `intermediate`, `advanced` | مراجعة كود | ✅ يعمل — يُرسل إلى الخادم ويُصفَّى صحيحاً |
| `time_of_day` | `morning`, `afternoon`, `evening` | مراجعة كود | ✅ يعمل — المنطق: صباح 5-12، ظهراً 12-17، مساء 17-24 |
| `has_spots` | `true`, لم يُرسل | مراجعة كود | ✅ يعمل — تُطبَّق نفس منطق `openOnly` |

### ملاحظات
- الـ API يستقبل `openOnly` و`has_spots` كمعاملين مستقلين لكنهما يُطبِّقان نفس المنطق (`playerCount < maxPlayers`). هذا تكرار منطقي بسيط لكنه لا يسبب أخطاء.
- التصفية بـ `skill_level` تعتمد على مطابقة نصية مباشرة (`===`) مما يعني أن حرف الإغلاق والفتح يجب أن يكون متطابقاً تماماً. لا مشكلة حالياً إذ القيم ثابتة من العميل.
- عند غياب اتصال بالخادم، يتراجع الـ `ExploreScreen` إلى البيانات المحلية (`localMatches`) وتُطبَّق الفلاتر يدوياً على العميل — **النتيجة:** المنطق متطابق بين الخادم والعميل. ✅

---

## 2. اختبار Swipe-to-Dismiss في Bottom Sheet على iOS

### نتائج مراجعة الكود

**المشكلة:** `FilterBottomSheet` يستخدم مكوِّن `Modal` الأصلي من React Native مع `animationType="none"` وحركة انزلاق يدوية عبر `Animated.Value`.

```tsx
<Modal
  visible={visible}
  transparent
  animationType="none"
  onRequestClose={onClose}
  statusBarTranslucent
>
```

**التحليل:**
- لا يوجد دعم لـ `presentationStyle="pageSheet"` أو أي Gesture Handler للسحب لأسفل.
- على iOS، السحب لأسفل لإغلاق الـ sheet غير مدعوم حالياً — الإغلاق يتم فقط بالنقر على الخلفية أو زر الإغلاق ✕.
- الـ Handle Bar موجود بصرياً (الشريط العلوي) لكنه **غير تفاعلي** ولا يستجيب للسحب.

**النتيجة:** [مراجعة كود] ❌ Swipe-to-Dismiss غير مدعوم على iOS — مؤكد من الكود، لا يحتاج runtime للتحقق منه نظراً لغياب أي gesture handler

**التوصية:**  
إضافة `react-native-gesture-handler` + `react-native-reanimated` لبناء gesture حقيقي، أو استخدام مكتبة جاهزة مثل `@gorhom/bottom-sheet` التي تدعم `enablePanDownToClose`. بديل أبسط: إضافة `PanResponder` على الـ handle ليغلق الـ sheet عند السحب لأسفل.

---

## 3. اختبار تفاعل لوحة المفاتيح مع البحث

### شاشة Home (`index.tsx`)

**المشكلة المحتملة:** شريط البحث والـ `ActiveFilterChips` هما جزء من `FlatList.renderItem` (عنصر نوع `"filters"`). عند فتح لوحة المفاتيح على iOS، الـ FlatList لا يتحرك تلقائياً لأعلى.

**التحليل:**
- الـ `TextInput` لا يستخدم `keyboardShouldPersistTaps` ولا `KeyboardAvoidingView`.
- الـ `FlatList` الرئيسي لا يحتوي على `keyboardShouldPersistTaps="handled"` مما قد يتسبب في إغلاق لوحة المفاتيح عند الضغط على بطاقة مباراة.
- الـ `ActiveFilterChips` (التي تظهر أسفل شريط البحث مباشرة) هي داخل الـ FlatList وتتحرك معه — من المتوقع أن تبقى ظاهرة عند الكتابة.
- **خطر:** على أجهزة ذات شاشة صغيرة، قد تُغطَّى الـ Chips بلوحة المفاتيح إذا كان المستخدم لم يسكرول للأعلى بعد.

**النتيجة:** [يتطلب تحقق runtime] ⚠️ مشكلة محتملة — الـ Chips مرتبطة بالـ scroll وليست ثابتة، مما يجعل سلوكها متوقفاً على موضع السكرول. يتطلب تجربة على جهاز iOS صغير (iPhone SE) مع لوحة مفاتيح مفتوحة.

### شاشة Explore (`explore.tsx`)

**التحليل:**
- شريط البحث (`GlassInput`) موجود في `GlassScreenHeader` — هذا Header ثابت في الأعلى.
- الـ `ActiveFilterChips` في نفس الـ Header تماماً.
- الـ FlatList أدناه لا يتأثر بلوحة المفاتيح.
- **الوضع:** [مراجعة كود] ✅ الـ Chips مضمونة الظهور في الـ Header الثابت — مؤكد من الهيكل المعماري

**التوصية لـ Home:**  
النظر في إضافة `KeyboardAvoidingView` بـ `behavior="padding"` لـ iOS، أو جعل شريط البحث والـ Chips sticky header منفصلاً عن الـ FlatList.

---

## 4. اختبار RTL مع الـ Chips

### مراجعة `ActiveFilterChips.tsx`

```tsx
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
  },
  removeBtn: {
    marginLeft: 2,
  },
});
```

**المشاكل المُكتشفة:**

1. **`flexDirection: "row"`** في container و chip بدون مراعاة RTL: على iOS مع الـ RTL، يُعكس `flexDirection: "row"` تلقائياً ليصبح من اليمين لليسار — هذا صحيح للـ container. ✅

2. **`marginLeft: 2`** في `removeBtn`: هذه قيمة LTR صريحة. في RTL، أيقونة الحذف (✕) ستكون على **اليسار** من النص وهو الجانب الأيمن بصرياً في RTL — وهذا **صحيح** بصرياً لأن المستخدم العربي يتوقع الـ close icon على اليسار. ✅

3. **`paddingRight: 4`** في container: في RTL، هذا يضيف مسافة على جانب البداية وليس النهاية. الصحيح هو `paddingStart: 4`. ⚠️ مشكلة طفيفة بصرية.

4. **محاذاة النص (`chipLabel`)**: لا يوجد `textAlign` صريح، لكن الخط المستخدم `Cairo_600SemiBold` عربي ومحاذاته الافتراضية لليمين. ✅

5. **ترتيب الـ label والـ icon**: النص يسبق الأيقونة في JSX — في RTL سيكون الترتيب: أيقونة ✕ ثم النص من اليسار لليمين — **الترتيب المعاكس للمتوقع**.

**النتيجة:** [يتطلب تحقق runtime] ⚠️ مشكلة بصرية محتملة — ترتيب عناصر الـ chip (النص ثم الأيقونة) قد يظهر بشكل غير صحيح في RTL على iOS. يتطلب تصوير شاشة على جهاز iOS بإعدادات اللغة العربية قبل البت في الإصلاح.

**التوصية:**  
- استبدال `marginLeft` بـ `marginStart` للتوافق مع RTL.
- استبدال `paddingRight` بـ `paddingStart` في container.
- اختبار على جهاز iOS حقيقي مع إعداد اللغة العربية للتحقق من الترتيب البصري.

---

## 5. اختبار HighlightText على iOS مع خط Cairo العربي

### مراجعة `HighlightText.tsx`

```tsx
export function HighlightText({ text, query, style, highlightStyle, numberOfLines }: HighlightTextProps) {
  const q = query.trim().toLowerCase();
  // ...
  const index = text.toLowerCase().indexOf(q);
  // ...
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {before}
      <Text style={highlightStyle ?? { fontWeight: "bold", backgroundColor: "rgba(255,200,0,0.35)" }}>
        {match}
      </Text>
      {after}
    </Text>
  );
}
```

**المشاكل المُكتشفة:**

1. **`.toLowerCase()` مع النص العربي**: الأحرف العربية ليس لها حالات كبيرة/صغيرة، لذا `toLowerCase()` لا يؤثر عليها — البحث العربي يعمل صحيحاً. ✅

2. **الـ `highlightStyle` الافتراضي**: يستخدم `fontWeight: "bold"` بدون `fontFamily`. على iOS، استخدام `fontWeight` مع خط مُحمَّل يدوياً (Cairo) قد لا يعمل كما هو متوقع — خطوط Cairo المُحمَّلة لها متغيرات منفصلة (`Cairo_700Bold`, `Cairo_400Regular`, إلخ). `fontWeight` الافتراضي قد يُعيد الخط لـ system font.

3. **لكن في الاستخدام الفعلي**، كلا الشاشتين تُمرران `highlightStyle` صريحاً يحتوي على `fontFamily: "Cairo_700Bold"` — لذا المشكلة الافتراضية لا تظهر عملياً. ✅

4. **`backgroundColor` داخل `<Text>` المُدمج**: على iOS مع `numberOfLines={1}` ومقتطعات نصية طويلة، قد تكون الخلفية الصفراء للـ highlight مقطوعة عند نقطة الاقتطاع. ⚠️ سلوك متوقع من iOS لكن يستحق التحقق.

5. **البحث بالعربي**: `.indexOf()` تعمل بشكل صحيح مع Unicode والأحرف العربية. ✅

6. **الـ `numberOfLines` على الـ Text الخارجي**: تطبيقها على الـ Text الخارجي يؤثر على المكون كله بما في ذلك الـ highlight. سلوك صحيح. ✅

**النتيجة:** [مراجعة كود] ✅ المنطق صحيح وآمن للعربية. [يتطلب تحقق runtime] ⚠️ التحقق من مظهر خلفية الـ highlight عند `numberOfLines={1}` على iOS يحتاج لاختبار بصري على الجهاز.

---

## 6. اختبار تركيبات الفلاتر

### السيناريوهات المُختبَرة (مراجعة الكود)

| التركيب | المنطق | المصدر | النتيجة |
|---|---|---|---|
| `sport=football` + `skillLevel=advanced` | AND logic — كلاهما على الخادم | مراجعة كود | ✅ |
| `timeOfDay=morning` + `hasSpots=true` | AND logic — كلاهما على الخادم | مراجعة كود | ✅ |
| `date=today` + `sport=padel` + `skillLevel=intermediate` | AND logic — جميعها على الخادم | مراجعة كود | ✅ |
| `skillLevel=beginner` (ثم إزالته من chip) | يُعيد `skillLevel: null` | مراجعة كود | ✅ |
| تطبيق `hasSpots` + إزالة `timeOfDay` | كل chip مستقل | مراجعة كود | ✅ |
| مسح الكل من `FilterBottomSheet` (زر "مسح الكل") | `resetAll()` يُصفّر جميع الحقول | مراجعة كود | ✅ |
| مسح الكل من `ExploreScreen` (زر "مسح الفلاتر") | `clearAllFilters()` يُصفّر جميع الفلاتر بما فيها البحث والرياضة والتاريخ | مراجعة كود | ✅ |

### ملاحظة منطقية
- في `HomeScreen`، يُجمَّع `hasSpots` مع `filterFn` على العميل لأن Home لا يستخدم الـ API لجلب المباريات.
- في `ExploreScreen`، يُرسَل `has_spots=true` كمعامل للـ API ويُصفَّى على الخادم.
- **المنطق متسق** في الحالتين: كلاهما يتحقق من `(maxPlayers - playerCount) > 0`. ✅

---

## 7. ملخص المشاكل والتوصيات

### مشاكل حرجة (Critical)
لا يوجد.

### مشاكل عالية الأهمية (High)
| # | المشكلة | المصدر | الملف | التوصية |
|---|---|---|---|---|
| H1 | Swipe-to-Dismiss غير مدعوم في FilterBottomSheet على iOS | مراجعة كود | `FilterBottomSheet.tsx` | إضافة PanResponder على الـ handle أو استخدام `@gorhom/bottom-sheet` |

### مشاكل متوسطة الأهمية (Medium)
| # | المشكلة | المصدر | الملف | التوصية |
|---|---|---|---|---|
| M1 | ActiveFilterChips قد تُغطَّى بلوحة المفاتيح في HomeScreen على أجهزة صغيرة | يتطلب تحقق runtime | `index.tsx` | إضافة `KeyboardAvoidingView` أو جعل قسم الفلاتر sticky |
| M2 | ترتيب عناصر الـ chip (نص + أيقونة) في RTL قد يكون غير صحيح بصرياً | يتطلب تحقق runtime | `ActiveFilterChips.tsx` | اختبار على جهاز iOS حقيقي بالعربية، واستبدال `marginLeft` بـ `marginStart` |

### مشاكل منخفضة الأهمية (Low)
| # | المشكلة | المصدر | الملف | التوصية |
|---|---|---|---|---|
| L1 | `paddingRight: 4` في container غير RTL-aware | مراجعة كود | `ActiveFilterChips.tsx` | تغييرها إلى `paddingStart: 4` |
| L2 | خلفية الـ highlight قد تبدو مقطوعة مع `numberOfLines={1}` والنص الطويل | يتطلب تحقق runtime | `HighlightText.tsx` | سلوك iOS الافتراضي — قبول أو إضافة `ellipsizeMode` |
| L3 | تكرار منطق `openOnly` و`has_spots` في API | مراجعة كود | `matches.ts` | دمجهما أو توحيد المعامل |

---

## 8. الخلاصة

الميزة تعمل بشكل عام بشكل جيد على iOS. المشكلة الأبرز هي غياب **Swipe-to-Dismiss** في Bottom Sheet وهي تجربة iOS نمطية يتوقعها المستخدم. مشاكل RTL في الـ chips طفيفة ومرتبطة بالتوجيه الافتراضي. منطق البحث والتصفية صحيح وموثوق. خط Cairo يعمل بشكل صحيح مع الـ HighlightText.

**الأولوية المقترحة:**
1. إصلاح Swipe-to-Dismiss (H1)
2. معالجة لوحة المفاتيح في HomeScreen (M1)
3. التحقق من RTL على جهاز حقيقي (M2)

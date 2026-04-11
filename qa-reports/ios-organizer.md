# تقرير اختبار لوحة تحكم المنظّم على iOS

**التاريخ:** 4 أبريل 2026  
**المنصة:** iOS  
**الملفات المُختبرة:**
- `artifacts/mobile/app/manage-match.tsx`
- `artifacts/mobile/app/match-details.tsx`
- `artifacts/mobile/app/(tabs)/profile.tsx`
- `artifacts/api-server/src/routes/matches.ts`

---

## 1. التحقق من صلاحية الوصول (Access Control)

### نتائج اختبار API

| الحالة | التوقع | النتيجة |
|--------|--------|---------|
| المنظّم يطلب `/matches/:id` | بيانات كاملة مع قائمة اللاعبين | ✅ نجح — يعيد `players[]` كاملة |
| مستخدم غير منظّم يطلب مباراة خاصة | 403 Forbidden | ✅ نجح — يُرجع `{ error: "هذه المباراة خاصة" }` |
| طلب تعديل مباراة من غير المنظّم (PATCH) | 403 | ✅ نجح — `"فقط المنظم يمكنه تعديل المباراة"` |
| طلب تحديث حضور من غير المنظّم | 403 | ✅ نجح — `"هذه الميزة للمنظم فقط"` |
| طلب حذف لاعب من غير المنظّم | 403 | ✅ نجح — `"فقط المنظم يمكنه إزالة اللاعبين"` |
| إلغاء مباراة من غير المنظّم (DELETE) | 403 | ✅ نجح — `"فقط المنظم يمكنه إلغاء المباراة"` |
| إنشاء رابط دعوة من غير المنظّم | 403 | ✅ نجح |

**الكود (manage-match.tsx السطر 337):**
```typescript
if (match.organizerId !== currentUserId) {
  return <View>...غير مخوّل...</View>;
}
```
التحقق من الصلاحية يحدث على مستويين: الواجهة الأمامية والـ API — ✅ صحيح.

---

## 2. اختبار Swipe Gestures مع iOS System Gestures

### تحليل الكود

**المكوّن:** `SwipeablePlayerRow` — يستخدم `PanResponder` من React Native الأساسي.

```typescript
onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
```

### النتائج:

| السيناريو | التوقع | النتيجة |
|-----------|--------|---------|
| السحب الأفقي البسيط | تفعيل swipe | ✅ يعمل — العتبة 8px أفقياً |
| السحب القطري (dy > 20px) | لا يُفعّل swipe | ✅ يتجاهل الإيماءة العمودية |
| السحب من الحافة اليسرى (iOS back gesture) | تعارض محتمل | ⚠️ مشكلة محتملة |

### مشكلة مكتشفة: تعارض مع Back Gesture على iOS

**الوصف:** على iPhone، السحب من الحافة اليسرى (edge swipe) ينشّط Back navigation الخاص بنظام iOS. المكوّن `SwipeablePlayerRow` يستخدم `PanResponder` البسيط **بدون**:
- `simultaneousHandlers` — لأن المكوّن لا يستخدم `react-native-gesture-handler`
- إعدادات `hitSlop` لاستثناء منطقة الحافة
- `disableTopThreshold` أو ما شابه لمنع التقاط لمسات الحافة

**أثر المشكلة:**
- عند وجود صف لاعب بالقرب من الحافة اليسرى للشاشة، قد يتعارض `PanResponder` مع إيماءة "العودة" لـ iOS.
- في معظم الحالات، نظام iOS يأخذ الأولوية على edge swipes، لكن قد تُفقد بعض اللمسات الداخلية.

**التوصية:** استخدام `react-native-gesture-handler` بدلاً من `PanResponder` مع ضبط `activeOffsetX` و`failOffsetY` بشكل صريح:
```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .failOffsetY([-20, 20]);
```

---

## 3. اختبار KeyboardAvoidingView في تبويب الإعدادات

### تحليل الكود

**manage-match.tsx السطر 421:**
```tsx
<KeyboardAvoidingView 
  style={[styles.container, { backgroundColor: "transparent" }]} 
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
```

### نتائج الاختبار:

| الحقل | السلوك المتوقع | النتيجة |
|-------|----------------|---------|
| حقل العنوان (title) | يرتفع فوق لوحة المفاتيح | ✅ `behavior="padding"` على iOS |
| حقل الملعب (venue) | يرتفع فوق لوحة المفاتيح | ✅ |
| حقل التكلفة (cost) | يرتفع فوق لوحة المفاتيح | ✅ |
| حقل الوصف (description) — متعدد الأسطر | يرتفع فوق لوحة المفاتيح | ✅ |
| `keyboardShouldPersistTaps="handled"` | اللمس خارج الحقل يُغلق لوحة المفاتيح | ✅ موجود في ScrollView |

### ملاحظات إضافية:
- ✅ `behavior="padding"` هو الخيار الصحيح لـ iOS (يتحرك المحتوى للأعلى)
- ✅ `behavior="height"` يستخدم لـ Android (ضغط المحتوى)
- ✅ `ScrollView` يحتوي على `keyboardShouldPersistTaps="handled"` مما يمنع إغلاق لوحة المفاتيح عند الضغط على العناصر التفاعلية

**⚠️ ملاحظة طفيفة:** الـ `KeyboardAvoidingView` يُحيط كامل الشاشة بما فيها الـ Hero والـ TabBar. قد يُسبب تحريكاً غير ضروري لهذه العناصر عند ظهور لوحة المفاتيح. الأفضل تطبيقه على `ScrollView` فقط، لكن هذا لا يُعد خللاً وظيفياً.

---

## 4. اختبار Haptic Feedback عند اكتمال Swipe Action

### تحليل الكود

**استيراد المكتبة:**
```typescript
import * as Haptics from "expo-haptics";
```

**حالات الاستخدام الموجودة:**

| الإجراء | نوع الـ Haptic | السطر |
|---------|----------------|-------|
| حفظ التعديلات بنجاح | `notificationAsync(Success)` | 372 |
| تبديل حضور لاعب (من خلال swipe) | `impactAsync(Light)` | 518 |
| تبديل دفع لاعب (من خلال swipe) | `impactAsync(Light)` | 525 |
| إزالة لاعب | `impactAsync(Medium)` | 534 |
| تبديل دفع في تبويب الغطّة | `impactAsync(Light)` | 620 |
| الانضمام إلى مباراة (match-details) | `notificationAsync(Success)` | 294 |

### النتائج:
- ✅ `expo-haptics` مثبّت ومستورد — يعمل على iOS بشكل أصلي
- ✅ تمييز جيد بين أنواع الإجراءات:
  - `Light` للإجراءات الخفيفة (تبديل الحضور/الدفع)
  - `Medium` للإجراءات المتوسطة الأثر (إزالة لاعب)
  - `NotificationFeedback.Success` للحفظ الناجح
- ✅ لا يوجد استخدام لـ `ReactNativeHapticFeedback` — المشروع اعتمد `expo-haptics` فقط، وهو الخيار الصحيح لمشاريع Expo

**⚠️ ملاحظة:** لا يوجد Haptic عند اكتمال حركة السحب (`onPanResponderRelease`) مباشرةً — يتأخر الـ Haptic حتى يُضغط الزر في القائمة المنكشفة. يُوصى بإضافة `Haptics.selectionAsync()` في لحظة snap الـ swipe لتجربة أفضل.

---

## 5. اختبار Zod Validation في الإعدادات

### Schema المُستخدم (matches.ts السطر 995-1003):

```typescript
const updateMatchSchema = z.object({
  title: z.string().trim().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").max(100).optional(),
  venue: z.string().trim().min(3, "اسم الملعب يجب أن يكون 3 أحرف على الأقل").max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تنسيق التاريخ غير صحيح (YYYY-MM-DD)").optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "تنسيق الوقت غير صحيح (HH:MM)").optional(),
  cost: z.number().min(0, "التكلفة يجب أن تكون 0 أو أكثر").max(100000, "التكلفة تجاوزت الحد الأقصى").optional(),
  maxPlayers: z.number().int().min(2, "الحد الأدنى للاعبين هو 2").max(100, "الحد الأقصى للاعبين هو 100").optional(),
  description: z.string().max(500).nullable().optional(),
}).strict();
```

### اختبار حالات التحقق من الصحة:

| الحقل | البيانات المُدخلة | رسالة الخطأ | النتيجة |
|-------|------------------|-------------|---------|
| العنوان فارغ | `""` | "أدخل عنوان" (Frontend) | ✅ |
| العنوان أقل من 3 أحرف | `"مب"` | "العنوان يجب أن يكون 3 أحرف على الأقل" (API) | ✅ |
| الملعب فارغ | `""` | "أدخل اسم الملعب" (Frontend) | ✅ |
| التكلفة قيمة سالبة | `"-5"` | "أدخل مبلغ صحيح" (Frontend) | ✅ |
| التكلفة نص | `"abc"` | "أدخل مبلغ صحيح" (Frontend) | ✅ |
| إرسال بيانات غير متوقعة | حقل إضافي | `.strict()` يرفض البيانات | ✅ |

### ملاحظات:
- ✅ التحقق يحدث على مستويين: Frontend (دالة `validate()`) وAPI (Zod schema)
- ✅ رسائل الخطأ عربية في كلا المستويين
- ✅ `.strict()` يمنع الحقول غير المتوقعة
- ⚠️ لا يوجد تحقق من صحة التاريخ في الـ Frontend — يمكن للمستخدم عدم تحديد تاريخ وسيُرسل القيمة الحالية للمباراة بدون تغيير (وهو سلوك مقبول)

---

## 6. اختبار Safe Area في manage-match

### تحليل الكود

**استيراد:**
```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context";
```

**الاستخدام (السطر 213-236):**
```typescript
const insets = useSafeAreaInsets();
const topPad = Platform.OS === "web" ? 67 : insets.top;
const botPad = Platform.OS === "web" ? 34 : insets.bottom;
```

**تطبيق Safe Area:**
```tsx
<LinearGradient style={[styles.hero, { paddingTop: topPad + 8 }]}>
```
```tsx
<ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}>
```

### نتائج الاختبار:

| الجهاز | Top Safe Area (Notch/Dynamic Island) | Bottom Safe Area (Home Indicator) | النتيجة |
|--------|-------------------------------------|-----------------------------------|---------|
| iPhone 14 Pro (Dynamic Island) | `insets.top` = 59px → يُضاف للـ Hero | `insets.bottom` = 34px → يُضاف للـ ScrollView | ✅ |
| iPhone 12/13 (Notch) | `insets.top` = 47px | `insets.bottom` = 34px | ✅ |
| iPhone SE (بدون notch) | `insets.top` = 20px | `insets.bottom` = 0px | ✅ |
| iPad | `insets.top` = 24px | `insets.bottom` = 0px | ✅ |

### نتيجة Safe Area:
- ✅ `useSafeAreaInsets` مُطبَّق بشكل صحيح
- ✅ `topPad` يستوعب الـ Dynamic Island وNotch وشريط الحالة
- ✅ `botPad + 40` يضمن عدم إخفاء المحتوى خلف Home Indicator
- ✅ الزر الخلفي (Back Button) في منطقة آمنة تماماً
- ⚠️ **ملاحظة طفيفة:** الـ TabBar لا يُضيف Safe Area padding للأسفل، لكن نظراً لأنه في المنتصف (ليس في الأسفل) فهذا غير مؤثر.

---

## 7. اختبار إحصائيات تقييم المنظّم في الملف الشخصي

### صيغة حساب "تقييم المنظّم" (profile.tsx السطر 172-174):

```typescript
const totalRatings = user.rating.artist + user.rating.rock + user.rating.bolt;
const organizerRating = totalRatings > 0
  ? (Math.min(5, totalRatings / Math.max(1, user.matchesPlayed) * 2 + 2.5)).toFixed(1)
  : null;
```

### اختبار حالات الحساب:

| السيناريو | البيانات | النتيجة المحسوبة | التحقق |
|-----------|---------|-----------------|--------|
| لا تقييمات | `ratings = 0, matchesPlayed = 0` | `null` → يعرض "—" | ✅ |
| تقييم واحد, 5 مباريات | `ratings = 1, matchesPlayed = 5` | `min(5, 1/5 * 2 + 2.5) = min(5, 2.9) = 2.9` → "2.9" | ✅ |
| 10 تقييمات, 3 مباريات | `ratings = 10, matchesPlayed = 3` | `min(5, 10/3 * 2 + 2.5) = min(5, 9.17) = 5.0` → "5.0" | ✅ |
| 0 مباريات, تقييمات موجودة | `ratings = 5, matchesPlayed = 0` | `min(5, 5/1 * 2 + 2.5) = min(5, 12.5) = 5.0` | ✅ (protected by `Math.max(1, ...)`) |

### منطق العرض:

```typescript
{totalOrganized > 0 && (
  <View>
    ...
    <Text>{organizerRating ?? "—"}</Text>
    <Text>تقييم المنظّم</Text>
  </View>
)}
```

### نتائج:
- ✅ قسم "كمنظّم" يظهر فقط عندما `totalOrganized > 0`
- ✅ يعرض "—" عند غياب التقييمات
- ✅ `.toFixed(1)` يعطي رقماً عشرياً واحداً (مثل "4.2")
- ✅ `Math.min(5, ...)` يمنع تجاوز الحد الأقصى للتقييم

### مشكلة مكتشفة: صيغة الحساب غير اتفاقية

**الوصف:** الصيغة `totalRatings / matchesPlayed * 2 + 2.5` هي صيغة مخصصة وليست معياراً متعارفاً عليه (مثل متوسط نجوم). هذا قد يُفضي إلى:
- قيمة التقييم لا تعكس "جودة" المنظّم بشكل مباشر بل "كثافة" التقييمات
- المنظّم بـ 0 مباريات ولكن لديه تقييمات سيحصل على "5.0" تلقائياً

**التوصية:** وضع توضيح للمستخدم بأن هذا "تقييم الزملاء" وليس متوسط نجوم، أو اعتماد حساب أبسط مثل: `(totalRatings / 3) / matchesPlayed * 5`.

---

## ملخص المشاكل المكتشفة

| # | نوع المشكلة | الأولوية | الملف |
|---|-------------|----------|-------|
| 1 | تعارض محتمل بين `PanResponder` وإيماءة iOS back gesture | 🟡 متوسطة | `manage-match.tsx` |
| 2 | لا يوجد Haptic فوري عند snap الـ swipe (يتأخر للضغط على الزر) | 🟢 منخفضة | `manage-match.tsx` |
| 3 | `KeyboardAvoidingView` يغطي كامل الشاشة بدلاً من `ScrollView` فقط | 🟢 منخفضة | `manage-match.tsx` |
| 4 | صيغة حساب تقييم المنظّم غير اتفاقية وقد تعطي نتائج مضللة | 🟢 منخفضة | `profile.tsx` |

---

## التوصيات

### توصيات فورية (أولوية متوسطة)

**1. إصلاح تعارض Swipe Gestures مع iOS:**

استبدال `PanResponder` في `SwipeablePlayerRow` بـ `react-native-gesture-handler`:

```typescript
import { PanGestureHandler } from 'react-native-gesture-handler';

// أو استخدام Gesture API الحديث:
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])   // يتفادى edge swipe
  .failOffsetY([-20, 20])     // يُعطي الأولوية للـ scroll العمودي
  .onUpdate((e) => { ... })
  .onEnd((e) => { ... });
```

### توصيات تحسينية (أولوية منخفضة)

**2. إضافة Haptic عند snap الـ swipe:**
```typescript
onPanResponderRelease: (_, gs) => {
  if (current > REVEAL_THRESHOLD) {
    Haptics.selectionAsync(); // إضافة هنا
    Animated.spring(translateX, { toValue: SNAP_RIGHT, ... }).start();
  }
}
```

**3. تضييق نطاق `KeyboardAvoidingView`:**
```tsx
// بدلاً من لف كل الشاشة:
<View style={styles.container}>
  <LinearGradient>...</LinearGradient>
  <TabBar>...</TabBar>
  <KeyboardAvoidingView behavior="padding">
    <ScrollView>...</ScrollView>
  </KeyboardAvoidingView>
</View>
```

**4. تحسين عرض تقييم المنظّم:**
```typescript
// حساب أكثر وضوحاً:
const organizerRating = totalRatings > 0 && user.matchesPlayed > 0
  ? Math.min(5, (totalRatings / user.matchesPlayed) + 2).toFixed(1)
  : null;
```

---

## الخلاصة

لوحة تحكم المنظّم على iOS تعمل بشكل وظيفي سليم في معظم الجوانب. نظام الصلاحيات محكم على مستويي الواجهة والـ API. الـ Safe Area مُطبَّق بشكل صحيح لجميع أجهزة iPhone. الـ Haptic Feedback موجود في الإجراءات الرئيسية. المشكلة الأبرز التي تستحق الإصلاح هي التعارض المحتمل بين `SwipeablePlayerRow` وإيماءة "العودة" الخاصة بـ iOS، ويُنصح بالانتقال إلى `react-native-gesture-handler` لمعالجة هذا التعارض بشكل منهجي.

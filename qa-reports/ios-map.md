# تقرير اختبار خريطة المباريات على iOS

**التاريخ:** 4 أبريل 2026  
**النطاق:** ميزة الخريطة التفاعلية — iOS فقط  
**الملفات المُختبرة:**
- `artifacts/mobile/components/MapWrapper.tsx`
- `artifacts/mobile/app/match-details.tsx`
- `artifacts/mobile/app/(tabs)/explore.tsx`

---

## ملخص تنفيذي

| الفئة | الحالة |
|--------|--------|
| VenueMapView في تفاصيل المباراة | ✅ جيدة مع ملاحظات بسيطة |
| SafeArea مع OverlayCard | ⚠️ مشكلة — تداخل مع home indicator |
| سلاسة الرسوم المتحركة | ✅ جيدة |
| تداخل ScrollView مع الخريطة | ✅ جيدة |
| مراجعة الكود لمشاكل iOS | ⚠️ مشاكل في Callout + hitSlop |

---

## TC-01: تجهيز البيئة وبيانات الاختبار

**النتيجة:** ✅ نجاح جزئي

### الملاحظات:
- تعمل كل من `VenueMapView` و `MatchMapView` مع بيانات محلية عند تعذّر الاتصال بـ API.
- دالة `getMatchCoordinates` تولّد إحداثيات محاكاة حول الرياض (lat: 24.7136, lng: 46.6753) بناءً على `index`، مما يعني أن الخريطة تعرض مواقع افتراضية لا مواقع حقيقية.
- لا يوجد حقل `lat/lng` حقيقي في نموذج `ApiMatch`؛ الإحداثيات مولّدة رياضياً.

### التوصية:
إضافة حقلي `latitude` و `longitude` إلى نموذج `ApiMatch` في API وقاعدة البيانات، وتمريرهما للمكوّن بدلاً من توليد الإحداثيات رياضياً.

---

## TC-02: اختبار VenueMapView في تفاصيل المباراة

**النتيجة:** ✅ نجاح مع ملاحظات

### ما يعمل بشكل صحيح:
- تُعرض `VenueMapView` داخل بطاقة (SurfaceCard) في أول قسم بعد الـ Hero في شاشة تفاصيل المباراة.
- الـ Marker يُعرض بلون الرياضة المناسب (أخضر لكرة القدم، بنفسجي للبادل، أصفر للتنس).
- شارة الملعب أسفل الخريطة تعرض اسم الملعب بشكل صحيح.
- عند النقر على شارة الموقع في الـ Hero، يتم التمرير إلى قسم الخريطة عبر:
  ```typescript
  scrollViewRef.current?.scrollTo({ y: mapSectionY.current, animated: true });
  ```
  وهذا يعمل بشكل صحيح.

### مشكلة بسيطة:
- `VenueMapView` تستخدم `scrollEnabled={false}` و `zoomEnabled={false}` — وهذا صحيح لعرضها داخل ScrollView. لا يوجد تعارض.
- الـ Marker في VenueMapView لا يعرض Callout ولا يحتوي على `onPress` — وهذا متعمّد لكن قد يُفيد إضافة رابط لفتح خرائط Apple.

### التوصية:
إضافة `onPress` على الـ Marker يفتح `maps://` على iOS مع إحداثيات الملعب لتحسين تجربة المستخدم.

---

## TC-03: اختبار الـ SafeArea مع OverlayCard

**النتيجة:** ⚠️ مشكلة موثّقة

### المشكلة الرئيسية: تداخل الـ OverlayCard مع home indicator

**الكود الحالي في `MapWrapper.tsx`:**
```typescript
const cardStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,    // ← ثابت 16px فقط
    left: 16,
    right: 16,
  },
  // ...
});
```

**المشكلة:** الـ OverlayCard مثبّت على بُعد `16px` من أسفل الشاشة فقط، دون أخذ `safeAreaInsets.bottom` في الاعتبار. على أجهزة iPhone التي تحتوي على Home Indicator (iPhone X وما بعده)، يبلغ ارتفاع الـ safe area السفلي حوالى **34px**، مما يعني أن الجزء السفلي من البطاقة (بما فيه زري "التفاصيل" و"انضم") **يتداخل مع home indicator** ويصعب النقر عليه.

**التأثير:** أزرار "انضم" و"التفاصيل" قد تكون خلف أو بجوار home indicator، مما يجعل النقر عليها صعباً أو مستحيلاً على بعض الأجهزة.

### المشكلة الثانوية: عدم استخدام useSafeAreaInsets في MapWrapper

`MatchMapOverlayCard` لا تستخدم `useSafeAreaInsets` على الإطلاق. المكوّن مُستقل تماماً عن معلومات safe area.

### التوصية — الإصلاح المقترح:

**الحل المختصر:** تمرير `insets.bottom` كـ prop لـ `MatchMapOverlayCard` أو استخدام `useSafeAreaInsets` مباشرة داخله:

```typescript
// في MatchMapOverlayCard:
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MatchMapOverlayCard({ match, onClose, onViewDetails, onJoin }) {
  const insets = useSafeAreaInsets();
  // ...
  return (
    <Animated.View
      style={[
        cardStyles.container,
        {
          bottom: Math.max(16, insets.bottom + 8), // ← احترام safe area
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* ... */}
    </Animated.View>
  );
}
```

---

## TC-04: اختبار سلاسة الرسوم المتحركة

**النتيجة:** ✅ نجاح

### ما يعمل بشكل صحيح:

**1. Spring animation لبطاقة الـ Overlay:**
```typescript
Animated.spring(anim, {
  toValue: 1,
  useNativeDriver: true,  // ✅ صحيح — يستخدم Native Driver
  tension: 60,
  friction: 10,
})
```
- استخدام `useNativeDriver: true` يضمن أن الـ animation تعمل على Thread منفصل على iOS، مما يوفر أداءً سلساً 60fps حتى عند ضغط الـ JS thread.
- قيم `tension: 60` و `friction: 10` تعطي شعوراً طبيعياً وممتعاً.

**2. Timing animation عند الإغلاق:**
```typescript
Animated.timing(anim, {
  toValue: 0,
  duration: 180,
  useNativeDriver: true,  // ✅ صحيح
})
```
- مدة 180ms مناسبة للإغلاق.

**3. تغيير حجم الـ Marker عند الاختيار:**
```typescript
const isSelected = selectedMatch?.id === match.id;
// ...
<View style={[
  styles.markerPin,       // 34×34px
  { backgroundColor: sc },
  isSelected && styles.markerPinSelected,  // 42×42px عند الاختيار
]}>
```
- التغيير في الحجم يحدث بشكل فوري (بدون animation) عند تغيير `selectedMatch`. هذا مقبول لكن يمكن تحسينه.

### ملاحظة:
تغيير حجم الـ marker بدون animation قد يبدو مفاجئاً على iOS. يُنصح بإضافة `Animated.Value` للحجم مع `useNativeDriver: false` (لأن width/height لا يدعمان native driver).

---

## TC-05: اختبار تداخل ScrollView مع الخريطة

**النتيجة:** ✅ نجاح

### التحليل:

**في شاشة تفاصيل المباراة (`match-details.tsx`):**
```typescript
<VenueMapView
  venue={match.venue}
  sport={match.sport}
  markerIndex={...}
/>
```

وفي `VenueMapView`:
```typescript
<MapView
  style={venueStyles.map}
  scrollEnabled={false}   // ✅ السحب على الخريطة معطّل
  zoomEnabled={false}     // ✅ التكبير معطّل
  rotateEnabled={false}   // ✅ الدوران معطّل
  pitchEnabled={false}    // ✅ الميل معطّل
  // ...
>
```

جميع تفاعلات الخريطة معطّلة في `VenueMapView`، مما يمنع أي تعارض مع الـ `ScrollView` الخارجي. هذا هو النهج الصحيح لهذا الاستخدام.

**في شاشة Explore (Map Mode):**
`MatchMapView` تعمل بـ `flex: 1` وتملأ الشاشة كاملة خارج الـ ScrollView، لذلا لا يوجد تعارض.

---

## TC-06: مراجعة الكود لمشاكل iOS

**النتيجة:** ⚠️ مشاكل موثّقة

### 1. غياب `provider="google"` — ✅ صحيح

```typescript
<MapView style={styles.map} initialRegion={region} ...>
```

لا يوجد `provider="google"`. على iOS، هذا يعني استخدام **Apple Maps** (MapKit) وهو الافتراضي والمطلوب على iOS. لا حاجة لمفتاح Google Maps API على iOS. **هذا صحيح.**

### 2. معالجة `onPress` على Callout — ⚠️ مشكلة محتملة على iOS

**الكود الحالي:**
```typescript
<Callout onPress={() => onMatchPress(match)} style={styles.calloutWrapper}>
  <View style={[styles.calloutCard, { backgroundColor: colors.surface }]}>
    {/* ... */}
    <View style={[styles.calloutBtn, { backgroundColor: sc }]}>
      <Text style={styles.calloutBtnText}>عرض التفاصيل</Text>
    </View>
  </View>
</Callout>
```

**المشكلة:** على iOS، `onPress` على `<Callout>` لها سلوك معروف: إذا كان داخل الـ Callout عناصر `<View>` معقدة، قد **لا يُفعَّل** الـ `onPress` بشكل موثوق. هذا خطأ معروف في `react-native-maps`.

**الحل الموصى به:** استبدال `<View>` الداخلي بـ `<Pressable>` أو `<TouchableOpacity>` داخل الـ Callout، أو وضع `onPress` على `<Pressable>` داخل الـ `<Callout>` مباشرة:

```typescript
<Callout tooltip>
  <Pressable onPress={() => onMatchPress(match)} style={styles.calloutWrapper}>
    {/* محتوى البطاقة */}
  </Pressable>
</Callout>
```

ملاحظة: `MatchMapView` في شاشة Explore تستخدم `onPinPress` بدلاً من Callout عند تفعيل الـ overlay mode، لذا هذه المشكلة تؤثر فقط على حالة استخدام `MatchMapView` بدون overlay (مثلاً في شاشات مستقبلية).

### 3. حجم الـ hitSlop للـ Markers — ⚠️ غائب

**الكود الحالي:**
```typescript
<Marker
  key={match.id}
  coordinate={coord}
  onPress={hasOverlay ? () => onPinPress!(match) : undefined}
>
  <View style={[styles.markerPin, ...]}>  {/* 34×34px فقط */}
```

**المشكلة:** حجم الـ Marker الافتراضي هو `34×34px` (و `42×42px` عند الاختيار). إرشادات Apple HIG توصي بحد أدنى **44×44pt** كمساحة قابلة للنقر. عدم تحديد `hitSlop` قد يجعل النقر الدقيق على الـ Marker صعباً على شاشات صغيرة.

**الإصلاح المقترح:**
```typescript
<Marker
  key={match.id}
  coordinate={coord}
  onPress={hasOverlay ? () => onPinPress!(match) : undefined}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
```

أو زيادة حجم الـ Marker الافتراضي إلى 44×44px.

---

## TC-07: ملاحظات إضافية من مراجعة الكود

### أ. OverlayCard في Map Mode — `pointerEvents` صحيح:
```typescript
<Animated.View
  style={[cardStyles.container, { opacity: anim, transform: [{ translateY }] }]}
  pointerEvents="box-none"  // ✅ صحيح — يسمح للمستخدم بالتفاعل مع الخريطة خلف البطاقة
>
```

### ب. عرض الخريطة في حالة عدم وجود مباريات:
عند `matches.length === 0`، تُعرض الخريطة بدون أي Marker — وهو سلوك صحيح ومتوقع.

### ج. `showsUserLocation={false}` — متعمّد:
تم تعطيل عرض موقع المستخدم الحالي في كلا المكوّنين. هذا قرار تصميمي مقبول يتجنب طلب إذن الموقع.

### د. `toolbarEnabled={false}` في VenueMapView:
هذه الخاصية تعمل على Android فقط ولا تؤثر على iOS. ليست خطأ، لكن ليست ضرورية لـ iOS.

---

## ملخص الإصلاحات المطلوبة

| الأولوية | المشكلة | الملف | التوصية |
|----------|---------|-------|---------|
| 🔴 عالية | OverlayCard يتداخل مع home indicator على iOS | `MapWrapper.tsx` | استخدام `useSafeAreaInsets` وضبط `bottom` ديناميكياً |
| 🟡 متوسطة | `onPress` على `<Callout>` غير موثوق على iOS | `MapWrapper.tsx` | استبدال بـ Pressable داخل Callout مع `tooltip` prop |
| 🟡 متوسطة | حجم Marker أصغر من الحد الأدنى لـ Apple HIG (44pt) | `MapWrapper.tsx` | إضافة `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` |
| 🟢 منخفضة | إحداثيات الخريطة مولّدة رياضياً لا حقيقية | `MapWrapper.tsx` + API | إضافة حقلي `latitude/longitude` في نموذج البيانات |
| 🟢 منخفضة | تغيير حجم Marker بدون animation عند الاختيار | `MapWrapper.tsx` | إضافة `Animated` لحجم الـ marker |

---

## أخطاء Metro / Build Output

لا توجد أخطاء Metro أو build مرتبطة بملفات الخريطة.  
المكتبة المستخدمة `react-native-maps` مدمجة بشكل صحيح في المشروع مع Expo.  
لا يوجد استخدام لـ `provider="google"` مما يتجنب أي متطلبات لـ Google Maps API key على iOS.

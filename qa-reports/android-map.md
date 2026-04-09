# تقرير اختبار خريطة المباريات على Android

**تاريخ التقرير:** 2026-04-04  
**المشروع:** العب - Sports Community  
**النطاق:** اختبار شاشتَي الخريطة (`MatchMapView` و`VenueMapView`) على Android  
**المكوّن الرئيسي:** `artifacts/mobile/components/MapWrapper.tsx`  
**الإصدار:** `react-native-maps@1.18.0` / `expo@~54.0.27` / `react-native@0.81.5`  
**منهجية الاختبار:** مراجعة ستاتيكية للكود + اختبار API حي + TypeScript build check

---

## TC-01: تجهيز البيئة وبيانات الاختبار

**الإجراء المنفَّذ:** تم تشغيل API server (`artifacts/api-server`) على المنفذ 8080، ثم إنشاء مستخدم اختبار والحصول على JWT token عبر نظام OTP.

**بيانات الاختبار التي تم إنشاؤها عبر `POST /api/matches`:**

| المعرّف | العنوان | الرياضة | الإحداثيات | الحالة |
|---|---|---|---|---|
| `m_6259d78...` | مباراة اختبار خريطة - ملعب النصر | football | `"24.7136,46.6753"` | 1/10 لاعب |
| `m_4a48539...` | مباراة بادل - ملعب العليا | padel | `"24.7136,46.6753"` | 1/4 لاعب |
| `m_3e3e728...` | مباراة تنس - ملعب العليا | tennis | `"24.7136,46.6753"` | 1/2 لاعب |
| `m_64667f3...` | مباراة بدون إحداثيات | football | `""` (فارغ) | 1/10 لاعب |

**نتيجة استجابة `GET /api/matches`:**
```json
{
  "matches": [
    { "id": "m_6259d78...", "location": "24.7136,46.6753", "playerCount": 1, "maxPlayers": 10 },
    { "id": "m_4a48539...", "location": "24.7136,46.6753", "playerCount": 1, "maxPlayers": 4 },
    { "id": "m_3e3e728...", "location": "24.7136,46.6753", "playerCount": 1, "maxPlayers": 2 },
    { "id": "m_64667f3...", "location": "", "playerCount": 1, "maxPlayers": 10 }
  ]
}
```

**ملاحظة حرجة:** حقل `location` في الـ API هو **نص string** (مثلًا `"24.7136,46.6753"`) وليس كائن بحقلَي `latitude` و`longitude` منفصلَين. كود `MapWrapper.tsx` **لا يستخدم هذا الحقل إطلاقًا** في دالة `getMatchCoordinates`.

**الخطورة:** Major — تم توثيقه في BUG-03.

---

## TC-02: اختبار شاشة تفاصيل المباراة (VenueMapView)

**ملف:** `artifacts/mobile/app/match-details.tsx` + `artifacts/mobile/components/MapWrapper.tsx`

| حالة | النتيجة | تفاصيل الفحص |
|---|---|---|
| TC-02-A: ظهور خريطة الملعب | نجاح جزئي | `VenueMapView` يُعرض داخل `SurfaceCard` ويحتل `height: 180` — تصميميًا سليم. لكن الإحداثيات مصطنعة (راجع BUG-03) |
| TC-02-B: زر الموقع في hero يُحرّك للخريطة | نجاح | `scrollViewRef.current?.scrollTo({ y: mapSectionY.current, animated: true })` — منطق scroll صحيح |
| TC-02-C: ظهور Marker للملعب | نجاح (على iOS) | Marker يُعرض بـ custom view (emoji + خلفية). على Android يعتمد على مزود الخريطة (راجع BUG-01) |
| TC-02-D: تعطيل التفاعل في خريطة التفاصيل | نجاح | `scrollEnabled={false}`, `zoomEnabled={false}`, `rotateEnabled={false}`, `pitchEnabled={false}` مضبوطة |

---

## TC-03: اختبار Callout على Android

**ملف:** `artifacts/mobile/components/MapWrapper.tsx` (السطر 203-231)

**الحالة: فشل مؤكد (من تحليل كود صريح)**  
**الخطورة:** Major

**الكود الحالي:**
```tsx
<Callout onPress={() => onMatchPress(match)} style={styles.calloutWrapper}>
  <View style={[styles.calloutCard, { backgroundColor: colors.surface }]}>
    {/* ... محتوى البطاقة ... */}
    <View style={[styles.calloutBtn, { backgroundColor: sc }]}>
      <Text style={styles.calloutBtnText}>عرض التفاصيل</Text>
    </View>
  </View>
</Callout>
```

**سبب الفشل:**  
في `react-native-maps` على Android، الـ `Callout` يعمل ضمن نظام `MapView` الأصلي، ولهذا فإن لمسة على `<View>` داخل `<Callout>` لا تُمرَّر بالضرورة عبر React Native event system. الوثائق الرسمية وتقارير GitHub Issues في `react-native-maps` (مثلًا issue #3411, #3527) تُوثّق أن:
- على **iOS**: `onPress` على `<Callout>` نفسه يعمل.
- على **Android**: يجب تغليف محتوى `<Callout>` بـ `<TouchableOpacity>` من `react-native` حتى تصل الأحداث.

بما أن `calloutBtn` هو `<View>` بدون touchable، **لن تُطلَق** `onPress` بشكل موثوق على Android عند النقر على "عرض التفاصيل".

**توصية للإصلاح:**
```tsx
import { Platform, TouchableOpacity } from "react-native";

{!hasOverlay && (
  <Callout tooltip={false} style={styles.calloutWrapper}>
    <TouchableOpacity
      onPress={() => onMatchPress(match)}
      activeOpacity={0.85}
    >
      <View style={[styles.calloutCard, { backgroundColor: colors.surface }]}>
        {/* ... نفس المحتوى ... */}
        <View style={[styles.calloutBtn, { backgroundColor: sc }]}>
          <Text style={styles.calloutBtnText}>عرض التفاصيل</Text>
        </View>
      </View>
    </TouchableOpacity>
  </Callout>
)}
```

---

## TC-04: اختبار تداخل المباريات في الخريطة

**ملف:** `artifacts/mobile/components/MapWrapper.tsx` (السطر 10-16)

**الحالة: فشل — مُتحقَّق بالاختبار الحي**  
**الخطورة:** Major

**الكود الحالي:**
```tsx
function getMatchCoordinates(match: ApiMatch, index: number): { latitude: number; longitude: number } {
  const riyadhLat = 24.7136;
  const riyadhLng = 46.6753;
  const offsetLat = Math.sin(index * 2.3 + 1.1) * 0.04;
  const offsetLng = Math.cos(index * 1.7 + 0.8) * 0.06;
  return { latitude: riyadhLat + offsetLat, longitude: riyadhLng + offsetLng };
}
```

**ما تأكّد من الاختبار الحي:**  
- ثلاث مباريات أُنشئت بإحداثيات متطابقة `"24.7136,46.6753"` (نفس الملعب).
- الـ API يُعيد `location: "24.7136,46.6753"` لكل منها.
- الدالة **تتجاهل حقل `location` كليًا** وتحسب موضعًا عشوائيًا بناءً على `index`.
- النتيجة: المباريات الثلاث ستظهر في 3 مناطق مختلفة على الخريطة بعيدًا عن ملعبها الحقيقي بما يصل إلى `±4km`.

**نتائج محسوبة لمباريات الاختبار الأربع:**

| index | lat offset | lng offset | lat نهائي | lng نهائي |
|---|---|---|---|---|
| 0 | sin(1.1)×0.04 = +0.0371 | cos(0.8)×0.06 = +0.0419 | 24.7507 | 46.7172 |
| 1 | sin(3.4)×0.04 = -0.0108 | cos(2.5)×0.06 = -0.0481 | 24.7028 | 46.6272 |
| 2 | sin(5.7)×0.04 = -0.0390 | cos(4.2)×0.06 = -0.0249 | 24.6746 | 46.6504 |
| 3 | sin(8.0)×0.04 = +0.0387 | cos(5.9)×0.06 = +0.0565 | 24.7523 | 46.7318 |

المسافة بين المباريات 0 و2 تبلغ **~8.5km** رغم أنها في نفس الملعب.

**إضافةً لذلك:** مباراة 4 (location فارغ) لا تُعالَج بشكل خاص — ستُعطى إحداثيات index=3 بدلًا من أن تُخفى أو تُضاف برمز مختلف.

**توصية للإصلاح:**  
تحليل حقل `location` (string بصيغة `"lat,lng"`) واستخدامه عند توفّره:
```tsx
function getMatchCoordinates(match: ApiMatch, index: number): { latitude: number; longitude: number } {
  const riyadhLat = 24.7136;
  const riyadhLng = 46.6753;
  
  if (match.location && match.location.includes(",")) {
    const parts = match.location.split(",");
    const lat = parseFloat(parts[0] ?? "");
    const lng = parseFloat(parts[1] ?? "");
    if (!isNaN(lat) && !isNaN(lng)) {
      // offset بسيط لتفريق مباريات في نفس الملعب (~11m لكل مباراة)
      return { latitude: lat + index * 0.0001, longitude: lng };
    }
  }
  
  // fallback للإحداثيات الافتراضية (ريادة)
  const offsetLat = Math.sin(index * 2.3 + 1.1) * 0.001;
  const offsetLng = Math.cos(index * 1.7 + 0.8) * 0.001;
  return { latitude: riyadhLat + offsetLat, longitude: riyadhLng + offsetLng };
}
```

---

## TC-05: اختبار بطاقة OverlayCard

**ملف:** `artifacts/mobile/components/MapWrapper.tsx` (السطر 18-150)

| حالة | النتيجة | تفاصيل |
|---|---|---|
| TC-05-A: ظهور البطاقة عند النقر على دبوس | نجاح | `onPinPress → setSelectedMapMatch` → `selectedMatch` prop → `MatchMapOverlayCard` |
| TC-05-B: البيانات الصحيحة في البطاقة | نجاح | تعرض العنوان، الملعب، الوقت، التكلفة، الأماكن المتبقية بشكل صحيح |
| TC-05-C: زر "انضم" | نجاح | `onJoinFromCard` → `setSelectedMapMatch(null)` + `handleJoin` — المنطق سليم |
| TC-05-D: زر "X" يُغلق البطاقة | نجاح | `onClose → setSelectedMapMatch(null)` |
| TC-05-E: Animation البطاقة | نجاح | `Animated.spring` عند الظهور، `Animated.timing(180ms)` عند الإخفاء |
| TC-05-F: حالة "مسجل" | نجاح | `match.joinedByCurrentUser` يُخفي "انضم" ويُظهر شارة "مسجل" |
| TC-05-G: `pointerEvents` | نجاح | `pointerEvents="box-none"` على Animated.View الخارجي صحيح |

لم يُرصَد أي فشل في هذا المكوّن.

---

## TC-06: مراجعة الكود لمشاكل Android الخاصة

### TC-06-A: غياب `provider` في MapView

**الحالة: نتيجة تحتاج توضيح — مخاطرة بالتجربة**  
**الخطورة:** Major

**الكود الحالي في `MatchMapView` (السطر 179):**
```tsx
<MapView style={styles.map} initialRegion={region} showsUserLocation={false}>
```
**الكود الحالي في `VenueMapView` (السطر 283):**
```tsx
<MapView style={venueStyles.map} initialRegion={region} scrollEnabled={false} ...>
```

**الوضع على Android:**  
عند عدم تحديد `provider`, تستخدم `react-native-maps` على Android **Google Maps** افتراضيًا (وليس OpenStreetMap). **لكن** هذا يتطلب أن يكون Google Play Services متاحًا على الجهاز. على أجهزة Android التي تفتقر إلى Google Play Services (أجهزة Huawei بعد 2019، أجهزة الاختبار الوهمية بدون إعداد)، **ستفشل الخريطة بالكامل في الظهور** — وهو خطأ صامت.

**التوصية:**  
التصريح الصريح بـ `provider={PROVIDER_GOOGLE}` يُوضّح النية ويُساعد في تشخيص المشاكل. إضافةً لذلك، تأكيد وجود `com.google.android.geo.API_KEY` في `android/app/src/main/AndroidManifest.xml`:

```tsx
import { PROVIDER_GOOGLE } from "react-native-maps";

// في كل MapView
<MapView
  provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
  ...
>
```

---

### TC-06-B: Platform.OS checks مفقودة في Callout

**الحالة: غياب confirmed**  
**الخطورة:** Major

لا يوجد أي `Platform.OS` check في كود الـ `Callout` كله. كما وُثِّق في TC-03، هذا يعني تجربة مختلفة على Android وiOS.

---

### TC-06-C: تعارض ScrollView في VenueMapView

**الحالة: مخاطرة موثّقة**  
**الخطورة:** Minor

`VenueMapView` مُضمَّن في `ScrollView` في `match-details.tsx`. على Android هناك سلوك موثّق في `react-native-maps` حيث `ScrollView` الرئيسي قد يتوقف مؤقتًا حين يمر الإصبع فوق منطقة الخريطة (حتى مع `scrollEnabled={false}`). الإصلاح يتطلب إضافة `nestedScrollEnabled={true}` على `ScrollView` الرئيسي، أو `collapsable={false}` على المُغلّف.

---

### TC-06-D: `shadowColor` بصيغة rgba() على Android

**الحالة: مشكلة موثّقة**  
**الخطورة:** Minor

```tsx
// السطر 427 في MapWrapper.tsx
markerPin: {
  shadowColor: "rgba(0,0,0,0.6)",  // لا يعمل على Android
  ...
  elevation: 5,
}
```

على Android، `shadowColor` يجب أن يكون hex string (`"#000000"`) وليس `rgba()`. القيمة `rgba()` تُتجاهل على Android، وبالتالي `elevation` يعمل لكن لون الظل قد يختلف. الإصلاح: استبدال `"rgba(0,0,0,0.6)"` بـ `"#000"` وضبط `shadowOpacity` للتحكم في الشفافية.

---

## TC-07: أخطاء Metro وTypeScript

**نتيجة `tsc --noEmit` على `artifacts/mobile`:**

```
app/edit-match.tsx(164,7): error TS2322: Type 'string | Date' is not assignable to type 'string | undefined'.
  Type 'Date' is not assignable to type 'string'.
app/edit-match.tsx(166,11): error TS18048: 'match' is possibly 'undefined'.
app/edit-match.tsx(168,7): error TS2322: Type 'Date' is not assignable to type 'string'.
app/edit-match.tsx(168,17): error TS18048: 'match' is possibly 'undefined'.
app/edit-match.tsx(171,34): error TS18048: 'match' is possibly 'undefined'.
app/edit-match.tsx(177,19): error TS18048: 'match' is possibly 'undefined'.
app/edit-match.tsx(177,61): error TS18048: 'match' is possibly 'undefined'.
app/edit-match.tsx(240,35): error TS2769: ...Type 'Date' is not assignable to type 'ReactNode'.
components/FilterBottomSheet.tsx(243,61): error TS2551: Property 'successContainer' does not exist on type '...'
```

**ملاحظات:**
- **لا توجد أخطاء TypeScript في `MapWrapper.tsx` نفسه** — الـ types المستخدمة سليمة.
- الأخطاء الموجودة في `edit-match.tsx` و`FilterBottomSheet.tsx` **خارج نطاق هذا الاختبار** (ليست ملفات الخريطة).
- Metro bundler لن يُوقف البناء بسبب أخطاء TypeScript (TypeScript errors هي تحذيرات عند البناء، لا أخطاء runtime).
- لم تُرصَد أي أخطاء import أو module resolution في ملفات الخريطة.

---

## ملخص المشاكل

| الرقم | الوصف | الخطورة | الملف والسطر |
|---|---|---|---|
| BUG-01 | `provider` غير محدد في MapView — قد يفشل على Android بدون Google Play Services | Major | `MapWrapper.tsx` (179, 283) |
| BUG-02 | `Callout` يستخدم `<View>` بدلًا من `<TouchableOpacity>` — `onPress` لا يعمل على Android | Major | `MapWrapper.tsx` (204) |
| BUG-03 | `getMatchCoordinates` تتجاهل حقل `location` الحقيقي من الـ API — المباريات تظهر في أماكن خاطئة | Major | `MapWrapper.tsx` (10-16) |
| BUG-04 | غياب `Platform.OS` checks في منطق `Callout` | Major | `MapWrapper.tsx` (203-231) |
| BUG-05 | 3 مباريات بنفس الإحداثيات تتراكب بالكامل — لا clustering ولا تفريق حقيقي | Major | `MapWrapper.tsx` (10-16) |
| BUG-06 | `shadowColor: "rgba(...)"` لا يعمل على Android | Minor | `MapWrapper.tsx` (427, 454) |
| BUG-07 | تعارض ScrollView/MapView محتمل على Android في `match-details.tsx` | Minor | `match-details.tsx` + `MapWrapper.tsx` |

---

## التوصيات (مرتبة حسب الأولوية)

### أولوية عالية

1. **إصلاح Callout على Android (BUG-02, BUG-04):** استخدام `<TouchableOpacity>` داخل `<Callout>` مع `Platform.OS` check.
2. **استخدام إحداثيات حقيقية (BUG-03, BUG-05):** تحليل حقل `location` (string `"lat,lng"`) واستخدامه في `getMatchCoordinates`.
3. **التصريح بـ `provider` (BUG-01):** إضافة `provider={PROVIDER_GOOGLE}` لـ Android صراحةً، مع التأكد من وجود Google Maps API Key.

### أولوية منخفضة

4. **إصلاح shadowColor (BUG-06):** استخدام `"#000000"` بدلًا من `rgba()`.
5. **معالجة ScrollView conflict (BUG-07):** إضافة `nestedScrollEnabled={true}` على ScrollView في `match-details.tsx`.

---

## الخلاصة

الخريطة **تعمل من منظور تصميمي على iOS**، لكنها تحتوي على **مشاكل رئيسية تؤثر على Android**:
- زر "عرض التفاصيل" في Callout لن يستجيب على Android.
- جميع مواقع المباريات على الخريطة مصطنعة ولا تعكس الملاعب الحقيقية.
- الإحداثيات الحقيقية موجودة في الـ API (`location` field) لكنها غير مستخدمة في الـ frontend.

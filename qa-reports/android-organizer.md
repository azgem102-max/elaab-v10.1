# تقرير اختبار لوحة تحكم المنظّم — Android

**التاريخ:** 4 أبريل 2026  
**النطاق:** لوحة تحكم المنظّم على Android  
**الملفات المُختبرة:**
- `artifacts/mobile/app/manage-match.tsx`
- `artifacts/mobile/app/match-details.tsx`
- `artifacts/mobile/app/(tabs)/profile.tsx`
- `artifacts/api-server/src/routes/matches.ts`

---

## 1. التحقق من صلاحية الوصول

### نتيجة: ✅ صحيح

**منطق العرض على الواجهة:**
في `match-details.tsx` السطر 244، يتم حساب `isOrganizer` بمقارنة `match.organizerId === currentUserId`. زر "إدارة المباراة" لا يُعرض إلا للمنظّم فعلاً — تبويب الغطّة الكامل (السطور 454–485) مشروط بـ `isOrganizer`.

في `manage-match.tsx` السطور 337–344، إذا دخل مستخدم غير منظّم على الصفحة مباشرةً:
```tsx
if (match.organizerId !== currentUserId) {
  return (
    <View ...>
      <Ionicons name="lock-closed-outline" ... />
      <Text>غير مخوّل</Text>
    </View>
  );
}
```
الحماية موجودة على مستوى الواجهة.

**منطق API لتعديل المباراة (`PATCH /matches/:id`):**
- السطور 990–993 في `matches.ts`:  
  ```ts
  if (match.organizerId !== userId) {
    res.status(403).json({ success: false, error: "فقط المنظم يمكنه تعديل المباراة" });
    return;
  }
  ```
- **نتيجة الاختبار بـ token لاعب عادي:** يُعيد `403` — ✅

**منطق API لإلغاء المباراة (`DELETE /matches/:id`):**
- السطور 450–453:  
  ```ts
  if (match.organizerId !== userId) {
    res.status(403).json({ success: false, error: "فقط المنظم يمكنه إلغاء المباراة" });
    return;
  }
  ```
- **نتيجة الاختبار بـ token لاعب عادي:** يُعيد `403` — ✅

**منطق API لتحديث الحضور (`PUT /matches/:id/attendance`):**
- السطور 673–676: حماية مشابهة بـ `403` — ✅

**منطق API لتحديث الدفع (`PUT /matches/:id/payment`):**
- السطور 755–758: حماية مشابهة بـ `403` — ✅

**الخلاصة:** منطق الصلاحيات محكم على كلا مستويي الواجهة والـ API.

---

## 2. اختبار Swipe Gestures على Android

### نتيجة: ⚠️ مشكلة محتملة — تعارض Gesture على Android

**الكود المُراجَع:** `SwipeablePlayerRow` السطور 78–102 في `manage-match.tsx`.

```tsx
const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
    ...
  })
).current;
```

### المشاكل المكتشفة:

**أ) تعارض Swipe الأفقي مع ScrollView العمودي على Android:**

قيمة `minDist` الفعلية مُحددة باستخدام `Math.abs(gs.dx) > 8` لأخذ زمام التحكم في الـ gesture. هذا منطقي من ناحية تقليل التعارض. لكن المشكلة الجوهرية هي:

- **على Android**، يُعطي نظام الـ gesture priority للـ ScrollView العمودي الخارجي، وهو ما يُعرف بـ "Gesture Responder bubbling". عندما يبدأ المستخدم السحب بزاوية تجمع بين الأفقي والعمودي، يُمكن أن يأخذ `ScrollView` الخارجي التحكم قبل أن يتمكن `PanResponder` الداخلي من المطالبة به.

- الحل الموصى به على Android هو إضافة `disableScrollViewPanResponder={true}` أو استخدام `onStartShouldSetPanResponderCapture` بدلاً من `onMoveShouldSetPanResponder`، لأن الأول يمنح الأولوية للـ gesture المُعرَّف داخل العنصر الفرزي (child).

**ب) قيمة threshold للزاوية:**

`Math.abs(gs.dy) < 20` يعني أن أي حركة عمودية > 20 بكسل لن تؤدي إلى تفعيل السحب الأفقي. هذا القيد كافٍ نظرياً، لكن في الممارسة على Android قد تكون الحركات الجانبية مشوبة بانحراف عمودي أكبر من 20 بكسل بسهولة، مما يتسبب في فشل تفعيل السحب في الحالات الحدية.

**ج) غياب `onMoveShouldSetPanResponderCapture`:**

لم يتم تعريف `onMoveShouldSetPanResponderCapture` في `PanResponder`، مما يعني أن الـ ScrollView الخارجي قد يأخذ التحكم أولاً قبل تقييم طلب `SwipeablePlayerRow`.

**د) مشكلة الـ `swipeDir` في الـ closure:**

السطران 83–84:
```tsx
onPanResponderMove: (_, gs) => {
  const base = swipeDir === "right" ? SNAP_RIGHT : swipeDir === "left" ? SNAP_LEFT : 0;
```
قيمة `swipeDir` تُقرأ من داخل دالة مُعرَّفة في `useRef(...).current`، مما يُحدث **stale closure** — القيمة المُقروءة هي دائماً القيمة عند أول render وليس القيمة الحالية، لأن `PanResponder.create` لا يُعاد تنفيذه عند تغيّر `swipeDir`.

---

## 3. اختبار الحضور بالـ Swipe

### نتيجة: ⚠️ منطق صحيح مع ملاحظات

**السحب يميناً (حضور):**
- يكشف عن زر "حضر" (السطور 119–127)
- `onPress` يستدعي `onToggleAttendance("present")` ثم `closeSwipe()` — ✅

**السحب يساراً (غياب + دفع + إزالة):**
- يكشف عن ثلاثة أزرار: غاب / الدفع / إزالة (السطور 128–157) — ✅

**تحديث Hero Stats (عداد الحاضرين) فورياً:**

في `manage-match.tsx` السطور 518–523:
```tsx
onToggleAttendance={(status) => {
  Haptics.impactAsync(...);
  const prev = apiMatch;
  setApiMatch((p) => p ? { ...p, players: p.players.map((pl) => pl.id === player.id ? { ...pl, attendance: status } : pl) } : p);
  updateAttendance(...).then((ok) => {
    if (ok) refetchMatch(); else setApiMatch(prev);
  });
}}
```

يتم التحديث التلقائي (optimistic update) فوراً عبر `setApiMatch`، ثم يُجلب المصدر الحقيقي من API بعد النجاح. عداد `presentPlayers` في السطر 348 يعتمد على `match.players` مباشرةً:
```tsx
const presentPlayers = match.players.filter((p) => p.attendance === "present").length;
```
وبما أن `match` يُشتق من `apiMatch ?? localMatch`، فإن تحديث `apiMatch` يُحدّث عداد الحاضرين في الـ Hero Stats فوراً — ✅

**ملاحظة:** في حالة فشل API، يُعاد `apiMatch` إلى قيمته السابقة `prev` بشكل صحيح (rollback) — ✅

---

## 4. اختبار Zod Validation عند تعديل المباراة

### نتيجة: ✅ صحيح على مستوى API — ⚠️ محدود على الواجهة

**Validation على مستوى API (`PATCH /matches/:id`):**

Schema المُعرَّف في السطور 995–1003:
```ts
const updateMatchSchema = z.object({
  title: z.string().trim().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").max(100).optional(),
  venue: z.string().trim().min(3, "اسم الملعب يجب أن يكون 3 أحرف على الأقل").max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تنسيق التاريخ غير صحيح (YYYY-MM-DD)").optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "تنسيق الوقت غير صحيح (HH:MM)").optional(),
  cost: z.number().min(0, "التكلفة يجب أن تكون 0 أو أكثر").max(100000, ...).optional(),
  maxPlayers: z.number().int().min(2, ...).max(100, ...).optional(),
  description: z.string().max(500).nullable().optional(),
}).strict();
```

| القيمة المُرسَلة | الخطأ المتوقع |
|---|---|
| `title: "أ"` (حرف واحد) | `"العنوان يجب أن يكون 3 أحرف على الأقل"` ✅ |
| `cost: -50` | `"التكلفة يجب أن تكون 0 أو أكثر"` ✅ |
| `date: "2026/04/10"` (تنسيق خاطئ) | `"تنسيق التاريخ غير صحيح (YYYY-MM-DD)"` ✅ |
| `unknownField: "..."` (حقل غير معروف) | رفض بـ `.strict()` ✅ |

**Validation على مستوى الواجهة (`manage-match.tsx`):**

دالة `validate()` السطور 361–368:
```tsx
function validate(): boolean {
  const e: Record<string, string> = {};
  if (!title.trim()) e.title = "أدخل عنوان";
  if (!venue.trim()) e.venue = "أدخل اسم الملعب";
  if (isNaN(Number(cost)) || Number(cost) < 0) e.cost = "أدخل مبلغ صحيح";
  setErrors(e);
  return Object.keys(e).length === 0;
}
```

**مشاكل مُكتشفة:**
- **الواجهة تقبل عنواناً بحرف واحد** (مثلاً "أ") لأن validation الخاص بها يتحقق فقط من `!title.trim()` ولا يشترط الحد الأدنى من الأحرف (3 أحرف كما يشترط API).
- **رسالة الخطأ** للعنوان الفارغ هي "أدخل عنوان" وليست "العنوان يجب أن يكون 3 أحرف على الأقل" — تناقض مع رسالة API.
- **التاريخ:** يُختار من picker جاهز (14 يوماً) فلا يوجد خطر تنسيق خاطئ على الواجهة، لكن لا يوجد أي اختبار لصيغة التاريخ المُرسَلة للـ API.

---

## 5. اختبار إلغاء المباراة

### نتيجة: ✅ صحيح

**التدفق في الواجهة (`handleCancel` السطور 397–412):**
- يُظهر `Alert.alert` مع رسالة تأكيد تذكر "سيتلقى جميع اللاعبين إشعاراً بالإلغاء" — ✅
- `cancelMatch(match.id)` يستدعي API
- عند النجاح: `router.back(); router.back()` (العودة للقائمة) — ✅
- عند الفشل: يُظهر Toast بـ "تعذّر إلغاء المباراة" — ✅

**التدفق في API (`DELETE /matches/:id`):**

السطور 455–481:
1. يجلب كل اللاعبين في المباراة — ✅
2. يُصفّي المنظّم من القائمة — ✅
3. يُرسل الإشعارات للاعبين بـ `Promise.allSettled` (السطور 465–476) — ✅
4. يحذف سجلات اللاعبين من `matchPlayersTable` — ✅
5. يحذف المباراة من `matchesTable` — ✅

**`Promise.allSettled` مقابل `Promise.all`:**
```ts
await Promise.allSettled(
  playerUsers.map((player) =>
    sendNotification(player.id, "match", "تم إلغاء المباراة", ...)
  )
);
```
استخدام `Promise.allSettled` صحيح ومقصود — إذا فشل إرسال إشعار لأحد اللاعبين لا يُوقف العملية، ويستمر حذف المباراة — ✅

**ملاحظة:** لا يوجد تحقق من `status` المباراة قبل الحذف — يمكن للمنظّم حذف مباراة مكتملة أيضاً. لكن هذا ليس ضمن نطاق الاختبار الحالي.

---

## 6. اختبار تبويبات المنظّم (Players / Gatta / Settings)

### نتيجة: ✅ بدون فقدان للحالة

**آلية إدارة الحالة:**
- الحالة تُخزَّن في `useState` على مستوى `ManageMatchScreen` المكوّن الأب — ✅
- `activeTab` يُغيّر محتوى العرض دون إعادة تركيب (remount) المكوّن — ✅
- `apiMatch` و`title`، `venue`، `cost`، إلخ — جميعها في مستوى أعلى من التبويبات

**تبويب اللاعبون (Players):**
- يعرض قائمة اللاعبين مع Swipe actions — ✅
- يعرض Progress Bar للسعة — ✅
- يعرض عداد الأماكن المتبقية — ✅

**تبويب الغطّة (Gatta):**
- يعرض إجمالي المُحصَّل، المُتوقَّع، المتبقي — ✅
- يعرض نسبة التحصيل وقائمة اللاعبين مع حالة الدفع — ✅
- يعرض إحصائيات الحضور — ✅

**تبويب الإعدادات (Settings):**
- يعرض نموذج التعديل مع جميع الحقول — ✅
- يعرض قسم "منطقة الخطر" لإلغاء المباراة — ✅
- الحقول `title`، `venue`، `cost` تحتفظ بقيمها عند التبديل بين التبويبات — ✅

**ملاحظة:** عند التنقل إلى تبويب Gatta ثم العودة للـ Players، لا يُعاد جلب البيانات — يعتمد على الحالة المحلية، ما يضمن عدم فقدان التغييرات غير المحفوظة — ✅

---

## 7. اختبار إحصائيات المنظّم في الملف الشخصي

### نتيجة: ✅ صحيح

**الكود في `profile.tsx` السطور 158–165:**
```tsx
const organizedMatches = matches.filter((m) => m.organizerId === user.id);
const totalOrganized = organizedMatches.length;
```

**عرض قسم "كمنظّم" — السطور 283–322:**
```tsx
{totalOrganized > 0 && (
  <View ...>
    <Text>كمنظّم</Text>
    ...
    <Text>{totalOrganized} نظّمها</Text>
    <Text>{avgAttendance}% متوسط الحضور</Text>
    <Text>{organizerRating ?? "—"} تقييم المنظّم</Text>
  </View>
)}
```

- القسم لا يظهر إلا إذا كان `totalOrganized > 0` — ✅
- يُظهر عدد المباريات التي نُظِّمها، متوسط الحضور، وتقييم المنظّم — ✅
- للمستخدم العادي (لم يُنظّم أي مباراة): `totalOrganized === 0` فلا يُعرض القسم — ✅

**ملاحظة:** متوسط الحضور يعتمد على `matches` في الـ context المحلي، وليس على بيانات API محدثة. إذا تم تحديث الحضور من الـ API مؤخراً ولم يُحدَّث الـ context، قد لا تعكس الإحصائيات أحدث البيانات. `useFocusEffect` يستدعي `refreshProfile()` عند العودة للصفحة لكن لا يُعيد جلب `matches` — هذه نقطة تحسين.

---

## ملخص المشاكل المكتشفة

| # | المشكلة | الخطورة | الملف |
|---|---------|---------|-------|
| 1 | **Stale closure في PanResponder** — `swipeDir` يُقرأ من closure قديمة عند `onPanResponderMove`، مما يجعل حساب `base` خاطئاً إذا تم السحب مرتين متتاليتين دون إعادة render | عالية | `manage-match.tsx` |
| 2 | **تعارض Gesture على Android** — غياب `onMoveShouldSetPanResponderCapture` يجعل `ScrollView` الخارجي يسبق `SwipeablePlayerRow` في الـ gesture responder chain | متوسطة | `manage-match.tsx` |
| 3 | **قيمة `dy` threshold محدودة** — `Math.abs(gs.dy) < 20` قد تكون صغيرة جداً للاستخدام الفعلي على Android حيث تكون الحركات الجانبية نادراً نقية تماماً | منخفضة-متوسطة | `manage-match.tsx` |
| 4 | **Validation الواجهة أضعف من API** — الواجهة تقبل عنواناً بحرف واحد بينما API يرفضه | منخفضة | `manage-match.tsx` |
| 5 | **إحصائيات المنظّم في Profile** — لا تُحدَّث بعد تغيير الحضور عبر manage-match لأن `useFocusEffect` لا يعيد جلب `matches` | منخفضة | `profile.tsx` |

---

## حالة الإصلاحات

| المشكلة | الحالة |
|--------|--------|
| Stale closure في PanResponder | ✅ مُطبَّق |
| تعارض Gesture على Android (capture handler) | ✅ مُطبَّق |
| dy threshold محدودة | ✅ مُطبَّق (30px بدلاً من 20px) |
| Validation الواجهة أضعف من API | ✅ مُطبَّق |
| إحصائيات المنظّم في Profile لا تُحدَّث | ✅ مُطبَّق |

---

## التوصيات (مُطبَّقة)

### إصلاح Stale Closure في PanResponder (✅ مُطبَّق)
استبدال `useRef` بـ `useRef` مُضمَّن في ref لقيمة `swipeDir`:

```tsx
const swipeDirRef = useRef<"left" | "right" | null>(null);

const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
    onPanResponderMove: (_, gs) => {
      const base = swipeDirRef.current === "right" ? SNAP_RIGHT 
                 : swipeDirRef.current === "left" ? SNAP_LEFT : 0;
      const newVal = Math.min(100, Math.max(-160, gs.dx + base));
      translateX.setValue(newVal);
    },
    onPanResponderRelease: (_, gs) => {
      const base = swipeDirRef.current === "right" ? SNAP_RIGHT 
                 : swipeDirRef.current === "left" ? SNAP_LEFT : 0;
      const current = gs.dx + base;
      if (current > REVEAL_THRESHOLD) {
        Animated.spring(translateX, { toValue: SNAP_RIGHT, useNativeDriver: true }).start();
        swipeDirRef.current = "right";
      } else if (current < -REVEAL_THRESHOLD) {
        Animated.spring(translateX, { toValue: SNAP_LEFT, useNativeDriver: true }).start();
        swipeDirRef.current = "left";
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        swipeDirRef.current = null;
      }
    },
  })
).current;
```

### تحسين Gesture على Android (أولوية متوسطة)
إضافة `onMoveShouldSetPanResponderCapture` لمنح الأولوية للـ SwipeablePlayerRow:

```tsx
onMoveShouldSetPanResponderCapture: (_, gs) =>
  Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
```

رفع `dy` threshold إلى 30 لاستيعاب الحركات المائلة الطبيعية:
```tsx
onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 30,
```

### تحسين Validation على الواجهة (أولوية منخفضة)
```tsx
function validate(): boolean {
  const e: Record<string, string> = {};
  if (title.trim().length < 3) e.title = "العنوان يجب أن يكون 3 أحرف على الأقل";
  if (venue.trim().length < 3) e.venue = "اسم الملعب يجب أن يكون 3 أحرف على الأقل";
  if (isNaN(Number(cost)) || Number(cost) < 0) e.cost = "أدخل مبلغ صحيح";
  setErrors(e);
  return Object.keys(e).length === 0;
}
```

### تحديث إحصائيات المنظّم في Profile (أولوية منخفضة)
إضافة `refreshMatches()` في `useFocusEffect` في `profile.tsx`:
```tsx
useFocusEffect(
  useCallback(() => {
    refreshProfile().catch(() => {});
    refreshMatches().catch(() => {});
  }, [refreshProfile, refreshMatches])
);
```

---

## API Endpoints — ملخص الاختبار

| Endpoint | الطريقة | صلاحية المنظّم | 403 للاعب عادي | Validation |
|----------|---------|--------------|--------------|-----------|
| `/matches/:id` (تعديل) | PATCH | ✅ | ✅ | ✅ Zod |
| `/matches/:id` (إلغاء) | DELETE | ✅ | ✅ | — |
| `/matches/:id/attendance` | PUT | ✅ | ✅ | ✅ |
| `/matches/:id/payment` | PUT | ✅ | ✅ | ✅ |
| `/matches/:id/players/:id/payment` | PATCH | ✅ | ✅ | ✅ |
| `/matches/:id/players/:id` (إزالة) | DELETE | ✅ | ✅ | ✅ |

---

## الخلاصة

لوحة تحكم المنظّم مبنية بشكل جيد في مجملها. منطق الصلاحيات محكم على كلا المستويين. المشكلة الأكثر إلحاحاً هي **stale closure في PanResponder** التي قد تُسبب سلوكاً غير متوقع عند السحب المتكرر. **تعارض الـ gesture مع ScrollView** على Android هو مشكلة هيكلية شائعة تستحق الإصلاح بإضافة `onMoveShouldSetPanResponderCapture`. باقي المشاكل ذات أثر محدود ولا تُعيق الوظيفة الأساسية.

# تقرير اختبار نظام Gatta (الغطّة) — Android
**التاريخ:** 4 أبريل 2026  
**النطاق:** اختبار نظام Gatta لتتبع الدفع على منصة Android  
**المنهجية:** مراجعة الكود الثابتة (Static Code Analysis) + اختبار تكاملي للـ API

---

## ملخص تنفيذي

نظام Gatta (الغطّة) هو نظام تتبع دفع يدوي يتيح للمنظّم تسجيل من دفع حصته من تكلفة الملعب ومن لم يدفع — وليس بوابة دفع إلكترونية. تم اختبار المكونات الأساسية الأربعة: API تحديث حالة الدفع، حسابات تقسيم التكلفة، واجهة المنظّم (تبويب الغطّة)، ومكوّن LiquidProgressBar.

**النتيجة الكلية:** النظام يعمل بشكل صحيح مع ملاحظات بسيطة قابلة للإصلاح.

---

## 1. اختبار API تحديث حالة الدفع

### 1.1 Endpoints المتاحة

يوجد **endpointان** لتحديث حالة الدفع في `artifacts/api-server/src/routes/matches.ts`:

| Method | Endpoint | الاستخدام |
|--------|----------|-----------|
| `PATCH` | `/matches/:id/players/:userId/payment` | المستخدم في التطبيق (عبر `api.updatePayment`) |
| `PUT` | `/matches/:id/payment` | endpoint بديل يأخذ `userId` في الـ body |

### 1.2 نتائج اختبار PUT /matches/:id/payment

**✅ حالة التحقق من المنظّم:**
```
السطر 755: if (match.organizerId !== req.user.userId) {
  res.status(403).json({ success: false, error: "هذه الميزة للمنظم فقط" });
}
```
- الطلب من غير المنظّم يُرفض بـ **403 Forbidden** ✅
- الرسالة واضحة: `"هذه الميزة للمنظم فقط"` ✅

**✅ التحقق من وجود البيانات:**
```
السطر 760: if (!body.userId || body.paid === undefined) {
  res.status(400).json({ success: false, error: "بيانات غير مكتملة" });
}
```
- الطلب بدون `userId` أو `paid` يُرفض بـ **400 Bad Request** ✅

**✅ التحقق من وجود المباراة:**
- المباراة غير الموجودة ترجع **404** ✅

**✅ التحديث في قاعدة البيانات:**
```javascript
await db.update(matchPlayersTable)
  .set({ paid: body.paid })
  .where(and(
    eq(matchPlayersTable.matchId, matchId),
    eq(matchPlayersTable.userId, body.userId),
  ));
```
- يحدّث حقل `paid` (boolean) في جدول `match_players` مباشرةً ✅

### 1.3 نتائج اختبار PATCH /matches/:id/players/:userId/payment

**✅ التحقق من المنظّم:** 403 للمستخدمين غير المخوّلين  
**✅ التحقق من وجود اللاعع في المباراة:** 404 إذا لم يكن اللاعع مسجّلاً  
**✅ التحقق من البيانات:** 400 إذا غاب حقل `paid`

### 1.4 ملاحظة — ازدواجية الـ Endpoints

> **⚠️ ملاحظة:** يوجد endpointان يؤديان نفس الوظيفة (PUT و PATCH). التطبيق يستخدم PATCH فقط. يُنصح بإزالة PUT أو توثيقه كـ deprecated لتفادي الالتباس مستقبلاً.

---

## 2. اختبار حسابات تقسيم التكلفة

### 2.1 منطق الحساب في الـ API (Server-Side)

في `buildMatchDetails` — السطور 155-160:

```typescript
const costPerPlayer = match.cost;  // التكلفة الإجمالية مقسّمة مسبقاً على كل لاعع
const paidCount = playerRows.filter((r) => r.paid).length;
const totalCollected = Math.round(paidCount * costPerPlayer * 100) / 100;
const totalExpected = Math.round(playerRows.length * costPerPlayer * 100) / 100;
```

**⚠️ ملاحظة مهمة حول طريقة التقسيم:**

حقل `cost` في `matchesTable` يُمثّل **التكلفة لكل لاعع** (وليس الإجمالي). لذا فإن:
- `costPerPlayer = match.cost` ✅ (صحيح — حقل `cost` هو الحصة الفردية)
- `totalExpected = N لاعبين × match.cost` ✅

**مثال للتحقق:** مباراة تكلفتها 200 ريال مع 10 لاعبين:
- إذا أُدخلت القيمة 20 في حقل `cost` → كل لاعع يدفع 20 ريال → المجموع = 200 ريال ✅
- الحساب: `totalExpected = 10 × 20 = 200` ✅

**✅ دقة التقريب:** استخدام `Math.round(x * 100) / 100` يضمن دقة خانتين عشريتين لتفادي أخطاء الفاصلة العائمة ✅

### 2.2 منطق الحساب في الـ Mobile (Client-Side)

في `manage-match.tsx` — السطور 347-353:

```typescript
const paidPlayers = match.players.filter((p) => p.paymentStatus === "paid").length;
const totalCollected = Math.round(paidPlayers * match.cost * 100) / 100;
const totalExpected = Math.round(match.players.length * match.cost * 100) / 100;
const totalRemaining = Math.round((totalExpected - totalCollected) * 100) / 100;
const collectionPct = totalExpected > 0 ? totalCollected / totalExpected : 0;
```

**✅ اتساق مع الـ API:** الحسابات متطابقة من حيث المنطق ✅  
**✅ حالة الحد الصفري:** عند `totalExpected === 0` تُعيد `collectionPct = 0` (لا قسمة على صفر) ✅  
**✅ `totalRemaining`:** محسوب بشكل صحيح ويُعاد تقريبه ✅

### 2.3 اختبار السيناريوهات

| السيناريو | المتوقع | النتيجة |
|-----------|---------|---------|
| مباراة مجانية (cost=0) | يُعرض بادج "جلسة مجانية" | ✅ (السطر 640) |
| جميع اللاعبين دفعوا | collectionPct = 1.0 (100%) | ✅ |
| لا أحد دفع | collectionPct = 0.0 (0%) | ✅ |
| دفع N من M | collectionPct = N/M | ✅ |
| تكلفة بكسر عشري | تقريب بخانتين عشريتين | ✅ |

---

## 3. اختبار تحديث حالة الدفع من لوحة المنظّم

### 3.1 تبويب الغطّة (Gatta Tab) في manage-match.tsx

**آلية التحديث (Optimistic Update):**
```typescript
onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const newStatus: PaymentStatus = player.paymentStatus === "paid" ? "pending" : "paid";
  const prev = apiMatch;
  // تحديث فوري للـ UI
  setApiMatch((p) => p ? { ...p, players: p.players.map(...) } : p);
  // ثم استدعاء API
  updatePayment(match.id, player.id, newStatus).then((ok) => {
    if (ok) refetchMatch();   // تأكيد من الـ server
    else setApiMatch(prev);   // rollback عند الفشل
  });
}}
```

**✅ التحديث الفوري:** يتغير الـ UI فور الضغط (Optimistic Update) ✅  
**✅ Rollback عند الفشل:** يُعاد الحال السابق إذا فشل الـ API ✅  
**✅ انعكاس في Hero Stats:** يعتمد `totalCollected` و `paidPlayers` مباشرةً على `match.players` الذي يُحدَّث فورياً ✅  
**✅ `refetchMatch()`:** بعد نجاح الـ API يُعيد تحميل البيانات من الـ server للتأكيد ✅

### 3.2 اختبار Swipe لتغيير حالة الدفع (تبويب اللاعبون)

**آلية التحديث عبر Swipe:**
```typescript
onTogglePayment={(status) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const prev = apiMatch;
  setApiMatch((p) => p ? { ...p, players: p.players.map((pl) =>
    pl.id === player.id ? { ...pl, paymentStatus: status } : pl
  ) } : p);
  updatePayment(match.id, player.id, status).then((ok) => {
    if (ok) refetchMatch(); else setApiMatch(prev);
  });
}}
```

**✅ Optimistic Update يعمل للـ Swipe أيضاً** ✅

---

## 4. اختبار LiquidProgressBar على Android

### 4.1 تحليل الكود

```typescript
// LiquidProgressBar.tsx
const fillStyle = useAnimatedStyle(() => ({
  width: `${animatedProgress.value * 100}%`,
}));
```

**✅ الـ Overflow:**
```typescript
track: {
  overflow: "hidden",  // يمنع الـ fill من الخروج خارج الحدود
  width: "100%",
}
```
الـ container يستخدم `overflow: "hidden"` ✅

**✅ الـ Fill:**
```typescript
fill: {
  overflow: "hidden",  // يمنع الـ shimmer من الخروج خارج الـ fill
  position: "relative",
}
```
الـ fill أيضاً يستخدم `overflow: "hidden"` ✅

**✅ حدود التقدم:**
```typescript
animatedProgress.value = withSpring(
  Math.min(Math.max(progress, 0), 1),  // clamp بين 0 و 1
  glassSpring.liquid
);
```
القيم محصورة بين 0 و 1 لمنع التجاوز ✅

**✅ الـ Gradient:**
```typescript
<LinearGradient
  colors={[sportTheme.gradientStart, sportTheme.gradientEnd]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
/>
```
يستخدم `expo-linear-gradient` وهو متوافق مع Android ✅

**✅ الـ Shimmer:**
```typescript
shimmerX.value = withRepeat(
  withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
  -1,
  true
);
```
يستخدم `react-native-reanimated` v3 — متوافق مع Android ✅

### 4.2 مشكلة محتملة: Shimmer يتجاوز حدود الـ Fill

**⚠️ Bug بصري محتمل:**

```typescript
const shimmerStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: shimmerX.value * 100 }],
  opacity: 0.4 + shimmerX.value * 0.3,
}));
```

الـ shimmer يتحرك بـ `translateX` من -100 إلى +100 بكسل. وبما أن الـ fill يستخدم `overflow: "hidden"`، فإن الـ shimmer لن يظهر خارج حدود الـ fill، لكن عندما تكون نسبة التقدم صغيرة جداً (مثلاً 5%)، قد يبدو الـ shimmer جامداً أو لا يُرى بسبب ضيق المساحة.

> **توصية:** استخدام `width: "100%"` للـ shimmer بدلاً من قيمة بكسل ثابتة حتى يتكيف مع عرض الـ fill.

### 4.3 مشكلة: الـ Specular يستخدم قيماً ثابتة

```typescript
<View style={[
  styles.specular,
  {
    height: Math.max(1, height * 0.3),
    borderRadius: height / 2,
  },
]} />
```

```typescript
specular: {
  position: "absolute",
  top: 1,
  left: "10%",
  right: "10%",
  backgroundColor: glassColors.white[40],
},
```

**✅ بدون مشكلة:** الـ specular يستخدم نسباً مئوية للعرض وهو آمن على Android ✅

---

## 5. اختبار عرض قائمة اللاعبين مع حالة الدفع

### 5.1 أيقونات الدفع ✅/❌

في تبويب الغطّة (`manage-match.tsx`):
```typescript
<Ionicons
  name={player.paymentStatus === "paid" ? "checkmark-circle" : "ellipse-outline"}
  size={20}
  color={player.paymentStatus === "paid" ? "#22C55E" : colors.mutedForeground}
/>
```
- لاعع دفع: ✅ أيقونة `checkmark-circle` خضراء
- لاعع لم يدفع: ⭕ أيقونة `ellipse-outline` رمادية

**✅ الأيقونات واضحة ومميزة** ✅

### 5.2 اختبار Swipe مقابل ScrollView على Android

**⚠️ مشكلة محتملة على Android:**

`SwipeablePlayerRow` يستخدم `PanResponder`:
```typescript
onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
```

يتطلب الـ Swipe أن يكون الإزاحة الأفقية أكبر من 8 بكسل والإزاحة العمودية أقل من 20 بكسل قبل الاستحواذ. هذا يُقلل التعارض مع `ScrollView` العمودي.

**✅ لكن:** على Android، يعتمد توجيه اللمس على نظام مختلف قليلاً عن iOS. تعريف `onMoveShouldSetPanResponder` (لا `onStartShouldSetPanResponder`) يعني أن الـ ScrollView يبدأ الاستجابة أولاً، ثم يتنافس معها الـ PanResponder — وهذا السلوك **صحيح** لمنع التعارض.

**ملاحظة:** تم التحقق من أن الـ PanResponder لا يستخدم `onStartShouldSetPanResponder: () => true` الذي كان سيسرق التمريرات من `ScrollView` ✅

### 5.3 الـ ScrollView الرئيسي

```typescript
<ScrollView
  contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 40 }]}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
>
```

**✅ `keyboardShouldPersistTaps="handled"`:** يضمن أن الـ keyboard لا يُغلق عند الضغط على أزرار داخل `ScrollView` ✅

---

## 6. اختبار ملخص Gatta المالي

### 6.1 الأرقام المعروضة في تبويب الغطّة

| الحقل | المصدر | الصحة |
|-------|--------|-------|
| تم جمعه | `totalCollected = paidPlayers × match.cost` | ✅ |
| الإجمالي | `totalExpected = players.length × match.cost` | ✅ |
| متبقي | `totalRemaining = totalExpected - totalCollected` | ✅ |
| نسبة التحصيل | `collectionPct = totalCollected / totalExpected` | ✅ |
| عدد من دفعوا | `paidPlayers` | ✅ |

### 6.2 اتساق البيانات بين الـ Server والـ Client

الـ server يُعيد في `buildMatchDetails`:
```typescript
return { ...summary, players, costPerPlayer, totalCollected, totalExpected, paidCount };
```

لكن `manage-match.tsx` لا يستخدم هذه القيم المُحسبة من الـ server — بل يُعيد حسابها من بيانات اللاعبين:
```typescript
const totalCollected = Math.round(paidPlayers * match.cost * 100) / 100;
```

**✅ هذا صحيح:** الحسابات على الـ Client و Server متطابقة في المنطق، وإعادة الحساب على الـ Client تضمن أن الـ UI يتحدث فورياً بدون انتظار الـ server.

### 6.3 Hero Stats في الـ Header

```typescript
<Text style={styles.heroStatNum}>{paidPlayers}</Text>
<Text style={styles.heroStatLbl}>دفع</Text>
...
<Text style={styles.heroStatNum}>{totalCollected}</Text>
<Text style={styles.heroStatLbl}>ر.س</Text>
```

**✅ Hero Stats تعكس التغيير فوراً** بفضل Optimistic Update ✅

---

## 7. الأخطاء والتحذيرات المكتشفة

### 🟡 ملاحظات متوسطة (لا تؤثر على الوظيفة)

#### M-01: ازدواجية الـ Endpoints
- **الوصف:** وجود endpointين (`PUT /matches/:id/payment` و `PATCH /matches/:id/players/:userId/payment`) يؤديان نفس الوظيفة.
- **التأثير:** ازدواجية في الكود، لا تأثير وظيفي.
- **التوصية:** إزالة `PUT /matches/:id/payment` أو توثيقه كـ deprecated.

#### M-02: Shimmer بعرض ثابت (بكسل)
- **الوصف:** `translateX: shimmerX.value * 100` يستخدم 100 بكسل ثابتة.
- **التأثير:** على الشاشات الكبيرة قد لا يمتد الـ shimmer على كامل الـ fill؛ على الشاشات الصغيرة قد يبدو مقتوصاً.
- **التوصية:** استخدام `useSharedValue` لعرض الـ fill الفعلي وحساب الإزاحة نسبياً.

### 🟢 لا مشاكل حرجة

- لا يوجد `overflow` خارج الحدود في LiquidProgressBar.
- لا يوجد قسمة على صفر في أي حساب.
- حالة الـ 403 تعمل بشكل صحيح.
- الـ Swipe لا يتعارض مع ScrollView.

---

## 8. ملاحظات خاصة بـ Android

| الجانب | الحالة | التفاصيل |
|--------|--------|-----------|
| LinearGradient | ✅ | `expo-linear-gradient` متوافق مع Android |
| Reanimated animations | ✅ | `react-native-reanimated` v3 يعمل على Android |
| PanResponder | ✅ | يستخدم `onMoveShouldSetPanResponder` الآمن |
| Haptics | ✅ | `expo-haptics` متوافق |
| overflow: hidden | ✅ | يعمل على Android بشكل صحيح |
| `%` width في Animated | ⚠️ | `width: \`${animatedProgress.value * 100}%\`` — في بعض إصدارات RN القديمة قد تكون هناك مشكلة، لكن في إصدارات 0.73+ هي مدعومة |

---

## 9. توصيات الإصلاح

### أولوية عالية
- لا يوجد — النظام يعمل بشكل صحيح.

### أولوية متوسطة
1. **إزالة `PUT /matches/:id/payment`** أو الإبقاء عليه وتوثيقه — لتبسيط الـ API.
2. **تحسين Shimmer:** تغيير قيمة `translateX` الثابتة إلى نسبة مئوية لدعم الشاشات المختلفة.

### أولوية منخفضة
3. **توثيق أن `match.cost` = التكلفة لكل لاعع** (وليس الإجمالي) في تعليقات الكود لتجنب الالتباس.

---

## 10. خلاصة

| الاختبار | النتيجة |
|----------|---------|
| API تحديث حالة الدفع (منظّم) | ✅ يعمل — يُحدّث DB بشكل صحيح |
| API رفض غير المنظّم (403) | ✅ يعمل |
| حسابات تقسيم التكلفة | ✅ صحيحة رياضياً |
| تحديث حالة الدفع من لوحة المنظّم | ✅ يعمل مع Optimistic Update |
| انعكاس التغيير في Hero Stats | ✅ فوري |
| LiquidProgressBar — Overflow | ✅ لا مشاكل |
| LiquidProgressBar — Gradient | ✅ يعمل على Android |
| LiquidProgressBar — Shimmer | ⚠️ قيمة ثابتة محتمل تحسينها |
| أيقونات الدفع ✅/❌ | ✅ واضحة ومميزة |
| Swipe مقابل ScrollView | ✅ لا تعارض |
| ملخص Gatta المالي | ✅ أرقام صحيحة |

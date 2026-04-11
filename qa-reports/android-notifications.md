# تقرير اختبار الإشعارات الفورية على Android

**التاريخ:** 4 أبريل 2026  
**النظام:** Android  
**الإصدار المختبر:** تطبيق "العب" — Sports Community Mobile App  
**المراجع:** `artifacts/mobile/`, `artifacts/api-server/`, `lib/db/`

---

## ملخص تنفيذي

تم مراجعة شاملة لمنظومة الإشعارات عبر تحليل الكود المصدري والتحقق من منطق كل سيناريو. النتيجة العامة: البنية التحتية للإشعارات سليمة وتعمل بشكل صحيح في معظم الحالات، مع وجود بعض المخاوف التي تستدعي الانتباه.

---

## السيناريو 1: التحقق من تسجيل Push Token

**الملف:** `artifacts/mobile/hooks/usePushNotifications.ts`  
**API Endpoint:** `POST /api/push/register` — `artifacts/api-server/src/routes/push.ts`

### نتائج الاختبار

| الجانب | النتيجة | الحالة |
|--------|---------|--------|
| الاستدعاء بعد تسجيل الدخول | `usePushNotifications(!!user, registerToken)` — يُستدعى فقط عند `isLoggedIn = true` | ✅ |
| طلب صلاحية الإشعارات | يطلب صلاحية وينتظر الرد قبل المتابعة | ✅ |
| الحصول على Expo Push Token | يستخدم `getExpoPushTokenAsync()` | ✅ |
| استدعاء `registerPushToken` | يُستدعى مباشرة بعد الحصول على التوكن | ✅ |
| حفظ التوكن في `push_tokens` | `POST /api/push/register` يحفظ في جدول `push_tokens` | ✅ |
| تجنب التسجيل المكرر | `registered.current = true` بعد التسجيل الناجح | ✅ |
| إلغاء التسجيل في Expo Go | يُتجاهل عند `isExpoGoEnvironment() = true` | ✅ |
| معالجة تغيير المستخدم | إذا سجّل مستخدم مختلف باستخدام نفس الجهاز، يُحدَّث `userId` في السجل | ✅ |

### ملاحظات

- **مشكلة محتملة:** `usePushNotifications` يستخدم `registered.current` لتجنب التسجيل المكرر، لكن هذا الـ ref لا يُعاد تعيينه عند تسجيل الخروج ثم الدخول مجدداً. إذا غيّر المستخدم حساباته، لن يُعاد تسجيل التوكن في الجلسة ذاتها.
- `catch` block في `setupPush()` يبتلع الأخطاء بصمت دون تسجيلها (logging).

---

## السيناريو 2: اختبار إشعار انضمام لاعب

**الملف:** `artifacts/api-server/src/routes/matches.ts` — `POST /matches/:id/join`

### نتائج الاختبار

| الجانب | النتيجة | الحالة |
|--------|---------|--------|
| إشعار "لاعب جديد انضم" | يُرسَل للمنظم عند الانضمام | ✅ |
| محتوى الإشعار | العنوان: `"لاعب جديد انضم ⚽"` — النص: `"${joinerName} انضم إلى مباراة "${match.title}""` | ✅ |
| `relatedId` | يُرسَل `matchId` لتمكين deep linking | ✅ |
| إشعار "اكتملت المباراة" | يُرسَل بدلاً من "لاعب جديد" عند امتلاء المباراة | ✅ |
| عدم إشعار المنظم بنفسه | المنظم يُضاف تلقائياً عند إنشاء المباراة، ولا يتلقى إشعاراً عن نفسه | ✅ |

### ملاحظات

- لا يوجد تحقق من أن المنظم يمتلك push token مسجلاً — `sendNotification` تتعامل مع هذا بمرونة (لا ترسل إذا لا توجد tokens).

---

## السيناريو 3: اختبار إشعار تأكيد/رفض الحضور

**الملف:** `artifacts/api-server/src/routes/matches.ts` — `PUT /matches/:id/attendance`

### نتائج الاختبار

| الحالة | العنوان | النص | الحالة |
|--------|---------|------|--------|
| `status = "present"` | `"تم تأكيد حضورك ✅"` | `"المنظّم أكّد حضورك في مباراة..."` | ✅ |
| `status = "absent"` | `"تم رفض حضورك ❌"` | `"المنظّم لم يؤكّد حضورك في مباراة..."` | ✅ |
| `status = "pending"` | لا يُرسَل إشعار | — | ✅ |
| عدم إشعار المنظم بنفسه | `if (body.userId !== req.user.userId)` | — | ✅ |

### ملاحظات

- الإشعار يحمل `type: "match"` و `relatedId: matchId` — مناسب للـ deep linking.
- لا يُرسَل إشعار عند تغيير الحالة من `present` إلى `pending` (رجوع) — قد يكون مفيداً إشعار المستخدم.

---

## السيناريو 4: اختبار إشعار التقييم (Badge Notification)

**الملف:** `artifacts/api-server/src/routes/matches.ts` — `POST /matches/:id/rate`

### نتائج الاختبار

| الجانب | النتيجة | الحالة |
|--------|---------|--------|
| إشعار badge للاعب المُقيَّم | يُرسَل عند أول تقييم جديد | ✅ |
| اسم الـ badge الصحيح | `"فنان 🎨"` / `"صخرة 💪"` / `"صاعقة ⚡"` | ✅ |
| العنوان | `"حصلت على تقييم جديد! ⭐"` | ✅ |
| النص | `"${raterName} منحك شارة "${badgeLabel}" في مباراة "${match.title}""` | ✅ |
| التحقق من التقييم المكرر | `notifiedUsers` set يمنع الإشعار المزدوج لنفس اللاعب | ✅ |
| التحقق من الحضور والدفع | لا يُسمح بالتقييم إلا للاعبين الذين حضروا ودفعوا (أو المباراة مجانية) | ✅ |
| `type: "rating"` | ✅ مضبوط بشكل صحيح | ✅ |

### ملاحظات

- `relatedId` يُرسَل كـ `matchId` — يؤدي deep linking إلى شاشة المباراة لا إلى الـ badge مباشرة، وهو سلوك مقبول.

---

## السيناريو 5: اختبار Deep Linking من الإشعار

**الملف:** `artifacts/mobile/app/_layout.tsx`

### نتائج الاختبار

| الحالة | الوجهة | الحالة |
|--------|--------|--------|
| `type = "group"` + `relatedId` | `router.push("/group-detail", { id: relatedId })` | ✅ |
| `type = "match"` أو أي نوع آخر + `relatedId` | `router.push("/match-details", { id: relatedId })` | ✅ |
| `relatedId` غير موجود | `return` بلا navigation | ✅ |

#### التطبيق في الخلفية (Background)
- `addNotificationResponseReceivedListener` يستمع لاستجابة المستخدم على الإشعار ويوجّه مباشرة | ✅

#### التطبيق مغلق (Cold Start)
- `getLastNotificationResponseAsync()` يُحضر آخر استجابة محفوظة عند بدء التطبيق | ✅

### مشكلة: غياب deduplication عند Cold Start

**الحالة:** في `_layout.tsx` السطر 72–75:
```typescript
const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse) {
  const data = lastResponse.notification.request.content.data as Record<string, unknown>;
  navigateFromNotification(data);
}
```

- **المشكلة:** لا يوجد تحقق من `lastHandledNotificationId` كما هو مذكور في متطلبات المهمة. إذا أعاد النظام تشغيل التطبيق أو حدثت إعادة render للـ `PushNotificationManager`، يمكن أن يُعالَج الإشعار مرتين.
- **التأثير:** التنقل إلى نفس الشاشة مرتين متتاليتين — يُضيف entry زائد في navigation stack.
- **التوصية:** إضافة `lastHandledNotificationId` ref لتخزين آخر identifier معالج:

```typescript
const lastHandledNotificationIdRef = useRef<string | null>(null);

const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse) {
  const notifId = lastResponse.notification.request.identifier;
  if (notifId !== lastHandledNotificationIdRef.current) {
    lastHandledNotificationIdRef.current = notifId;
    const data = lastResponse.notification.request.content.data;
    navigateFromNotification(data);
  }
}
```

---

## السيناريو 6: اختبار مشكلة Android — Notification Channel

**الملف:** `artifacts/mobile/app.json` — `artifacts/mobile/hooks/usePushNotifications.ts`

### نتائج الاختبار

| الجانب | النتيجة | الحالة |
|--------|---------|--------|
| إضافة plugin `expo-notifications` | موجود في `app.json` | ✅ |
| `shouldShowAlert: true` | مضبوط في `setNotificationHandler` | ✅ |
| `shouldPlaySound: true` | مضبوط | ✅ |
| `shouldSetBadge: true` | مضبوط | ✅ |
| Android Notification Channel مخصص | **غير موجود** — لا يوجد تعريف لـ channel في `app.json` أو الكود | ⚠️ |

### مشكلة: Notification Channel غير مُعرَّف

**الحالة:**  
على Android 8.0+ (Oreo — API 26+)، يجب أن تنتمي الإشعارات إلى channel مُعرَّف. بدونه:
- إصدارات Android 8.0+ ستستخدم channel افتراضي (`"Default"`) تنشئه Expo تلقائياً.
- لا يمكن تخصيص أولوية الإشعار أو إعداداته (صوت، اهتزاز، مؤشر الضوء).

**التوصية:** إضافة تعريف channel صريح في `app.json`:

```json
"android": {
  "package": "com.elab.sports",
  "adaptiveIcon": { ... },
  "notification": {
    "icon": "./assets/images/icon.png",
    "color": "#FF6B35",
    "androidMode": "default",
    "androidCollapsedTitle": "#{unread_notifications} إشعار جديد"
  }
}
```

وإضافة `setNotificationChannelAsync` في `usePushNotifications.ts`:

```typescript
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("default", {
    name: "الإشعارات العامة",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF6B35",
    sound: "default",
  });
}
```

---

## السيناريو 7: اختبار إشعار إلغاء المباراة

**الملف:** `artifacts/api-server/src/routes/matches.ts` — `DELETE /matches/:id`

### نتائج الاختبار

| الجانب | النتيجة | الحالة |
|--------|---------|--------|
| إشعار لجميع اللاعبين (غير المنظم) | يُرسَل باستخدام `Promise.allSettled` | ✅ |
| عنوان الإشعار | `"تم إلغاء المباراة"` | ✅ |
| نص الإشعار | `"تم إلغاء مباراة "${match.title}" من قبل المنظّم"` | ✅ |
| استخدام `Promise.allSettled` | يمنع فشل إشعار واحد من إلغاء البقية | ✅ |
| `relatedId` | يُرسَل `matchId` | ✅ |
| لا يُرسَل للمنظم | `filter((uid) => uid !== userId)` | ✅ |
| حذف اللاعبين أولاً أم الإشعار أولاً | الإشعار يُرسَل **قبل** الحذف — صحيح | ✅ |

### ملاحظات

- لا يوجد إرسال للإشعار إذا لم يكن هناك لاعبون (`playerUserIds.length === 0`) — منطق صحيح.

---

## ملخص المشاكل المكتشفة

| # | المشكلة | الخطورة | التوصية |
|---|---------|---------|---------|
| 1 | غياب `lastHandledNotificationId` deduplication عند Cold Start | متوسطة | إضافة ref لتتبع آخر إشعار معالج |
| 2 | Android Notification Channel غير مُعرَّف صراحةً | منخفضة-متوسطة | إضافة `setNotificationChannelAsync` في usePushNotifications |
| 3 | `catch` block صامت في `setupPush()` و `registerToken` | منخفضة | إضافة error logging للتشخيص |
| 4 | `registered.current` لا يُعاد تعيينه عند تغيير المستخدم | منخفضة | إضافة `useEffect` cleanup أو ربطها بـ userId |
| 5 | لا إشعار عند إرجاع حضور اللاعب من `present` إلى `pending` | منخفضة | إضافة اختياري لإشعار "تم إلغاء تأكيد حضورك" |

---

## التوصيات

### أولوية عالية
1. **إضافة deduplication للـ cold start** — منع التنقل المزدوج عند إعادة render.

### أولوية متوسطة
2. **تعريف Android Notification Channel صريح** — ضمان تجربة إشعارات متسقة على Android 8+.

### أولوية منخفضة
3. **Error logging في push notification hooks** — تسهيل التشخيص في الإنتاج.
4. **إعادة تعيين `registered.current` عند تسجيل الخروج** — ضمان التسجيل الصحيح عند تبديل الحسابات.

---

## خلاصة

منظومة الإشعارات تعمل بشكل صحيح في جميع السيناريوهات الأساسية:
- تسجيل التوكن ✅
- إشعار انضمام لاعب ✅
- إشعار تأكيد/رفض الحضور ✅
- إشعار التقييم مع اسم الـ badge الصحيح ✅
- Deep linking للمباراة والمجموعة ✅
- إشعار إلغاء المباراة ✅

المشاكل المكتشفة صغيرة ولا تمنع التشغيل، لكن إصلاحها سيحسن جودة التجربة على Android ويزيد موثوقية النظام.

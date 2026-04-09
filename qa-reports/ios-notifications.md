# تقرير اختبار الإشعارات الفورية على iOS

**التاريخ:** 4 أبريل 2026  
**النظام:** iOS  
**الملفات المراجعة:**
- `artifacts/mobile/hooks/usePushNotifications.ts`
- `artifacts/mobile/app/_layout.tsx`
- `artifacts/api-server/src/lib/push.ts`
- `artifacts/mobile/app.json`

---

## ملخص تنفيذي

تم مراجعة منظومة الإشعارات الفورية على iOS من خلال تحليل الكود المصدري. النتائج تُظهر أن البنية العامة سليمة، لكن توجد **3 مشاكل** تستحق الإصلاح قبل الإطلاق على iOS.

---

## 1. التحقق من Permission Flow على iOS

### النتيجة: ⚠️ يعمل جزئياً – يحتاج تحسيناً

**الكود الحالي (`usePushNotifications.ts`):**
```ts
const { status } = await Notifications.requestPermissionsAsync();
```

**المشاكل المكتشفة:**
- `requestPermissionsAsync()` يُستدعى بدون تحديد الـ permissions المطلوبة صراحةً. على iOS، يجب تمرير الخيارات:
  ```ts
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true }
  });
  ```
- غياب هذه الخيارات لا يمنع الإشعارات من العمل (الافتراضيات تشملها)، لكنه يقلل من الوضوح والتحكم.
- حالة رفض المستخدم (`denied`) تُعالج بشكل صحيح: الكود يتوقف عند `if (finalStatus !== "granted") return;` — لا توجد محاولات إعادة سؤال لا نهائية.
- **غائب:** لا يوجد أي توجيه للمستخدم نحو إعدادات التطبيق (`Linking.openSettings()`) عند الرفض — يُعدّ هذا سلوكاً مقبولاً لكنه يُقلّل من تجربة الاستخدام.

**التوصية:**
```ts
const { status } = await Notifications.requestPermissionsAsync({
  ios: { allowAlert: true, allowBadge: true, allowSound: true }
});
```

---

## 2. اختبار تسجيل APNs Token

### النتيجة: ⚠️ مشكلة محتملة – يحتاج إصلاحاً

**الكود الحالي:**
```ts
const tokenData = await Notifications.getExpoPushTokenAsync();
```

**المشاكل المكتشفة:**
- على iOS (خاصةً عند استخدام EAS أو standalone build)، `getExpoPushTokenAsync()` يتطلب تمرير `projectId` صراحةً:
  ```ts
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  });
  ```
- استدعاؤه بدون `projectId` قد يفشل على iOS standalone builds ويُعطي `undefined` أو exception.
- في `app.json` لا يوجد `extra.eas.projectId` مُعرَّف، مما يزيد من احتمالية الفشل.

**التوصية:**
1. إضافة `projectId` في `app.json`:
   ```json
   "extra": {
     "eas": { "projectId": "YOUR_EAS_PROJECT_ID" }
   }
   ```
2. تمرير `projectId` في `getExpoPushTokenAsync()`:
   ```ts
   const tokenData = await Notifications.getExpoPushTokenAsync({
     projectId: Constants.expoConfig?.extra?.eas?.projectId
   });
   ```

---

## 3. اختبار سيناريوهات الإشعارات

### النتيجة: ✅ البنية سليمة (يعتمد على الاختبار الميداني)

**السيناريوهات المُفحوصة من خلال الكود:**

| السيناريو | البيانات المُرسلة | التنقل المتوقع | الحالة |
|-----------|-----------------|----------------|--------|
| انضمام لاعب للمباراة | `{ type: "match", relatedId: matchId }` | `/match-details?id=matchId` | ✅ منطق صحيح |
| تأكيد حضور | `{ type: "match", relatedId: matchId }` | `/match-details?id=matchId` | ✅ منطق صحيح |
| تقييم ما بعد المباراة | `{ type: "rating", relatedId: matchId }` | `/match-details?id=matchId` | ✅ منطق صحيح |
| إلغاء مباراة | `{ type: "match", relatedId: matchId }` | `/match-details?id=matchId` | ✅ منطق صحيح |
| إشعار مجموعة | `{ type: "group", relatedId: groupId }` | `/group-detail?id=groupId` | ✅ منطق صحيح |

**ملاحظة:** `push.ts` يُرشّح التوكنات بـ `t.startsWith("ExponentPushToken")` مما يمنع إرسال APNs tokens الخام لـ Expo API — هذا صحيح.

---

## 4. اختبار Cold Start Deep Linking على iOS

### النتيجة: ❌ مشكلة — يحتاج إصلاحاً عاجلاً

**الكود الحالي:**
```ts
const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse) {
  const data = lastResponse.notification.request.content.data as Record<string, unknown>;
  navigateFromNotification(data);
}
```

**المشاكل المكتشفة:**
1. **لا يوجد `lastHandledNotificationId`:** كما هو مذكور في متطلبات المهمة، التقرير يتوقع وجود آلية لمنع التنقل المكرر عند إعادة render الـ component. الكود الحالي لا يتتبع أي `id` للإشعار المعالج، مما قد يُسبب تنقلاً مكرراً عند:
   - re-render سريع لـ `PushNotificationManager`
   - تغيير حالة المستخدم (تسجيل الدخول) بعد cold start
2. **التوقيت:** `setupNotificationResponseListener` يُستدعى مباشرةً في `useEffect` بدون ضمان اكتمال تهيئة الـ router، مما يعني أن `router.push()` داخل `navigateFromNotification` قد يُستدعى قبل أن يكون expo-router جاهزاً.

**التوصية:**
```ts
const lastHandledNotificationId = useRef<string | null>(null);

const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse) {
  const notifId = lastResponse.notification.request.identifier;
  if (notifId !== lastHandledNotificationId.current) {
    lastHandledNotificationId.current = notifId;
    const data = lastResponse.notification.request.content.data as Record<string, unknown>;
    navigateFromNotification(data);
  }
}
```

---

## 5. اختبار تعارض الـ Navigation مع expo-router

### النتيجة: ❌ مشكلة — Race Condition محتملة

**الكود الحالي (`_layout.tsx`):**
```ts
useEffect(() => {
  // يُستدعى مباشرةً دون انتظار router
  setupNotificationResponseListener();
}, []);
```

**المشاكل المكتشفة:**
- `PushNotificationManager` يُستدعى مُبكراً في شجرة الـ components — قبل أن يضمن expo-router اكتمال تهيئته.
- `router.push()` في `navigateFromNotification` قد يُعطي خطأ صامتاً أو يُستدعى قبل mount الـ navigator.
- على iOS، cold start من إشعار أبطأ من Android، مما يزيد من احتمالية وقوع هذه الـ race condition.

**التوصية:**
استخدام `setTimeout` بسيط أو الاستماع لحدث `onLayout` لتأجيل التنقل:
```ts
// في navigateFromNotification
setTimeout(() => {
  router.push({ pathname: "/match-details", params: { id: relatedId } });
}, 100);
```
أو الأفضل: استخدام `useRootNavigationState` من expo-router للتأكد من جاهزية الـ navigator:
```ts
import { useRootNavigationState } from 'expo-router';
const navigationState = useRootNavigationState();
// لا تُنفّذ التنقل حتى يكون navigationState?.key مُعرَّفاً
```

---

## 6. مراجعة Badge Count

### النتيجة: ✅ يعمل بشكل صحيح

**الكود الحالي:**
```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,  // ✅ مُفعَّل
    ...
  }),
});
```

**التحقق:**
- `shouldSetBadge: true` مُعيَّن بشكل صحيح في `setNotificationHandler`.
- `expo-notifications` مُدرج في `plugins` داخل `app.json` — يضمن الإعداد الصحيح لـ entitlements على iOS.
- لم يتم إعداد إعادة تصفير الـ badge عند فتح التطبيق (`setBadgeCountAsync(0)`) — يُنصح بإضافتها للتجربة الأمثل.

**التوصية:**
```ts
// عند تشغيل التطبيق
await Notifications.setBadgeCountAsync(0);
```

---

## ملخص المشاكل والتوصيات

| # | المشكلة | الخطورة | الإصلاح المقترح |
|---|---------|---------|----------------|
| 1 | `requestPermissionsAsync()` بدون خيارات iOS صريحة | منخفضة | تمرير `{ ios: { allowAlert, allowBadge, allowSound } }` |
| 2 | `getExpoPushTokenAsync()` بدون `projectId` | **عالية** | إضافة `projectId` في `app.json` وتمريره للـ function |
| 3 | غياب `lastHandledNotificationId` | **عالية** | إضافة ref لتتبع آخر إشعار تمت معالجته |
| 4 | Race condition بين cold start وRouter initialization | متوسطة | تأجيل التنقل حتى اكتمال تهيئة expo-router |
| 5 | غياب إعادة تصفير الـ badge count | منخفضة | استدعاء `setBadgeCountAsync(0)` عند فتح التطبيق |

---

## خلاصة

التطبيق يحتاج **إصلاحين عاجلين** قبل نشره على iOS:
1. **`projectId` في `getExpoPushTokenAsync()`** — بدونه لن يعمل تسجيل التوكن على standalone builds.
2. **`lastHandledNotificationId`** — لمنع التنقل المكرر عند cold start.

المشاكل الأخرى تُؤثر على تجربة المستخدم لكنها لا تمنع الإشعارات من العمل بشكل كامل.

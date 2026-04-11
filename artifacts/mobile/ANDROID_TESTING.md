# دليل اختبار Android — تطبيق العب

## المتطلبات الأساسية

- حساب Expo: [expo.dev](https://expo.dev) (مجاني)
- Node.js 18+ و pnpm
- EAS CLI: `npm install -g eas-cli`
- جهاز Android (Android 7.0+ / API 24+) أو محاكي

---

## الإعداد لأول مرة

### 1. تسجيل الدخول إلى Expo

```bash
eas login
```

### 2. ربط المشروع بحساب Expo

```bash
cd artifacts/mobile
eas init --id <YOUR_PROJECT_ID>
```

> إذا كان مشروعاً جديداً، اترك الأمر بدون `--id` وسيُنشئ معرّفاً جديداً.

---

## بناء التطبيق

### Development Build (للاختبار الداخلي)

```bash
cd artifacts/mobile
eas build --platform android --profile development
```

- يُنتج **APK** قابل للتثبيت مباشرةً
- يدعم hot reload عبر Expo Dev Client
- مناسب للمطورين والاختبار اليومي

### Preview Build (للمختبرين الخارجيين)

```bash
eas build --platform android --profile preview
```

- يُنتج **APK** موقّعاً
- يُوزَّع عبر رابط مباشر من Expo
- لا يحتاج Google Play

### Production Build (لرفع Google Play)

```bash
eas build --platform android --profile production
```

- يُنتج **AAB** (Android App Bundle)
- يُرفع على Google Play Console

---

## إعداد FCM (الإشعارات)

### 1. إنشاء مشروع Firebase

1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. أنشئ مشروعاً جديداً أو استخدم موجوداً
3. أضف تطبيق Android بـ Package Name: `com.elab.sports`
4. حمّل `google-services.json` وضعه في `artifacts/mobile/`

> **مهم:** لا تضف `google-services.json` إلى Git. أضفه إلى `.gitignore`.

### 2. التحقق من الإعداد

```bash
# تأكد من وجود الملف
ls artifacts/mobile/google-services.json
```

---

## تثبيت APK على الجهاز

1. بعد اكتمال البناء، ستحصل على رابط APK من Expo
2. افتح الرابط على جهاز Android
3. فعّل "Unknown Sources" في الإعدادات إذا طُلب
4. ثبّت التطبيق

```bash
# أو عبر adb إذا كان الجهاز متصلاً بالكمبيوتر
adb install path/to/app.apk
```

---

## قائمة تحقق الاختبار على الجهاز

### الشاشة الرئيسية (Home)
- [ ] تأثير الزجاج (BlurView) يظهر خلف الـ Tab Bar
- [ ] الاتجاه RTL صحيح (النص العربي يبدأ من اليمين)
- [ ] التمرير سلس بدون تقطع

### تأثيرات الزجاج (Glass Effects)
- [ ] `GlassCard` يعرض blur حقيقي (وليس لوناً شفافاً فقط)
- [ ] `GlassTabBar` في أسفل الشاشة يعمل بشكل صحيح
- [ ] `GlassScreenHeader` في رأس كل شاشة يظهر بتأثير الزجاج

### الخطوط
- [ ] خط Cairo يحمّل بشكل صحيح
- [ ] لا يوجد fallback إلى Arial أو خط النظام الافتراضي
- [ ] النص العربي يظهر بشكل واضح وجميل

### شريط الحالة (StatusBar)
- [ ] شفاف — المحتوى يمتد خلفه إلى أعلى الشاشة
- [ ] لا يوجد شريط أبيض أو مربع أسود فوق التطبيق

### لوحة المفاتيح
- [ ] عند فتح لوحة المفاتيح، المحتوى يرتفع (ولا يُخفَى خلفها)
- [ ] حقول النص في شاشات تسجيل الدخول/الإنشاء تعمل بشكل صحيح

### الإيماءات (Gestures)
- [ ] في شاشة تفاصيل المباراة: السحب للخلف (swipe back) يعمل بسلاسة
- [ ] لا يوجد تعارض بين الـ gestures المختلفة

### الموقع الجغرافي
- [ ] التطبيق يطلب إذن الموقع بشكل صحيح
- [ ] بعد منح الإذن، الخريطة تعرض الموقع الحالي
- [ ] قائمة الملاعب القريبة تُحدَّث بناءً على الموقع

### الإشعارات (Android 13+)
- [ ] التطبيق يطلب إذن POST_NOTIFICATIONS
- [ ] إشعار تجريبي يصل ويظهر في قائمة الإشعارات
- [ ] الضغط على الإشعار يفتح الشاشة الصحيحة

### الأداء
- [ ] قائمة المباريات (FlatList) تتمرر بـ 60fps
- [ ] لا يوجد تجمّد عند التنقل بين الشاشات
- [ ] وقت البدء (startup time) معقول (أقل من 3 ثوان)

---

## استكشاف الأخطاء

### خطأ: "google-services.json not found"
```bash
# إنشاء الملف من الـ template
cp artifacts/mobile/google-services.json.template artifacts/mobile/google-services.json
# ثم عدّل القيم بالبيانات الحقيقية من Firebase
```

### خطأ في البناء: SDK version
تأكد من `app.json`:
```json
"android": {
  "compileSdkVersion": 35,
  "targetSdkVersion": 35,
  "minSdkVersion": 24
}
```

### BlurView لا يعمل
- تأكد من `expo-blur` مثبّت: `pnpm add expo-blur`
- تأكد من استخدام native build وليس Expo Go

---

## روابط مفيدة

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [FCM Setup Guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Expo Dev Client](https://docs.expo.dev/clients/introduction/)
- [Firebase Console](https://console.firebase.google.com)

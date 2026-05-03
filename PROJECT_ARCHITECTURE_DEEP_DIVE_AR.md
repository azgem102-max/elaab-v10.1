# العَب - تحليل معماري عميق للمشروع
> مرجع هندسي عربي لفهم الهدف، الترابطات، المسؤوليات، والمخاطر التقنية الحالية
>
> تاريخ الإنشاء: 2026-04-21

---

## 1. الهدف الحقيقي من المنتج

`العَب` ليس مجرد تطبيق "إنشاء مباراة" أو "حجز ملعب".
هو منصة مجتمع رياضي محلي، هدفها تنظيم اللعب بين أشخاص موثوقين داخل السعودية، مع تركيز واضح على:

- اكتشاف مباريات رياضية والانضمام لها.
- إنشاء مجموعات رياضية عامة أو خاصة.
- بناء سمعة اللاعب عبر الحضور والانضباط.
- تشغيل منظومة دعوات، إشعارات، وتقييمات بعد المباراة.

الرياضات المدعومة حاليًا:

- كرة القدم
- البادل
- التنس

الفكرة المركزية للمنتج هي الجمع بين:

- `Scheduling`: متى وأين ستقام المباراة
- `Community`: من سيلعب معك
- `Trust`: هل اللاعب ملتزم فعلًا
- `Operations`: حضور، دفع، دعوات، إشعارات، تقييم

بالتالي فالمشروع يمكن اعتباره:

- تطبيق مجتمع رياضي
- تطبيق تنسيق وتشغيل مباريات
- نظام ثقة اجتماعية مبني على الحضور والسلوك

---

## 2. الصورة العامة للمعمارية

المشروع مبني كـ `pnpm monorepo`، ومقسم إلى 3 طبقات رئيسية:

- `artifacts/mobile/`
  تطبيق Expo / React Native
- `artifacts/api-server/`
  خادم Express / Node.js
- `lib/`
  مكتبات مشتركة: قاعدة البيانات، عقد API، التوليد

### التدفق المعماري المختصر

1. المستخدم يتفاعل مع شاشة في تطبيق Expo.
2. الشاشة تعتمد على `AppContext` أو تستدعي `services/api.ts`.
3. `services/api.ts` يرسل الطلب إلى خادم Express مع JWT عند الحاجة.
4. الراوتر المناسب في `api-server` ينفذ قواعد المجال.
5. الراوتر يستخدم Drizzle للوصول إلى PostgreSQL.
6. النتيجة تعود للواجهة وتُدمج في حالة التطبيق المحلية.

### خريطة التدفق

```text
Mobile Screen
  -> AppContext / API Service
  -> Express Route
  -> Domain Logic
  -> Drizzle ORM
  -> PostgreSQL
  -> Response
  -> Local State + UI Refresh
```

---

## 3. طبقات المشروع ومسؤولية كل طبقة

## 3.1 طبقة العرض - Mobile UI

المجلد:

- `artifacts/mobile/app/`

المسؤولية:

- تعريف الشاشات الفعلية عبر Expo Router
- استقبال تفاعل المستخدم
- عرض الحالة القادمة من `AppContext`
- استدعاء العمليات مثل إنشاء مباراة أو الانضمام لها

أمثلة مهمة:

- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/explore.tsx`
- `app/match-details.tsx`
- `app/group-detail.tsx`
- `app/create-match.tsx`

## 3.2 طبقة الحالة والتنسيق - Frontend State Orchestration

الملف الأهم:

- `artifacts/mobile/context/AppContext.tsx`

المسؤولية:

- إدارة المستخدم الحالي
- إدارة المباريات والمجموعات والإشعارات
- تنفيذ optimistic updates
- توحيد السلوك بين الشاشات
- مزامنة جزء من الحالة مع `AsyncStorage`

هذه الطبقة هي "عقل" الواجهة الأمامية الحقيقي.

## 3.3 طبقة الشبكة - API Client Layer

الملف:

- `artifacts/mobile/services/api.ts`

المسؤولية:

- تحديد عنوان الخادم
- إدارة JWT
- إضافة `Authorization` headers
- إدارة timeout والأخطاء
- تعريف الواجهات المستخدمة بين الموبايل والخادم

## 3.4 طبقة الخادم - API / Business Logic

المجلد:

- `artifacts/api-server/src/routes/`

المسؤولية:

- تطبيق قواعد العمل
- التحقق من الصلاحيات
- التحقق من البيانات
- القراءة والكتابة من قاعدة البيانات
- إصدار الإشعارات

المسارات الرئيسية:

- `auth.ts`
- `matches.ts`
- `groups.ts`
- `users.ts`
- `notifications.ts`
- `venues.ts`
- `admin.ts`

## 3.5 طبقة البيانات - Database Layer

المجلد:

- `lib/db/src/schema/`

المسؤولية:

- تعريف الجداول
- تعريف بنية البيانات
- تمثيل العلاقات المنطقية بين الكيانات

الملفات الأساسية:

- `users.ts`
- `matches.ts`
- `groups.ts`
- `ratings.ts`
- `notifications.ts`
- `invite_links.ts`
- `venues.ts`
- `venue_reviews.ts`
- `group_join_requests.ts`
- `group_messages.ts`

## 3.6 طبقة العقد - API Contract Layer

المجلد:

- `lib/api-spec/`

الملفات:

- `openapi.yaml`
- `orval.config.ts`

المسؤولية:

- توثيق واجهات الـ API رسميًا
- توليد عميل React Query
- توليد ملفات Zod/Types

---

## 4. أهم التدفقات الوظيفية

## 4.1 تدفق المصادقة

الملفات الأساسية:

- `artifacts/mobile/app/index.tsx`
- `artifacts/mobile/app/phone.tsx`
- `artifacts/mobile/app/otp.tsx`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/auth.ts`

التدفق:

1. المستخدم يختار اللغة ثم يبدأ.
2. يدخل رقم هاتف سعودي بصيغة `+9665XXXXXXXX`.
3. الخادم يولد OTP ويخزنه في `otp_codes`.
4. عند التحقق:
   - إن كان المستخدم جديدًا يُنشأ سجل في `users`
   - ثم يُوقّع JWT
5. الواجهة تخزن التوكن محليًا.

ملاحظات:

- يوجد دعم Twilio عند توفر الإعدادات.
- يوجد dev bypass أثناء التطوير.

## 4.2 تدفق المباريات

الملفات الأساسية:

- `artifacts/mobile/app/create-match.tsx`
- `artifacts/mobile/app/match-details.tsx`
- `artifacts/mobile/app/manage-match.tsx`
- `artifacts/api-server/src/routes/matches.ts`
- `lib/db/src/schema/matches.ts`

الوظائف المغطاة:

- إنشاء مباراة
- الانضمام للمباراة
- الانسحاب منها
- كشف التعارض الزمني
- إدارة الحضور
- إدارة الدفع
- إنشاء روابط الدعوة
- إكمال أو إلغاء المباراة
- تصويت دقة المستوى بعد المباراة

المفهوم الأهم هنا:

- المباراة ليست مجرد كيان عرض
- هي كيان تشغيلي يحمل:
  - أعضاء
  - حالة
  - منظم
  - تكلفة
  - نوع الجلسة
  - مستوى مطلوب
  - دعوات

## 4.3 تدفق المجموعات

الملفات الأساسية:

- `artifacts/mobile/app/(tabs)/groups.tsx`
- `artifacts/mobile/app/group-detail.tsx`
- `artifacts/mobile/app/group-management.tsx`
- `artifacts/api-server/src/routes/groups.ts`
- `lib/db/src/schema/groups.ts`
- `lib/db/src/schema/group_join_requests.ts`
- `lib/db/src/schema/group_messages.ts`

الوظائف:

- إنشاء مجموعة
- عرض المجموعات العامة
- إظهار المجموعات الخاصة للأعضاء فقط
- إرسال طلب انضمام
- قبول/رفض الطلب
- دعوة الأعضاء
- تغيير الأدوار
- إدارة الدردشة

المفهوم الأهم:

- المجموعة هي وحدة اجتماعية وتنظيمية
- الخصوصية في المباريات الخاصة تعتمد عليها

## 4.4 تدفق الملف الشخصي والثقة

الملفات الأساسية:

- `artifacts/mobile/app/(tabs)/profile.tsx`
- `artifacts/mobile/app/settings.tsx`
- `artifacts/api-server/src/routes/users.ts`
- `lib/db/src/schema/users.ts`
- `lib/db/src/schema/ratings.ts`

الوظائف:

- تحديث الاسم والصورة والرياضات
- تحديث ملفات الرياضات ومستوى اللاعب
- إدارة تفضيلات الإشعارات
- حساب `Reliability`

### Reliability Index

هذا من أهم مفاهيم المشروع.

يُحسب بناءً على:

- حضور اللاعب في مباريات لا ينظمها بنفسه
- بعد حد أدنى من عدد المشاركات
- مع bonus إضافي من تصويت دقة المستوى

هذا يجعل الثقة جزءًا أساسيًا من هوية المنتج.

## 4.5 الإشعارات و Push

الملفات الأساسية:

- `artifacts/mobile/hooks/usePushNotifications.ts`
- `artifacts/mobile/app/notifications.tsx`
- `artifacts/api-server/src/routes/notifications.ts`
- `artifacts/api-server/src/lib/push.ts`
- `lib/db/src/schema/notifications.ts`

الوظائف:

- تسجيل Expo Push Token
- إرسال إشعار خارجي
- حفظ إشعار داخلي في قاعدة البيانات
- عرض سجل الإشعارات
- تعليم الإشعار كمقروء

## 4.6 الجدولة الزمنية التلقائية

الملف:

- `artifacts/api-server/src/lib/scheduler.ts`

الوظائف:

- تذكير قبل المباراة بساعة
- تذكير بعد المباراة للتقييم
- تذكير أسبوعي لبعض المستخدمين
- إكمال المباراة أو إلغاؤها تلقائيًا

هذه الطبقة تجعل المشروع ليس مجرد CRUD، بل نظامًا زمنيًا متفاعلًا.

## 4.7 الملاعب والإدارة

الملفات:

- `artifacts/api-server/src/routes/venues.ts`
- `artifacts/api-server/src/routes/admin.ts`
- `artifacts/api-server/src/lib/adminAuth.ts`
- `lib/db/src/schema/venues.ts`
- `lib/db/src/schema/venue_reviews.ts`

الوظائف:

- قائمة الملاعب
- اقتراح ملاعب من المستخدمين
- تقييم الملاعب
- اعتماد الاقتراحات إداريًا
- لوحة تحكم بسيطة للإدارة

---

## 5. أهم الملفات التي يجب قراءتها أولًا

إذا أردت فهم المشروع سريعًا، هذا هو ترتيب القراءة الأفضل:

1. `artifacts/mobile/app/_layout.tsx`
2. `artifacts/mobile/context/AppContext.tsx`
3. `artifacts/mobile/services/api.ts`
4. `artifacts/api-server/src/app.ts`
5. `artifacts/api-server/src/routes/index.ts`
6. `artifacts/api-server/src/lib/auth.ts`
7. `artifacts/api-server/src/routes/auth.ts`
8. `artifacts/api-server/src/routes/matches.ts`
9. `artifacts/api-server/src/routes/groups.ts`
10. `artifacts/api-server/src/routes/users.ts`
11. `artifacts/api-server/src/lib/scheduler.ts`
12. `lib/db/src/schema/users.ts`
13. `lib/db/src/schema/matches.ts`
14. `lib/db/src/schema/groups.ts`
15. `lib/api-spec/openapi.yaml`

---

## 6. خريطة المسؤوليات العملية

## 6.1 إذا أردت تعديل المصادقة

ابدأ من:

- `mobile/app/phone.tsx`
- `mobile/app/otp.tsx`
- `mobile/services/api.ts`
- `api-server/routes/auth.ts`

## 6.2 إذا أردت تعديل إنشاء/انضمام مباراة

ابدأ من:

- `mobile/app/create-match.tsx`
- `mobile/app/match-details.tsx`
- `mobile/context/AppContext.tsx`
- `api-server/routes/matches.ts`
- `db/schema/matches.ts`

## 6.3 إذا أردت تعديل المجموعات

ابدأ من:

- `mobile/app/(tabs)/groups.tsx`
- `mobile/app/group-detail.tsx`
- `api-server/routes/groups.ts`
- `db/schema/groups.ts`

## 6.4 إذا أردت تعديل الملف الشخصي أو الموثوقية

ابدأ من:

- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/settings.tsx`
- `api-server/routes/users.ts`
- `db/schema/users.ts`
- `db/schema/ratings.ts`

## 6.5 إذا أردت تعديل النصوص أو RTL/LTR

ابدأ من:

- `mobile/i18n/index.tsx`
- `mobile/i18n/ar.ts`
- `mobile/i18n/en.ts`

## 6.6 إذا أردت تعديل تصميم الواجهة

ابدأ من:

- `mobile/components/glass/`
- `mobile/constants/colors.ts`
- `mobile/hooks/useColors.ts`

---

## 7. ما المكتمل فعليًا

من خلال قراءة التنفيذ الحالي، هذه أجزاء تبدو مكتملة وظيفيًا إلى حد جيد:

- تدفق OTP + JWT
- إنشاء المباراة والانضمام لها
- كشف التعارض الزمني للمباريات
- إنشاء المجموعات وطلبات الانضمام
- الدردشة polling داخل المجموعات
- الإشعارات الداخلية والخارجية
- رفع صورة الحساب
- منطق الثقة `Reliability`
- تقييم دقة المستوى بعد المباراة
- دعوات المجموعات والمباريات عبر روابط
- طبقة admin أولية

---

## 8. ما الموجود لكن يبدو غير مكتمل أو غير مندمج بالكامل

## 8.1 Contract-first موجود لكن غير مستثمر بالكامل

يوجد:

- `OpenAPI`
- `orval`
- generated client
- generated zod

لكن الواجهة الحالية تعتمد عمليًا أكثر على:

- `AppContext`
- `services/api.ts`

أكثر من اعتمادها على الـ generated hooks.

هذا يعني أن البنية المقصودة حديثة، لكن التطبيق الفعلي ما يزال هجينًا.

## 8.2 React Query موجود كبنية، لكنه ليس مركز الحالة الحقيقي

يوجد `QueryClientProvider` في `_layout.tsx`
لكن مركز الحالة والسلوك الفعلي هو `AppContext`.

بالتالي:

- React Query موجود
- لكن إدارة البيانات ليست موحدة حوله بعد

## 8.3 `waitlist` موجود في البيانات والإدارة، لكنه غير مكتمل في السلوك

يوجد جدول:

- `lib/db/src/schema/waitlist.ts`

وتوجد واجهة admin تعرضه.

لكن منطق `join match` الحالي في `matches.ts` يرفض المباراة الممتلئة مباشرة بدل إدخال اللاعب في قائمة انتظار.

إذًا:

- الموديل موجود
- لكن السلوك لم يكتمل بعد

## 8.4 التوثيق أعلى من دقة التنفيذ في بعض النقاط

التوثيق الحالي يذكر:

- `i18next`
- `expo-localization`
- اعتماد واسع على React Query

بينما التنفيذ الفعلي يستخدم:

- i18n provider مخصص داخل `artifacts/mobile/i18n/index.tsx`
- AppContext كمركز إدارة أساسي

---

## 9. أهم المخاطر التقنية الحالية

## 9.1 AppContext ملف ضخم جدًا ومركزي جدًا

`artifacts/mobile/context/AppContext.tsx`

يجمع:

- الحالة
- التحويل بين API/local models
- persistence
- الإشعارات
- المباريات
- المجموعات
- optimistic updates

هذا يزيد:

- صعوبة التعديل الآمن
- صعوبة الاختبار
- احتمالية التضارب بين الميزات

## 9.2 business logic موزع بين الخادم والواجهة

بعض قواعد المجال موجودة في الواجهة أيضًا، مثل:

- فحص التعارض الزمني قبل طلب الخادم
- فحوصات الانضمام المحلية

هذا جيد لتحسين UX، لكنه قد يسبب:

- ازدواجية منطق
- احتمال عدم تطابق بين الواجهة والخادم مع الوقت

## 9.3 N+1 logic داخل بعض بناء التفاصيل

بعض ملفات الخادم، خصوصًا `matches.ts` و`groups.ts`, تبني التفاصيل عبر استعلامات متكررة لكل لاعب أو عضو.

هذا قد يتحول إلى bottleneck مع زيادة البيانات.

## 9.4 الترجمة موجودة لكن ليست مندمجة بالكامل مع كل النصوص

ما زال يوجد في بعض الشاشات نصوص مباشرة أو خلط بين:

- نص مترجم من `t(...)`
- نص صريح داخل الملف

وهذا خطر على:

- تناسق اللغة
- سهولة الصيانة
- دعم RTL/LTR بشكل مثالي

## 9.5 الوثائق الحالية ليست كلها متزامنة مع التنفيذ

يوجد فرق بين:

- ما تقوله نظرة المشروع
- وما ينفذه الكود فعليًا

وهذا يربك أي مطور جديد أو أي agent يقرأ المشروع.

---

## 10. mental model الصحيح لفهم المشروع

افهم المشروع بهذا الترتيب:

- `mobile/app`
  أين يرى المستخدم الميزة
- `AppContext`
  كيف تتصرف الميزة داخل التطبيق
- `services/api.ts`
  كيف تتحدث الواجهة مع الخادم
- `routes/*.ts`
  ما هي قواعد العمل الحقيقية
- `schema/*.ts`
  ما هي الحقيقة المخزنة
- `openapi.yaml`
  ما هو العقد الرسمي المتوقع

إذا حفظت هذا التقسيم، ستعرف بسرعة أين تبدأ أي تعديل.

---

## 11. توصية عملية لأي مطور جديد يدخل المشروع

لا تبدأ بقراءة كل شيء عشوائيًا.

ابدأ بهذا التسلسل:

1. `artifacts/mobile/app/_layout.tsx`
2. `artifacts/mobile/context/AppContext.tsx`
3. `artifacts/mobile/services/api.ts`
4. `artifacts/api-server/src/routes/matches.ts`
5. `artifacts/api-server/src/routes/groups.ts`
6. `artifacts/api-server/src/routes/users.ts`
7. `lib/db/src/schema/*.ts`
8. `lib/api-spec/openapi.yaml`

ثم اختر مسارًا واحدًا فقط:

- `Auth`
- `Matches`
- `Groups`
- `Profile`
- `Notifications`
- `Venues/Admin`

---

## 12. خلاصة تنفيذية

هذا المشروع ناضج وظيفيًا أكثر مما يبدو من النظرة الأولى.

نقاط القوة:

- مجال منتجي واضح
- business logic حقيقي، ليس مجرد CRUD
- بنية monorepo جيدة
- وجود عقد API
- وجود طبقة ثقة وتمييز منتجي
- وجود إعدادات للإدارة والإشعارات والجدولة

نقاط الضعف الحالية:

- تضخم `AppContext`
- تباين بين التوثيق والتنفيذ
- contract-first غير مطبق بالكامل في الواجهة
- وجود أجزاء نصف مكتملة مثل `waitlist`

أفضل وصف حالي للمشروع:

> منصة مجتمع رياضي وتشغيل مباريات، مبنية حول الثقة والالتزام، مع واجهة Expo وخادم Express وقاعدة PostgreSQL، وبنية تشارك بعض خصائص الأنظمة الحديثة لكنها لا تزال في مرحلة دمج وتوحيد هندسي.


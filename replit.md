# العب (Al'ab) — Saudi Sports Community App

A fully-featured Arabic RTL mobile sports community app built with Expo (React Native).

## Stack
- **Mobile**: Expo 54 + expo-router 6 + React Native
- **Font**: Cairo (Arabic) via @expo-google-fonts/cairo
- **State**: React Context + AsyncStorage (no backend)
- **Icons**: @expo/vector-icons (Ionicons)
- **Charts**: react-native-svg (Radar chart in profile)
- **API**: artifacts/api-server (Express + PostgreSQL + Drizzle ORM)
- **Auth**: OTP via DB + JWT tokens (jsonwebtoken)
- **DB**: PostgreSQL (Replit built-in) — tables: users, otp_codes, matches, match_players, groups, group_members, group_messages, ratings, notifications, push_tokens, invite_links
- **API Service**: artifacts/mobile/services/api.ts — handles base URL resolution for web and native

## Design — Liquid Glass 2026 (Warm Arena / Digital Majlis)
- **Design System**: Liquid Glass — inspired by iOS 26 / Glassmorphism 2.0 / Material You
- **Glass Theme**: `constants/glassTheme.ts` — full token system with glass opacity levels, blur intensities (light/medium/heavy/ultraHeavy), border gradients, liquid shadows, spring animation configs, and per-sport glass themes
- **Glass Components**: `components/glass/` barrel-exported via `index.ts`:
  - `GlassCard` — BlurView-based card with variants: light/medium/dark/sport, specular highlight
  - `GlassButton` — Sport gradient + glass overlay with spring press animation + ripple effect
  - `GlassTabBar` — Floating tab bar (16px above bottom) with glass blur background, replaces default tab bar
  - `GlassHeader` — Floating transparent header with blur, scroll-based title fade
  - `GlassScreenHeader` — Glass blur wrapper for screen header sections (search, filters, tabs)
  - `GlassInput` — Glass input field with animated floating label, sport-colored glow on focus
  - `GlassBackground` — Dynamic radial gradient background wrapper with per-sport gradient colors
  - `GlassRipple` — Ripple animation overlay (useGlassRipple hook + GlassRippleOverlay component)
  - `LiquidProgressBar` — Liquid-fill progress bar with shimmer animation
  - `GlassBadge` — Badge/label with variants: default/sport/success/warning/error
  - `SportGlassChip` — Sport filter chip with spring press, glow when selected
- **Glass Integration**: GlassBackground wraps root layout (`app/_layout.tsx`), all screens use transparent backgrounds, GlassScreenHeader applied to tab screen headers (my-matches, groups, explore)
- **Palette**: BG `#FBFBE2` (warm beige), surface hierarchy: `surfaceContainerLow` (#F5F5DC), `surfaceContainerHigh` (#E0DDCA), `surfaceContainerHighest` (#D6D3C0)
- **Sport identity**: Each sport has glass config in `sportTheme.ts` (glassColor, blurIntensity, borderGlow, backgroundGradient) + visual theme in `glassTheme.ts`
  - Football: green glass, gradient #2E7D32→#66BB6A
  - Padel: blue glass, gradient #0288D1→#4FC3F7
  - Tennis: orange glass, gradient #EF6C00→#FFB74D
  - Basketball: deep orange glass, gradient #E65100→#FF8A65
- **Shadow system**: `constants/neu.ts` (legacy) + `constants/glassTheme.ts` (new liquid shadows: soft/medium/heavy/glow)
- **No-line rule**: No `borderBottomWidth` dividers — separation via padding/gap and tonal background shifts
- **Typography**: Editorial style — larger headlines (28-32px) with generous `lineHeight`, Cairo 400/600/700/900
- **Buttons**: `GlassButton` uses sport gradients + glass overlay; legacy `SportGradientButton` still available
- **Tab bar**: Floating GlassTabBar with ultra-heavy blur, specular highlights, spring animations
- **Welcome screen**: Organic asymmetric sport cards with varying rotation + marginTop offsets
- **RTL**: I18nManager.forceRTL(true) — fully Arabic RTL layout
- **Interactive states**: Spring physics (snappy/gentle/bouncy/liquid configs) for press animations

## App Screens (19 screens)
### Onboarding
- `app/index.tsx` — Welcome (sport cards, app logo)
- `app/phone.tsx` — Saudi phone input (+966) with regex validation (05XXXXXXXX format, E.164 formatting)
- `app/otp.tsx` — 4-digit OTP with 60s countdown timer, handles new vs returning users (isNewUser flag)
- `app/profile-setup.tsx` — Nickname + sport/skill selection (first-time only)
- `app/position-selector.tsx` — Position per sport (step-by-step)

### Main Tabs (RTL order: الرئيسية | استكشاف | مبارياتي | المجموعات | حسابي)
- `app/(tabs)/index.tsx` — Home: split into "مبارياتي القادمة" (my matches) and "مباريات مقترحة" (suggested) sections, sport filters, search, sort, join/leave, FAB, encouraging empty state with create/explore CTAs
- `app/(tabs)/explore.tsx` — Match discovery with sport filters, date filters (today/tomorrow/thisWeek), "open only" toggle, visibility filters, pull-to-refresh, match cards with organizer name and full badge
- `app/(tabs)/my-matches.tsx` — My matches: upcoming/past with Gatta stats
- `app/(tabs)/groups.tsx` — Groups: join/leave, search, discover
- `app/(tabs)/profile.tsx` — Profile: avatar image support, SVG radar chart, reliability badge, rating badges

### Stack Screens
- `app/create-match.tsx` — Create match: sport, date picker, time picker, Gatta cost
- `app/match-details.tsx` — Match details: player list with **Gatta Ledger** (organizer toggles attendance & payment per player)
- `app/post-match-rating.tsx` — Rate players: الفنان (Artist) / الصخرة (Rock) / البرق (Bolt)
- `app/group-detail.tsx` — Group detail: 3 tabs (الأعضاء/members with reliability+admin badge, المباريات/matches with join, دردشة/chat with real-time polling every 5s)
- `app/notifications.tsx` — Notifications: type-colored, mark as read
- `app/settings.tsx` — Settings: notification toggles, edit profile modal (name, avatar from gallery via expo-image-picker, sports, skill level), account options
- `app/create-group.tsx` — Create group: name, sport, description, privacy

## Core Engines

### Reliability Engine (محرك الموثوقية)
Score 0-100% displayed on every player card and badge:
- **جديد** (grey): < 3 matches played
- **ضعيف** (red): 0-49%
- **متوسط** (orange): 50-69%
- **جيد** (green): 70-89%
- **ممتاز** (dark green): 90-100%

### Gatta Financial Ledger (دفتر الغطة)
Available in match-details for organizers:
- Toggle each player's **attendance** (حضر/غاب/معلق)
- Toggle each player's **payment** (دفع/لم يدفع)
- Running total: expected vs. collected

## Key Files
- `context/AppContext.tsx` — All state, seed data (5 matches, 3 groups, 7 players), CRUD operations; `updateAttendance`/`updatePayment` sync to API after local state update
- `constants/colors.ts` — Full Warm Arena color palette
- `app/_layout.tsx` — Cairo font loading, RTL setup, Stack screens
- `app/(tabs)/_layout.tsx` — Tab bar (NativeTabs on iOS 26, ClassicTabs otherwise)

## Running
The app runs via the `artifacts/mobile: expo` workflow on the configured PORT.

---

## خارطة الطريق (Project Roadmap)

> المرجع الكامل: `.local/roadmap.md`

### المرحلة الأولى: الأساس المتين 🔨 — **قيد التنفيذ**
الهدف: كل الميزات الموجودة تعمل بشكل صحيح بدون أخطاء.
- إصلاح هوية المستخدم (ربط العمليات بالمستخدم الفعلي لا IDs ثابتة)
- إصلاح منطق الانضمام للمباريات (تحقق من التعارض الزمني)
- إصلاح خصوصية المجموعات (الخاصة لا تظهر في الاستكشاف)
- نظام دعوة الأعضاء للمجموعات والمباريات
- إضافة نوع "تمرين" (Training Sessions)
- ربط التقييم بعد المباراة بنقاط الموثوقية والشارات فعلياً
- إصلاح الإشعارات (التنقل عند الضغط + أحداث تلقائية)
- إصلاح فلترة المجموعات حسب الرياضة

**معيار الإنجاز:** خالد + سارة + عمر يكملون رحلاتهم كاملة بدون أخطاء.

### المرحلة الثانية: الخلفية الحقيقية 🔌 — **مكتملة**
الهدف: ربط التطبيق بخادم حقيقي — بيانات مشتركة بين المستخدمين.
- ✅ إصلاح تشغيل الخادم (يقرأ PORT من env، مع fallback)
- ✅ `GET /api/healthz` → `{ status: "ok", version: "1.0.0" }`
- ✅ قاعدة بيانات PostgreSQL مع Drizzle ORM (users, otp_codes, matches, match_players, groups, group_members, ratings)
- ✅ OTP حقيقي (4 أرقام عشوائية، صالح 10 دقائق، محفوظ في DB)
- ✅ JWT token حقيقي عند التحقق
- ✅ `GET /api/matches` + `POST /api/matches` → DB
- ✅ `POST /api/matches/:id/join` + `leave` مع التحقق من التعارضات
- ✅ `PUT /api/matches/:id/attendance` + `payment` (للمنظم فقط)
- ✅ `POST /api/matches/:id/rate` للتقييم بعد المباراة
- ✅ `GET /api/groups` + `POST /api/groups` → DB
- ✅ `POST /api/groups/:id/join` + `leave`
- ✅ `GET /api/users/:id` مع حساب reliability score
- ✅ JWT middleware لحماية جميع endpoints المحمية

**معيار الإنجاز:** مستخدمان على جهازين مختلفين يرون نفس البيانات.

### المرحلة الثالثة: الميزات التنافسية ⚽ — **مخطط لها**
الهدف: الميزات التي تجعل "العب" فريداً.
- نظام الموثوقية المتقدم (حسابات تلقائية)
- دفتر الغطة الكامل
- بحث ذكي عن ملاعب ولاعبين

**معيار الإنجاز:** اللاعب يرى تاريخه وموثوقيته ومقارنته بأصدقائه.

### المرحلة الرابعة: التجربة المتكاملة 🚀 — **مخطط لها**
الهدف: التطبيق جاهز للإطلاق الفعلي في المتاجر.
- Push Notifications
- WebSocket للوقت الفعلي
- اختبارات E2E شاملة
- Deployment

**معيار الإنجاز:** التطبيق منشور في المتاجر ويعمل بدون أخطاء.

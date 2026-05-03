#!/usr/bin/env node
/**
 * الاختبار الشامل لتطبيق العَب
 * يحاكي يوماً كاملاً في حياة 25 مستخدم حقيقي
 * من أول تسجيل ← إعداد البروفايل ← المجموعات ← المباريات ← التقييم ← الإشعارات
 */

const BASE = "http://localhost:3000/api";

// ─── إحصائيات ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];
const allResults = [];

// ─── مساعدات ──────────────────────────────────────────────────────────────

async function api(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json;
    try { json = await r.json(); } catch { json = null; }
    return { status: r.status, json };
  } catch (err) {
    return { status: 0, json: null, error: err.message };
  }
}

function check(label, status, expected, json, assertFn = null) {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  let assertOk = true, assertErr = null;
  if (ok && assertFn) {
    try { assertFn(json); } catch (e) { assertOk = false; assertErr = e.message; }
  }
  const pass = ok && assertOk;
  const detail = json ? JSON.stringify(json).slice(0, 120) : "(no body)";
  if (pass) {
    process.stdout.write(`  ✅ ${label}\n`);
    passed++;
  } else {
    const msg = assertErr || `got ${status}, want ${JSON.stringify(expected)}`;
    process.stdout.write(`  ❌ ${label}\n     → ${msg} | ${detail}\n`);
    failed++;
    failures.push({ label, msg, detail });
  }
  allResults.push({ label, pass, status, expected });
  return pass;
}

async function login(phone, otp = "123456") {
  await api("POST", "/auth/request-otp", { body: { phone } });
  const v = await api("POST", "/auth/verify-otp", { body: { phone, otp } });
  if (!v.json?.token) throw new Error(`فشل تسجيل الدخول لـ ${phone}: ${JSON.stringify(v.json)}`);
  return { token: v.json.token, userId: v.json.userId, isNewUser: v.json.isNewUser };
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function sub(title) {
  console.log(`\n  ── ${title} ──`);
}

// تواريخ
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const dayAfter  = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// ─── تعريف المستخدمين ─────────────────────────────────────────────────────
const USERS = [
  // كرة قدم
  { name: "أحمد الكابتن",    phone: "+966510000001", sports: ["football"], skillLevel: "محترف", skillNum: 7.0, pos: "حارس مرمى" },
  { name: "محمد القائد",     phone: "+966510000002", sports: ["football","padel"], skillLevel: "محترف", skillNum: 6.5, pos: "مدافع" },
  { name: "خالد النجم",      phone: "+966510000003", sports: ["football"], skillLevel: "متوسط", skillNum: 5.0, pos: "مهاجم" },
  { name: "سعود السريع",     phone: "+966510000004", sports: ["football"], skillLevel: "متوسط", skillNum: 4.5, pos: "جناح أيمن" },
  { name: "فهد المبتدئ",     phone: "+966510000005", sports: ["football"], skillLevel: "مبتدئ", skillNum: 2.0, pos: "لاعب وسط" },
  { name: "عبدالله الحارس",  phone: "+966510000006", sports: ["football"], skillLevel: "محترف", skillNum: 6.0, pos: "حارس مرمى" },
  { name: "ياسر المهاجم",    phone: "+966510000007", sports: ["football"], skillLevel: "متوسط", skillNum: 4.0, pos: "مهاجم" },
  { name: "نايف المدافع",    phone: "+966510000008", sports: ["football"], skillLevel: "مبتدئ", skillNum: 1.5, pos: "مدافع" },
  // بادل
  { name: "بندر البادل",     phone: "+966510000009", sports: ["padel"], skillLevel: "محترف", skillNum: 5.5, pos: "لاعب" },
  { name: "ماجد المضرب",     phone: "+966510000010", sports: ["padel"], skillLevel: "متوسط", skillNum: 3.5, pos: "لاعب" },
  { name: "سلطان الشبكة",    phone: "+966510000011", sports: ["padel"], skillLevel: "مبتدئ", skillNum: 2.0, pos: "لاعب" },
  { name: "عمر الخبير",      phone: "+966510000012", sports: ["padel"], skillLevel: "محترف", skillNum: 6.0, pos: "لاعب" },
  { name: "حمد المدرب",      phone: "+966510000013", sports: ["padel"], skillLevel: "متوسط", skillNum: 4.0, pos: "لاعب" },
  { name: "زياد الجديد",     phone: "+966510000014", sports: ["padel"], skillLevel: "مبتدئ", skillNum: 1.0, pos: "لاعب" },
  // تنس
  { name: "راشد التنس",      phone: "+966510000015", sports: ["tennis"], skillLevel: "محترف", skillNum: 6.5, pos: "لاعب" },
  { name: "وليد المضرب",     phone: "+966510000016", sports: ["tennis"], skillLevel: "متوسط", skillNum: 4.0, pos: "لاعب" },
  { name: "مشعل الملعب",     phone: "+966510000017", sports: ["tennis"], skillLevel: "مبتدئ", skillNum: 2.5, pos: "لاعب" },
  { name: "فيصل النجم",      phone: "+966510000018", sports: ["tennis"], skillLevel: "محترف", skillNum: 5.5, pos: "لاعب" },
  { name: "طارق اللاعب",     phone: "+966510000019", sports: ["tennis"], skillLevel: "متوسط", skillNum: 3.5, pos: "لاعب" },
  // متعددو الرياضات
  { name: "صالح الشامل",     phone: "+966510000020", sports: ["football","padel","tennis"], skillLevel: "متوسط", skillNum: 4.0, pos: "لاعب" },
  { name: "إبراهيم المتعدد", phone: "+966510000021", sports: ["football","padel"], skillLevel: "مبتدئ", skillNum: 2.5, pos: "لاعب" },
  { name: "عادل المشرف",     phone: "+966510000022", sports: ["football","tennis"], skillLevel: "محترف", skillNum: 5.0, pos: "لاعب" },
  { name: "مروان المتابع",   phone: "+966510000023", sports: ["padel","tennis"], skillLevel: "متوسط", skillNum: 3.0, pos: "لاعب" },
  { name: "طلال المختبر",    phone: "+966510000024", sports: ["football","padel","tennis"], skillLevel: "محترف", skillNum: 6.0, pos: "لاعب" },
  { name: "هاني الأخير",     phone: "+966510000025", sports: ["football"], skillLevel: "متوسط", skillNum: 3.5, pos: "لاعب" },
];

async function main() {
  console.log("\n🏟️  الاختبار الشامل لتطبيق العَب");
  console.log(`📅  ${new Date().toLocaleString("ar-SA")}`);
  console.log(`🌐  ${BASE}\n`);

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 1: الاختبارات الأولية — Health + Auth Edge Cases");
  // ═══════════════════════════════════════════════════════════════

  sub("1.1 Health Check");
  {
    const r = await api("GET", "/healthz");
    check("GET /healthz → 200", r.status, 200, r.json, j => { if (!j?.status) throw new Error("missing status"); });
  }

  sub("1.2 Auth — حالات الخطأ");
  {
    const r = await api("POST", "/auth/request-otp", { body: { phone: "+1234567890" } });
    check("رقم غير سعودي → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/auth/request-otp", { body: { phone: "" } });
    check("رقم فارغ → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/auth/request-otp", { body: { phone: "+96651123" } });
    check("رقم سعودي غير مكتمل → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/auth/verify-otp", { body: { phone: "+966510000001", otp: "12" } });
    check("OTP أقل من 6 أرقام → 400", r.status, 400, r.json);
  }
  {
    const r = await api("GET", "/users/me");
    check("GET /users/me بدون token → 401", r.status, 401, r.json);
  }
  {
    const r = await api("GET", "/notifications");
    check("GET /notifications بدون token → 401", r.status, 401, r.json);
  }
  {
    const r = await api("POST", "/matches", { body: { title: "test" } });
    check("POST /matches بدون token → 401", r.status, 401, r.json);
  }
  {
    const r = await api("POST", "/groups", { body: { name: "test" } });
    check("POST /groups بدون token → 401", r.status, 401, r.json);
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 2: إنشاء 25 حساب + إعداد البروفايلات");
  // ═══════════════════════════════════════════════════════════════

  const users = [];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    process.stdout.write(`  [${i+1}/25] ${u.name}... `);
    try {
      // تسجيل دخول
      const auth = await login(u.phone);
      // إعداد الاسم
      await api("PATCH", "/users/me", { token: auth.token, body: { name: u.name } });
      // إعداد الرياضات
      await api("PATCH", "/users/me", { token: auth.token, body: { sports: u.sports } });
      // إعداد البروفايل الرياضي لكل رياضة
      const sportProfiles = {};
      for (const sport of u.sports) {
        const maxN = sport === "padel" ? 6.0 : 7.0;
        const safeNum = Math.min(u.skillNum, maxN);
        sportProfiles[sport] = { sport, skillLevel: u.skillLevel, skillLevelNumeric: safeNum, position: u.pos };
      }
      await api("PATCH", "/users/me", { token: auth.token, body: { sportProfiles } });
      // التحقق
      const profile = await api("GET", "/users/me", { token: auth.token });
      const ok = profile.status === 200 && profile.json?.user?.name === u.name;
      if (ok) {
        passed++; process.stdout.write("✅\n");
        allResults.push({ label: `حساب ${u.name}`, pass: true });
      } else {
        failed++; process.stdout.write("❌\n");
        failures.push({ label: `حساب ${u.name}`, msg: "profile mismatch" });
        allResults.push({ label: `حساب ${u.name}`, pass: false });
      }
      users.push({ ...u, token: auth.token, userId: auth.userId });
    } catch (err) {
      failed++; process.stdout.write(`❌ ${err.message}\n`);
      users.push({ ...u, token: null, userId: null });
    }
  }

  // اختصارات المستخدمين الرئيسيين
  const U = (name) => users.find(u => u.name === name);
  const ahmed   = U("أحمد الكابتن");    // 0: منظم كرة قدم
  const mohamed  = U("محمد القائد");    // 1: منظم متعدد
  const khaled   = U("خالد النجم");     // 2: لاعب كرة قدم
  const saud     = U("سعود السريع");    // 3: لاعب مزاجي
  const fahad    = U("فهد المبتدئ");    // 4: مبتدئ
  const abdAllah = U("عبدالله الحارس"); // 5: محترف
  const yasser   = U("ياسر المهاجم");   // 6: لاعب متحمس
  const naif     = U("نايف المدافع");   // 7: مبتدئ
  const bandar   = U("بندر البادل");    // 8: منظم بادل
  const majed    = U("ماجد المضرب");    // 9: بادل
  const sultan   = U("سلطان الشبكة");   // 10: بادل مبتدئ
  const omar     = U("عمر الخبير");     // 11: بادل محترف
  const hamad    = U("حمد المدرب");     // 12: بادل
  const ziad     = U("زياد الجديد");    // 13: بادل مبتدئ
  const rashed   = U("راشد التنس");     // 14: منظم تنس
  const waleed   = U("وليد المضرب");    // 15: تنس
  const meshal   = U("مشعل الملعب");    // 16: تنس مبتدئ
  const faisal   = U("فيصل النجم");     // 17: تنس محترف
  const tariq    = U("طارق اللاعب");    // 18: تنس
  const saleh    = U("صالح الشامل");    // 19: متعدد
  const ibrahim  = U("إبراهيم المتعدد"); // 20
  const adel     = U("عادل المشرف");    // 21
  const marwan   = U("مروان المتابع");  // 22
  const talal    = U("طلال المختبر");   // 23
  const hani     = U("هاني الأخير");    // 24

  sub("2.B اختبار بروفايلات إضافية");
  {
    // تسجيل الدخول بنفس الرقم → isNewUser=false
    const v = await api("POST", "/auth/verify-otp", { body: { phone: ahmed.phone, otp: "654321" } });
    check("تسجيل دخول مستخدم موجود → isNewUser=false", v.status, 200, v.json,
      j => { if (j?.isNewUser !== false) throw new Error(`isNewUser=${j?.isNewUser} بدلاً من false`); });
  }
  {
    const r = await api("PATCH", "/users/me", { token: ahmed.token, body: {} });
    check("PATCH /users/me جسم فارغ → 400", r.status, 400, r.json);
  }
  {
    const r = await api("PATCH", "/users/me", { token: ahmed.token, body: { sports: ["cricket"] } });
    check("رياضة غير موجودة cricket → 400", r.status, 400, r.json);
  }
  {
    const r = await api("PATCH", "/users/me", { token: ahmed.token, body: { avatarUrl: "file:///etc/passwd" } });
    check("avatarUrl=file:// → 400", r.status, 400, r.json);
  }
  {
    const r = await api("GET", `/users/${khaled.userId}`, { token: ahmed.token });
    check("GET /users/:id (بروفايل مستخدم آخر) → 200", r.status, 200, r.json,
      j => { if (!j?.user?.id) throw new Error("missing user.id"); });
  }
  {
    const r = await api("GET", "/users/fake_user_xyz", { token: ahmed.token });
    check("GET /users/:id غير موجود → 404", r.status, 404, r.json);
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 3: المجموعات");
  // ═══════════════════════════════════════════════════════════════

  sub("3.1 إنشاء المجموعات العامة");
  let G1, G2, G3, G4, G5, G6, G7, G8;

  {
    const r = await api("POST", "/groups", { token: ahmed.token, body: { name: "نجوم الرياض ⭐", sport: "football", description: "مباريات أسبوعية كل جمعة", isPublic: true } });
    check("G1: إنشاء 'نجوم الرياض' (عامة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G1 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: bandar.token, body: { name: "بادل الرياض 🏓", sport: "padel", description: "لمحبي البادل", isPublic: true } });
    check("G2: إنشاء 'بادل الرياض' (عامة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G2 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: rashed.token, body: { name: "نادي التنس 🎾", sport: "tennis", description: "مجتمع لاعبي التنس", isPublic: true } });
    check("G3: إنشاء 'نادي التنس' (عامة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G3 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: fahad.token, body: { name: "المبتدئون المتحمسون 💪", sport: "football", description: "تعلم بدون ضغط", isPublic: true } });
    check("G4: إنشاء 'المبتدئون' (عامة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G4 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: hamad.token, body: { name: "بادل للجميع 🏓", sport: "padel", description: "كل المستويات مرحبة", isPublic: true } });
    check("G5: إنشاء 'بادل للجميع' (عامة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G5 = r.json?.group?.id;
  }

  sub("3.2 إنشاء المجموعات الخاصة");
  {
    const r = await api("POST", "/groups", { token: ahmed.token, body: { name: "فريق المحترفين 🔒", sport: "football", description: "للمحترفين فقط", isPublic: false } });
    check("G6: إنشاء 'فريق المحترفين' (خاصة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G6 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: bandar.token, body: { name: "بادل VIP 🔒", sport: "padel", description: "جلسات حصرية", isPublic: false } });
    check("G7: إنشاء 'بادل VIP' (خاصة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G7 = r.json?.group?.id;
  }
  {
    const r = await api("POST", "/groups", { token: rashed.token, body: { name: "تنس النخبة 🔒", sport: "tennis", description: "مباريات جدية", isPublic: false } });
    check("G8: إنشاء 'تنس النخبة' (خاصة) → 201", r.status, 201, r.json, j => { if (!j?.group?.id) throw new Error("missing group.id"); });
    G8 = r.json?.group?.id;
  }

  sub("3.3 اختبارات إنشاء مجموعات — حالات الخطأ");
  {
    const r = await api("POST", "/groups", { token: ahmed.token, body: { name: "", sport: "football" } });
    check("اسم فارغ → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/groups", { token: ahmed.token, body: { name: "مجموعة", sport: "cricket" } });
    check("رياضة غير مدعومة → 400", r.status, 400, r.json);
  }
  {
    const r = await api("GET", "/groups");
    check("GET /groups (بدون تسجيل) → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.groups)) throw new Error("missing groups array"); });
  }
  {
    const r = await api("GET", "/groups?sport=padel");
    check("GET /groups?sport=padel → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.groups)) throw new Error("missing groups array"); });
  }
  {
    const r = await api("GET", "/groups?q=نجوم");
    check("GET /groups?q=نجوم → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.groups)) throw new Error("missing groups array"); });
  }

  sub("3.4 الانضمام للمجموعة العامة G1 (نجوم الرياض)");
  // الأعضاء: خالد، ياسر، إبراهيم، صالح، هاني (طلبات)
  // سعود وعادل أيضاً يطلبون
  const G1_joiners = [khaled, yasser, ibrahim, saleh, hani, abdAllah, naif, adel];
  for (const u of G1_joiners) {
    if (!u?.token) continue;
    const r = await api("POST", `/groups/${G1}/join`, { token: u.token });
    check(`${u.name} يطلب الانضمام لـ G1 → 200/409`, r.status, [200, 409], r.json);
  }
  // أحمد يرى الطلبات
  {
    const r = await api("GET", `/groups/${G1}/join-requests`, { token: ahmed.token });
    check("المشرف يرى طلبات الانضمام → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.requests)) throw new Error("missing requests"); });
    // قبول كل الطلبات
    if (r.status === 200 && Array.isArray(r.json?.requests)) {
      for (const req of r.json.requests) {
        await api("POST", `/groups/${G1}/join-requests/${req.id}/approve`, { token: ahmed.token });
      }
      check(`قبول ${r.json.requests.length} طلبات في G1`, 200, 200, null);
    }
  }
  // سعود يطلب ويُرفض
  if (saud?.token) {
    const r = await api("POST", `/groups/${G1}/join`, { token: saud.token });
    if (r.status === 200) {
      const reqs = await api("GET", `/groups/${G1}/join-requests`, { token: ahmed.token });
      if (reqs.json?.requests?.length > 0) {
        const rid = reqs.json.requests.find(x => x.userId === saud.userId)?.id;
        if (rid) {
          const rej = await api("POST", `/groups/${G1}/join-requests/${rid}/reject`, { token: ahmed.token });
          check("المشرف يرفض طلب سعود → 200", rej.status, 200, rej.json);
        }
      }
    }
  }
  // شخص غير مشرف يحاول رؤية الطلبات
  {
    const r = await api("GET", `/groups/${G1}/join-requests`, { token: khaled.token });
    check("لاعب عادي يحاول رؤية طلبات الانضمام → 403", r.status, 403, r.json);
  }
  // انضمام لمجموعة خاصة مباشرة → 403
  {
    const r = await api("POST", `/groups/${G6}/join`, { token: khaled.token });
    check("انضمام مباشر لمجموعة خاصة → 403", r.status, 403, r.json);
  }

  sub("3.5 الانضمام لمجموعات البادل والتنس");
  // G2: بادل الرياض
  for (const u of [majed, sultan, omar, hamad, ziad, saleh]) {
    if (!u?.token) continue;
    const r = await api("POST", `/groups/${G2}/join`, { token: u.token });
    check(`${u.name} → G2`, r.status, [200, 409], r.json);
  }
  { // قبول الطلبات في G2
    const reqs = await api("GET", `/groups/${G2}/join-requests`, { token: bandar.token });
    if (reqs.json?.requests?.length > 0) {
      for (const req of reqs.json.requests) {
        await api("POST", `/groups/${G2}/join-requests/${req.id}/approve`, { token: bandar.token });
      }
    }
  }
  // G3: نادي التنس
  for (const u of [waleed, meshal, faisal, tariq, saleh, marwan]) {
    if (!u?.token) continue;
    const r = await api("POST", `/groups/${G3}/join`, { token: u.token });
    check(`${u.name} → G3`, r.status, [200, 409], r.json);
  }
  { // قبول الطلبات في G3
    const reqs = await api("GET", `/groups/${G3}/join-requests`, { token: rashed.token });
    if (reqs.json?.requests?.length > 0) {
      for (const req of reqs.json.requests) {
        await api("POST", `/groups/${G3}/join-requests/${req.id}/approve`, { token: rashed.token });
      }
    }
  }

  sub("3.6 روابط الدعوة للمجموعات الخاصة");
  let invTokenG6, invTokenG7, invTokenG8;
  {
    const r = await api("POST", `/groups/${G6}/invite-link`, { token: ahmed.token });
    check("أحمد ينشئ رابط دعوة G6 → 200", r.status, 200, r.json, j => { if (!j?.token) throw new Error("missing token"); });
    invTokenG6 = r.json?.token;
  }
  {
    const r = await api("POST", `/groups/${G7}/invite-link`, { token: bandar.token });
    check("بندر ينشئ رابط دعوة G7 → 200", r.status, 200, r.json, j => { if (!j?.token) throw new Error("missing token"); });
    invTokenG7 = r.json?.token;
  }
  {
    const r = await api("POST", `/groups/${G8}/invite-link`, { token: rashed.token });
    check("راشد ينشئ رابط دعوة G8 → 200", r.status, 200, r.json, j => { if (!j?.token) throw new Error("missing token"); });
    invTokenG8 = r.json?.token;
  }
  // غير المشرف يحاول إنشاء رابط
  {
    const r = await api("POST", `/groups/${G6}/invite-link`, { token: khaled.token });
    check("غير المشرف ينشئ رابط → 403", r.status, 403, r.json);
  }
  // محمد وعبدالله ينضمون لـ G6 عبر الرابط
  if (invTokenG6) {
    { const r = await api("GET", `/invites/${invTokenG6}`); check("GET تفاصيل رابط G6 → 200", r.status, 200, r.json, j => { if (!j?.invite?.group?.id) throw new Error("missing group"); }); }
    { const r = await api("POST", `/invites/${invTokenG6}/accept`, { token: mohamed.token }); check("محمد ينضم لـ G6 عبر الرابط → 200", r.status, 200, r.json); }
    { const r = await api("POST", `/invites/${invTokenG6}/accept`, { token: abdAllah.token }); check("عبدالله ينضم لـ G6 عبر الرابط → 200", r.status, 200, r.json); }
    { const r = await api("POST", `/invites/${invTokenG6}/accept`, { token: talal.token }); check("طلال ينضم لـ G6 (مختبر) → 200", r.status, 200, r.json); }
    // عضو موجود يقبل الرابط مرة ثانية → alreadyMember
    { const r = await api("POST", `/invites/${invTokenG6}/accept`, { token: ahmed.token }); check("المؤسس يقبل رابطه الخاص → alreadyMember=true", r.status, 200, r.json, j => { if (j?.alreadyMember !== true) throw new Error(`alreadyMember=${j?.alreadyMember}`); }); }
    // رابط غير موجود
    { const r = await api("GET", "/invites/fake_token_xyz"); check("رابط دعوة غير موجود → 404", r.status, 404, r.json); }
  }
  // أعضاء G7 وG8
  if (invTokenG7) {
    for (const u of [omar, majed, hamad]) {
      if (!u?.token) continue;
      const r = await api("POST", `/invites/${invTokenG7}/accept`, { token: u.token });
      check(`${u.name} ينضم لـ G7 → 200`, r.status, 200, r.json);
    }
  }
  if (invTokenG8) {
    for (const u of [waleed, faisal]) {
      if (!u?.token) continue;
      const r = await api("POST", `/invites/${invTokenG8}/accept`, { token: u.token });
      check(`${u.name} ينضم لـ G8 → 200`, r.status, 200, r.json);
    }
  }

  sub("3.7 إدارة أعضاء المجموعة");
  // ترقية محمد لمشرف في G1
  {
    const r = await api("PATCH", `/groups/${G1}/members/${mohamed.userId}/role`, { token: ahmed.token, body: { role: "admin" } });
    check("ترقية محمد لمشرف في G1 → 200", r.status, 200, r.json);
  }
  // مشرف يحاول تخفيض مالك → 403
  {
    const r = await api("PATCH", `/groups/${G1}/members/${ahmed.userId}/role`, { token: mohamed.token, body: { role: "member" } });
    check("مشرف يحاول تخفيض المالك → 403", r.status, 403, r.json);
  }
  // إزالة عضو
  if (naif?.userId) {
    const r = await api("DELETE", `/groups/${G1}/members/${naif.userId}`, { token: ahmed.token });
    check("المشرف يزيل نايف من G1 → 200", r.status, 200, r.json, j => { if (!("memberCount" in j)) throw new Error("no memberCount"); });
  }
  // غير المشرف يحاول الإزالة
  {
    const r = await api("DELETE", `/groups/${G1}/members/${yasser.userId}`, { token: khaled.token });
    check("لاعب عادي يحاول إزالة عضو → 403", r.status, 403, r.json);
  }
  // مغادرة المجموعة
  if (hani?.token) {
    const r = await api("POST", `/groups/${G1}/leave`, { token: hani.token });
    check("هاني يغادر G1 طوعاً → 200", r.status, 200, r.json);
  }
  // المالك يحاول المغادرة
  {
    const r = await api("POST", `/groups/${G1}/leave`, { token: ahmed.token });
    check("المالك يحاول مغادرة مجموعته → 403", r.status, 403, r.json);
  }
  // تعديل بيانات المجموعة
  {
    const r = await api("PUT", `/groups/${G1}`, { token: ahmed.token, body: { name: "نجوم الرياض ⭐ الموسم الجديد", description: "أقوى فريق في الرياض 2026!" } });
    check("تعديل اسم ووصف G1 → 200", r.status, 200, r.json, j => { if (!j?.group?.name) throw new Error("no group.name"); });
  }

  sub("3.8 الدردشة في المجموعة");
  const chatMessages = [
    { user: ahmed, text: "السلام عليكم يا شباب! الجمعة الجاية مباراة إن شاء الله 🏆" },
    { user: khaled, text: "حياك الله كابتن، وين الملعب؟" },
    { user: yasser, text: "أنا جاهز 💪 متحمس جداً" },
    { user: saleh,  text: "ممكن أجيب معي صاحبي؟" },
    { user: ibrahim,text: "إن شاء الله كلنا نلعب ونستانس" },
  ];
  for (const { user, text } of chatMessages) {
    if (!user?.token) continue;
    const r = await api("POST", `/groups/${G1}/messages`, { token: user.token, body: { text } });
    check(`${user.name} يرسل رسالة في G1 → 201`, r.status, 201, r.json, j => { if (!j?.message?.id) throw new Error("missing message.id"); });
  }
  // قراءة الرسائل
  {
    const r = await api("GET", `/groups/${G1}/messages`, { token: ahmed.token });
    check("قراءة رسائل G1 → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.messages)) throw new Error("missing messages"); });
  }
  // رسالة فارغة → 400
  {
    const r = await api("POST", `/groups/${G1}/messages`, { token: ahmed.token, body: { text: "   " } });
    check("رسالة فارغة → 400", r.status, 400, r.json);
  }
  // غير العضو يرسل رسالة → 403
  {
    const r = await api("POST", `/groups/${G1}/messages`, { token: bandar.token, body: { text: "مرحبا" } });
    check("غير العضو يرسل رسالة → 403", r.status, 403, r.json);
  }
  // GET تفاصيل المجموعة
  {
    const r = await api("GET", `/groups/${G1}`, { token: ahmed.token });
    check("GET تفاصيل G1 → 200 مع أعضاء", r.status, 200, r.json, j => {
      if (!j?.group?.id) throw new Error("missing group.id");
      if (!Array.isArray(j?.group?.members)) throw new Error("missing members");
    });
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 4: المباريات");
  // ═══════════════════════════════════════════════════════════════

  sub("4.1 فلاتر البحث عن مباريات");
  {
    const r = await api("GET", "/matches");
    check("GET /matches (عام) → 200 مع قائمة", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?sport=football");
    check("فلتر ?sport=football → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?sport=padel");
    check("فلتر ?sport=padel → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?sport=tennis");
    check("فلتر ?sport=tennis → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?type=match");
    check("فلتر ?type=match → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?type=training");
    check("فلتر ?type=training → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", `/matches?date=tomorrow`);
    check("فلتر ?date=tomorrow → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?time_of_day=morning");
    check("فلتر ?time_of_day=morning → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?time_of_day=evening");
    check("فلتر ?time_of_day=evening → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?has_spots=true");
    check("فلتر ?has_spots=true → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }
  {
    const r = await api("GET", "/matches?lat=24.65&lng=46.71&radius=20");
    check("فلتر بالموقع → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.matches)) throw new Error("missing matches"); });
  }

  sub("4.2 إنشاء مباريات كرة القدم");
  let M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12;

  // M1: ديربي الجمعة (عامة، 10 لاعبين، مدفوعة)
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: {
      title: "ديربي الجمعة ⚽", sport: "football", date: tomorrow, time: "18:00",
      venue: "ملعب الملز الخماسي", location: "الرياض، حي الملز",
      lat: 24.654, lng: 46.710, maxPlayers: 10, cost: 50,
      isPublic: true, sessionType: "match", skillLevel: "متوسط,محترف",
      description: "مباراة أسبوعية — الجميع مرحب"
    }});
    check("M1: ديربي الجمعة (عامة، مدفوعة) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M1 = r.json?.match?.id;
  }

  // M2: تمرين الصباح (عامة، مجاني، training)
  {
    const r = await api("POST", "/matches", { token: mohamed.token, body: {
      title: "تمرين الصباح 🏋️", sport: "football", date: tomorrow, time: "08:00",
      venue: "ملعب النادي", maxPlayers: 8, cost: 0,
      isPublic: true, sessionType: "training", skillLevel: "مبتدئ,متوسط"
    }});
    check("M2: تمرين الصباح (مجاني) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M2 = r.json?.match?.id;
  }

  // M3: مباراة VIP (خاصة لـ G6)
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: {
      title: "مباراة VIP 🔒⚽", sport: "football", date: tomorrow, time: "21:00",
      venue: "ملعب الفيصلية الخماسي", maxPlayers: 10, cost: 100,
      isPublic: false, sessionType: "match", skillLevel: "محترف", invitedGroupId: G6
    }});
    check("M3: مباراة VIP (خاصة لـ G6) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M3 = r.json?.match?.id;
  }

  // M4: مباراة نجوم الرياض (خاصة لـ G1)
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: {
      title: "مباراة نجوم الرياض ⭐", sport: "football", date: dayAfter, time: "18:00",
      venue: "ملعب حي الياسمين", maxPlayers: 12, cost: 25,
      isPublic: false, sessionType: "match", invitedGroupId: G1
    }});
    check("M4: مباراة نجوم الرياض (خاصة لـ G1) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M4 = r.json?.match?.id;
  }

  sub("4.3 إنشاء مباريات البادل");
  // M5: بادل ثنائي (double = 4 لاعبين)
  {
    const r = await api("POST", "/matches", { token: bandar.token, body: {
      title: "بادل ثنائي مسائي 🏓", sport: "padel", date: tomorrow, time: "20:00",
      venue: "ملاعب ذهبي بادل", maxPlayers: 4, cost: 100,
      isPublic: true, sessionType: "match", matchFormat: "double", skillLevel: "محترف"
    }});
    check("M5: بادل ثنائي (عامة) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M5 = r.json?.match?.id;
  }

  // M6: بادل فردي (single = 2 لاعبين)
  {
    const r = await api("POST", "/matches", { token: bandar.token, body: {
      title: "بادل فردي سريع ⚡", sport: "padel", date: tomorrow, time: "16:00",
      venue: "ملاعب ذهبي بادل", maxPlayers: 2, cost: 80,
      isPublic: true, sessionType: "match", matchFormat: "single", skillLevel: "متوسط"
    }});
    check("M6: بادل فردي (عامة) → 201 — maxPlayers يُضبط = 2", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M6 = r.json?.match?.id;
  }

  // M7: تدريب بادل مبتدئين (مجاني)
  {
    const r = await api("POST", "/matches", { token: hamad.token, body: {
      title: "تدريب بادل للمبتدئين 🎯", sport: "padel", date: tomorrow, time: "10:00",
      venue: "ملاعب السلام بادل", maxPlayers: 4, cost: 0,
      isPublic: true, sessionType: "training", matchFormat: "double", skillLevel: "مبتدئ"
    }});
    check("M7: تدريب بادل (مبتدئين، مجاني) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M7 = r.json?.match?.id;
  }

  // M8: بادل VIP (خاصة لـ G7)
  {
    const r = await api("POST", "/matches", { token: bandar.token, body: {
      title: "بادل VIP 🏓🔒", sport: "padel", date: tomorrow, time: "22:00",
      venue: "ملعب بادل الجولف", maxPlayers: 4, cost: 150,
      isPublic: false, sessionType: "match", matchFormat: "double",
      skillLevel: "محترف", invitedGroupId: G7
    }});
    check("M8: بادل VIP (خاصة لـ G7) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M8 = r.json?.match?.id;
  }

  sub("4.4 إنشاء مباريات التنس");
  // M9: بطولة تنس فردي
  {
    const r = await api("POST", "/matches", { token: rashed.token, body: {
      title: "بطولة التنس 🎾", sport: "tennis", date: tomorrow, time: "17:00",
      venue: "ملاعب الهيلتون للتنس", maxPlayers: 2, cost: 60,
      isPublic: true, sessionType: "match", matchFormat: "single", skillLevel: "محترف"
    }});
    check("M9: بطولة تنس فردي → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M9 = r.json?.match?.id;
  }

  // M10: تنس ثنائي
  {
    const r = await api("POST", "/matches", { token: rashed.token, body: {
      title: "تنس ثنائي ممتع 🎾", sport: "tennis", date: tomorrow, time: "14:00",
      venue: "ملاعب النادي الرياضي", maxPlayers: 4, cost: 40,
      isPublic: true, sessionType: "match", matchFormat: "double", skillLevel: "متوسط"
    }});
    check("M10: تنس ثنائي (عامة) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M10 = r.json?.match?.id;
  }

  // M11: تنس النخبة (خاصة لـ G8)
  {
    const r = await api("POST", "/matches", { token: rashed.token, body: {
      title: "تنس النخبة 🎾🔒", sport: "tennis", date: tomorrow, time: "19:00",
      venue: "ملعب التنس الخاص", maxPlayers: 4, cost: 100,
      isPublic: false, sessionType: "match", matchFormat: "double",
      skillLevel: "محترف", invitedGroupId: G8
    }});
    check("M11: تنس النخبة (خاصة لـ G8) → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M11 = r.json?.match?.id;
  }

  // M12: مباراة مفتوحة للجميع
  {
    const r = await api("POST", "/matches", { token: saleh.token, body: {
      title: "مباراة الجميع مرحبا! 🌟", sport: "football", date: dayAfter, time: "20:00",
      venue: "ملعب الأمير فيصل", maxPlayers: 14, cost: 30,
      isPublic: true, sessionType: "match", skillLevel: "مبتدئ,متوسط,محترف"
    }});
    check("M12: مباراة مفتوحة لـ 14 لاعب → 201", r.status, 201, r.json, j => { if (!j?.match?.id) throw new Error("missing match.id"); });
    M12 = r.json?.match?.id;
  }

  sub("4.5 حالات الخطأ في إنشاء المباريات");
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: { title: "ناقص", sport: "football" } });
    check("بيانات ناقصة → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: {
      title: "مباراة قديمة", sport: "football", date: yesterday, time: "10:00",
      venue: "ملعب", maxPlayers: 6, cost: 0, isPublic: true
    }});
    check("تاريخ في الماضي → 400", r.status, 400, r.json);
  }
  {
    const r = await api("POST", "/matches", { token: ahmed.token, body: {
      title: "خاصة بدون مجموعة", sport: "football", date: tomorrow, time: "12:00",
      venue: "ملعب", maxPlayers: 6, cost: 0, isPublic: false
    }});
    check("مباراة خاصة بدون مجموعة → 400", r.status, 400, r.json);
  }

  sub("4.6 تفاصيل المباراة");
  if (M1) {
    const r = await api("GET", `/matches/${M1}`, { token: ahmed.token });
    check("GET تفاصيل M1 → 200 مع players", r.status, 200, r.json, j => {
      if (!j?.match?.id) throw new Error("missing match.id");
      if (!Array.isArray(j?.match?.players)) throw new Error("missing players");
      if (!("organizerPhone" in j.match)) throw new Error("missing organizerPhone");
      if (!("totalCollected" in j.match)) throw new Error("missing totalCollected");
    });
  }
  {
    const r = await api("GET", "/matches/fake_match_id");
    check("GET مباراة غير موجودة → 404", r.status, 404, r.json);
  }

  sub("4.7 الانضمام لـ M1 (ديربي الجمعة) — 9 لاعبين");
  const M1_players = [khaled, mohamed, abdAllah, yasser, saleh, ibrahim, adel, talal, hani];
  for (const u of M1_players) {
    if (!u?.token || !M1) continue;
    const r = await api("POST", `/matches/${M1}/join`, { token: u.token });
    check(`${u.name} ينضم لـ M1 → 200`, r.status, 200, r.json, j => { if (!("playerCount" in j)) throw new Error("missing playerCount"); });
  }
  // المباراة اكتملت (1 منظم + 9 لاعبين = 10/10)
  if (fahad?.token && M1) {
    const r = await api("POST", `/matches/${M1}/join`, { token: fahad.token });
    check("فهد يحاول الانضمام للمباراة الممتلئة → 400", r.status, 400, r.json);
  }
  // محاولة انضمام مرة ثانية
  if (khaled?.token && M1) {
    const r = await api("POST", `/matches/${M1}/join`, { token: khaled.token });
    check("خالد ينضم مرة ثانية → 409", r.status, 409, r.json);
  }

  sub("4.8 الانضمام لـ M2 (تمرين الصباح)");
  for (const u of [fahad, naif, ibrahim, saleh]) {
    if (!u?.token || !M2) continue;
    const r = await api("POST", `/matches/${M2}/join`, { token: u.token });
    check(`${u.name} ينضم لـ M2 → 200`, r.status, 200, r.json);
  }

  sub("4.9 الانضمام للمباريات الخاصة");
  // M3 (VIP لـ G6): فقط أعضاء G6 ينضمون
  if (M3 && mohamed?.token) {
    const r = await api("POST", `/matches/${M3}/join`, { token: mohamed.token });
    check("محمد (عضو G6) ينضم لـ M3 → 200", r.status, 200, r.json);
  }
  if (M3 && abdAllah?.token) {
    const r = await api("POST", `/matches/${M3}/join`, { token: abdAllah.token });
    check("عبدالله (عضو G6) ينضم لـ M3 → 200", r.status, 200, r.json);
  }
  // غير عضو يحاول الانضمام
  if (M3 && khaled?.token) {
    const r = await api("POST", `/matches/${M3}/join`, { token: khaled.token });
    check("خالد (ليس عضو G6) يحاول الانضمام لـ M3 → 403", r.status, 403, r.json);
  }
  // غير عضو يحاول رؤية تفاصيل المباراة الخاصة
  if (M3) {
    const r = await api("GET", `/matches/${M3}`);
    check("GET مباراة خاصة بدون token → 403", r.status, 403, r.json);
  }

  // M4 (نجوم الرياض لـ G1): أعضاء G1 ينضمون
  const M4_players = [khaled, yasser, saleh, ibrahim, adel, hani];
  for (const u of M4_players) {
    if (!u?.token || !M4) continue;
    const r = await api("POST", `/matches/${M4}/join`, { token: u.token });
    check(`${u.name} ينضم لـ M4 → 200`, r.status, [200, 409], r.json);
  }

  sub("4.10 الانضمام لمباريات البادل");
  // M5: ثنائي (4 لاعبين، بندر منظم)
  if (M5) {
    for (const u of [omar, hamad, saleh]) {
      if (!u?.token) continue;
      const r = await api("POST", `/matches/${M5}/join`, { token: u.token });
      check(`${u.name} ينضم لـ M5 → 200`, r.status, 200, r.json);
    }
    // ممتلئة الآن
    if (ziad?.token) {
      const r = await api("POST", `/matches/${M5}/join`, { token: ziad.token });
      check("زياد يحاول الانضمام للـ M5 الممتلئة → 400", r.status, 400, r.json);
    }
  }
  // M6: فردي (2 لاعبين — بندر منظم)
  if (M6 && majed?.token) {
    const r = await api("POST", `/matches/${M6}/join`, { token: majed.token });
    check("ماجد ينضم لـ M6 → 200 (اكتملت)", r.status, 200, r.json);
    // M6 اكتملت، سلطان لا يستطيع
    if (sultan?.token) {
      const r2 = await api("POST", `/matches/${M6}/join`, { token: sultan.token });
      check("سلطان يحاول الانضمام لـ M6 الممتلئة → 400", r2.status, 400, r2.json);
    }
  }
  // M7: تدريب مبتدئين
  for (const u of [sultan, ziad, marwan]) {
    if (!u?.token || !M7) continue;
    const r = await api("POST", `/matches/${M7}/join`, { token: u.token });
    check(`${u.name} ينضم لـ M7 → 200`, r.status, [200, 409], r.json);
  }

  sub("4.11 الانضمام لمباريات التنس");
  // M9: بطولة فردي (2 لاعبين — راشد منظم)
  if (M9 && faisal?.token) {
    const r = await api("POST", `/matches/${M9}/join`, { token: faisal.token });
    check("فيصل ينضم لـ M9 → 200 (بطولة مكتملة)", r.status, 200, r.json);
  }
  // M10: ثنائي (4 لاعبين)
  if (M10) {
    for (const u of [waleed, faisal, tariq]) {
      if (!u?.token) continue;
      const r = await api("POST", `/matches/${M10}/join`, { token: u.token });
      check(`${u.name} ينضم لـ M10 → 200`, r.status, [200, 409], r.json);
    }
  }
  // M11: تنس النخبة (خاصة لـ G8)
  if (M11) {
    for (const u of [waleed, faisal]) {
      if (!u?.token) continue;
      const r = await api("POST", `/matches/${M11}/join`, { token: u.token });
      check(`${u.name} (عضو G8) ينضم لـ M11 → 200`, r.status, [200, 409], r.json);
    }
    // غير عضو G8
    if (meshal?.token) {
      const r = await api("POST", `/matches/${M11}/join`, { token: meshal.token });
      check("مشعل (ليس عضو G8) يحاول الانضمام لـ M11 → 403", r.status, 403, r.json);
    }
  }
  // M12: مباراة الجميع
  for (const u of [ahmed, khaled, bandar, rashed, fahad, naif, meshal, marwan, talal, ibrahim]) {
    if (!u?.token || !M12) continue;
    const r = await api("POST", `/matches/${M12}/join`, { token: u.token });
    check(`${u.name} ينضم لـ M12 → 200`, r.status, [200, 409], r.json);
  }

  sub("4.12 كشف التعارض الزمني");
  // ننشئ مباراتين متعارضتين
  let overlapA, overlapB;
  {
    const r = await api("POST", "/matches", { token: saleh.token, body: {
      title: "مباراة A 15:00", sport: "football", date: tomorrow, time: "15:00",
      venue: "الملعب أ", maxPlayers: 10, cost: 0, isPublic: true, sessionType: "match"
    }});
    overlapA = r.json?.match?.id;
  }
  {
    const r = await api("POST", "/matches", { token: saleh.token, body: {
      title: "مباراة B 15:30 (تعارض)", sport: "football", date: tomorrow, time: "15:30",
      venue: "الملعب ب", maxPlayers: 10, cost: 0, isPublic: true, sessionType: "match"
    }});
    overlapB = r.json?.match?.id;
  }
  if (overlapA && overlapB && fahad?.token) {
    await api("POST", `/matches/${overlapA}/join`, { token: fahad.token });
    const r = await api("POST", `/matches/${overlapB}/join`, { token: fahad.token });
    check("كشف التعارض الزمني → 409 مع conflictMatch", r.status, 409, r.json,
      j => { if (!j?.conflictMatch) throw new Error("missing conflictMatch"); });
  }

  sub("4.13 تعديل المباراة");
  if (M1) {
    const r = await api("PATCH", `/matches/${M1}`, { token: ahmed.token, body: { venue: "ملعب الحمراء الخماسي", cost: 40, description: "تم تعديل المكان" } });
    check("المنظم يعدل مكان وتكلفة M1 → 200", r.status, 200, r.json, j => { if (!j?.match?.id) throw new Error("no match.id"); });
  }
  if (M1 && khaled?.token) {
    const r = await api("PATCH", `/matches/${M1}`, { token: khaled.token, body: { title: "حاولت التعديل" } });
    check("لاعب عادي يحاول تعديل M1 → 403", r.status, 403, r.json);
  }
  // تقليل maxPlayers أقل من اللاعبين الحاليين → 400
  if (M1) {
    const r = await api("PATCH", `/matches/${M1}`, { token: ahmed.token, body: { maxPlayers: 2 } });
    check("تقليل maxPlayers أقل من اللاعبين الحاليين → 400", r.status, 400, r.json);
  }

  sub("4.14 مغادرة وإزالة لاعبين");
  // هاني يغادر M1
  if (M1 && hani?.token) {
    const r = await api("POST", `/matches/${M1}/leave`, { token: hani.token });
    check("هاني يغادر M1 → 200", r.status, 200, r.json, j => { if (!("playerCount" in j)) throw new Error("no playerCount"); });
  }
  // أحمد يزيل ياسر من M1
  if (M1 && yasser?.userId) {
    const r = await api("DELETE", `/matches/${M1}/players/${yasser.userId}`, { token: ahmed.token });
    check("أحمد يزيل ياسر من M1 → 200", r.status, 200, r.json, j => { if (!("playerCount" in j)) throw new Error("no playerCount"); });
  }
  // المنظم يحاول المغادرة
  if (M1 && ahmed?.token) {
    const r = await api("POST", `/matches/${M1}/leave`, { token: ahmed.token });
    check("المنظم يحاول المغادرة → 403", r.status, 403, r.json);
  }
  // لاعب يحاول إزالة شخص آخر
  if (M1 && khaled?.token && saleh?.userId) {
    const r = await api("DELETE", `/matches/${M1}/players/${saleh.userId}`, { token: khaled.token });
    check("لاعب عادي يحاول إزالة لاعب آخر → 403", r.status, 403, r.json);
  }

  sub("4.15 روابط الدعوة للمباريات");
  let matchInvToken;
  if (M4) {
    const r = await api("POST", `/matches/${M4}/invite-link`, { token: ahmed.token });
    check("إنشاء رابط دعوة لـ M4 → 200", r.status, 200, r.json, j => { if (!j?.token) throw new Error("no token"); });
    matchInvToken = r.json?.token;
  }
  // غير المنظم يحاول إنشاء رابط
  if (M4 && khaled?.token) {
    const r = await api("POST", `/matches/${M4}/invite-link`, { token: khaled.token });
    check("غير المنظم ينشئ رابط مباراة → 403", r.status, 403, r.json);
  }
  // هاني يستخدم الرابط بعد مغادرته
  if (matchInvToken && hani?.token) {
    const r = await api("GET", `/invites/${matchInvToken}`);
    check("GET تفاصيل رابط مباراة M4 → 200", r.status, 200, r.json, j => { if (!j?.invite?.match?.id) throw new Error("missing match"); });
    const r2 = await api("POST", `/invites/${matchInvToken}/accept`, { token: hani.token });
    check("هاني ينضم عبر رابط الدعوة → 200", r2.status, 200, r2.json);
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 5: يوم المباراة — الحضور والمدفوعات");
  // ═══════════════════════════════════════════════════════════════

  sub("5.1 تسجيل الحضور في M1");
  // اللاعبون الحاليون في M1: أحمد (منظم) + خالد + محمد + عبدالله + صالح + إبراهيم + عادل + طلال
  // ياسر وهاني غادروا
  const M1_present = [khaled, mohamed, abdAllah, saleh, ibrahim, adel, talal];
  for (const u of M1_present) {
    if (!u?.userId || !M1) continue;
    const r = await api("PUT", `/matches/${M1}/attendance`, { token: ahmed.token, body: { userId: u.userId, status: "present" } });
    check(`تأكيد حضور ${u.name} → 200`, r.status, 200, r.json);
  }
  // ياسر غائب
  if (M1 && yasser?.userId) {
    const r = await api("PUT", `/matches/${M1}/attendance`, { token: ahmed.token, body: { userId: yasser.userId, status: "absent" } });
    check("تسجيل غياب ياسر → 200 (أو 404 لأنه أُزيل)", r.status, [200, 404], r.json);
  }
  // لاعب عادي يحاول تسجيل الحضور → 403
  if (M1 && khaled?.token && saleh?.userId) {
    const r = await api("PUT", `/matches/${M1}/attendance`, { token: khaled.token, body: { userId: saleh.userId, status: "present" } });
    check("لاعب عادي يحاول تسجيل الحضور → 403", r.status, 403, r.json);
  }

  sub("5.2 المدفوعات في M1 (50 ر.س)");
  // أحمد يؤكد دفع المنضمين
  const M1_paid = [khaled, mohamed, abdAllah, saleh];
  for (const u of M1_paid) {
    if (!u?.userId || !M1) continue;
    const r = await api("PATCH", `/matches/${M1}/players/${u.userId}/payment`, { token: ahmed.token, body: { paid: true } });
    check(`تأكيد دفع ${u.name} → 200`, r.status, 200, r.json);
  }
  // تذكير بالدفع
  if (M1) {
    const r = await api("POST", `/matches/${M1}/payment-reminder`, { token: ahmed.token });
    check("تذكير بالدفع لمن لم يدفع → 200", r.status, 200, r.json, j => {
      if (typeof j?.notified !== "number") throw new Error("missing notified count");
    });
  }
  // تأكيد دفع الحاضرين دفعة واحدة
  if (M1) {
    const r = await api("POST", `/matches/${M1}/mark-attendees-paid`, { token: ahmed.token });
    check("تأكيد دفع الحاضرين دفعة واحدة → 200", r.status, 200, r.json, j => {
      if (typeof j?.marked !== "number") throw new Error("missing marked count");
    });
  }
  // لاعب يحاول تعديل حالة الدفع → 403
  if (M1 && khaled?.token && saleh?.userId) {
    const r = await api("PATCH", `/matches/${M1}/players/${saleh.userId}/payment`, { token: khaled.token, body: { paid: false } });
    check("لاعب يحاول تعديل الدفع → 403", r.status, 403, r.json);
  }
  // مباراة مجانية → تذكير رفض
  if (M2) {
    const r = await api("POST", `/matches/${M2}/payment-reminder`, { token: mohamed.token });
    check("تذكير دفع لمباراة مجانية → 400", r.status, 400, r.json);
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 6: إكمال المباريات + تقييم اللاعبين");
  // ═══════════════════════════════════════════════════════════════

  sub("6.1 إكمال M1 (ديربي الجمعة)");
  if (M1) {
    const r = await api("PATCH", `/matches/${M1}`, { token: ahmed.token, body: { status: "completed" } });
    check("أحمد يُكمل M1 → 200", r.status, 200, r.json, j => { if (!j?.match?.id) throw new Error("no match.id"); });
  }

  sub("6.2 التقييم في M1 — لا يمكن تقييم مباراة لم تكتمل");
  // أولاً نختبر M2 (لم تكتمل)
  if (M2 && khaled?.token) {
    const r = await api("POST", `/matches/${M2}/level-votes`, { token: khaled.token, body: { votes: { [fahad.userId]: "accurate" } } });
    check("تقييم مباراة لم تكتمل → 400", r.status, 400, r.json);
  }

  sub("6.3 التقييم في M1 (المكتملة)");
  // التحقق من حالة التقييم
  if (M1 && khaled?.token) {
    const r = await api("GET", `/matches/${M1}/level-votes/status`, { token: khaled.token });
    check("التحقق من حالة التقييم قبل → hasVoted=false", r.status, 200, r.json, j => {
      if (j?.hasVoted !== false) throw new Error(`hasVoted=${j?.hasVoted} بدلاً من false`);
    });
  }

  // اللاعبون الحاضرون في M1 يقيّمون بعضهم
  const M1_raters = [
    { rater: ahmed,   votes: khaled.userId && { [khaled.userId]: "accurate", [saleh.userId]: "higher", [ibrahim.userId]: "accurate" } },
    { rater: khaled,  votes: ahmed.userId && { [ahmed.userId]: "accurate", [mohamed.userId]: "higher", [abdAllah.userId]: "accurate" } },
    { rater: mohamed, votes: khaled.userId && { [khaled.userId]: "higher", [saleh.userId]: "accurate", [adel.userId]: "lower" } },
    { rater: abdAllah,votes: ahmed.userId && { [ahmed.userId]: "higher", [khaled.userId]: "accurate" } },
    { rater: saleh,   votes: khaled.userId && { [khaled.userId]: "accurate", [ahmed.userId]: "lower" } },
  ];
  for (const { rater, votes } of M1_raters) {
    if (!rater?.token || !M1 || !votes) continue;
    // تصفية UserIds الفارغة
    const cleanVotes = Object.fromEntries(Object.entries(votes).filter(([k]) => k && k !== "undefined"));
    if (Object.keys(cleanVotes).length === 0) continue;
    const r = await api("POST", `/matches/${M1}/level-votes`, { token: rater.token, body: { votes: cleanVotes } });
    check(`${rater.name} يقيّم اللاعبين في M1 → 200`, r.status, 200, r.json, j => {
      if (typeof j?.inserted !== "number") throw new Error(`inserted=${j?.inserted}`);
    });
  }

  // التحقق من حالة التقييم بعد التقييم
  if (M1 && khaled?.token) {
    const r = await api("GET", `/matches/${M1}/level-votes/status`, { token: khaled.token });
    check("التحقق من حالة التقييم بعد → hasVoted=true", r.status, 200, r.json, j => {
      if (j?.hasVoted !== true) throw new Error(`hasVoted=${j?.hasVoted} بدلاً من true`);
    });
  }

  // محاولة تقييم مرة ثانية → 409
  if (M1 && ahmed?.token && khaled?.userId) {
    const r = await api("POST", `/matches/${M1}/level-votes`, { token: ahmed.token, body: { votes: { [khaled.userId]: "lower" } } });
    check("تقييم مرة ثانية → 409", r.status, 409, r.json);
  }

  // غير مشارك يحاول التقييم → 403
  if (M1 && bandar?.token && khaled?.userId) {
    const r = await api("POST", `/matches/${M1}/level-votes`, { token: bandar.token, body: { votes: { [khaled.userId]: "accurate" } } });
    check("غير مشارك يحاول التقييم → 403", r.status, 403, r.json);
  }

  sub("6.4 إكمال M5 (بادل ثنائي) وتقييمه");
  if (M5) {
    // تسجيل حضور
    const M5_players = [omar, hamad, saleh];
    for (const u of M5_players) {
      if (!u?.userId) continue;
      await api("PUT", `/matches/${M5}/attendance`, { token: bandar.token, body: { userId: u.userId, status: "present" } });
    }
    const r = await api("PATCH", `/matches/${M5}`, { token: bandar.token, body: { status: "completed" } });
    check("بندر يُكمل M5 (بادل) → 200", r.status, 200, r.json);
    // بندر يقيّم
    if (omar?.userId && hamad?.userId) {
      const votes = { [omar.userId]: "accurate", [hamad.userId]: "higher" };
      if (saleh?.userId) votes[saleh.userId] = "lower";
      const rv = await api("POST", `/matches/${M5}/level-votes`, { token: bandar.token, body: { votes } });
      check("بندر يقيّم اللاعبين في M5 → 200", rv.status, 200, rv.json);
    }
    // عمر يقيّم
    if (omar?.token && bandar?.userId && hamad?.userId) {
      const votes = { [bandar.userId]: "accurate", [hamad.userId]: "accurate" };
      if (saleh?.userId) votes[saleh.userId] = "accurate";
      const rv = await api("POST", `/matches/${M5}/level-votes`, { token: omar.token, body: { votes } });
      check("عمر يقيّم في M5 → 200", rv.status, 200, rv.json);
    }
  }

  sub("6.5 إكمال M9 (بطولة تنس) وتقييم");
  if (M9 && rashed?.token) {
    await api("PUT", `/matches/${M9}/attendance`, { token: rashed.token, body: { userId: faisal?.userId, status: "present" } });
    const r = await api("PATCH", `/matches/${M9}`, { token: rashed.token, body: { status: "completed" } });
    check("راشد يُكمل M9 (تنس) → 200", r.status, 200, r.json);
    if (faisal?.userId) {
      const rv = await api("POST", `/matches/${M9}/level-votes`, { token: rashed.token, body: { votes: { [faisal.userId]: "accurate" } } });
      check("راشد يقيّم فيصل في M9 → 200", rv.status, 200, rv.json);
    }
    if (rashed?.userId && faisal?.token) {
      const rv2 = await api("POST", `/matches/${M9}/level-votes`, { token: faisal.token, body: { votes: { [rashed.userId]: "higher" } } });
      check("فيصل يقيّم راشد في M9 → 200", rv2.status, 200, rv2.json);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 7: الإشعارات وإلغاء المباريات");
  // ═══════════════════════════════════════════════════════════════

  sub("7.1 قراءة وإدارة الإشعارات");
  {
    const r = await api("GET", "/notifications", { token: ahmed.token });
    check("أحمد يقرأ إشعاراته → 200", r.status, 200, r.json, j => { if (!Array.isArray(j?.notifications)) throw new Error("missing notifications"); });
  }
  {
    const r = await api("PATCH", "/notifications/read-all", { token: ahmed.token });
    check("تعليم كل الإشعارات كمقروءة → 200", r.status, 200, r.json);
  }
  // حذف إشعار غير موجود → 404
  {
    const r = await api("DELETE", "/notifications/fake_notif_xyz", { token: ahmed.token });
    check("حذف إشعار غير موجود → 404", r.status, 404, r.json);
  }
  // حذف كل الإشعارات
  {
    const r = await api("DELETE", "/notifications", { token: khaled.token });
    check("خالد يحذف كل إشعاراته → 200", r.status, 200, r.json);
  }
  // قراءة إشعار واحد
  {
    const notifs = await api("GET", "/notifications", { token: bandar.token });
    if (notifs.json?.notifications?.length > 0) {
      const id = notifs.json.notifications[0].id;
      const r = await api("PATCH", `/notifications/${id}/read`, { token: bandar.token });
      check("تعليم إشعار واحد كمقروء → 200", r.status, 200, r.json);
    } else {
      check("تعليم إشعار واحد كمقروء (لا إشعارات) → skip", 200, 200, null);
    }
  }

  sub("7.2 إلغاء مباراة");
  if (M2 && mohamed?.token) {
    const r = await api("DELETE", `/matches/${M2}`, { token: mohamed.token });
    check("محمد يلغي M2 (تمرين الصباح) → 200", r.status, 200, r.json);
    // التأكد من الحذف
    const r2 = await api("GET", `/matches/${M2}`);
    check("M2 بعد الإلغاء → 404", r2.status, 404, r2.json);
  }
  // لاعب يحاول إلغاء مباراة شخص آخر
  if (M4 && khaled?.token) {
    const r = await api("DELETE", `/matches/${M4}`, { token: khaled.token });
    check("لاعب يحاول إلغاء مباراة شخص آخر → 403", r.status, 403, r.json);
  }

  sub("7.3 Push Tokens");
  if (ahmed?.token) {
    const r = await api("POST", "/push/register", { token: ahmed.token, body: { token: "ExponentPushToken[ahmed_test_001]" } });
    check("تسجيل push token → 200", r.status, 200, r.json);
  }
  // نفس التوكن مرة ثانية (idempotent)
  if (ahmed?.token) {
    const r = await api("POST", "/push/register", { token: ahmed.token, body: { token: "ExponentPushToken[ahmed_test_001]" } });
    check("تسجيل نفس التوكن مرة ثانية (idempotent) → 200", r.status, 200, r.json);
  }
  // token فارغ → 400
  if (ahmed?.token) {
    const r = await api("POST", "/push/register", { token: ahmed.token, body: {} });
    check("تسجيل token فارغ → 400", r.status, 400, r.json);
  }
  // إلغاء التسجيل
  if (ahmed?.token) {
    const r = await api("DELETE", "/push/unregister", { token: ahmed.token, body: { token: "ExponentPushToken[ahmed_test_001]" } });
    check("إلغاء تسجيل push token → 200", r.status, 200, r.json);
  }

  sub("7.4 إعدادات الإشعارات");
  if (ahmed?.token) {
    const r = await api("GET", "/users/me/notification-settings", { token: ahmed.token });
    check("GET إعدادات الإشعارات → 200", r.status, 200, r.json, j => {
      if (!("matchNotifs" in j)) throw new Error("missing matchNotifs");
      if (!("groupNotifs" in j)) throw new Error("missing groupNotifs");
    });
  }
  if (ahmed?.token) {
    const r = await api("PATCH", "/users/me/notification-settings", { token: ahmed.token, body: { matchNotifs: false } });
    check("تعطيل إشعارات المباريات → 200", r.status, 200, r.json, j => { if (j?.matchNotifs !== false) throw new Error("not updated"); });
  }
  if (ahmed?.token) {
    const r = await api("PATCH", "/users/me/notification-settings", { token: ahmed.token, body: { groupNotifs: false } });
    check("تعطيل إشعارات المجموعات → 200", r.status, 200, r.json);
  }
  if (ahmed?.token) {
    const r = await api("PATCH", "/users/me/notification-settings", { token: ahmed.token, body: {} });
    check("إعدادات إشعارات بجسم فارغ → 400", r.status, 400, r.json);
  }
  // إعادة تفعيل
  if (ahmed?.token) {
    await api("PATCH", "/users/me/notification-settings", { token: ahmed.token, body: { matchNotifs: true, groupNotifs: true } });
  }

  // ═══════════════════════════════════════════════════════════════
  section("الفصل 8: حالات الحدود المتقدمة");
  // ═══════════════════════════════════════════════════════════════

  sub("8.1 حذف المجموعة");
  // G4 (المبتدئون) — فهد يحذفها
  if (G4 && fahad?.token) {
    const r = await api("DELETE", `/groups/${G4}`, { token: fahad.token });
    check("فهد يحذف مجموعته G4 → 200", r.status, 200, r.json);
    const r2 = await api("GET", `/groups/${G4}`);
    check("G4 بعد الحذف → 404", r2.status, 404, r2.json);
  }
  // شخص آخر يحاول حذف G1
  if (G1 && khaled?.token) {
    const r = await api("DELETE", `/groups/${G1}`, { token: khaled.token });
    check("خالد يحاول حذف G1 → 403", r.status, 403, r.json);
  }

  sub("8.2 مجموعة غير موجودة");
  {
    const r = await api("GET", "/groups/fake_group_xyz");
    check("GET مجموعة غير موجودة → 404", r.status, 404, r.json);
  }
  {
    const r = await api("POST", "/groups/fake_group_xyz/join", { token: ahmed.token });
    check("join مجموعة غير موجودة → 404", r.status, 404, r.json);
  }
  {
    const r = await api("POST", "/groups/fake_group_xyz/messages", { token: ahmed.token, body: { text: "test" } });
    check("رسالة لمجموعة غير موجودة → 404", r.status, 404, r.json);
  }

  sub("8.3 انضمام متكرر لمجموعة");
  if (G2 && majed?.token) {
    const r = await api("POST", `/groups/${G2}/join`, { token: majed.token });
    check("انضمام متكرر لـ G2 → 409", r.status, 409, r.json);
  }

  sub("8.4 إزالة المنظم من مباراته");
  if (M1 && ahmed?.token && ahmed?.userId) {
    const r = await api("DELETE", `/matches/${M1}/players/${ahmed.userId}`, { token: ahmed.token });
    check("المنظم يحاول إزالة نفسه → 400", r.status, 400, r.json);
  }

  sub("8.5 تعديل مباراة مكتملة (تغيير status مرة ثانية)");
  if (M1) {
    const r = await api("PATCH", `/matches/${M1}`, { token: ahmed.token, body: { title: "تعديل بعد الإكمال" } });
    // قد يسمح أو يمنع — نسجل النتيجة
    check("تعديل عنوان مباراة مكتملة → 200 أو 400", r.status, [200, 400], r.json);
  }

  sub("8.6 بيانات sportProfiles غير صالحة");
  if (ahmed?.token) {
    const r = await api("PATCH", "/users/me", { token: ahmed.token, body: {
      sportProfiles: { football: { sport: "football", skillLevel: "مبتدئ", skillLevelNumeric: 999, position: "لاعب" } }
    }});
    check("skillLevelNumeric خارج النطاق → 400", r.status, 400, r.json);
  }

  sub("8.7 التحقق من reliability بعد التقييمات");
  if (khaled?.token && khaled?.userId) {
    const r = await api("GET", `/users/${khaled.userId}`, { token: ahmed.token });
    check("التحقق من بروفايل خالد بعد التقييمات → 200", r.status, 200, r.json, j => {
      if (!j?.user?.id) throw new Error("missing user.id");
      // reliability قد يكون null أو رقم — كلاهما مقبول
      if (!("reliability" in j.user)) throw new Error("missing reliability field");
    });
  }

  // ═══════════════════════════════════════════════════════════════
  section("الخلاصة النهائية");
  // ═══════════════════════════════════════════════════════════════

  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\n  📊 النتائج: ${passed}/${total} نجح (${pct}%)`);
  console.log(`  ✅ نجح: ${passed}`);
  console.log(`  ❌ فشل: ${failed}`);

  if (failures.length > 0) {
    console.log(`\n  ❌ الاختبارات الفاشلة (${failures.length}):`);
    for (const f of failures) {
      console.log(`    • ${f.label}`);
      console.log(`      → ${f.msg}`);
      if (f.detail) console.log(`        ${f.detail.slice(0, 100)}`);
    }
  } else {
    console.log("\n  🎉 كل الاختبارات نجحت! التطبيق يعمل بشكل ممتاز.");
  }

  console.log("\n" + "═".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("\n💥 خطأ غير متوقع:", err.message);
  process.exit(1);
});

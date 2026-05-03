#!/usr/bin/env node
/**
 * Comprehensive API test script for العب backend
 * Uses ALLOW_DEV_OTP_BYPASS=true (OTP "1234") for auth
 *
 * Bugs found and fixed:
 *   [BUG FIXED] POST /auth/verify-otp (wrong OTP): was 400, changed to 401
 *   [BUG FIXED] POST /matches/:id/join (full match): was 409, changed to 400
 *   [BUG FIXED] POST /invites/:token/accept (full match): was 409, changed to 400
 */


const BASE = "http://localhost:8080/api";
const PHONE_A = "+966512345678";
const PHONE_B = "+966512345679";
const PHONE_C = "+966512345680";

let passed = 0;
let failed = 0;
const bugs = [];

// ─── helpers ──────────────────────────────────────────────────────────────────

async function req(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await r.json(); } catch { json = null; }
  return { status: r.status, json };
}

function check(label, status, expected, json, assertFn = null) {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  let assertOk = true;
  if (ok && assertFn) {
    try { assertFn(json); } catch (e) { assertOk = false; console.log(`     assert failed: ${e.message}`); }
  }
  if (ok && assertOk) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    const detail = json ? JSON.stringify(json).slice(0, 140) : "";
    console.log(`  ❌ ${label} — got ${status}, want ${expected} | ${detail}`);
    failed++;
    bugs.push({ label, got: status, want: expected, detail });
  }
  return ok && assertOk;
}

// ─── authenticate ─────────────────────────────────────────────────────────────

async function login(phone) {
  await req("POST", "/auth/request-otp", { body: { phone } });
  const v = await req("POST", "/auth/verify-otp", { body: { phone, otp: "1234" } });
  if (!v.json?.token) throw new Error(`Login failed for ${phone}: ${JSON.stringify(v.json)}`);
  return { token: v.json.token, userId: v.json.userId };
}

// ─── tiny test image (1x1 red pixel PNG) ──────────────────────────────────────

const PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009001" +
  "2e000000124944415478016360f8cfc0000000020001e221bc330000000049454e44ae426082",
  "hex"
);

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  API Test Suite — العب Backend");
  console.log("═══════════════════════════════════════════\n");

  // ── 1. Health ──────────────────────────────────────────────────────────────
  console.log("1. Health");
  {
    const r = await req("GET", "/healthz");
    check("GET /healthz → 200 with status:ok", r.status, 200, r.json,
      (j) => { if (!j?.status) throw new Error("missing status field"); });
  }

  // ── 2. Auth ────────────────────────────────────────────────────────────────
  console.log("\n2. Auth");
  {
    const r = await req("POST", "/auth/request-otp", { body: { phone: PHONE_A } });
    check("POST /auth/request-otp (valid Saudi +9665XXXXXXXX) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }
  {
    const r = await req("POST", "/auth/request-otp", { body: { phone: "+1234567890" } });
    check("POST /auth/request-otp (non-Saudi number) → 400", r.status, 400, r.json);
  }
  {
    const r = await req("POST", "/auth/request-otp", { body: { phone: "" } });
    check("POST /auth/request-otp (empty phone) → 400", r.status, 400, r.json);
  }
  {
    const r = await req("POST", "/auth/verify-otp", { body: { phone: PHONE_A, otp: "1234" } });
    check("POST /auth/verify-otp (correct OTP via bypass) → 200 with token", r.status, 200, r.json,
      (j) => { if (!j?.token) throw new Error("missing token"); });
  }
  {
    const r = await req("POST", "/auth/verify-otp", { body: { phone: PHONE_A, otp: "0000" } });
    check("POST /auth/verify-otp (wrong OTP) → 401 [BUG FIXED: was 400]", r.status, 401, r.json);
  }

  // ── Bootstrap users ────────────────────────────────────────────────────────
  console.log("\n   [bootstrap] Creating test users A, B, C...");
  const userA = await login(PHONE_A);
  const userB = await login(PHONE_B);
  const userC = await login(PHONE_C);

  await req("PATCH", "/users/me", { token: userA.token, body: { name: "أحمد" } });
  await req("PATCH", "/users/me", { token: userB.token, body: { name: "محمد" } });
  await req("PATCH", "/users/me", { token: userC.token, body: { name: "خالد" } });

  console.log(`   User A (organizer): ${userA.userId}`);
  console.log(`   User B: ${userB.userId}`);
  console.log(`   User C: ${userC.userId}`);

  // ── 3. Users ───────────────────────────────────────────────────────────────
  console.log("\n3. Users");
  {
    const r = await req("GET", "/users/me");
    check("GET /users/me (no auth) → 401", r.status, 401, r.json);
  }
  {
    const r = await req("GET", "/users/me", { token: userA.token });
    check("GET /users/me (with auth) → 200 with complete profile", r.status, 200, r.json,
      (j) => {
        if (!j?.user?.id) throw new Error("missing user.id");
        if (!("reliability" in j.user)) throw new Error("missing reliability");
        if (!Array.isArray(j.user.sports)) throw new Error("missing sports array");
      });
  }
  {
    const r = await req("PATCH", "/users/me", { token: userA.token, body: { name: "أحمد", sports: ["football"] } });
    check("PATCH /users/me (update name + sports) → 200", r.status, 200, r.json,
      (j) => { if (j?.user?.name !== "أحمد") throw new Error("name not updated"); });
  }
  {
    const r = await req("PATCH", "/users/me", { token: userA.token, body: { avatarUrl: "file:///etc/passwd" } });
    check("PATCH /users/me (avatarUrl=file://) → 400", r.status, 400, r.json);
  }
  {
    const r = await req("PATCH", "/users/me", { token: userA.token, body: { sports: ["cricket"] } });
    check("PATCH /users/me (invalid sport 'cricket') → 400", r.status, 400, r.json);
  }
  {
    const r = await req("PATCH", "/users/me", { token: userA.token, body: {} });
    check("PATCH /users/me (empty body) → 400", r.status, 400, r.json);
  }

  // Avatar upload — no file → 400
  {
    const fd = new FormData();
    const r2 = await fetch(`${BASE}/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.token}` },
      body: fd,
    });
    let json2;
    try { json2 = await r2.json(); } catch { json2 = null; }
    check("POST /users/me/avatar (no file) → 400", r2.status, 400, json2);
  }

  // Avatar upload — valid image file → 200 with avatarUrl; and verify URL is fetchable
  {
    const fd = new FormData();
    const blob = new Blob([PNG_1X1], { type: "image/png" });
    fd.append("avatar", blob, "avatar.png");
    const r2 = await fetch(`${BASE}/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.token}` },
      body: fd,
    });
    let json2;
    try { json2 = await r2.json(); } catch { json2 = null; }
    const uploadOk = check("POST /users/me/avatar (valid image) → 200 with avatarUrl", r2.status, 200, json2,
      (j) => { if (!j?.avatarUrl) throw new Error("missing avatarUrl in response"); });

    if (uploadOk && json2?.avatarUrl) {
      // Verify the avatar URL is actually accessible
      const avatarResp = await fetch(json2.avatarUrl);
      const ct = avatarResp.headers.get("content-type") ?? "";
      check("  ↳ avatarUrl is fetchable (image/png) → 200", avatarResp.status, 200, null,
        () => { if (!ct.includes("image/")) throw new Error(`content-type ${ct} is not an image`); });
    }
  }

  // Notification settings
  {
    const r = await req("GET", "/users/me/notification-settings", { token: userA.token });
    check("GET /users/me/notification-settings → 200 with matchNotifs/groupNotifs/ratingNotifs", r.status, 200, r.json,
      (j) => {
        if (!("matchNotifs" in j)) throw new Error("missing matchNotifs");
        if (!("groupNotifs" in j)) throw new Error("missing groupNotifs");
        if (!("ratingNotifs" in j)) throw new Error("missing ratingNotifs");
      });
  }
  {
    const r = await req("PATCH", "/users/me/notification-settings", { token: userA.token, body: { matchNotifs: false } });
    check("PATCH /users/me/notification-settings (matchNotifs: false) → 200", r.status, 200, r.json,
      (j) => { if (j?.matchNotifs !== false) throw new Error("matchNotifs not updated to false"); });
  }
  {
    const r = await req("PATCH", "/users/me/notification-settings", { token: userA.token, body: {} });
    check("PATCH /users/me/notification-settings (empty body) → 400", r.status, 400, r.json);
  }

  // Other user profile
  {
    const r = await req("GET", `/users/${userB.userId}`, { token: userA.token });
    check("GET /users/:id (another user's public profile) → 200", r.status, 200, r.json,
      (j) => { if (!j?.user?.id) throw new Error("missing user.id"); });
  }
  {
    const r = await req("GET", "/users/nonexistent_user_id", { token: userA.token });
    check("GET /users/:id (not found) → 404", r.status, 404, r.json);
  }

  // ── 4. Matches ─────────────────────────────────────────────────────────────
  console.log("\n4. Matches");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Public list
  {
    const r = await req("GET", "/matches");
    check("GET /matches (no auth) → 200 with matches array", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.matches)) throw new Error("missing matches array"); });
  }
  {
    const r = await req("GET", "/matches?sport=football");
    check("GET /matches?sport=football → 200", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.matches)) throw new Error("missing matches array"); });
  }
  {
    const r = await req("GET", "/matches?skill_level=intermediate");
    check("GET /matches?skill_level=intermediate → 200", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.matches)) throw new Error("missing matches array"); });
  }
  // Test Arabic skill level filter (متوسط) — filter by skill text search
  {
    const r = await req("GET", `/matches?skill_level=%D9%85%D8%AA%D9%88%D8%B3%D8%B7`);
    check("GET /matches?skill_level=متوسط (Arabic) → 200", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.matches)) throw new Error("missing matches array"); });
  }

  // Create valid match
  let matchId = null;
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة اختبار",
        sport: "football",
        date: tomorrow,
        time: "18:00",
        venue: "ملعب الاختبار",
        maxPlayers: 10,
        cost: 0,
        isPublic: true,
        sessionType: "match",
        skillLevel: "intermediate",
      },
    });
    check("POST /matches (valid, all required fields) → 201", r.status, 201, r.json,
      (j) => { if (!j?.match?.id) throw new Error("missing match.id"); });
    if (r.status === 201) matchId = r.json?.match?.id;
  }

  // Missing fields → 400
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: { title: "ناقص", sport: "football" },
    });
    check("POST /matches (missing required fields) → 400", r.status, 400, r.json);
  }

  // Past date → 400
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة قديمة",
        sport: "football",
        date: "2020-01-01",
        time: "10:00",
        venue: "ملعب",
        maxPlayers: 6,
        cost: 0,
        isPublic: true,
      },
    });
    check("POST /matches (past date) → 400", r.status, 400, r.json);
  }

  // Get match details with organizerPhone
  if (matchId) {
    const r = await req("GET", `/matches/${matchId}`);
    check("GET /matches/:id (public details with organizerPhone) → 200", r.status, 200, r.json,
      (j) => {
        if (!j?.match?.id) throw new Error("missing match.id");
        if (!("organizerPhone" in j.match)) throw new Error("missing organizerPhone");
        if (!Array.isArray(j.match.players)) throw new Error("missing players array");
      });
  }
  {
    const r = await req("GET", "/matches/nonexistent_match_id");
    check("GET /matches/:id (not found) → 404", r.status, 404, r.json);
  }

  // Join match (user B)
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/join`, { token: userB.token });
    check("POST /matches/:id/join (user B joins) → 200 with playerCount", r.status, 200, r.json,
      (j) => { if (!("playerCount" in j)) throw new Error("missing playerCount"); });
  }

  // Join again → 409
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/join`, { token: userB.token });
    check("POST /matches/:id/join (already joined) → 409", r.status, 409, r.json);
  }

  // Update match (organizer)
  if (matchId) {
    const r = await req("PATCH", `/matches/${matchId}`, {
      token: userA.token,
      body: { title: "مباراة اختبار معدّلة" },
    });
    check("PATCH /matches/:id (organizer updates title) → 200", r.status, 200, r.json,
      (j) => { if (!j?.match?.id) throw new Error("missing match.id"); });
  }

  // Update match (non-organizer → 403)
  if (matchId) {
    const r = await req("PATCH", `/matches/${matchId}`, {
      token: userB.token,
      body: { title: "محاولة تعديل" },
    });
    check("PATCH /matches/:id (non-organizer) → 403 [BUG CHECK]", r.status, 403, r.json);
  }

  // Attendance (organizer marks user B present)
  if (matchId) {
    const r = await req("PUT", `/matches/${matchId}/attendance`, {
      token: userA.token,
      body: { userId: userB.userId, status: "present" },
    });
    check("PUT /matches/:id/attendance (organizer marks present) → 200", r.status, 200, r.json);
  }

  // Attendance (non-organizer → 403)
  if (matchId) {
    const r = await req("PUT", `/matches/${matchId}/attendance`, {
      token: userB.token,
      body: { userId: userA.userId, status: "present" },
    });
    check("PUT /matches/:id/attendance (non-organizer) → 403", r.status, 403, r.json);
  }

  // Payment update (organizer)
  if (matchId) {
    const r = await req("PATCH", `/matches/${matchId}/players/${userB.userId}/payment`, {
      token: userA.token,
      body: { paid: true },
    });
    check("PATCH /matches/:id/players/:userId/payment (organizer) → 200", r.status, 200, r.json);
  }

  // Payment update (non-organizer → 403)
  if (matchId) {
    const r = await req("PATCH", `/matches/${matchId}/players/${userB.userId}/payment`, {
      token: userB.token,
      body: { paid: false },
    });
    check("PATCH /matches/:id/players/:userId/payment (non-organizer) → 403", r.status, 403, r.json);
  }

  // Rate (future match → 403, not completed yet)
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/rate`, {
      token: userA.token,
      body: { ratings: { [userB.userId]: "rock" } },
    });
    check("POST /matches/:id/rate (future match, ratings obj) → 403", r.status, 403, r.json);
  }

  // Now create a "past" match to test rating success
  // We create a match then immediately mark it completed via PATCH status: completed
  let pastMatchId = null;
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة مكتملة للتقييم",
        sport: "football",
        date: tomorrow,
        time: "10:00",
        venue: "ملعب التقييم",
        maxPlayers: 10,
        cost: 0,
        isPublic: true,
        sessionType: "match",
      },
    });
    if (r.status === 201) pastMatchId = r.json?.match?.id;
  }

  if (pastMatchId) {
    // User B joins
    await req("POST", `/matches/${pastMatchId}/join`, { token: userB.token });
    // Mark B as attended
    await req("PUT", `/matches/${pastMatchId}/attendance`, {
      token: userA.token,
      body: { userId: userB.userId, status: "present" },
    });
    // Mark match as completed
    await req("PATCH", `/matches/${pastMatchId}`, {
      token: userA.token,
      body: { status: "completed" },
    });
    // Now rate B (match is "completed")
    const r = await req("POST", `/matches/${pastMatchId}/rate`, {
      token: userA.token,
      body: { ratings: { [userB.userId]: "rock" } },
    });
    check("POST /matches/:id/rate (completed match, ratings obj) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }

  // Rate again (duplicate → 409)
  if (pastMatchId) {
    const r = await req("POST", `/matches/${pastMatchId}/rate`, {
      token: userA.token,
      body: { ratings: { [userB.userId]: "artist" } },
    });
    check("POST /matches/:id/rate (duplicate rating) → 409", r.status, 409, r.json);
  }

  // Invite link (organizer)
  let matchInviteToken = null;
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/invite-link`, { token: userA.token });
    check("POST /matches/:id/invite-link (organizer) → 200 with token", r.status, 200, r.json,
      (j) => { if (!j?.token) throw new Error("missing token"); });
    if (r.status === 200) matchInviteToken = r.json?.token;
  }

  // Invite link (non-organizer → 403)
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/invite-link`, { token: userB.token });
    check("POST /matches/:id/invite-link (non-organizer) → 403", r.status, 403, r.json);
  }

  // Leave match (user B)
  if (matchId) {
    const r = await req("POST", `/matches/${matchId}/leave`, { token: userB.token });
    check("POST /matches/:id/leave (user B leaves) → 200 with playerCount", r.status, 200, r.json,
      (j) => { if (!("playerCount" in j)) throw new Error("missing playerCount"); });
  }

  // Delete (non-organizer → 403)
  if (matchId) {
    const r = await req("DELETE", `/matches/${matchId}`, { token: userB.token });
    check("DELETE /matches/:id (non-organizer) → 403 [BUG CHECK]", r.status, 403, r.json);
  }

  // Delete (organizer → 200)
  if (matchId) {
    const r = await req("DELETE", `/matches/${matchId}`, { token: userA.token });
    check("DELETE /matches/:id (organizer) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }

  // ── 5. Groups ──────────────────────────────────────────────────────────────
  console.log("\n5. Groups");
  {
    const r = await req("GET", "/groups");
    check("GET /groups (no auth) → 200 with groups array", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.groups)) throw new Error("missing groups array"); });
  }
  {
    const r = await req("GET", "/groups?sport=padel");
    check("GET /groups?sport=padel (filter) → 200", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.groups)) throw new Error("missing groups array"); });
  }

  // Create group (valid)
  let groupId = null;
  {
    const r = await req("POST", "/groups", {
      token: userA.token,
      body: { name: "مجموعة الاختبار", sport: "football", isPublic: true },
    });
    check("POST /groups (valid) → 201 with group.id", r.status, 201, r.json,
      (j) => { if (!j?.group?.id) throw new Error("missing group.id"); });
    if (r.status === 201) groupId = r.json?.group?.id;
  }

  // name: null → 400
  {
    const r = await req("POST", "/groups", {
      token: userA.token,
      body: { name: null, sport: "football" },
    });
    check("POST /groups (name: null) → 400", r.status, 400, r.json);
  }

  // invalid sport → 400
  {
    const r = await req("POST", "/groups", {
      token: userA.token,
      body: { name: "مجموعة", sport: "cricket" },
    });
    check("POST /groups (invalid sport) → 400", r.status, 400, r.json);
  }

  // Get group detail (with members + messages)
  if (groupId) {
    const r = await req("GET", `/groups/${groupId}`);
    check("GET /groups/:id (public group, with members array) → 200", r.status, 200, r.json,
      (j) => {
        if (!j?.group?.id) throw new Error("missing group.id");
        if (!Array.isArray(j.group.members)) throw new Error("missing members array");
        if (!("memberCount" in j.group)) throw new Error("missing memberCount");
      });
  }
  {
    const r = await req("GET", "/groups/nonexistent_group_id");
    check("GET /groups/:id (not found) → 404", r.status, 404, r.json);
  }

  // Join group (user B)
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/join`, { token: userB.token });
    check("POST /groups/:id/join (user B joins) → 200 with memberCount", r.status, 200, r.json,
      (j) => { if (!("memberCount" in j)) throw new Error("missing memberCount"); });
  }

  // Join again → 409
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/join`, { token: userB.token });
    check("POST /groups/:id/join (already member) → 409", r.status, 409, r.json);
  }

  // Invite link (admin)
  let groupInviteToken = null;
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/invite-link`, { token: userA.token });
    check("POST /groups/:id/invite-link (admin) → 200 with token", r.status, 200, r.json,
      (j) => { if (!j?.token) throw new Error("missing token"); });
    if (r.status === 200) groupInviteToken = r.json?.token;
  }

  // Invite link (non-admin → 403)
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/invite-link`, { token: userB.token });
    check("POST /groups/:id/invite-link (non-admin) → 403", r.status, 403, r.json);
  }

  // Get invite details
  if (groupInviteToken) {
    const r = await req("GET", `/invites/${groupInviteToken}`);
    check("GET /invites/:token (group invite details) → 200 with group info", r.status, 200, r.json,
      (j) => {
        if (!j?.invite?.group?.id) throw new Error("missing invite.group.id");
        if (j?.invite?.targetType !== "group") throw new Error("targetType must be group");
      });
  }
  {
    const r = await req("GET", "/invites/invalid_token_xyz");
    check("GET /invites/:token (not found) → 404", r.status, 404, r.json);
  }

  // Accept invite (user B already a member → 200 alreadyMember=true)
  if (groupInviteToken) {
    const r = await req("POST", `/invites/${groupInviteToken}/accept`, { token: userB.token });
    check("POST /invites/:token/accept (group, already member) → 200 alreadyMember=true", r.status, 200, r.json,
      (j) => { if (j?.alreadyMember !== true) throw new Error("alreadyMember must be true"); });
  }

  // Accept invite (user C, new member → 200 alreadyMember=false)
  if (groupInviteToken) {
    const r = await req("POST", `/invites/${groupInviteToken}/accept`, { token: userC.token });
    check("POST /invites/:token/accept (group, new member) → 200 alreadyMember=false", r.status, 200, r.json,
      (j) => { if (j?.alreadyMember !== false) throw new Error("alreadyMember must be false"); });
  }

  // Match invite link + accept flow
  let matchId3 = null;
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة دعوة",
        sport: "football",
        date: tomorrow,
        time: "20:00",
        venue: "الملعب الثاني",
        maxPlayers: 10,
        cost: 0,
        isPublic: true,
        sessionType: "match",
      },
    });
    if (r.status === 201) matchId3 = r.json?.match?.id;
  }
  let matchInviteToken3 = null;
  if (matchId3) {
    const r = await req("POST", `/matches/${matchId3}/invite-link`, { token: userA.token });
    if (r.status === 200) matchInviteToken3 = r.json?.token;
  }
  if (matchInviteToken3) {
    const r = await req("GET", `/invites/${matchInviteToken3}`);
    check("GET /invites/:token (match invite details) → 200", r.status, 200, r.json,
      (j) => {
        if (!j?.invite?.match?.id) throw new Error("missing invite.match.id");
        if (j?.invite?.targetType !== "match") throw new Error("targetType must be match");
      });
  }
  if (matchInviteToken3) {
    const r = await req("POST", `/invites/${matchInviteToken3}/accept`, { token: userB.token });
    check("POST /invites/:token/accept (match invite, new joiner) → 200", r.status, 200, r.json,
      (j) => { if (!("matchId" in j)) throw new Error("missing matchId"); });
  }

  // Group messages
  if (groupId) {
    const r = await req("GET", `/groups/${groupId}/messages`, { token: userA.token });
    check("GET /groups/:id/messages (member) → 200 with messages array", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.messages)) throw new Error("missing messages array"); });
  }
  {
    const r = await req("GET", "/groups/nonexistent_group_id/messages", { token: userA.token });
    check("GET /groups/:id/messages (group not found) → 404", r.status, 404, r.json);
  }

  // Send message (member)
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/messages`, {
      token: userA.token,
      body: { text: "مرحبا بالمجموعة" },
    });
    check("POST /groups/:id/messages (member sends text) → 200", r.status, [200, 201], r.json,
      (j) => { if (!j?.message?.id) throw new Error("missing message.id"); });
  }

  // Send message (empty text → 400)
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/messages`, {
      token: userA.token,
      body: { text: "   " },
    });
    check("POST /groups/:id/messages (empty/whitespace text) → 400", r.status, 400, r.json);
  }

  // Remove member (admin removes user B)
  if (groupId) {
    const r = await req("DELETE", `/groups/${groupId}/members/${userB.userId}`, { token: userA.token });
    check("DELETE /groups/:id/members/:userId (admin removes member) → 200", r.status, 200, r.json,
      (j) => { if (!("memberCount" in j)) throw new Error("missing memberCount"); });
  }

  // Remove member (non-admin → 403)
  if (groupId) {
    // Re-add user B first
    await req("POST", `/groups/${groupId}/join`, { token: userB.token });
    const r = await req("DELETE", `/groups/${groupId}/members/${userB.userId}`, { token: userB.token });
    check("DELETE /groups/:id/members/:userId (non-admin) → 403", r.status, 403, r.json);
  }

  // Leave group (user B)
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/leave`, { token: userB.token });
    check("POST /groups/:id/leave (member leaves) → 200", r.status, 200, r.json);
  }

  // Admin can't leave
  if (groupId) {
    const r = await req("POST", `/groups/${groupId}/leave`, { token: userA.token });
    check("POST /groups/:id/leave (admin blocked) → 403", r.status, 403, r.json);
  }

  // ── 6. Notifications ───────────────────────────────────────────────────────
  console.log("\n6. Notifications");
  {
    const r = await req("GET", "/notifications", { token: userA.token });
    check("GET /notifications (authed) → 200 with notifications array", r.status, 200, r.json,
      (j) => { if (!Array.isArray(j?.notifications)) throw new Error("missing notifications array"); });
  }
  {
    const r = await req("GET", "/notifications");
    check("GET /notifications (no auth) → 401", r.status, 401, r.json);
  }
  {
    const r = await req("PATCH", "/notifications/read-all", { token: userA.token });
    check("PATCH /notifications/read-all → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }
  {
    const r = await req("PATCH", "/notifications/fake_notif_id/read", { token: userA.token });
    check("PATCH /notifications/:id/read (any id) → 200", r.status, 200, r.json);
  }
  {
    const r = await req("DELETE", "/notifications/nonexistent_notif", { token: userA.token });
    check("DELETE /notifications/:id (not found) → 404", r.status, 404, r.json);
  }
  {
    const r = await req("DELETE", "/notifications", { token: userA.token });
    check("DELETE /notifications (delete all) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }

  // ── 7. Push Notifications ──────────────────────────────────────────────────
  console.log("\n7. Push Notifications");
  const testPushToken = "ExponentPushToken[test_token_abc123]";
  {
    const r = await req("POST", "/push/register", {
      token: userA.token,
      body: { token: testPushToken },
    });
    check("POST /push/register (valid expo token) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }
  // Register same token again (idempotent)
  {
    const r = await req("POST", "/push/register", {
      token: userA.token,
      body: { token: testPushToken },
    });
    check("POST /push/register (same token again, idempotent) → 200", r.status, 200, r.json);
  }
  {
    const r = await req("POST", "/push/register", {
      token: userA.token,
      body: {},
    });
    check("POST /push/register (no token) → 400", r.status, 400, r.json);
  }
  {
    const r = await req("DELETE", "/push/unregister", {
      token: userA.token,
      body: { token: testPushToken },
    });
    check("DELETE /push/unregister (valid token) → 200", r.status, 200, r.json,
      (j) => { if (j?.success !== true) throw new Error("success must be true"); });
  }
  {
    const r = await req("DELETE", "/push/unregister", {
      token: userA.token,
      body: {},
    });
    check("DELETE /push/unregister (no token) → 400", r.status, 400, r.json);
  }

  // ── 8. Edge Cases ──────────────────────────────────────────────────────────
  console.log("\n8. Edge Cases");

  // Full match capacity (padel single = 2 players)
  let smallMatchId = null;
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "بادل مكتمل",
        sport: "padel",
        date: tomorrow,
        time: "16:00",
        venue: "ملعب بادل",
        maxPlayers: 2,
        cost: 0,
        isPublic: true,
        sessionType: "match",
        matchFormat: "single",
      },
    });
    if (r.status === 201) smallMatchId = r.json?.match?.id;
  }
  if (smallMatchId) {
    await req("POST", `/matches/${smallMatchId}/join`, { token: userB.token });
    // userA (organizer) + userB = full (maxPlayers=2 for padel single)
    const r = await req("POST", `/matches/${smallMatchId}/join`, { token: userC.token });
    check("POST /matches/:id/join (full match) → 400 [BUG FIXED: was 409]", r.status, 400, r.json);
  }

  // Time overlap detection
  let overlap1Id = null, overlap2Id = null;
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة أولى 15:00",
        sport: "football",
        date: tomorrow,
        time: "15:00",
        venue: "الملعب أ",
        maxPlayers: 10,
        cost: 0,
        isPublic: true,
        sessionType: "match",
      },
    });
    if (r.status === 201) overlap1Id = r.json?.match?.id;
  }
  {
    const r = await req("POST", "/matches", {
      token: userA.token,
      body: {
        title: "مباراة ثانية 15:30 (تعارض)",
        sport: "football",
        date: tomorrow,
        time: "15:30",
        venue: "الملعب ب",
        maxPlayers: 10,
        cost: 0,
        isPublic: true,
        sessionType: "match",
      },
    });
    if (r.status === 201) overlap2Id = r.json?.match?.id;
  }
  if (overlap1Id) {
    await req("POST", `/matches/${overlap1Id}/join`, { token: userB.token });
  }
  if (overlap2Id) {
    const r = await req("POST", `/matches/${overlap2Id}/join`, { token: userB.token });
    check("POST /matches/:id/join (time overlap conflict) → 409", r.status, 409, r.json,
      (j) => { if (!j?.conflictMatch) throw new Error("missing conflictMatch in response"); });
  }

  // Clean up
  const cleanupIds = [pastMatchId, matchId3, smallMatchId, overlap1Id, overlap2Id].filter(Boolean);
  for (const id of cleanupIds) {
    await req("DELETE", `/matches/${id}`, { token: userA.token });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed}/${total} passed`);
  if (bugs.length > 0) {
    console.log(`\n  Bugs found / assertions failed (${bugs.length}):`);
    for (const b of bugs) {
      console.log(`    ❌ ${b.label}`);
      console.log(`       got ${b.got}, want ${b.want}`);
      if (b.detail) console.log(`       ${b.detail}`);
    }
  } else {
    console.log("  All tests passed! No bugs found.");
  }
  console.log("\n  Bugs fixed in backend:");
  console.log("    [BUG FIXED] POST /auth/verify-otp (wrong OTP): 400 → 401");
  console.log("    [BUG FIXED] POST /matches/:id/join (full match): 409 → 400");
  console.log("    [BUG FIXED] POST /invites/:token/accept (full match via link): 409 → 400");
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

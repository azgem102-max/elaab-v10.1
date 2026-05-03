import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, matchesTable, matchPlayersTable, groupsTable, groupMembersTable, inviteLinksTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0]! : param;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SPORT_LABELS: Record<string, string> = {
  football: "كرة القدم",
  padel: "بادل",
  tennis: "تنس",
  basketball: "كرة السلة",
  volleyball: "كرة الطائرة",
};

function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport;
}

function buildPage(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;" />
  <title>${safeTitle} — تطبيق العب</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #f1f5f9;
    }
    .card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
    }
    .logo {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .app-name {
      font-size: 22px;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 24px;
    }
    .divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 24px 0;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .meta {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.7;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      background: rgba(56,189,248,0.15);
      color: #38bdf8;
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 13px;
      margin: 8px 4px 0;
    }
    .cta-text {
      font-size: 15px;
      color: #cbd5e1;
      margin-top: 24px;
      line-height: 1.6;
    }
    .store-links {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .store-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 10px 20px;
      color: #f1f5f9;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }
    .store-btn:hover { background: rgba(255,255,255,0.14); }
    .error-icon { font-size: 48px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚽</div>
    <div class="app-name">العب</div>
    <div class="divider"></div>
    ${body}
    <div class="cta-text">حمّل تطبيق العب للانضمام والمشاركة مع أصدقائك</div>
    <div class="store-links">
      <a class="store-btn" href="https://apps.apple.com" target="_blank">🍎 App Store</a>
      <a class="store-btn" href="https://play.google.com" target="_blank">🤖 Google Play</a>
    </div>
  </div>
</body>
</html>`;
}

router.get("/invite/:token", async (req: Request, res: Response) => {
  const token = getParam(req.params["token"] as string);

  try {
    const invite = await db.query.inviteLinksTable.findFirst({
      where: eq(inviteLinksTable.token, token),
    });

    if (!invite || invite.isRevoked || (invite.expiresAt && invite.expiresAt < new Date())) {
      const body = `
        <div class="error-icon">🔗</div>
        <h1>رابط الدعوة غير صالح</h1>
        <p class="meta">هذا الرابط منتهي الصلاحية أو تم إلغاؤه.</p>
      `;
      res.status(410).send(buildPage("رابط الدعوة غير صالح", body));
      return;
    }

    if (invite.targetType === "group") {
      const group = await db.query.groupsTable.findFirst({
        where: eq(groupsTable.id, invite.targetId),
      });

      if (!group) {
        const body = `<div class="error-icon">👥</div><h1>المجموعة غير موجودة</h1>`;
        res.status(404).send(buildPage("مجموعة غير موجودة", body));
        return;
      }

      const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
      const admin = await db.query.usersTable.findFirst({ where: eq(usersTable.id, group.adminId) });

      const body = `
        <h1>${escapeHtml(group.name)}</h1>
        <span class="badge">${escapeHtml(sportLabel(group.sport))}</span>
        <span class="badge">${members.length} عضو</span>
        ${admin ? `<p class="meta" style="margin-top:16px">المشرف: ${escapeHtml(admin.name ?? "")}</p>` : ""}
        ${group.description ? `<p class="meta">${escapeHtml(group.description)}</p>` : ""}
      `;
      res.send(buildPage(`دعوة لمجموعة ${group.name}`, body));
      return;
    }

    if (invite.targetType === "match") {
      const match = await db.query.matchesTable.findFirst({
        where: eq(matchesTable.id, invite.targetId),
      });

      if (!match) {
        const body = `<div class="error-icon">⚽</div><h1>المباراة غير موجودة</h1>`;
        res.status(404).send(buildPage("مباراة غير موجودة", body));
        return;
      }

      const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, match.id));
      const organizer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, match.organizerId) });

      const matchDate = new Date(match.date);
      const dateStr = matchDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const body = `
        <h1>${escapeHtml(match.title)}</h1>
        <span class="badge">${escapeHtml(sportLabel(match.sport))}</span>
        <span class="badge">${match.sessionType === "training" ? "تمرين" : "مباراة"}</span>
        <p class="meta" style="margin-top:16px">📅 ${escapeHtml(dateStr)} الساعة ${escapeHtml(match.time)}</p>
        <p class="meta">📍 ${escapeHtml(match.venue)}</p>
        <p class="meta">👥 ${players.length}/${match.maxPlayers} لاعب</p>
        ${organizer ? `<p class="meta">المنظّم: ${escapeHtml(organizer.name ?? "")}</p>` : ""}
      `;
      res.send(buildPage(`دعوة لـ ${match.title}`, body));
      return;
    }

    res.status(400).send(buildPage("خطأ", `<h1>نوع الدعوة غير مدعوم</h1>`));
  } catch {
    res.status(500).send(buildPage("خطأ", `<div class="error-icon">⚠️</div><h1>حدث خطأ</h1>`));
  }
});

router.get("/match/:id", async (req: Request, res: Response) => {
  const matchId = getParam(req.params["id"] as string);

  try {
    const match = await db.query.matchesTable.findFirst({
      where: eq(matchesTable.id, matchId),
    });

    if (!match) {
      const body = `<div class="error-icon">⚽</div><h1>المباراة غير موجودة</h1>`;
      res.status(404).send(buildPage("مباراة غير موجودة", body));
      return;
    }

    const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, match.id));
    const organizer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, match.organizerId) });

    const matchDate = new Date(match.date);
    const dateStr = matchDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const body = `
      <h1>${escapeHtml(match.title)}</h1>
      <span class="badge">${escapeHtml(sportLabel(match.sport))}</span>
      <span class="badge">${match.sessionType === "training" ? "تمرين" : "مباراة"}</span>
      <p class="meta" style="margin-top:16px">📅 ${escapeHtml(dateStr)} الساعة ${escapeHtml(match.time)}</p>
      <p class="meta">📍 ${escapeHtml(match.venue)}</p>
      <p class="meta">👥 ${players.length}/${match.maxPlayers} لاعب</p>
      ${organizer ? `<p class="meta">المنظّم: ${escapeHtml(organizer.name ?? "")}</p>` : ""}
    `;
    res.send(buildPage(match.title, body));
  } catch {
    res.status(500).send(buildPage("خطأ", `<div class="error-icon">⚠️</div><h1>حدث خطأ</h1>`));
  }
});

router.get("/group/:id", async (req: Request, res: Response) => {
  const groupId = getParam(req.params["id"] as string);

  try {
    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      const body = `<div class="error-icon">👥</div><h1>المجموعة غير موجودة</h1>`;
      res.status(404).send(buildPage("مجموعة غير موجودة", body));
      return;
    }

    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
    const admin = await db.query.usersTable.findFirst({ where: eq(usersTable.id, group.adminId) });

    const body = `
      <h1>${escapeHtml(group.name)}</h1>
      <span class="badge">${escapeHtml(sportLabel(group.sport))}</span>
      <span class="badge">${members.length} عضو</span>
      ${admin ? `<p class="meta" style="margin-top:16px">المشرف: ${escapeHtml(admin.name ?? "")}</p>` : ""}
      ${group.description ? `<p class="meta">${escapeHtml(group.description)}</p>` : ""}
    `;
    res.send(buildPage(group.name, body));
  } catch {
    res.status(500).send(buildPage("خطأ", `<div class="error-icon">⚠️</div><h1>حدث خطأ</h1>`));
  }
});

router.get("/profile/:userId", async (req: Request, res: Response) => {
  const userId = getParam(req.params["userId"] as string);

  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });

    if (!user) {
      const body = `<div class="error-icon">👤</div><h1>المستخدم غير موجود</h1>`;
      res.status(404).send(buildPage("مستخدم غير موجود", body));
      return;
    }

    let sports: string[] = [];
    try {
      if (user.sports) sports = JSON.parse(user.sports);
    } catch {}

    const sportsText = sports.map(sportLabel).join(" • ");
    const reliabilityText = user.reliability !== null ? `${user.reliability}%` : "—";

    const body = `
      <h1>${escapeHtml(user.name ?? "")}</h1>
      ${sportsText ? `<p class="meta" style="margin-top:12px">🏅 ${escapeHtml(sportsText)}</p>` : ""}
      <p class="meta">موثوقية الحضور: ${escapeHtml(reliabilityText)}</p>
    `;
    res.send(buildPage(`ملف ${user.name}`, body));
  } catch {
    res.status(500).send(buildPage("خطأ", `<div class="error-icon">⚠️</div><h1>حدث خطأ</h1>`));
  }
});

export default router;

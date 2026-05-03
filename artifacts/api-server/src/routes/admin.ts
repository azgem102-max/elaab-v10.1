import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  matchesTable,
  groupsTable,
  venuesTable,
  venueSuggestionsTable,
  venueReviewsTable,
  matchWaitlistTable,
} from "@workspace/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { requireAdmin } from "../lib/adminAuth";
import { generateId } from "../lib/id";
import { signToken } from "../lib/auth";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const router = Router();

// ─── Serve Admin Dashboard HTML ──────────────────────────────────────────
// GET /admin  → لوحة التحكم (HTML)
router.get("/admin", requireAdmin, async (req, res) => {
  const htmlPath = path.resolve(__dirname, "../admin-dashboard/index.html");
  if (existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    // fallback بسيط إذا لم يُبنى ملف HTML بعد
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>لوحة تحكم العَب</title></head>
<body><h1>لوحة التحكم</h1><p>ملف الداشبورد قيد البناء...</p></body>
</html>`);
  }
});

// ─── API: إحصائيات عامة ─────────────────────────────────────────────────
// GET /admin/dashboard
router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const [
      [{ total: usersCount }],
      [{ total: matchesCount }],
      [{ total: groupsCount }],
      [{ total: venuesCount }],
      [{ total: pendingSuggestionsCount }],
      [{ total: waitlistCount }],
      recentUsers,
      recentMatches,
    ] = await Promise.all([
      db.select({ total: count() }).from(usersTable),
      db.select({ total: count() }).from(matchesTable),
      db.select({ total: count() }).from(groupsTable),
      db.select({ total: count() }).from(venuesTable).where(eq(venuesTable.status, "active")),
      db.select({ total: count() }).from(venueSuggestionsTable).where(eq(venueSuggestionsTable.status, "pending")),
      db.select({ total: count() }).from(matchWaitlistTable),
      db.select({ id: usersTable.id, name: usersTable.name, createdAt: usersTable.createdAt, isAdmin: usersTable.isAdmin })
        .from(usersTable).orderBy(desc(usersTable.createdAt)).limit(10),
      db.select({ id: matchesTable.id, title: matchesTable.title, sport: matchesTable.sport, status: matchesTable.status, date: matchesTable.date, venue: matchesTable.venue })
        .from(matchesTable).orderBy(desc(matchesTable.createdAt)).limit(10),
    ]);

    res.json({
      success: true,
      stats: {
        usersCount,
        matchesCount,
        groupsCount,
        venuesCount,
        pendingSuggestionsCount,
        waitlistCount,
      },
      recentUsers,
      recentMatches,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "فشل جلب الإحصائيات" });
  }
});

// ─── API: قائمة المستخدمين ───────────────────────────────────────────────
// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        phone: usersTable.phone,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(100);
    res.json({ success: true, users });
  } catch {
    res.status(500).json({ success: false, error: "فشل جلب المستخدمين" });
  }
});

// ─── API: تعيين/إلغاء تعيين أدمن ────────────────────────────────────────
// PATCH /admin/users/:id/toggle-admin
router.patch("/admin/users/:id/toggle-admin", requireAdmin, async (req, res) => {
  try {
    const userId = Array.isArray(req.params["id"]) ? req.params["id"][0]! : req.params["id"]!;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });
    await db.update(usersTable).set({ isAdmin: !user.isAdmin, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    return res.json({ success: true, isAdmin: !user.isAdmin });
  } catch {
    return res.status(500).json({ success: false, error: "فشل تعديل الصلاحية" });
  }
});

// ─── API: قائمة الانتظار (overview) ─────────────────────────────────────
// GET /admin/waitlist
router.get("/admin/waitlist", requireAdmin, async (_req, res) => {
  try {
    const waitlist = await db
      .select()
      .from(matchWaitlistTable)
      .orderBy(desc(matchWaitlistTable.createdAt))
      .limit(50);
    res.json({ success: true, waitlist });
  } catch {
    res.status(500).json({ success: false, error: "فشل جلب قائمة الانتظار" });
  }
});

// ─── API: تقييمات الملاعب ────────────────────────────────────────────────
// GET /admin/venue-reviews
router.get("/admin/venue-reviews", requireAdmin, async (_req, res) => {
  try {
    const reviews = await db
      .select()
      .from(venueReviewsTable)
      .orderBy(desc(venueReviewsTable.createdAt))
      .limit(50);
    res.json({ success: true, reviews });
  } catch {
    res.status(500).json({ success: false, error: "فشل جلب التقييمات" });
  }
});

// ─── Seed: إنشاء حساب أدمن وهمي ─────────────────────────────────────────
// POST /admin/seed-admin (مرة واحدة فقط — لأغراض التطوير)
router.post("/admin/seed-admin", async (req, res) => {
  const { secret } = req.body as { secret?: string };
  if (secret !== (process.env["ADMIN_SEED_SECRET"] ?? "elab-admin-2024")) {
    return res.status(403).json({ success: false, error: "كلمة السر غير صحيحة" });
  }

  try {
    const ADMIN_PHONE = "+966500000000";
    const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.phone, ADMIN_PHONE) });

    let adminId: string;
    if (existing) {
      // أضف صلاحية الأدمن إذا لم تكن موجودة
      await db.update(usersTable).set({ isAdmin: true, updatedAt: new Date() }).where(eq(usersTable.id, existing.id));
      adminId = existing.id;
    } else {
      const adminUser = await db.insert(usersTable).values({
        id: generateId("u_"),
        phone: ADMIN_PHONE,
        name: "الأدمن",
        isAdmin: true,
        notifMatch: true,
        notifGroup: true,
        notifRating: false,
        notifWeekly: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      adminId = adminUser[0].id;
    }

    // أعطِ توكن JWT
    const token = signToken({ userId: adminId, phone: ADMIN_PHONE });
    return res.json({
      success: true,
      message: "حساب الأدمن جاهز",
      adminId,
      adminPhone: ADMIN_PHONE,
      token,
      dashboardUrl: "/api/admin",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "فشل إنشاء حساب الأدمن" });
  }
});

export default router;

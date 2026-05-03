import { Router } from "express";
import { db } from "@workspace/db";
import {
  venuesTable,
  venueSuggestionsTable,
  venueReviewsTable,
} from "@workspace/db/schema";
import { eq, like, or, and, sql, desc, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { requireAdmin } from "../lib/adminAuth";
import { generateId } from "../lib/id";
import type { JwtPayload } from "../lib/auth";
import type { Request } from "express";

const router = Router();

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0]! : param;
}

// ─── Public: قائمة الملاعب ──────────────────────────────────────────────
// GET /venues?sport=football&city=الرياض&q=الهلال
router.get("/venues", async (req, res) => {
  try {
    const { sport, city, q } = req.query as Record<string, string>;
    const conditions = [eq(venuesTable.status, "active")];

    if (sport && sport !== "all") conditions.push(or(eq(venuesTable.sport, sport), eq(venuesTable.sport, "multi"))!);
    if (city) conditions.push(like(venuesTable.city, `%${city}%`));
    if (q) conditions.push(or(like(venuesTable.name, `%${q}%`), like(venuesTable.district, `%${q}%`))!);

    const venues = await db
      .select()
      .from(venuesTable)
      .where(and(...conditions))
      .orderBy(desc(venuesTable.rating), asc(venuesTable.name));

    res.json({ success: true, venues });
  } catch (err) {
    res.status(500).json({ success: false, error: "فشل جلب الملاعب" });
  }
});

// ─── Public: تفاصيل ملعب واحد ───────────────────────────────────────────
// GET /venues/:id
router.get("/venues/:id", async (req, res) => {
  try {
    const venueId = getParam(req.params["id"] as string);
    const venue = await db.query.venuesTable.findFirst({
      where: eq(venuesTable.id, venueId),
    });
    if (!venue) return res.status(404).json({ success: false, error: "الملعب غير موجود" });

    // آخر 10 تقييمات
    const reviews = await db
      .select()
      .from(venueReviewsTable)
      .where(eq(venueReviewsTable.venueId, venueId))
      .orderBy(desc(venueReviewsTable.createdAt))
      .limit(10);

    return res.json({ success: true, venue, reviews });
  } catch {
    return res.status(500).json({ success: false, error: "فشل جلب الملعب" });
  }
});

// ─── Auth: اقتراح ملعب جديد ─────────────────────────────────────────────
// POST /venues/suggest
router.post("/venues/suggest", requireAuth, async (req, res) => {
  const user = (req as Request & { user: JwtPayload }).user;
  try {
    const { name, sport, city, district, address, lat, lng, googleMapsUrl, phone, notes } = req.body as Record<string, string>;
    if (!name?.trim() || !sport) {
      return res.status(400).json({ success: false, error: "الاسم والرياضة مطلوبان" });
    }

    // تحقق من عدم تكرار نفس الاقتراح
    const existing = await db.query.venueSuggestionsTable.findFirst({
      where: and(
        eq(venueSuggestionsTable.suggestedBy, user.userId),
        like(venueSuggestionsTable.name, name.trim()),
        eq(venueSuggestionsTable.status, "pending"),
      ),
    });
    if (existing) {
      return res.status(409).json({ success: false, error: "لديك اقتراح مشابه قيد المراجعة بالفعل" });
    }

    const { usersTable } = await import("@workspace/db/schema");
    const dbUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, user.userId) });

    const suggestion = await db.insert(venueSuggestionsTable).values({
      id: generateId("vs_"),
      name: name.trim(),
      sport,
      city: city ?? null,
      district: district ?? null,
      address: address ?? null,
      lat: lat ? parseFloat(lat as string) : null,
      lng: lng ? parseFloat(lng as string) : null,
      googleMapsUrl: googleMapsUrl ?? null,
      phone: phone ?? null,
      notes: notes ?? null,
      suggestedBy: user.userId,
      suggestedByName: dbUser?.name ?? null,
      status: "pending",
    }).returning();

    return res.json({ success: true, suggestion: suggestion[0] });
  } catch {
    return res.status(500).json({ success: false, error: "فشل إرسال الاقتراح" });
  }
});

// ─── Auth: تقييم ملعب بعد مباراة ────────────────────────────────────────
// POST /venues/:id/reviews  (id can be "unknown" for unverified venues)
router.post("/venues/:id/reviews", requireAuth, async (req, res) => {
  const user = (req as Request & { user: JwtPayload }).user;
  try {
    const { matchId, rating, comment, venueName } = req.body as {
      matchId: string;
      rating: number;
      comment?: string;
      venueName?: string;
    };

    if (!matchId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: "البيانات غير صحيحة" });
    }

    const rawId = getParam(req.params["id"] as string);
    const venueId = rawId === "unknown" ? null : rawId;

    const review = await db.insert(venueReviewsTable).values({
      id: generateId("vr_"),
      venueId,
      venueName: venueName ?? rawId,
      matchId,
      userId: user.userId,
      rating,
      comment: comment ?? null,
    }).returning();

    // حدّث متوسط التقييم في جدول الملاعب إذا كان الملعب معروفاً
    if (venueId) {
      const avgResult = await db
        .select({ avg: sql<number>`AVG(${venueReviewsTable.rating})`, count: sql<number>`COUNT(*)` })
        .from(venueReviewsTable)
        .where(eq(venueReviewsTable.venueId, venueId));

      const avg = avgResult[0];
      if (avg) {
        await db.update(venuesTable).set({
          rating: Math.round((avg.avg ?? 0) * 10) / 10,
          ratingCount: Number(avg.count),
          updatedAt: new Date(),
        }).where(eq(venuesTable.id, venueId));
      }
    }

    return res.json({ success: true, review: review[0] });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ success: false, error: "قيّمت هذا الملعب بالفعل لهذه المباراة" });
    }
    return res.status(500).json({ success: false, error: "فشل إرسال التقييم" });
  }
});

// ─── Public: تقييمات ملعب ────────────────────────────────────────────────
// GET /venues/:id/reviews
router.get("/venues/:id/reviews", async (req, res) => {
  try {
    const venueId = getParam(req.params["id"] as string);
    const reviews = await db
      .select()
      .from(venueReviewsTable)
      .where(eq(venueReviewsTable.venueId, venueId))
      .orderBy(desc(venueReviewsTable.createdAt))
      .limit(20);

    res.json({ success: true, reviews });
  } catch {
    res.status(500).json({ success: false, error: "فشل جلب التقييمات" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — تحتاج صلاحيات أدمن
// ═══════════════════════════════════════════════════════════════════════════

// POST /admin/venues — إضافة ملعب مباشرة
router.post("/admin/venues", requireAdmin, async (req, res) => {
  try {
    const { name, nameEn, sport, city, district, address, lat, lng, googleMapsUrl, phone, priceRange } = req.body;
    if (!name?.trim() || !sport || !city?.trim()) {
      return res.status(400).json({ success: false, error: "الاسم والرياضة والمدينة مطلوبة" });
    }
    const venue = await db.insert(venuesTable).values({
      id: generateId("v_"),
      name: name.trim(),
      nameEn: nameEn ?? null,
      sport,
      city: city.trim(),
      district: district ?? null,
      address: address ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      googleMapsUrl: googleMapsUrl ?? null,
      phone: phone ?? null,
      priceRange: priceRange ?? null,
      isVerified: true,
      status: "active",
    }).returning();
    return res.json({ success: true, venue: venue[0] });
  } catch {
    return res.status(500).json({ success: false, error: "فشل إضافة الملعب" });
  }
});

// PATCH /admin/venues/:id — تعديل ملعب
router.patch("/admin/venues/:id", requireAdmin, async (req, res) => {
  try {
    const venueId = getParam(req.params["id"] as string);
    const updated = await db.update(venuesTable).set({
      ...req.body,
      updatedAt: new Date(),
    }).where(eq(venuesTable.id, venueId)).returning();
    if (!updated.length) return res.status(404).json({ success: false, error: "الملعب غير موجود" });
    return res.json({ success: true, venue: updated[0] });
  } catch {
    return res.status(500).json({ success: false, error: "فشل تعديل الملعب" });
  }
});

// DELETE /admin/venues/:id — حذف/إيقاف ملعب
router.delete("/admin/venues/:id", requireAdmin, async (req, res) => {
  try {
    const venueId = getParam(req.params["id"] as string);
    await db.update(venuesTable).set({ status: "inactive", updatedAt: new Date() })
      .where(eq(venuesTable.id, venueId));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: "فشل حذف الملعب" });
  }
});

// GET /admin/venues/suggestions — قائمة الاقتراحات
router.get("/admin/venues/suggestions", requireAdmin, async (req, res) => {
  try {
    const { status = "pending" } = req.query as { status?: string };
    const suggestions = await db
      .select()
      .from(venueSuggestionsTable)
      .where(eq(venueSuggestionsTable.status, status))
      .orderBy(desc(venueSuggestionsTable.createdAt));
    return res.json({ success: true, suggestions });
  } catch {
    return res.status(500).json({ success: false, error: "فشل جلب الاقتراحات" });
  }
});

// POST /admin/venues/suggestions/:id/approve — اعتماد اقتراح
router.post("/admin/venues/suggestions/:id/approve", requireAdmin, async (req, res) => {
  const adminUser = (req as any).adminUser;
  try {
    const suggestionId = getParam(req.params["id"] as string);
    const suggestion = await db.query.venueSuggestionsTable.findFirst({
      where: eq(venueSuggestionsTable.id, suggestionId),
    });
    if (!suggestion) return res.status(404).json({ success: false, error: "الاقتراح غير موجود" });
    if (suggestion.status !== "pending") return res.status(409).json({ success: false, error: "تمت مراجعة هذا الاقتراح بالفعل" });

    // أضف الملعب المعتمد
    const venue = await db.insert(venuesTable).values({
      id: generateId("v_"),
      name: suggestion.name,
      sport: suggestion.sport,
      city: suggestion.city ?? "غير محدد",
      district: suggestion.district ?? null,
      address: suggestion.address ?? null,
      lat: suggestion.lat ?? null,
      lng: suggestion.lng ?? null,
      googleMapsUrl: suggestion.googleMapsUrl ?? null,
      phone: suggestion.phone ?? null,
      isVerified: true,
      status: "active",
    }).returning();

    // حدّث حالة الاقتراح
    await db.update(venueSuggestionsTable).set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminUser?.name ?? administrationUserId(req),
      adminNote: req.body.adminNote ?? null,
    }).where(eq(venueSuggestionsTable.id, suggestionId));

    // أشعر المستخدم المقترح
    const { sendNotification } = await import("../lib/push");
    await sendNotification(
      suggestion.suggestedBy,
      "system",
      "✅ تم اعتماد اقتراحك",
      `ملعب "${suggestion.name}" أضفناه للقائمة المعتمدة. شكراً لمساهمتك!`,
    );

    return res.json({ success: true, venue: venue[0] });
  } catch {
    return res.status(500).json({ success: false, error: "فشل اعتماد الاقتراح" });
  }
});

// POST /admin/venues/suggestions/:id/reject — رفض اقتراح
router.post("/admin/venues/suggestions/:id/reject", requireAdmin, async (req, res) => {
  const adminUser = (req as any).adminUser;
  try {
    const suggestionId = getParam(req.params["id"] as string);
    const suggestion = await db.query.venueSuggestionsTable.findFirst({
      where: eq(venueSuggestionsTable.id, suggestionId),
    });
    if (!suggestion) return res.status(404).json({ success: false, error: "الاقتراح غير موجود" });

    await db.update(venueSuggestionsTable).set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: adminUser?.name ?? administrationUserId(req),
      adminNote: req.body.adminNote ?? null,
    }).where(eq(venueSuggestionsTable.id, suggestionId));

    // أشعر المستخدم
    const { sendNotification } = await import("../lib/push");
    await sendNotification(
      suggestion.suggestedBy,
      "system",
      "اقتراح الملعب",
      `شكراً لاقتراحك ملعب "${suggestion.name}". لم نتمكن من إضافته حالياً.`,
    );

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: "فشل رفض الاقتراح" });
  }
});

function administrationUserId(req: Request): string {
  return (req as any).user?.userId ?? "admin";
}

export default router;

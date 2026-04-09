import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

type AuthRequest = Request & { user: JwtPayload };

router.get("/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user.userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  const notifications = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    linkedId: n.relatedId ?? undefined,
    isRead: n.read,
    time: n.createdAt,
  }));

  res.json({ notifications });
});

router.patch("/notifications/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, req.user.userId));

  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const notifId = Array.isArray(req.params["id"]) ? req.params["id"][0]! : req.params["id"] as string;

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(
      eq(notificationsTable.id, notifId),
      eq(notificationsTable.userId, req.user.userId),
    ));

  res.json({ success: true });
});

router.delete("/notifications/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const notifId = Array.isArray(req.params["id"]) ? req.params["id"][0]! : req.params["id"] as string;

  const deleted = await db
    .delete(notificationsTable)
    .where(and(
      eq(notificationsTable.id, notifId),
      eq(notificationsTable.userId, req.user.userId),
    ))
    .returning({ id: notificationsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ success: false, error: "الإشعار غير موجود" });
    return;
  }

  res.json({ success: true });
});

router.delete("/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
  await db
    .delete(notificationsTable)
    .where(eq(notificationsTable.userId, req.user.userId));

  res.json({ success: true });
});

export default router;

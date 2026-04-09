import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateId } from "../lib/id";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

type AuthRequest = Request & { user: JwtPayload };

router.post("/push/register", requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as { token?: string };
  const { token } = body;

  if (!token) {
    res.status(400).json({ success: false, error: "رمز الإشعار مطلوب" });
    return;
  }

  const existing = await db.query.pushTokensTable.findFirst({
    where: eq(pushTokensTable.token, token),
  });

  if (existing) {
    if (existing.userId !== req.user.userId) {
      await db
        .update(pushTokensTable)
        .set({ userId: req.user.userId, updatedAt: new Date() })
        .where(eq(pushTokensTable.token, token));
    }
    res.json({ success: true });
    return;
  }

  await db.insert(pushTokensTable).values({
    id: generateId("pt_"),
    userId: req.user.userId,
    token,
  });

  res.json({ success: true });
});

router.delete("/push/unregister", requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as { token?: string };
  const { token } = body;

  if (!token) {
    res.status(400).json({ success: false, error: "رمز الإشعار مطلوب" });
    return;
  }

  await db
    .delete(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.token, token),
        eq(pushTokensTable.userId, req.user.userId),
      ),
    );

  res.json({ success: true });
});

export default router;

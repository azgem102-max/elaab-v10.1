import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "./auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AdminRequest extends Request {
  user: JwtPayload;
  adminUser?: typeof usersTable.$inferSelect;
}

/**
 * Middleware: يتحقق أن المستخدم مسجّل دخول وصلاحيته isAdmin = true
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "مطلوب تسجيل الدخول" });
    return;
  }

  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ success: false, error: "رمز المصادقة غير صالح" });
    return;
  }

  const user = await db.query.usersTable
    .findFirst({ where: eq(usersTable.id, payload.userId) })
    .catch(() => null);

  if (!user?.isAdmin) {
    res.status(403).json({ success: false, error: "غير مصرح لك بالوصول" });
    return;
  }

  (req as AdminRequest).user = payload;
  (req as AdminRequest).adminUser = user;
  next();
}

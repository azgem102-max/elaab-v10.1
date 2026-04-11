import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

function loadJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (secret) return secret;

  if (process.env["NODE_ENV"] === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }

  const generated = randomBytes(64).toString("hex");
  process.env["JWT_SECRET"] = generated;
  return generated;
}

const JWT_SECRET = loadJwtSecret();

export interface JwtPayload {
  userId: string;
  phone: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "مطلوب تسجيل الدخول" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "رمز المصادقة غير صالح" });
  }
}

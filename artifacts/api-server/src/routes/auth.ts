import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, otpCodesTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signToken } from "../lib/auth";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber = process.env["TWILIO_PHONE_NUMBER"];

  if (!accountSid || !authToken || !fromNumber) {
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const formData = new URLSearchParams();
  formData.append("To", to);
  formData.append("From", fromNumber);
  formData.append("Body", body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.warn({ to, status: response.status, body: text }, "Twilio SMS failed");
  }
}

const SAUDI_E164_REGEX = /^\+9665\d{8}$/;

router.post("/auth/request-otp", async (req: Request, res: Response) => {
  try {
    const body = req.body as { phone?: string };
    const phone = (body.phone ?? "").trim();
    if (!phone) {
      res.status(400).json({ success: false, error: "رقم الجوال مطلوب" });
      return;
    }

    if (!SAUDI_E164_REGEX.test(phone)) {
      res.status(400).json({ success: false, error: "صيغة رقم الجوال غير صحيحة. يجب أن يكون بصيغة +9665XXXXXXXX" });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({
      id: generateId("otp_"),
      phone,
      code: otp,
      expiresAt,
      used: 0,
    });

    const hasTwilio =
      !!process.env["TWILIO_ACCOUNT_SID"] &&
      !!process.env["TWILIO_AUTH_TOKEN"] &&
      !!process.env["TWILIO_PHONE_NUMBER"];

    const isDev = process.env["NODE_ENV"] !== "production";

    if (hasTwilio) {
      await sendSms(phone, `رمز التحقق الخاص بك في العب: ${otp}. صالح لمدة 10 دقائق.`);
      logger.info({ phone }, "OTP sent via Twilio SMS");
    } else if (isDev) {
      logger.info({ phone, otp }, "OTP generated (Twilio not configured - dev console only)");
      logger.info("TEST MODE: You can use any 6-digit code to log in in dev mode.");
    } else {
      logger.error({ phone }, "SMS cannot be sent: Twilio not configured in production");
      res.status(503).json({ success: false, error: "خدمة الرسائل غير متاحة حالياً" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in request-otp");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم. حاول مرة أخرى." });
  }
});

router.post("/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const body = req.body as { phone?: string; otp?: string };
    const phone = (body.phone ?? "").trim();
    const otp = (body.otp ?? "").trim();

    if (!phone || !otp) {
      res.status(400).json({ success: false, error: "رقم الجوال والرمز مطلوبان" });
      return;
    }

    if (!SAUDI_E164_REGEX.test(phone)) {
      res.status(400).json({ success: false, error: "صيغة رقم الجوال غير صحيحة" });
      return;
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ success: false, error: "الرمز يجب أن يكون ٦ أرقام" });
      return;
    }

    const now = new Date();
    const allowDevBypass = process.env["ALLOW_DEV_OTP_BYPASS"] === "true" || process.env["NODE_ENV"] === "development";
    const isDevBypass = allowDevBypass && /^\d{6}$/.test(otp);

    const validOtp = isDevBypass ? null : await db.query.otpCodesTable.findFirst({
      where: and(
        eq(otpCodesTable.phone, phone),
        eq(otpCodesTable.code, otp),
        eq(otpCodesTable.used, 0),
        gt(otpCodesTable.expiresAt, now),
      ),
    });

    if (!isDevBypass && !validOtp) {
      res.status(400).json({ success: false, error: "الرمز غير صحيح أو منتهي الصلاحية" });
      return;
    }

    if (validOtp) {
      await db
        .update(otpCodesTable)
        .set({ used: 1 })
        .where(eq(otpCodesTable.id, validOtp.id));
    }

    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.phone, phone),
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const userId = generateId("u_");
      await db.insert(usersTable).values({
        id: userId,
        phone,
        name: null,
        avatarUrl: null,
      });
      user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });
    } else if (!user.name) {
      isNewUser = true;
    }

    if (!user) {
      res.status(500).json({ success: false, error: "خطأ في إنشاء الحساب" });
      return;
    }

    const token = signToken({ userId: user.id, phone: user.phone });

    res.json({
      success: true,
      token,
      userId: user.id,
      name: user.name ?? "مستخدم",
      isNewUser,
    });
  } catch (err) {
    logger.error({ err }, "Error in verify-otp");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم. حاول مرة أخرى." });
  }
});

export default router;

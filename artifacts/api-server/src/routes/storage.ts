import { Router, type IRouter, type Request, type Response } from "express";
import { downloadAvatar } from "../lib/storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /storage/avatar?key=avatars/userId/timestamp.png
 * Proxy endpoint to serve avatar images from GCS (bypasses public access prevention).
 */
router.get("/storage/avatar", async (req: Request, res: Response) => {
  const key = typeof req.query["key"] === "string" ? req.query["key"] : null;

  if (!key || !key.startsWith("avatars/")) {
    res.status(400).json({ success: false, error: "مسار الصورة غير صالح" });
    return;
  }

  try {
    const { buffer, contentType } = await downloadAvatar(key);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000");
    res.send(buffer);
  } catch (err: unknown) {
    const isNotFound =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 404;

    if (isNotFound) {
      res.status(404).json({ success: false, error: "الصورة غير موجودة" });
    } else {
      logger.error({ err, key }, "Avatar proxy download failed");
      res.status(500).json({ success: false, error: "فشل تحميل الصورة" });
    }
  }
});

export default router;

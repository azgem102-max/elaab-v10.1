import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

export default router;

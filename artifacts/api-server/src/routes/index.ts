import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import groupsRouter from "./groups";
import authRouter from "./auth";
import usersRouter from "./users";
import pushRouter from "./push";
import notificationsRouter from "./notifications";
import storageRouter from "./storage";
import landingRouter from "./landing";
import venuesRouter from "./venues";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchesRouter);
router.use(groupsRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(pushRouter);
router.use(notificationsRouter);
router.use(storageRouter);
router.use(landingRouter);
router.use(venuesRouter);
router.use(adminRouter);

export default router;


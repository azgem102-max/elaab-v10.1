import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, usersTable, inviteLinksTable, matchesTable, matchPlayersTable, groupMessagesTable, groupJoinRequestsTable } from "@workspace/db/schema";
import { eq, and, ilike, or, inArray, lt, desc, gt, asc } from "drizzle-orm";
import { requireAuth, verifyToken } from "../lib/auth";
import { generateId } from "../lib/id";
import { sendNotification } from "../lib/push";
import type { JwtPayload } from "../lib/auth";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router: IRouter = Router();

type AuthRequest = Request & { user: JwtPayload };

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0]! : param;
}

async function buildGroupSummary(group: typeof groupsTable.$inferSelect, userId?: string) {
  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));

  const admin = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, group.adminId),
  });

  const isJoined = userId ? members.some((m) => m.userId === userId) : false;

  let hasPendingRequest = false;
  if (userId && !isJoined) {
    const pendingRequest = await db.query.groupJoinRequestsTable.findFirst({
      where: and(
        eq(groupJoinRequestsTable.groupId, group.id),
        eq(groupJoinRequestsTable.userId, userId),
        eq(groupJoinRequestsTable.status, "pending"),
      ),
    });
    hasPendingRequest = !!pendingRequest;
  }

  return {
    id: group.id,
    name: group.name,
    sport: group.sport,
    description: group.description ?? "",
    memberCount: members.length,
    adminId: group.adminId,
    adminName: admin?.name ?? "مستخدم",
    isPublic: group.isPublic,
    nextMatch: null as string | null,
    isJoined,
    hasPendingRequest,
  };
}

async function buildGroupDetail(group: typeof groupsTable.$inferSelect, userId?: string) {
  const memberRows = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, group.id));

  const admin = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, group.adminId),
  });

  const memberUsers = await Promise.all(
    memberRows.map((m) =>
      db.query.usersTable.findFirst({ where: eq(usersTable.id, m.userId) })
    )
  );

  const isJoined = userId ? memberRows.some((m) => m.userId === userId) : false;

  let hasPendingRequest = false;
  if (userId && !isJoined) {
    const pendingRequest = await db.query.groupJoinRequestsTable.findFirst({
      where: and(
        eq(groupJoinRequestsTable.groupId, group.id),
        eq(groupJoinRequestsTable.userId, userId),
        eq(groupJoinRequestsTable.status, "pending"),
      ),
    });
    hasPendingRequest = !!pendingRequest;
  }

  const members = memberUsers
    .filter((u): u is NonNullable<typeof u> => u != null)
    .map((u) => {
      const memberRow = memberRows.find((m) => m.userId === u.id);
      let role: "owner" | "admin" | "member" = "member";
      if (memberRow?.role === "owner" || u.id === group.adminId) role = "owner";
      else if (memberRow?.role === "admin") role = "admin";
      return {
        id: u.id,
        nickname: u?.name ?? "مستخدم",
        reliability: null as number | null,
        sports: [] as string[],
        sportProfiles: {},
        matchesPlayed: 0,
        role,
      };
    });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const futureCandidates = await db
    .select()
    .from(matchesTable)
    .where(
      and(
        eq(matchesTable.invitedGroupId, group.id),
        eq(matchesTable.status, "upcoming"),
        or(
          gt(matchesTable.date, today),
          and(
            eq(matchesTable.date, today),
            gt(matchesTable.time, currentTime),
          ),
        ),
      )
    )
    .orderBy(asc(matchesTable.date), asc(matchesTable.time))
    .limit(1);

  let nextMatch: {
    id: string;
    title: string;
    date: string;
    time: string;
    sport: string;
    playerCount: number;
    maxPlayers: number;
  } | null = null;

  if (futureCandidates.length > 0) {
    const m = futureCandidates[0]!;
    const playerRows = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, m.id));

    nextMatch = {
      id: m.id,
      title: m.title,
      date: m.date,
      time: m.time,
      sport: m.sport,
      playerCount: playerRows.length,
      maxPlayers: m.maxPlayers,
    };
  }

  return {
    id: group.id,
    name: group.name,
    sport: group.sport,
    description: group.description ?? "",
    memberCount: memberRows.length,
    adminId: group.adminId,
    adminName: admin?.name ?? "مستخدم",
    isPublic: group.isPublic,
    nextMatch,
    isJoined,
    hasPendingRequest,
    members,
  };
}

router.get("/groups", async (req: Request, res: Response) => {
  const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
  const sport = typeof req.query["sport"] === "string" ? req.query["sport"].trim() : "";

  const authHeader = req.headers.authorization;
  let userId: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      userId = payload?.userId;
    } catch { }
  }

  let memberGroupIds: string[] = [];
  if (userId) {
    const memberships = await db
      .select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, userId));
    memberGroupIds = memberships.map((m) => m.groupId);
  }

  const searchConditions: ReturnType<typeof eq>[] = [];
  if (q) {
    searchConditions.push(
      or(
        ilike(groupsTable.name, `%${q}%`),
        ilike(groupsTable.sport, `%${q}%`)
      ) as ReturnType<typeof eq>
    );
  }
  if (sport) {
    searchConditions.push(eq(groupsTable.sport, sport));
  }

  let groups: typeof groupsTable.$inferSelect[] = [];

  if (memberGroupIds.length > 0) {
    const publicConditions = [eq(groupsTable.isPublic, true), ...searchConditions];
    const privateConditions = [
      eq(groupsTable.isPublic, false),
      inArray(groupsTable.id, memberGroupIds),
      ...searchConditions,
    ];

    const [publicGroups, privateGroups] = await Promise.all([
      db.select().from(groupsTable).where(and(...publicConditions)),
      db.select().from(groupsTable).where(and(...privateConditions)),
    ]);

    const seen = new Set<string>();
    for (const g of [...publicGroups, ...privateGroups]) {
      if (!seen.has(g.id)) { seen.add(g.id); groups.push(g); }
    }
  } else {
    const publicConditions = [eq(groupsTable.isPublic, true), ...searchConditions];
    groups = await db.select().from(groupsTable).where(and(...publicConditions));
  }

  const summaries = await Promise.all(groups.map((g) => buildGroupSummary(g, userId)));
  res.json({ groups: summaries });
});

router.get("/groups/:id", async (req: Request, res: Response) => {
  const groupId = getParam(req.params["id"] as string);

  const authHeader = req.headers.authorization;
  let userId: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      userId = payload?.userId;
    } catch { }
  }

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  if (!group.isPublic && userId) {
    const membership = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    });
    if (!membership) {
      res.status(403).json({ success: false, error: "هذه المجموعة خاصة" });
      return;
    }
  } else if (!group.isPublic && !userId) {
    res.status(403).json({ success: false, error: "هذه المجموعة خاصة" });
    return;
  }

  const detail = await buildGroupDetail(group, userId);
  res.json({ group: detail });
});

const VALID_SPORTS = ["football", "padel", "tennis"] as const;
const GROUP_NAME_MAX_LENGTH = 60;

router.post("/groups", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as {
      name?: string;
      sport?: string;
      description?: string;
      isPublic?: boolean;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const sport = typeof body.sport === "string" ? body.sport.trim() : "";
    const { description, isPublic } = body;

    if (!name || !sport) {
      res.status(400).json({ success: false, error: "اسم المجموعة والرياضة مطلوبان" });
      return;
    }

    if (name.length > GROUP_NAME_MAX_LENGTH) {
      res.status(400).json({ success: false, error: `اسم المجموعة يجب ألا يتجاوز ${GROUP_NAME_MAX_LENGTH} حرفاً` });
      return;
    }

    if (!(VALID_SPORTS as readonly string[]).includes(sport)) {
      res.status(400).json({ success: false, error: `الرياضة غير مدعومة. القيم المسموحة: ${VALID_SPORTS.join("، ")}` });
      return;
    }

    const groupId = generateId("g_");
    await db.insert(groupsTable).values({
      id: groupId,
      name,
      sport,
      description: description ?? "",
      isPublic: isPublic !== false,
      adminId: req.user.userId,
    });

    await db.insert(groupMembersTable).values({
      id: generateId("gm_"),
      groupId,
      userId: req.user.userId,
      role: "owner",
    });

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(500).json({ success: false, error: "خطأ في إنشاء المجموعة" });
      return;
    }

    const summary = await buildGroupSummary(group, req.user.userId);
    res.status(201).json({ group: summary });
  } catch (err) {
    logger.error({ err }, "Error creating group");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم عند إنشاء المجموعة" });
  }
});

router.post("/groups/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = getParam(req.params["id"] as string);
    const userId = req.user.userId;

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    if (!group.isPublic) {
      res.status(403).json({ success: false, error: "هذه المجموعة خاصة، يلزم دعوة من المشرف" });
      return;
    }

    const existing = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    });

    if (existing) {
      res.status(409).json({ success: false, error: "أنت عضو بالفعل في هذه المجموعة" });
      return;
    }

    const memberCount = await db.transaction(async (tx) => {
      await tx
        .delete(groupJoinRequestsTable)
        .where(
          and(
            eq(groupJoinRequestsTable.groupId, groupId),
            eq(groupJoinRequestsTable.userId, userId),
          ),
        );

      await tx.insert(groupMembersTable).values({
        id: generateId("gm_"),
        groupId,
        userId,
        role: "member",
      });

      const members = await tx
        .select({ id: groupMembersTable.id })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, groupId));

      return members.length;
    });

    res.json({ success: true, status: "joined", memberCount });
  } catch (err) {
    logger.error({ err }, "Error joining group");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم عند الانضمام للمجموعة" });
  }
});

router.get("/groups/:id/join-requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = getParam(req.params["id"] as string);
    const requesterId = req.user.userId;

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    const requesterMembership = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, requesterId),
      ),
    });
    const isRequesterAdmin = group.adminId === requesterId || requesterMembership?.role === "admin" || requesterMembership?.role === "owner";

    if (!isRequesterAdmin) {
      res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه رؤية طلبات الانضمام" });
      return;
    }

    const requests = await db
      .select()
      .from(groupJoinRequestsTable)
      .where(
        and(
          eq(groupJoinRequestsTable.groupId, groupId),
          eq(groupJoinRequestsTable.status, "pending"),
        ),
      );

    const requestsWithUsers = await Promise.all(
      requests.map(async (r) => {
        const user = await db.query.usersTable.findFirst({
          where: eq(usersTable.id, r.userId),
        });
        const playerRows = await db
          .select()
          .from(matchPlayersTable)
          .where(eq(matchPlayersTable.userId, r.userId));
        const matchesPlayed = playerRows.length;
        return {
          id: r.id,
          userId: r.userId,
          nickname: user?.name ?? "مستخدم",
          reliability: user?.reliability ?? null,
          matchesPlayed,
          requestedAt: r.requestedAt,
        };
      }),
    );

    res.json({ success: true, requests: requestsWithUsers });
  } catch (err) {
    logger.error({ err }, "Error getting join requests");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم" });
  }
});

router.post("/groups/:id/join-requests/:requestId/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = getParam(req.params["id"] as string);
    const requestId = getParam(req.params["requestId"] as string);
    const reviewerId = req.user.userId;

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    const reviewerMembership = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, reviewerId),
      ),
    });
    const isReviewerAdmin = group.adminId === reviewerId || reviewerMembership?.role === "admin" || reviewerMembership?.role === "owner";

    if (!isReviewerAdmin) {
      res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه الموافقة على الطلبات" });
      return;
    }

    const joinRequest = await db.query.groupJoinRequestsTable.findFirst({
      where: and(
        eq(groupJoinRequestsTable.id, requestId),
        eq(groupJoinRequestsTable.groupId, groupId),
        eq(groupJoinRequestsTable.status, "pending"),
      ),
    });

    if (!joinRequest) {
      res.status(404).json({ success: false, error: "الطلب غير موجود أو تمت مراجعته بالفعل" });
      return;
    }

    await db
      .update(groupJoinRequestsTable)
      .set({ status: "approved", reviewedAt: new Date(), reviewedBy: reviewerId })
      .where(eq(groupJoinRequestsTable.id, requestId));

    const existingMember = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, joinRequest.userId),
      ),
    });

    if (!existingMember) {
      await db.insert(groupMembersTable).values({
        id: generateId("gm_"),
        groupId,
        userId: joinRequest.userId,
        role: "member",
      });
    }

    await sendNotification(
      joinRequest.userId,
      "group",
      "تمت الموافقة على طلبك ✓",
      `تمت الموافقة على طلب انضمامك لمجموعة "${group.name}"`,
      groupId,
    ).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error approving join request");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم" });
  }
});

router.post("/groups/:id/join-requests/:requestId/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = getParam(req.params["id"] as string);
    const requestId = getParam(req.params["requestId"] as string);
    const reviewerId = req.user.userId;

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    const reviewerMembership = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, reviewerId),
      ),
    });
    const isReviewerAdmin = group.adminId === reviewerId || reviewerMembership?.role === "admin" || reviewerMembership?.role === "owner";

    if (!isReviewerAdmin) {
      res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه رفض الطلبات" });
      return;
    }

    const joinRequest = await db.query.groupJoinRequestsTable.findFirst({
      where: and(
        eq(groupJoinRequestsTable.id, requestId),
        eq(groupJoinRequestsTable.groupId, groupId),
        eq(groupJoinRequestsTable.status, "pending"),
      ),
    });

    if (!joinRequest) {
      res.status(404).json({ success: false, error: "الطلب غير موجود أو تمت مراجعته بالفعل" });
      return;
    }

    await db
      .update(groupJoinRequestsTable)
      .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: reviewerId })
      .where(eq(groupJoinRequestsTable.id, requestId));

    await sendNotification(
      joinRequest.userId,
      "group",
      "تم رفض طلب الانضمام",
      `تم رفض طلب انضمامك لمجموعة "${group.name}"`,
      groupId,
    ).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error rejecting join request");
    res.status(500).json({ success: false, error: "حدث خطأ في الخادم" });
  }
});

router.post("/groups/:id/invite", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const requesterId = req.user.userId;
  const body = (req.body ?? {}) as { inviteeId?: string };

  if (!body.inviteeId) {
    res.status(400).json({ success: false, error: "معرف المستخدم المدعو مطلوب" });
    return;
  }

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const requesterMembership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, requesterId),
    ),
  });
  const isRequesterAdmin = group.adminId === requesterId || requesterMembership?.role === "admin" || requesterMembership?.role === "owner";
  if (!isRequesterAdmin) {
    res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه دعوة أعضاء" });
    return;
  }

  const existing = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, body.inviteeId),
    ),
  });

  if (existing) {
    res.status(409).json({ success: false, error: "المستخدم عضو بالفعل في هذه المجموعة" });
    return;
  }

  const requester = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, requesterId),
  });
  const requesterName = requester?.name ?? "مشرف المجموعة";

  await sendNotification(
    body.inviteeId,
    "group",
    "دعوة لمجموعة 👥",
    `${requesterName} يدعوك للانضمام إلى مجموعة "${group.name}"`,
    groupId,
  );

  res.json({ success: true });
});

router.post("/groups/:id/invite-link", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const requesterId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const requesterMembershipLink = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, requesterId),
    ),
  });
  const isRequesterAdminLink = group.adminId === requesterId || requesterMembershipLink?.role === "admin" || requesterMembershipLink?.role === "owner";
  if (!isRequesterAdminLink) {
    res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه إنشاء رابط دعوة" });
    return;
  }

  await db
    .delete(inviteLinksTable)
    .where(
      and(
        eq(inviteLinksTable.targetId, groupId),
        eq(inviteLinksTable.targetType, "group"),
        or(
          eq(inviteLinksTable.isRevoked, true),
          lt(inviteLinksTable.expiresAt, new Date()),
        ),
      ),
    );

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(inviteLinksTable).values({
    id: generateId("inv_"),
    token,
    targetType: "group",
    targetId: groupId,
    createdBy: requesterId,
    expiresAt,
    isRevoked: false,
  });

  res.json({ success: true, token, expiresAt: expiresAt.toISOString() });
});

router.get("/invites/:token", async (req: Request, res: Response) => {
  const token = getParam(req.params["token"] as string);

  const invite = await db.query.inviteLinksTable.findFirst({
    where: eq(inviteLinksTable.token, token),
  });

  if (!invite) {
    res.status(404).json({ success: false, error: "رابط الدعوة غير موجود" });
    return;
  }

  if (invite.isRevoked) {
    res.status(410).json({ success: false, error: "رابط الدعوة ملغى" });
    return;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ success: false, error: "رابط الدعوة منتهي الصلاحية" });
    return;
  }

  if (invite.targetType === "group") {
    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, invite.targetId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyToken(authHeader.slice(7));
        userId = payload?.userId;
      } catch { }
    }

    const admin = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, group.adminId),
    });

    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
    const isJoined = userId ? members.some((m) => m.userId === userId) : false;

    return res.json({
      success: true,
      invite: {
        targetType: "group",
        group: {
          id: group.id,
          name: group.name,
          sport: group.sport,
          description: group.description ?? "",
          memberCount: members.length,
          adminId: group.adminId,
          adminName: admin?.name ?? "مستخدم",
          isPublic: group.isPublic,
          isJoined,
        },
      },
    });
  }

  if (invite.targetType === "match") {
    const match = await db.query.matchesTable.findFirst({
      where: eq(matchesTable.id, invite.targetId),
    });

    if (!match) {
      res.status(404).json({ success: false, error: "المباراة غير موجودة" });
      return;
    }

    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyToken(authHeader.slice(7));
        userId = payload?.userId;
      } catch { }
    }

    const organizer = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, match.organizerId),
    });

    const players = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, match.id));
    const isJoined = userId ? players.some((p) => p.userId === userId) : false;

    return res.json({
      success: true,
      invite: {
        targetType: "match",
        match: {
          id: match.id,
          title: match.title,
          sport: match.sport,
          date: match.date,
          time: match.time,
          venue: match.venue,
          maxPlayers: match.maxPlayers,
          playerCount: players.length,
          organizerId: match.organizerId,
          organizerName: organizer?.name ?? "منظّم",
          isPublic: match.isPublic,
          isJoined,
        },
      },
    });
  }

  return res.status(400).json({ success: false, error: "نوع الدعوة غير مدعوم" });
});

router.post("/invites/:token/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  const token = getParam(req.params["token"] as string);
  const userId = req.user.userId;

  const invite = await db.query.inviteLinksTable.findFirst({
    where: eq(inviteLinksTable.token, token),
  });

  if (!invite) {
    res.status(404).json({ success: false, error: "رابط الدعوة غير موجود" });
    return;
  }

  if (invite.isRevoked) {
    res.status(410).json({ success: false, error: "رابط الدعوة ملغى" });
    return;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(410).json({ success: false, error: "رابط الدعوة منتهي الصلاحية" });
    return;
  }

  if (invite.targetType === "group") {
    const groupId = invite.targetId;

    const group = await db.query.groupsTable.findFirst({
      where: eq(groupsTable.id, groupId),
    });

    if (!group) {
      res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
      return;
    }

    const existing = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    });

    if (existing) {
      return res.json({ success: true, alreadyMember: true, groupId });
    }

    await db.insert(groupMembersTable).values({
      id: generateId("gm_"),
      groupId,
      userId,
    });

    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
    return res.json({ success: true, alreadyMember: false, groupId, memberCount: members.length });
  }

  if (invite.targetType === "match") {
    const matchId = invite.targetId;

    const match = await db.query.matchesTable.findFirst({
      where: eq(matchesTable.id, matchId),
    });

    if (!match) {
      res.status(404).json({ success: false, error: "المباراة غير موجودة" });
      return;
    }

    const existingPlayer = await db.query.matchPlayersTable.findFirst({
      where: and(
        eq(matchPlayersTable.matchId, matchId),
        eq(matchPlayersTable.userId, userId),
      ),
    });

    if (existingPlayer) {
      return res.json({ success: true, alreadyMember: true, matchId });
    }

    const currentPlayers = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
    if (currentPlayers.length >= match.maxPlayers) {
      res.status(400).json({ success: false, error: "المباراة مكتملة، لا توجد أماكن متاحة" });
      return;
    }

    const userOtherPlayerRows = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.userId, userId));

    if (userOtherPlayerRows.length > 0) {
      const userMatchIds = userOtherPlayerRows.map((p) => p.matchId);
      const otherMatches = await db
        .select()
        .from(matchesTable)
        .where(inArray(matchesTable.id, userMatchIds));

      const DURATION_MS = 2 * 60 * 60 * 1000;
      const targetStart = new Date(`${match.date}T${match.time}:00`).getTime();
      const targetEnd = targetStart + DURATION_MS;

      for (const otherMatch of otherMatches) {
        if (otherMatch.id === matchId) continue;
        const otherStart = new Date(`${otherMatch.date}T${otherMatch.time}:00`).getTime();
        const otherEnd = otherStart + DURATION_MS;
        if (targetStart < otherEnd && otherStart < targetEnd) {
          res.status(409).json({
            success: false,
            error: `يوجد تعارض مع مباراة أخرى: ${otherMatch.title} في ${otherMatch.time}`,
            conflictMatch: { id: otherMatch.id, title: otherMatch.title, time: otherMatch.time, date: otherMatch.date },
          });
          return;
        }
      }
    }

    await db.insert(matchPlayersTable).values({
      id: generateId("mp_"),
      matchId,
      userId,
      position: null,
      attended: false,
      paid: false,
    });

    const allPlayers = await db.select().from(matchPlayersTable).where(eq(matchPlayersTable.matchId, matchId));
    return res.json({ success: true, alreadyMember: false, matchId, playerCount: allPlayers.length });
  }

  return res.status(400).json({ success: false, error: "نوع الدعوة غير مدعوم" });
});

router.delete("/groups/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const targetUserId = getParam(req.params["userId"] as string);
  const requesterId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const requesterMembershipRemove = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, requesterId),
    ),
  });
  const isRequesterAdminRemove = group.adminId === requesterId || requesterMembershipRemove?.role === "admin" || requesterMembershipRemove?.role === "owner";
  if (!isRequesterAdminRemove) {
    res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه إزالة الأعضاء" });
    return;
  }

  if (targetUserId === requesterId) {
    res.status(400).json({ success: false, error: "لا يمكن للمشرف إزالة نفسه" });
    return;
  }

  if (targetUserId === group.adminId) {
    res.status(403).json({ success: false, error: "لا يمكن إزالة مالك المجموعة" });
    return;
  }

  const membership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, targetUserId),
    ),
  });

  if (!membership) {
    res.status(404).json({ success: false, error: "العضو غير موجود في المجموعة" });
    return;
  }

  await db
    .delete(groupMembersTable)
    .where(and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, targetUserId),
    ));

  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  res.json({ success: true, memberCount: members.length });
});

router.post("/groups/:id/leave", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const userId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  if (group.adminId === userId) {
    res.status(403).json({ success: false, error: "المشرف لا يمكنه مغادرة المجموعة" });
    return;
  }

  await db
    .delete(groupMembersTable)
    .where(and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, userId),
    ));

  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  res.json({ success: true, memberCount: members.length });
});

router.get("/groups/:id/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const userId = req.user.userId;
  const afterStr = typeof req.query["after"] === "string" ? req.query["after"] : undefined;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const membership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, userId),
    ),
  });

  if (!membership) {
    res.status(403).json({ success: false, error: "يجب أن تكون عضواً في المجموعة للوصول للدردشة" });
    return;
  }

  let messages;
  if (afterStr) {
    const afterDate = new Date(afterStr);
    if (isNaN(afterDate.getTime())) {
      res.status(400).json({ success: false, error: "قيمة after غير صالحة" });
      return;
    }
    messages = await db
      .select()
      .from(groupMessagesTable)
      .where(and(
        eq(groupMessagesTable.groupId, groupId),
        gt(groupMessagesTable.createdAt, afterDate),
      ))
      .orderBy(groupMessagesTable.createdAt)
      .limit(100);
  } else {
    messages = await db
      .select()
      .from(groupMessagesTable)
      .where(eq(groupMessagesTable.groupId, groupId))
      .orderBy(desc(groupMessagesTable.createdAt))
      .limit(50);
    messages = messages.reverse();
  }

  res.json({
    success: true,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.put("/groups/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const requesterId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const requesterMembership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, requesterId),
    ),
  });
  const isRequesterAdmin = group.adminId === requesterId || requesterMembership?.role === "admin" || requesterMembership?.role === "owner";
  if (!isRequesterAdmin) {
    res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه تعديل المجموعة" });
    return;
  }

  const body = (req.body ?? {}) as { name?: string; description?: string; isPublic?: boolean };
  const updateData: Partial<typeof groupsTable.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    if (body.name.trim().length > GROUP_NAME_MAX_LENGTH) {
      res.status(400).json({ success: false, error: `اسم المجموعة يجب ألا يتجاوز ${GROUP_NAME_MAX_LENGTH} حرفاً` });
      return;
    }
    updateData.name = body.name.trim();
  }
  if (typeof body.description === "string") updateData.description = body.description;
  if (typeof body.isPublic === "boolean") updateData.isPublic = body.isPublic;
  updateData.updatedAt = new Date();

  await db.update(groupsTable).set(updateData).where(eq(groupsTable.id, groupId));

  const updated = await db.query.groupsTable.findFirst({ where: eq(groupsTable.id, groupId) });
  if (!updated) {
    res.status(500).json({ success: false, error: "خطأ في تحديث المجموعة" });
    return;
  }
  const detail = await buildGroupDetail(updated, requesterId);
  res.json({ success: true, group: detail });
});

router.patch("/groups/:id/members/:userId/role", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const targetUserId = getParam(req.params["userId"] as string);
  const requesterId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const body = (req.body ?? {}) as { role?: string };
  const newRole = body.role;
  if (newRole !== "admin" && newRole !== "member") {
    res.status(400).json({ success: false, error: "الدور غير صالح. القيم المقبولة: admin أو member" });
    return;
  }

  const requesterMembership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, requesterId),
    ),
  });
  const isOwner = group.adminId === requesterId || requesterMembership?.role === "owner";
  const isAdmin = isOwner || requesterMembership?.role === "admin";

  if (!isAdmin) {
    res.status(403).json({ success: false, error: "فقط مشرف المجموعة يمكنه تغيير الأدوار" });
    return;
  }

  if (targetUserId === group.adminId) {
    res.status(403).json({ success: false, error: "لا يمكن تغيير دور مالك المجموعة" });
    return;
  }

  const targetMembership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, targetUserId),
    ),
  });

  if (!targetMembership) {
    res.status(404).json({ success: false, error: "العضو غير موجود في المجموعة" });
    return;
  }

  if (newRole === "member" && targetMembership.role === "admin" && !isOwner) {
    res.status(403).json({ success: false, error: "فقط مالك المجموعة يمكنه تخفيض المشرفين" });
    return;
  }

  await db
    .update(groupMembersTable)
    .set({ role: newRole })
    .where(and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, targetUserId),
    ));

  res.json({ success: true, userId: targetUserId, role: newRole });
});

router.delete("/groups/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const requesterId = req.user.userId;

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  if (group.adminId !== requesterId) {
    const requesterMembership = await db.query.groupMembersTable.findFirst({
      where: and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, requesterId),
      ),
    });
    if (requesterMembership?.role !== "owner") {
      res.status(403).json({ success: false, error: "فقط مالك المجموعة يمكنه حذف المجموعة" });
      return;
    }
  }

  // منع حذف مجموعة مرتبطة بمباراة قادمة
  const upcomingMatches = await db
    .select({ id: matchesTable.id, title: matchesTable.title })
    .from(matchesTable)
    .where(and(
      eq(matchesTable.invitedGroupId, groupId),
      eq(matchesTable.status, "upcoming"),
    ))
    .limit(1);

  if (upcomingMatches.length > 0) {
    res.status(409).json({
      success: false,
      error: `لا يمكن حذف المجموعة لأنها مرتبطة بمباراة قادمة: "${upcomingMatches[0]!.title}"`,
    });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
    await tx.delete(groupMessagesTable).where(eq(groupMessagesTable.groupId, groupId));
    await tx.delete(groupJoinRequestsTable).where(eq(groupJoinRequestsTable.groupId, groupId));
    await tx.delete(inviteLinksTable).where(
      and(eq(inviteLinksTable.targetType, "group"), eq(inviteLinksTable.targetId, groupId))
    );
    await tx.delete(groupsTable).where(eq(groupsTable.id, groupId));
  });

  res.json({ success: true });
});

router.post("/groups/:id/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  const groupId = getParam(req.params["id"] as string);
  const userId = req.user.userId;
  const body = (req.body ?? {}) as { text?: string };

  if (!body.text || !body.text.trim()) {
    res.status(400).json({ success: false, error: "نص الرسالة مطلوب" });
    return;
  }

  const group = await db.query.groupsTable.findFirst({
    where: eq(groupsTable.id, groupId),
  });

  if (!group) {
    res.status(404).json({ success: false, error: "المجموعة غير موجودة" });
    return;
  }

  const membership = await db.query.groupMembersTable.findFirst({
    where: and(
      eq(groupMembersTable.groupId, groupId),
      eq(groupMembersTable.userId, userId),
    ),
  });

  if (!membership) {
    res.status(403).json({ success: false, error: "يجب أن تكون عضواً في المجموعة لإرسال رسائل" });
    return;
  }

  const sender = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  const msgId = generateId("msg_");
  const [msg] = await db.insert(groupMessagesTable).values({
    id: msgId,
    groupId,
    senderId: userId,
    senderName: sender?.name ?? "مستخدم",
    text: body.text.trim(),
  }).returning();

  const allMembers = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId));

  const senderName = sender?.name ?? "مستخدم";
  const messagePreview = body.text.trim().length > 60
    ? body.text.trim().slice(0, 60) + "…"
    : body.text.trim();

  await Promise.allSettled(
    allMembers
      .filter((m) => m.userId !== userId)
      .map((m) =>
        sendNotification(
          m.userId,
          "group",
          `رسالة جديدة في ${group.name}`,
          `${senderName}: ${messagePreview}`,
          groupId,
        )
      )
  );

  res.status(201).json({
    success: true,
    message: {
      id: msg!.id,
      senderId: msg!.senderId,
      senderName: msg!.senderName,
      text: msg!.text,
      createdAt: msg!.createdAt.toISOString(),
    },
  });
});

export default router;

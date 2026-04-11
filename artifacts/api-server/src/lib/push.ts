import { db } from "@workspace/db";
import { pushTokensTable, notificationsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "./id";

export type NotificationType = "match" | "group" | "system";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendExpoPush(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch {
  }
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  relatedId?: string,
): Promise<void> {
  if (type !== "system") {
    const prefs = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (type === "match" && !prefs?.notifMatch) return;
    if (type === "group" && !prefs?.notifGroup) return;
  }

  await db.insert(notificationsTable).values({
    id: generateId("n_"),
    userId,
    type,
    title,
    body,
    relatedId: relatedId ?? null,
    read: false,
  });

  const tokenRows = await db
    .select()
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, userId));

  const tokens = tokenRows.map((r) => r.token).filter((t) => t.startsWith("ExponentPushToken"));

  const data: Record<string, string> = { type };
  if (relatedId) data["relatedId"] = relatedId;
  await sendExpoPush(tokens, { title, body, data });
}

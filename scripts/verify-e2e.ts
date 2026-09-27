import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { addDays } from "date-fns";
import { getDb } from "../src/db";
import { account, auditEvents, bookings, inviteCodes, session, user, rooms } from "../src/db/schema";
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from "../src/lib/invites";
import { bookingWindowFromInput, dateKey } from "../src/lib/schedule";

const baseUrl = process.env.ROOMRES_E2E_URL ?? "http://localhost:3000";
const db = getDb();
const marker = randomBytes(5).toString("hex");
const adminEmail = `e2e-admin-${marker}@roomres.local`;
const memberEmail = `e2e-member-${marker}@roomres.local`;
const password = `${randomBytes(12).toString("base64url")}!Aa1`;
const createdUserIds: string[] = [];
let inviteId: string | undefined;

function cookieFrom(response: Response) {
  const values = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const raw = values.length ? values : [response.headers.get("set-cookie") ?? ""];
  return raw.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
}

async function signUp(input: { name: string; email: string; inviteCode?: string }) {
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ ...input, password }),
  });
  if (!response.ok) throw new Error(`Sign-up returned ${response.status}: ${await response.text()}`);
  const payload = (await response.json()) as { user: { id: string } };
  createdUserIds.push(payload.user.id);
  return { userId: payload.user.id, cookie: cookieFrom(response) };
}

function nextWeekday(from = new Date()) {
  let date = addDays(from, 1);
  while (date.getDay() === 0 || date.getDay() === 6) date = addDays(date, 1);
  return date;
}

async function cleanup() {
  if (!createdUserIds.length) return;
  await db.delete(bookings).where(inArray(bookings.organizerId, createdUserIds));
  if (inviteId) await db.delete(inviteCodes).where(eq(inviteCodes.id, inviteId));
  await db.delete(auditEvents).where(inArray(auditEvents.actorId, createdUserIds));
  await db.delete(session).where(inArray(session.userId, createdUserIds));
  await db.delete(account).where(inArray(account.userId, createdUserIds));
  await db.delete(user).where(inArray(user.id, createdUserIds));
}

async function main() {
  const existingUsers = await db.select({ id: user.id }).from(user).limit(1);
  if (existingUsers.length) throw new Error("E2E verification requires an uninitialized RoomRes database.");

  const admin = await signUp({ name: "E2E Admin", email: adminEmail });
  const [adminRow] = await db.select({ role: user.role }).from(user).where(eq(user.id, admin.userId));
  if (adminRow?.role !== "admin") throw new Error("The first account was not promoted to admin.");

  const inviteCode = generateInviteCode();
  const normalized = normalizeInviteCode(inviteCode);
  const [invite] = await db.insert(inviteCodes).values({
    label: `E2E ${marker}`,
    codeHash: hashInviteCode(normalized),
    lastFour: normalized.slice(-4),
    maxUses: 1,
    createdBy: admin.userId,
  }).returning({ id: inviteCodes.id });
  inviteId = invite.id;

  const member = await signUp({ name: "E2E Member", email: memberEmail, inviteCode });
  const [usedInvite] = await db.select({ useCount: inviteCodes.useCount }).from(inviteCodes).where(eq(inviteCodes.id, invite.id));
  if (usedInvite?.useCount !== 1) throw new Error("Invite use count did not increment.");

  const [room] = await db.select({ id: rooms.id, name: rooms.name }).from(rooms).where(eq(rooms.name, "Happy"));
  if (!room) throw new Error("Seeded room Happy was not found.");
  const date = dateKey(nextWeekday());
  const { startsAt, endsAt } = bookingWindowFromInput({ date, startTime: "10:00", durationMinutes: 30 });
  const [booking] = await db.insert(bookings).values({ roomId: room.id, organizerId: member.userId, title: `E2E Planning ${marker}`, notes: "Private E2E note", startsAt, endsAt }).returning({ id: bookings.id });

  let overlapRejected = false;
  try {
    await db.insert(bookings).values({ roomId: room.id, organizerId: admin.userId, title: "Should conflict", startsAt, endsAt });
  } catch (error) {
    const code = (error as { cause?: { code?: string }; code?: string }).cause?.code ?? (error as { code?: string }).code;
    overlapRejected = code === "23P01";
  }
  if (!overlapRejected) throw new Error("Database did not reject an overlapping room booking.");

  const scheduleResponse = await fetch(`${baseUrl}/schedule`, { headers: { cookie: member.cookie } });
  const scheduleHtml = await scheduleResponse.text();
  if (!scheduleResponse.ok || !scheduleHtml.includes("Find your room") || !scheduleHtml.includes("Happy")) {
    throw new Error(`Authenticated schedule render failed with ${scheduleResponse.status}.`);
  }

  await db.delete(bookings).where(eq(bookings.id, booking.id));
  console.log("E2E verified: auth → invite → session → rooms → booking constraint → schedule render.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(cleanup);

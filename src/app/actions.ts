"use server";

import { and, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  auditEvents,
  bookings,
  inviteCodes,
  rooms,
  session,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from "@/lib/invites";
import { bookingWindowFromInput, validateBookingWindow } from "@/lib/schedule";
import { requireAdmin, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const db = getDb();

function messageFromError(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the form.";
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

const bookingSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().trim().min(2, "Add a meeting title.").max(100),
  notes: z.string().trim().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(120),
});

export async function createBookingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireUser();
  try {
    const values = bookingSchema.parse(Object.fromEntries(formData));
    const { startsAt, endsAt } = bookingWindowFromInput(values);
    const validationError = validateBookingWindow(startsAt, endsAt);
    if (validationError) return { status: "error", message: validationError };

    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, values.roomId), eq(rooms.active, true)))
      .limit(1);
    if (!room) return { status: "error", message: "That room is not available." };

    const [conflict] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          isNull(bookings.cancelledAt),
          lt(bookings.startsAt, endsAt),
          gt(bookings.endsAt, startsAt),
          or(
            eq(bookings.roomId, values.roomId),
            eq(bookings.organizerId, current.user.id),
          ),
        ),
      )
      .limit(1);
    if (conflict) {
      return { status: "error", message: "That room or your calendar is already booked then." };
    }

    const [created] = await db
      .insert(bookings)
      .values({
        roomId: values.roomId,
        organizerId: current.user.id,
        title: values.title,
        notes: values.notes || null,
        startsAt,
        endsAt,
      })
      .returning({ id: bookings.id });
    await db.insert(auditEvents).values({
      actorId: current.user.id,
      action: "booking.created",
      entityType: "booking",
      entityId: created.id,
    });
  } catch (error) {
    const pgCode = (error as { cause?: { code?: string }; code?: string }).cause?.code ??
      (error as { code?: string }).code;
    if (pgCode === "23P01") {
      return { status: "error", message: "That room or your calendar was just booked by someone else." };
    }
    return { status: "error", message: messageFromError(error) };
  }
  revalidatePath("/schedule");
  return { status: "success", message: "Room reserved!" };
}

export async function cancelBookingAction(formData: FormData) {
  const current = await requireUser();
  const id = z.string().uuid().parse(formData.get("bookingId"));
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking || booking.cancelledAt) return;
  const isAdmin = current.user.role === "admin";
  if (booking.organizerId !== current.user.id && !isAdmin) throw new Error("Not allowed.");
  if (booking.startsAt <= new Date() && !isAdmin) throw new Error("Started bookings cannot be cancelled.");

  await db.update(bookings).set({ cancelledAt: new Date(), updatedAt: new Date() }).where(eq(bookings.id, id));
  await db.insert(auditEvents).values({
    actorId: current.user.id,
    action: "booking.cancelled",
    entityType: "booking",
    entityId: id,
  });
  revalidatePath("/schedule");
}

const roomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(40),
  capacity: z.coerce.number().int().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  amenities: z.string().optional(),
});

export async function saveRoomAction(formData: FormData) {
  const current = await requireAdmin();
  const raw = Object.fromEntries(formData);
  const values = roomSchema.parse({ ...raw, id: raw.id || undefined });
  const amenities = (values.amenities ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (values.id) {
    await db.update(rooms).set({ ...values, amenities, updatedAt: new Date() }).where(eq(rooms.id, values.id));
    await db.insert(auditEvents).values({ actorId: current.user.id, action: "room.updated", entityType: "room", entityId: values.id });
  } else {
    const [created] = await db.insert(rooms).values({ ...values, amenities }).returning({ id: rooms.id });
    await db.insert(auditEvents).values({ actorId: current.user.id, action: "room.created", entityType: "room", entityId: created.id });
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/schedule");
}

export async function toggleRoomAction(formData: FormData) {
  const current = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  await db.update(rooms).set({ active, updatedAt: new Date() }).where(eq(rooms.id, id));
  await db.insert(auditEvents).values({ actorId: current.user.id, action: active ? "room.activated" : "room.deactivated", entityType: "room", entityId: id });
  revalidatePath("/admin/rooms");
  revalidatePath("/schedule");
}

const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  role: z.enum(["member", "admin"]),
});

export async function updateUserAction(formData: FormData) {
  const current = await requireAdmin();
  const values = userUpdateSchema.parse(Object.fromEntries(formData));
  await db.update(user).set({ name: values.name, email: values.email.toLowerCase(), role: values.role === "member" ? "user" : values.role, updatedAt: new Date() }).where(eq(user.id, values.id));
  await db.insert(auditEvents).values({ actorId: current.user.id, action: "user.updated", entityType: "user", entityId: values.id });
  revalidatePath("/admin/users");
}

export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireAdmin();
  const values = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.email(),
    password: z.string().min(10, "Use at least 10 characters.").max(128),
    role: z.enum(["member", "admin"]),
  }).parse(Object.fromEntries(formData));
  try {
    const created = await auth.api.createUser({
      body: {
        name: values.name,
        email: values.email.toLowerCase(),
        password: values.password,
        role: values.role === "member" ? "user" : values.role,
      },
      headers: await headers(),
    });
    await db.update(user).set({ mustChangePassword: true, emailVerified: true }).where(eq(user.id, created.user.id));
    await db.insert(auditEvents).values({ actorId: current.user.id, action: "user.created", entityType: "user", entityId: created.user.id });
  } catch (error) {
    return { status: "error", message: messageFromError(error) };
  }
  revalidatePath("/admin/users");
  return { status: "success", message: "User created with a temporary password." };
}

export async function toggleUserAction(formData: FormData) {
  const current = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));
  const active = formData.get("active") === "true";
  if (id === current.user.id && !active) throw new Error("You cannot deactivate your own account.");
  await db.update(user).set({ active, banned: !active, banReason: active ? null : "Deactivated by admin", updatedAt: new Date() }).where(eq(user.id, id));
  if (!active) await db.delete(session).where(eq(session.userId, id));
  await db.insert(auditEvents).values({ actorId: current.user.id, action: active ? "user.activated" : "user.deactivated", entityType: "user", entityId: id });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireAdmin();
  const userId = z.string().min(1).parse(formData.get("userId"));
  const newPassword = z.string().min(10, "Use at least 10 characters.").max(128).parse(formData.get("password"));
  try {
    await auth.api.setUserPassword({ body: { userId, newPassword }, headers: await headers() });
    await db.update(user).set({ mustChangePassword: true, updatedAt: new Date() }).where(eq(user.id, userId));
    await db.delete(session).where(and(eq(session.userId, userId), ne(session.userId, current.user.id)));
    await db.insert(auditEvents).values({ actorId: current.user.id, action: "user.password_reset", entityType: "user", entityId: userId });
  } catch (error) {
    return { status: "error", message: messageFromError(error) };
  }
  revalidatePath("/admin/users");
  return { status: "success", message: "Temporary password set. The user must change it next time." };
}

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireUser({ allowPasswordChange: true });
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 10) return { status: "error", message: "Use at least 10 characters." };
  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
    await db.update(user).set({ mustChangePassword: false, updatedAt: new Date() }).where(eq(user.id, current.user.id));
  } catch (error) {
    return { status: "error", message: messageFromError(error) };
  }
  redirect("/schedule");
}

export async function createInviteAction(formData: FormData) {
  const current = await requireAdmin();
  const label = z.string().trim().min(2).max(60).parse(formData.get("label"));
  const maxUsesRaw = String(formData.get("maxUses") ?? "");
  const maxUses = maxUsesRaw ? z.coerce.number().int().min(1).max(100).parse(maxUsesRaw) : null;
  const code = generateInviteCode();
  const normalized = normalizeInviteCode(code);
  await db.insert(inviteCodes).values({
    label,
    codeHash: hashInviteCode(normalized),
    lastFour: normalized.slice(-4),
    maxUses,
    createdBy: current.user.id,
  });
  await db.insert(auditEvents).values({ actorId: current.user.id, action: "invite.created", entityType: "invite", entityId: normalized.slice(-4) });
  redirect(`/admin/invites?created=${encodeURIComponent(code)}`);
}

export async function disableInviteAction(formData: FormData) {
  const current = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  await db.update(inviteCodes).set({ active: false }).where(eq(inviteCodes.id, id));
  await db.insert(auditEvents).values({ actorId: current.user.id, action: "invite.disabled", entityType: "invite", entityId: id });
  revalidatePath("/admin/invites");
}

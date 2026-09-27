import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, bookings, rooms, user } from "@/db/schema";
import { BookingRuleError, updateApiBookingSchema, validateBookingWrite } from "@/lib/api-bookings";
import { apiError, invalidRequestResponse, pgErrorCode, unauthorizedResponse } from "@/lib/api-response";
import { authenticateApiRequest, type ApiPrincipal } from "@/lib/api-tokens";

export const runtime = "nodejs";

type BookingContext = { params: Promise<{ bookingId: string }> };

async function bookingIdFrom(context: BookingContext) {
  const { bookingId } = await context.params;
  return z.string().uuid().parse(bookingId);
}

async function getBooking(id: string) {
  const [booking] = await getDb()
    .select({
      id: bookings.id,
      roomId: bookings.roomId,
      roomName: rooms.name,
      organizerId: bookings.organizerId,
      organizerName: user.name,
      title: bookings.title,
      notes: bookings.notes,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      cancelledAt: bookings.cancelledAt,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
    })
    .from(bookings)
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .innerJoin(user, eq(bookings.organizerId, user.id))
    .where(eq(bookings.id, id))
    .limit(1);
  return booking;
}

function canManage(principal: ApiPrincipal, organizerId: string) {
  return principal.user.role === "admin" || principal.user.id === organizerId;
}

function serializeBooking(
  booking: NonNullable<Awaited<ReturnType<typeof getBooking>>>,
  principal: ApiPrincipal,
) {
  const manageable = canManage(principal, booking.organizerId);
  return {
    ...booking,
    notes: manageable ? booking.notes : null,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    canManage: manageable,
  };
}

export async function GET(request: Request, context: BookingContext) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  try {
    const booking = await getBooking(await bookingIdFrom(context));
    if (!booking) return apiError(404, "not_found", "Booking not found.");
    return Response.json(
      { data: serializeBooking(booking, principal) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return invalidRequestResponse(error);
  }
}

export async function PATCH(request: Request, context: BookingContext) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  try {
    const id = await bookingIdFrom(context);
    const existing = await getBooking(id);
    if (!existing || existing.cancelledAt) {
      return apiError(404, "not_found", "Active booking not found.");
    }
    if (!canManage(principal, existing.organizerId)) {
      return apiError(403, "forbidden", "You cannot update this booking.");
    }

    const input = updateApiBookingSchema.parse(await request.json());
    const values = {
      roomId: input.roomId ?? existing.roomId,
      title: input.title ?? existing.title,
      notes: Object.hasOwn(input, "notes") ? (input.notes ?? null) : existing.notes,
      startsAt: input.startsAt ? new Date(input.startsAt) : existing.startsAt,
      endsAt: input.endsAt ? new Date(input.endsAt) : existing.endsAt,
    };
    await validateBookingWrite(values, existing.organizerId, existing.id);

    await getDb()
      .update(bookings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(bookings.id, id));
    await getDb().insert(auditEvents).values({
      actorId: principal.user.id,
      action: "booking.updated_via_api",
      entityType: "booking",
      entityId: id,
      metadata: { apiTokenId: principal.tokenId },
    });

    const updated = await getBooking(id);
    return Response.json({ data: serializeBooking(updated!, principal) });
  } catch (error) {
    if (error instanceof BookingRuleError) {
      const status = error.kind === "conflict" ? 409 : 422;
      const code = error.kind === "conflict" ? "booking_conflict" : "invalid_request";
      return apiError(status, code, error.message);
    }
    if (pgErrorCode(error) === "23P01") {
      return apiError(409, "booking_conflict", "The room or organizer was just booked for that time.");
    }
    return invalidRequestResponse(error);
  }
}

export async function DELETE(request: Request, context: BookingContext) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  try {
    const id = await bookingIdFrom(context);
    const existing = await getBooking(id);
    if (!existing || existing.cancelledAt) {
      return apiError(404, "not_found", "Active booking not found.");
    }
    if (!canManage(principal, existing.organizerId)) {
      return apiError(403, "forbidden", "You cannot cancel this booking.");
    }
    if (principal.user.role !== "admin" && existing.startsAt <= new Date()) {
      return apiError(422, "invalid_request", "Started bookings cannot be cancelled.");
    }

    const now = new Date();
    await getDb()
      .update(bookings)
      .set({ cancelledAt: now, updatedAt: now })
      .where(and(eq(bookings.id, id), isNull(bookings.cancelledAt)));
    await getDb().insert(auditEvents).values({
      actorId: principal.user.id,
      action: "booking.cancelled_via_api",
      entityType: "booking",
      entityId: id,
      metadata: { apiTokenId: principal.tokenId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return invalidRequestResponse(error);
  }
}

import { addDays } from "date-fns";
import { and, asc, eq, gt, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, bookings, rooms, user } from "@/db/schema";
import { BookingRuleError, createApiBookingSchema, validateBookingWrite } from "@/lib/api-bookings";
import { apiError, invalidRequestResponse, pgErrorCode, unauthorizedResponse } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-tokens";

export const runtime = "nodejs";

const querySchema = z
  .object({
    start: z.iso.datetime({ offset: true }).optional(),
    end: z.iso.datetime({ offset: true }).optional(),
    roomId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.start) === Boolean(value.end), {
    message: "Provide both start and end, or neither.",
  });

export async function GET(request: Request) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));
    const now = new Date();
    const start = query.start ? new Date(query.start) : addDays(now, -7);
    const end = query.end ? new Date(query.end) : addDays(now, 14);
    if (start >= end) {
      return apiError(422, "invalid_request", "The start must be earlier than the end.");
    }
    if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) {
      return apiError(422, "invalid_request", "The requested window cannot exceed 31 days.");
    }

    const conditions = [
      isNull(bookings.cancelledAt),
      lt(bookings.startsAt, end),
      gt(bookings.endsAt, start),
    ];
    if (query.roomId) conditions.push(eq(bookings.roomId, query.roomId));

    const rows = await getDb()
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
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .innerJoin(user, eq(bookings.organizerId, user.id))
      .where(and(...conditions))
      .orderBy(asc(bookings.startsAt));

    const isAdmin = principal.user.role === "admin";
    return Response.json(
      {
        data: rows.map((booking) => ({
          ...booking,
          notes:
            isAdmin || booking.organizerId === principal.user.id ? booking.notes : null,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
          canManage: isAdmin || booking.organizerId === principal.user.id,
        })),
        meta: { start: start.toISOString(), end: end.toISOString() },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return invalidRequestResponse(error);
  }
}

export async function POST(request: Request) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  try {
    const input = createApiBookingSchema.parse(await request.json());
    const values = {
      roomId: input.roomId,
      title: input.title,
      notes: input.notes ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
    };
    await validateBookingWrite(values, principal.user.id);

    const [created] = await getDb()
      .insert(bookings)
      .values({ ...values, organizerId: principal.user.id })
      .returning();
    await getDb().insert(auditEvents).values({
      actorId: principal.user.id,
      action: "booking.created_via_api",
      entityType: "booking",
      entityId: created.id,
      metadata: { apiTokenId: principal.tokenId },
    });

    return Response.json(
      {
        data: {
          ...created,
          startsAt: created.startsAt.toISOString(),
          endsAt: created.endsAt.toISOString(),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          cancelledAt: null,
        },
      },
      { status: 201, headers: { Location: `/api/v1/bookings/${created.id}` } },
    );
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

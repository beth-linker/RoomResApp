import { and, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { validateBookingWindow } from "@/lib/schedule";

export const createApiBookingSchema = z
  .object({
    roomId: z.string().uuid(),
    title: z.string().trim().min(2).max(100),
    notes: z.string().trim().max(1000).nullable().optional(),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const updateApiBookingSchema = createApiBookingSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Include at least one field to update.",
);

export type BookingWriteValues = {
  roomId: string;
  title: string;
  notes: string | null;
  startsAt: Date;
  endsAt: Date;
};

export class BookingRuleError extends Error {
  constructor(
    message: string,
    public readonly kind: "room" | "window" | "conflict",
  ) {
    super(message);
  }
}

export async function validateBookingWrite(
  values: BookingWriteValues,
  organizerId: string,
  excludingBookingId?: string,
) {
  const validationError = validateBookingWindow(values.startsAt, values.endsAt);
  if (validationError) throw new BookingRuleError(validationError, "window");

  const [room] = await getDb()
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.id, values.roomId), eq(rooms.active, true)))
    .limit(1);
  if (!room) throw new BookingRuleError("That room is not available.", "room");

  const conditions = [
    isNull(bookings.cancelledAt),
    lt(bookings.startsAt, values.endsAt),
    gt(bookings.endsAt, values.startsAt),
    or(eq(bookings.roomId, values.roomId), eq(bookings.organizerId, organizerId)),
  ];
  if (excludingBookingId) conditions.push(ne(bookings.id, excludingBookingId));

  const [conflict] = await getDb()
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...conditions))
    .limit(1);
  if (conflict) {
    throw new BookingRuleError(
      "That room or the organizer's calendar is already booked then.",
      "conflict",
    );
  }
}

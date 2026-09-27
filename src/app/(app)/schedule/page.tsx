import { addDays, eachDayOfInterval, startOfDay } from "date-fns";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { CalendarPlus, Clock3 } from "lucide-react";
import { getDb } from "@/db";
import { bookings, rooms, user } from "@/db/schema";
import { ScheduleBoard } from "@/components/schedule-board";
import { BOOK_AHEAD_DAYS, dateKey, LOOKBACK_DAYS, OFFICE_TIME_ZONE } from "@/lib/schedule";
import { requireUser } from "@/lib/session";
import { toZonedTime } from "date-fns-tz";

export default async function SchedulePage() {
  const current = await requireUser();
  const todayLocal = startOfDay(toZonedTime(new Date(), OFFICE_TIME_ZONE));
  const firstDay = addDays(todayLocal, -LOOKBACK_DAYS);
  const lastDay = addDays(todayLocal, BOOK_AHEAD_DAYS);
  const [roomRows, bookingRows] = await Promise.all([
    getDb().select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.name)),
    getDb().select({ id: bookings.id, roomId: bookings.roomId, organizerId: bookings.organizerId, organizerName: user.name, title: bookings.title, notes: bookings.notes, startsAt: bookings.startsAt, endsAt: bookings.endsAt }).from(bookings).innerJoin(user, eq(bookings.organizerId, user.id)).where(and(isNull(bookings.cancelledAt), gte(bookings.startsAt, addDays(firstDay, -1)), lte(bookings.startsAt, addDays(lastDay, 2)))).orderBy(asc(bookings.startsAt)),
  ]);
  const dates = eachDayOfInterval({ start: firstDay, end: lastDay })
    .filter((date) => date.getDay() !== 0 && date.getDay() !== 6)
    .map(dateKey);
  const isAdmin = current.user.role === "admin";
  const serializedBookings = bookingRows.map((booking) => ({ ...booking, startsAt: booking.startsAt.toISOString(), endsAt: booking.endsAt.toISOString(), notes: booking.organizerId === current.user.id || isAdmin ? booking.notes : null, canManage: booking.organizerId === current.user.id || isAdmin }));

  return <main className="shell page"><div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}><div><div className="eyebrow"><Clock3 size={14} style={{ display: "inline", marginRight: 5 }} />8 to 6 · Monday–Friday</div><h1 className="display" style={{ fontSize: "clamp(2.6rem, 7vw, 4.8rem)", margin: ".55rem 0" }}>Find your room.</h1><p className="hint" style={{ fontSize: "1rem" }}>Look back one week or book up to two weeks ahead. All times are Eastern.</p></div><div className="pill" style={{ background: "var(--sun)", fontSize: ".9rem" }}><CalendarPlus size={16} />{roomRows.length} rooms ready</div></div><ScheduleBoard rooms={roomRows.map((room) => ({ id: room.id, name: room.name, capacity: room.capacity, color: room.color, amenities: room.amenities }))} bookings={serializedBookings} dates={dates} currentUserId={current.user.id} /></main>;
}

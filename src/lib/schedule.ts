import { addDays, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const OFFICE_TIME_ZONE = "America/New_York";
export const OFFICE_OPEN_MINUTE = 8 * 60;
export const OFFICE_CLOSE_MINUTE = 18 * 60;
export const BOOKING_INCREMENT_MINUTES = 15;
export const MAX_BOOKING_MINUTES = 120;
export const LOOKBACK_DAYS = 7;
export const BOOK_AHEAD_DAYS = 14;

export type BookingWindowInput = {
  date: string;
  startTime: string;
  durationMinutes: number;
};

export function bookingWindowFromInput(input: BookingWindowInput) {
  const startsAt = fromZonedTime(`${input.date}T${input.startTime}:00`, OFFICE_TIME_ZONE);
  const endsAt = addMinutes(startsAt, input.durationMinutes);
  return { startsAt, endsAt };
}

export function validateBookingWindow(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
): string | null {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Choose a valid date and time.";
  }

  const duration = differenceInMinutes(endsAt, startsAt);
  if (
    duration < BOOKING_INCREMENT_MINUTES ||
    duration > MAX_BOOKING_MINUTES ||
    duration % BOOKING_INCREMENT_MINUTES !== 0
  ) {
    return "Meetings must be 15 minutes to 2 hours, in 15-minute increments.";
  }

  const localStart = toZonedTime(startsAt, OFFICE_TIME_ZONE);
  const localEnd = toZonedTime(endsAt, OFFICE_TIME_ZONE);
  const day = localStart.getDay();
  if (day === 0 || day === 6 || localEnd.getDay() !== day) {
    return "RoomRes is open Monday through Friday.";
  }

  const startMinute = localStart.getHours() * 60 + localStart.getMinutes();
  const endMinute = localEnd.getHours() * 60 + localEnd.getMinutes();
  if (
    startMinute < OFFICE_OPEN_MINUTE ||
    endMinute > OFFICE_CLOSE_MINUTE ||
    startMinute % BOOKING_INCREMENT_MINUTES !== 0 ||
    endMinute % BOOKING_INCREMENT_MINUTES !== 0
  ) {
    return "Bookings must fit between 8:00 AM and 6:00 PM Eastern on 15-minute marks.";
  }

  const todayLocal = startOfDay(toZonedTime(now, OFFICE_TIME_ZONE));
  const startLocalDay = startOfDay(localStart);
  if (startLocalDay < todayLocal) return "New bookings cannot be made in the past.";
  if (startLocalDay > addDays(todayLocal, BOOK_AHEAD_DAYS)) {
    return "Bookings can be made up to 14 days ahead.";
  }
  if (startsAt <= now) return "Choose a time that has not started yet.";

  return null;
}

export function dateKey(date: Date) {
  return formatInTimeZone(date, OFFICE_TIME_ZONE, "yyyy-MM-dd");
}

export function displayTime(date: Date | string) {
  return formatInTimeZone(new Date(date), OFFICE_TIME_ZONE, "h:mm a");
}

export function displayDate(date: Date | string) {
  return formatInTimeZone(new Date(date), OFFICE_TIME_ZONE, "EEE, MMM d");
}

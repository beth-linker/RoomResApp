import { describe, expect, it } from "vitest";
import { bookingWindowFromInput, validateBookingWindow } from "./schedule";

describe("RoomRes booking rules", () => {
  const now = new Date("2026-09-28T12:00:00.000Z");

  it("accepts a weekday meeting during office hours", () => {
    const window = bookingWindowFromInput({
      date: "2026-09-29",
      startTime: "09:15",
      durationMinutes: 45,
    });
    expect(validateBookingWindow(window.startsAt, window.endsAt, now)).toBeNull();
  });

  it("rejects meetings longer than two hours", () => {
    const window = bookingWindowFromInput({
      date: "2026-09-29",
      startTime: "09:00",
      durationMinutes: 135,
    });
    expect(validateBookingWindow(window.startsAt, window.endsAt, now)).toContain("2 hours");
  });

  it("rejects weekend meetings", () => {
    const window = bookingWindowFromInput({
      date: "2026-10-03",
      startTime: "10:00",
      durationMinutes: 30,
    });
    expect(validateBookingWindow(window.startsAt, window.endsAt, now)).toContain("Monday");
  });

  it("rejects meetings outside office hours", () => {
    const window = bookingWindowFromInput({
      date: "2026-09-29",
      startTime: "17:30",
      durationMinutes: 60,
    });
    expect(validateBookingWindow(window.startsAt, window.endsAt, now)).toContain("6:00 PM");
  });
});

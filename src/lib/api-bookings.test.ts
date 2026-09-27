import { describe, expect, it } from "vitest";
import { createApiBookingSchema, updateApiBookingSchema } from "./api-bookings";

describe("REST booking payloads", () => {
  const valid = {
    roomId: "2a3a7ef4-a2ae-4eb9-b976-b11988524304",
    title: "Planning session",
    startsAt: "2026-09-29T13:00:00Z",
    endsAt: "2026-09-29T13:30:00Z",
  };

  it("accepts an ISO timestamp booking payload", () => {
    expect(createApiBookingSchema.parse(valid)).toEqual(valid);
  });

  it("rejects unknown create fields", () => {
    expect(() => createApiBookingSchema.parse({ ...valid, organizerId: "someone-else" })).toThrow();
  });

  it("requires at least one patch field", () => {
    expect(() => updateApiBookingSchema.parse({})).toThrow();
    expect(updateApiBookingSchema.parse({ notes: null })).toEqual({ notes: null });
  });
});

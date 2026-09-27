import { describe, expect, it } from "vitest";
import { apiTokenExpiresAt, generateApiToken, hashApiToken } from "./api-tokens";

describe("API tokens", () => {
  it("generates opaque tokens and stores only a deterministic hash", () => {
    const first = generateApiToken();
    const second = generateApiToken();

    expect(first.token).toMatch(/^roomres_[A-Za-z0-9_-]{43}$/);
    expect(first.tokenHash).toBe(hashApiToken(first.token));
    expect(first.lastFour).toBe(first.token.slice(-4));
    expect(first.token).not.toBe(second.token);
  });

  it("expires tokens after 30 days", () => {
    const createdAt = new Date("2026-09-27T12:00:00.000Z");
    expect(apiTokenExpiresAt(createdAt).toISOString()).toBe("2026-10-27T12:00:00.000Z");
  });
});

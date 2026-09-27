import { createHash, randomBytes } from "node:crypto";

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

export function generateInviteCode() {
  const compact = randomBytes(8).toString("hex").toUpperCase();
  return `ROOM-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

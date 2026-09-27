import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens, user } from "@/db/schema";

export const API_TOKEN_LIFETIME_DAYS = 30;
const API_TOKEN_PREFIX = "roomres_";

export type ApiPrincipal = {
  tokenId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export function hashApiToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateApiToken() {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashApiToken(token), lastFour: token.slice(-4) };
}

export function apiTokenExpiresAt(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + API_TOKEN_LIFETIME_DAYS);
  return expiresAt;
}

export async function authenticateApiRequest(request: Request): Promise<ApiPrincipal | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) return null;

  const now = new Date();
  const [record] = await getDb()
    .select({
      tokenId: apiTokens.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(apiTokens)
    .innerJoin(user, eq(apiTokens.userId, user.id))
    .where(
      and(
        eq(apiTokens.tokenHash, hashApiToken(token)),
        isNull(apiTokens.revokedAt),
        gt(apiTokens.expiresAt, now),
        eq(user.active, true),
      ),
    )
    .limit(1);

  if (!record) return null;

  await getDb()
    .update(apiTokens)
    .set({ lastUsedAt: now })
    .where(eq(apiTokens.id, record.tokenId));

  return {
    tokenId: record.tokenId,
    user: {
      id: record.userId,
      name: record.name,
      email: record.email,
      role: record.role,
    },
  };
}

"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { apiTokens, auditEvents } from "@/db/schema";
import { apiTokenExpiresAt, generateApiToken } from "@/lib/api-tokens";
import { requireUser } from "@/lib/session";

export type CreateApiTokenState = {
  status: "idle" | "success" | "error";
  message: string;
  token?: string;
};

export async function createApiTokenAction(
  _previous: CreateApiTokenState,
  formData: FormData,
): Promise<CreateApiTokenState> {
  const current = await requireUser();
  try {
    const name = z.string().trim().min(2).max(60).parse(formData.get("name"));
    const generated = generateApiToken();
    const [created] = await getDb()
      .insert(apiTokens)
      .values({
        userId: current.user.id,
        name,
        tokenHash: generated.tokenHash,
        lastFour: generated.lastFour,
        expiresAt: apiTokenExpiresAt(),
      })
      .returning({ id: apiTokens.id });
    await getDb().insert(auditEvents).values({
      actorId: current.user.id,
      action: "api_token.created",
      entityType: "api_token",
      entityId: created.id,
    });
    revalidatePath("/api-tokens");
    revalidatePath("/admin/api-tokens");
    return {
      status: "success",
      message: "Copy this token now. RoomRes will not show it again.",
      token: generated.token,
    };
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "Choose a valid token name.")
      : "The token could not be created.";
    return { status: "error", message };
  }
}

export async function revokeApiTokenAction(formData: FormData) {
  const current = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const [token] = await getDb()
    .select({ userId: apiTokens.userId })
    .from(apiTokens)
    .where(and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)))
    .limit(1);
  if (!token) return;
  if (token.userId !== current.user.id && current.user.role !== "admin") {
    throw new Error("Not allowed.");
  }

  await getDb()
    .update(apiTokens)
    .set({ revokedAt: new Date(), revokedBy: current.user.id })
    .where(and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)));
  await getDb().insert(auditEvents).values({
    actorId: current.user.id,
    action: "api_token.revoked",
    entityType: "api_token",
    entityId: id,
  });
  revalidatePath("/api-tokens");
  revalidatePath("/admin/api-tokens");
}

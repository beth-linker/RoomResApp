import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { hashInviteCode } from "@/lib/invites";

const db = getDb();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "build-time-placeholder-not-for-runtime",
  baseURL: process.env.BETTER_AUTH_URL ?? {
    allowedHosts: [
      "localhost:*",
      "roomres.vercel.app",
      "roomres-bethlinker-9864s-projects.vercel.app",
      "roomres-*.vercel.app",
    ],
    protocol: "auto",
    fallback: "https://roomres.vercel.app",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  user: {
    additionalFields: {
      active: { type: "boolean", required: true, defaultValue: true, input: false },
      mustChangePassword: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const email = String(ctx.body?.email ?? "").trim().toLowerCase();
        const [existing] = await db
          .select({ active: schema.user.active })
          .from(schema.user)
          .where(eq(schema.user.email, email))
          .limit(1);
        if (existing && !existing.active) {
          throw new APIError("FORBIDDEN", { message: "This account is inactive." });
        }
      }

      if (ctx.path !== "/sign-up/email") return;

      const [{ total }] = await db.select({ total: count() }).from(schema.user);
      if (total === 0) return;

      const rawCode = String(ctx.body?.inviteCode ?? "");
      const codeHash = hashInviteCode(rawCode);
      const now = new Date();
      const [invite] = await db
        .select({ id: schema.inviteCodes.id })
        .from(schema.inviteCodes)
        .where(
          and(
            eq(schema.inviteCodes.codeHash, codeHash),
            eq(schema.inviteCodes.active, true),
            or(isNull(schema.inviteCodes.expiresAt), gt(schema.inviteCodes.expiresAt, now)),
            or(
              isNull(schema.inviteCodes.maxUses),
              gt(schema.inviteCodes.maxUses, schema.inviteCodes.useCount),
            ),
          ),
        )
        .limit(1);

      if (!invite) {
        throw new APIError("FORBIDDEN", { message: "That invite code is invalid or expired." });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || !ctx.context.newSession) return;

      const newUser = ctx.context.newSession.user;
      const [{ total }] = await db.select({ total: count() }).from(schema.user);

      if (total === 1) {
        await db
          .update(schema.user)
          .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
          .where(eq(schema.user.id, newUser.id));
        await db.insert(schema.auditEvents).values({
          actorId: newUser.id,
          action: "setup.completed",
          entityType: "user",
          entityId: newUser.id,
        });
        return;
      }

      const rawCode = String(ctx.body?.inviteCode ?? "");
      if (!rawCode) return;
      const codeHash = hashInviteCode(rawCode);
      await db
        .update(schema.inviteCodes)
        .set({ useCount: sql`${schema.inviteCodes.useCount} + 1` })
        .where(eq(schema.inviteCodes.codeHash, codeHash));
    }),
  },
});

export type Session = typeof auth.$Infer.Session;

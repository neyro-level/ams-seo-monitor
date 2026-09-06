import "server-only";

import { randomUUID } from "node:crypto";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { createLocalAccountIssuer } from "better-auth/db";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import { getPrismaClient } from "../database/prisma/client.ts";
import { runInDatabaseTransaction } from "../database/transaction.ts";
import { hashUserSetupToken } from "./setup-token.ts";

const completeUserSetupBody = z.object({
  token: z.string().min(40).max(64),
  newPassword: z.string(),
  correlationId: z.string().uuid(),
});

function invalidSetupToken(): never {
  throw new APIError("UNAUTHORIZED", {
    code: "INVALID_SETUP_TOKEN",
    message: "Setup token is invalid or unavailable",
  });
}

export function userSetupTokenPlugin() {
  return {
    id: "ams-user-setup-token",
    endpoints: {
      completeUserSetup: createAuthEndpoint.serverOnly(
        {
          method: "POST",
          body: completeUserSetupBody,
        },
        async (context) => {
          const { token, newPassword, correlationId } = context.body;
          const passwordConfig = context.context.password.config;
          if (newPassword.length < passwordConfig.minPasswordLength) {
            throw new APIError("BAD_REQUEST", {
              code: "PASSWORD_TOO_SHORT",
              message: "Password is too short",
            });
          }
          if (newPassword.length > passwordConfig.maxPasswordLength) {
            throw new APIError("BAD_REQUEST", {
              code: "PASSWORD_TOO_LONG",
              message: "Password is too long",
            });
          }

          const tokenHash = hashUserSetupToken(token);
          const now = new Date();
          const candidate = await getPrismaClient().userSetupToken.findUnique({
            where: { tokenHash },
            select: {
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
              user: { select: { disabledAt: true, mustChangePassword: true } },
            },
          });
          if (
            !candidate ||
            candidate.usedAt ||
            candidate.revokedAt ||
            candidate.expiresAt <= now ||
            candidate.user.disabledAt ||
            !candidate.user.mustChangePassword
          ) {
            invalidSetupToken();
          }
          const passwordHash = await context.context.password.hash(newPassword);

          await runInDatabaseTransaction(async (transaction) => {
            const setupToken = await transaction.userSetupToken.findUnique({
              where: { tokenHash },
              select: {
                id: true,
                userId: true,
                expiresAt: true,
                usedAt: true,
                revokedAt: true,
                user: {
                  select: {
                    disabledAt: true,
                    mustChangePassword: true,
                  },
                },
              },
            });

            if (
              !setupToken ||
              setupToken.usedAt ||
              setupToken.revokedAt ||
              setupToken.expiresAt <= now ||
              setupToken.user.disabledAt ||
              !setupToken.user.mustChangePassword
            ) {
              invalidSetupToken();
            }

            const reservation = await transaction.userSetupToken.updateMany({
              where: {
                id: setupToken.id,
                usedAt: null,
                revokedAt: null,
                expiresAt: { gt: now },
              },
              data: { usedAt: now },
            });
            if (reservation.count !== 1) invalidSetupToken();

            const existingCredential = await transaction.account.findFirst({
              where: {
                userId: setupToken.userId,
                providerId: "credential",
              },
              select: { id: true },
            });
            if (existingCredential) invalidSetupToken();

            await transaction.account.create({
              data: {
                id: randomUUID(),
                userId: setupToken.userId,
                providerId: "credential",
                issuer: createLocalAccountIssuer("credential"),
                accountId: setupToken.userId,
                password: passwordHash,
              },
            });
            await transaction.user.update({
              where: { id: setupToken.userId },
              data: { mustChangePassword: false },
            });
            await transaction.auditEvent.create({
              data: {
                actorType: "SYSTEM",
                actorId: setupToken.userId,
                action: "auth.user-setup.completed",
                entityType: "User",
                entityId: setupToken.userId,
                beforeMarker: { mustChangePassword: true },
                afterMarker: { mustChangePassword: false },
                source: "setup-token",
                correlationId,
              },
            });
          });

          return context.json({ status: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}

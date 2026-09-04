import "server-only";

import { z } from "zod";
import { defineCommand } from "../commands/define-command.ts";
import type { PrincipalContext } from "../authorization/principal.ts";

export const completePasswordOnboarding = defineCommand({
  name: "auth.complete-password-onboarding",
  input: z.object({}),
  authorize: (principal: PrincipalContext) => {
    if (
      principal.kind !== "platform-admin" &&
      principal.kind !== "platform-analyst" &&
      principal.kind !== "tenant-user"
    ) {
      throw new Error("INTERACTIVE_PRINCIPAL_REQUIRED");
    }
  },
  execute: async ({ principal, transaction }) => {
    if (
      principal.kind !== "platform-admin" &&
      principal.kind !== "platform-analyst" &&
      principal.kind !== "tenant-user"
    ) {
      throw new Error("INTERACTIVE_PRINCIPAL_REQUIRED");
    }
    const userId = principal.userId;
    const user = await transaction.user.findUniqueOrThrow({
      where: { id: userId },
      select: { mustChangePassword: true },
    });
    if (!user.mustChangePassword) return { changed: false };

    await transaction.user.update({
      where: { id: userId },
      data: { mustChangePassword: false },
    });
    await transaction.auditEvent.create({
      data: {
        organizationId: principal.kind === "tenant-user" ? principal.organizationId : null,
        actorType: "USER",
        actorId: userId,
        action: "auth.password.onboarding-complete",
        entityType: "User",
        entityId: userId,
        beforeMarker: { mustChangePassword: true },
        afterMarker: { mustChangePassword: false },
        source: "auth-onboarding",
        correlationId: principal.correlationId,
      },
    });
    return { changed: true };
  },
});

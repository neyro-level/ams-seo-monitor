"use server";

import { z } from "zod";
import { auth } from "@/modules/identity-access/server";
import { createCorrelationId } from "@/platform/http/correlation";

const setupInput = z.object({
  token: z.string().min(40).max(64),
  newPassword: z.string().min(8).max(128),
});

export type CompleteSetupResult =
  | { ok: true }
  | { ok: false; message: string };

export async function completeSetupAction(
  rawInput: z.input<typeof setupInput>,
): Promise<CompleteSetupResult> {
  const input = setupInput.safeParse(rawInput);
  if (!input.success || !auth) {
    return { ok: false, message: "Ссылка недействительна или срок её действия истёк." };
  }

  try {
    await auth.api.completeUserSetup({
      body: {
        token: input.data.token,
        newPassword: input.data.newPassword,
        correlationId: createCorrelationId(),
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Ссылка недействительна или срок её действия истёк." };
  }
}

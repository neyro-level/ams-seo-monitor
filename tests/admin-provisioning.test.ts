import { describe, expect, it } from "vitest";
import {
  fixedPasswordSchema,
  provisionClientInputSchema,
} from "../src/modules/identity-access/domain/admin-identity.ts";

describe("Platform Admin client provisioning contract", () => {
  it("accepts exactly eight printable characters", () => {
    expect(fixedPasswordSchema.parse("Ab12!xyz")).toBe("Ab12!xyz");
    expect(() => fixedPasswordSchema.parse("Ab12!xy")).toThrow();
    expect(() => fixedPasswordSchema.parse("Ab12!xyzz")).toThrow();
    expect(() => fixedPasswordSchema.parse("Ab12 xyz")).toThrow();
  });

  it("defaults tenant access to VIEWER", () => {
    const result = provisionClientInputSchema.parse({
      organizationName: "Клиент",
      organizationSlug: "client",
      projectName: "Проект",
      projectSlug: "client-project",
      thresholdProfileId: "threshold",
      clusterProfileId: "cluster",
      userName: "Пользователь",
      username: "client_user",
      password: "Ab12!xyz",
    });
    expect(result.tenantRole).toBe("VIEWER");
  });
});

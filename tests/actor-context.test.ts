import { describe, expect, it } from "vitest";
import {
  getActorOrganizationIds,
  getPermissionsForRole,
  hasPermission,
  parseSystemRole,
} from "../src/application/ports/actor-context";
import { createActorContext } from "./helpers/actor-context";

describe("ActorContext permissions", () => {
  it("keeps platform admin, analyst and client capabilities distinct", () => {
    expect(getPermissionsForRole("PLATFORM_ADMIN")).toContain("platform:manage");
    expect(getPermissionsForRole("SEO_ANALYST")).toContain("sync:run:any");
    expect(getPermissionsForRole("SEO_ANALYST")).not.toContain("platform:manage");
    expect(getPermissionsForRole("CLIENT_VIEWER")).toEqual([
      "project:read:organization",
      "report:read:organization",
    ]);
  });

  it("authorizes by capability and derives organization scope from memberships", () => {
    const actor = createActorContext({
      memberships: [
        { membershipId: "member-a", organizationId: "org-a", role: "client_viewer" },
        { membershipId: "member-b", organizationId: "org-b", role: "client_viewer" },
      ],
    });

    expect(hasPermission(actor, "project:read:organization")).toBe(true);
    expect(hasPermission(actor, "project:read:any")).toBe(false);
    expect(getActorOrganizationIds(actor)).toEqual(["org-a", "org-b"]);
  });

  it("parses only versioned system roles", () => {
    expect(parseSystemRole("PLATFORM_ADMIN")).toBe("PLATFORM_ADMIN");
    expect(() => parseSystemRole("SUPERUSER")).toThrow("Unsupported system role");
  });
});

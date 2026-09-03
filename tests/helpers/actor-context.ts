import {
  getPermissionsForRole,
  type ActorContext,
  type SystemRole,
} from "../../src/application/ports/actor-context";

export function createActorContext(
  overrides: Partial<ActorContext> & { systemRole?: SystemRole } = {},
): ActorContext {
  const systemRole = overrides.systemRole ?? "CLIENT_VIEWER";

  return {
    userId: "test-user",
    email: "test-user@example.invalid",
    name: "Test User",
    systemRole,
    activeOrganizationId: null,
    memberships: [],
    permissions: getPermissionsForRole(systemRole),
    correlationId: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

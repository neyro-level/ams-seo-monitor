export type SystemRole = "PLATFORM_ADMIN" | "ANALYST" | "CLIENT";

export function parseSystemRole(value: string): SystemRole {
  if (
    value === "PLATFORM_ADMIN" ||
    value === "ANALYST" ||
    value === "CLIENT"
  ) {
    return value;
  }

  throw new Error(`Unsupported system role: ${value}`);
}

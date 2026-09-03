export function isPlatformAdminTwoFactorRequired(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.AMS_E2E_TEST === "true") return false;
  return env.NODE_ENV === "production";
}

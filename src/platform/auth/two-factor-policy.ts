export function isPlatformAdminTwoFactorRequired(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.APP_ENV) return env.APP_ENV === "production";
  return env.NODE_ENV === "production";
}

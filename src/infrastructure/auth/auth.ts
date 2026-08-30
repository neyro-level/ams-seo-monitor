import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { hasDatabaseUrl, getPrismaClient } from "../database/prisma/client";

const authSecret = process.env.BETTER_AUTH_SECRET ?? null;
const authUrl = process.env.BETTER_AUTH_URL ?? null;

export function hasAuthConfiguration() {
  return authSecret !== null && authSecret.length > 0 && authUrl !== null && authUrl.length > 0;
}

export const auth =
  hasDatabaseUrl() && authSecret && authUrl
    ? betterAuth({
        secret: authSecret,
        baseURL: authUrl,
        trustedOrigins: [authUrl],
        database: prismaAdapter(getPrismaClient(), {
          provider: "postgresql",
        }),
        emailAndPassword: {
          enabled: true,
          disableSignUp: true,
        },
        plugins: [
          organization({
            allowUserToCreateOrganization: false,
          }),
        ],
      })
    : null;

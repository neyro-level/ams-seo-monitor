import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { organization, username } from "better-auth/plugins";
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
        trustedOrigins: [
          authUrl,
          ...(process.env.NODE_ENV === "production"
            ? []
            : ["http://127.0.0.1:3000", "http://localhost:3000"]),
        ],
        database: prismaAdapter(getPrismaClient(), {
          provider: "postgresql",
        }),
        emailAndPassword: {
          enabled: true,
          disableSignUp: true,
          minPasswordLength: 8,
          maxPasswordLength: 128,
        },
        plugins: [
          username({
            displayUsername: false,
            immutableUsername: true,
            minUsernameLength: 3,
            maxUsernameLength: 30,
          }),
          organization({
            allowUserToCreateOrganization: false,
          }),
        ],
      })
    : null;

import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { jwt, username } from "better-auth/plugins";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import {
  hasDatabaseConfiguration,
  readAuthEnvironment,
} from "../config/server-environment.ts";
import { getPrismaClient } from "../database/prisma/client.ts";
import { createAuthRateLimitConfig } from "./security-config.ts";
import { getMcpResource, MCP_SCOPE } from "./mcp-config.ts";

const authEnvironment = readAuthEnvironment();

export function hasAuthConfiguration() {
  return authEnvironment !== null && hasDatabaseConfiguration();
}

export const auth =
  hasAuthConfiguration() && authEnvironment
    ? betterAuth({
        secret: authEnvironment.secret,
        baseURL: authEnvironment.baseUrl,
        trustedOrigins: [
          authEnvironment.baseUrl,
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
        rateLimit: createAuthRateLimitConfig(),
        plugins: [
          jwt(),
          mcp({
            loginPage: "/",
            consentPage: "/consent",
            resource: getMcpResource(authEnvironment.baseUrl),
            resources: [{
              identifier: getMcpResource(authEnvironment.baseUrl),
              allowedScopes: [MCP_SCOPE],
              accessTokenTtl: 300,
            }],
            scopes: [MCP_SCOPE, "offline_access"],
            grantTypes: ["authorization_code", "refresh_token"],
            accessTokenExpiresIn: 300,
            allowDynamicClientRegistration: true,
            allowUnauthenticatedClientRegistration: true,
            clientRegistrationDefaultScopes: [MCP_SCOPE],
            clientRegistrationAllowedScopes: ["offline_access"],
          }),
          cimd({
            fetchClientMetadataResource,
            metadataProfile: "mcp-2026-07-28",
          }),
          username({
            displayUsername: false,
            immutableUsername: true,
            minUsernameLength: 3,
            maxUsernameLength: 30,
          }),
        ],
      })
    : null;

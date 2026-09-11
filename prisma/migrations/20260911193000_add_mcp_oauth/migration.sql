CREATE TABLE "public"."jwks" (
  "id" TEXT PRIMARY KEY,
  "publicKey" TEXT NOT NULL,
  "privateKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "alg" TEXT,
  "crv" TEXT
);

CREATE TABLE "public"."oauthClient" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL UNIQUE,
  "clientSecret" TEXT,
  "clientDiscoveryId" TEXT,
  "disabled" BOOLEAN DEFAULT FALSE,
  "skipConsent" BOOLEAN,
  "enableEndSession" BOOLEAN,
  "subjectType" TEXT,
  "scopes" TEXT[] NOT NULL,
  "clientCredentialsScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "userId" TEXT,
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  "name" TEXT,
  "uri" TEXT,
  "icon" TEXT,
  "contacts" TEXT[] NOT NULL,
  "tos" TEXT,
  "policy" TEXT,
  "softwareId" TEXT,
  "softwareVersion" TEXT,
  "softwareStatement" TEXT,
  "redirectUris" TEXT[] NOT NULL,
  "postLogoutRedirectUris" TEXT[] NOT NULL,
  "backchannelLogoutUri" TEXT,
  "backchannelLogoutSessionRequired" BOOLEAN,
  "tokenEndpointAuthMethod" TEXT,
  "applicationType" TEXT,
  "jwks" TEXT,
  "jwksUri" TEXT,
  "grantTypes" TEXT[] NOT NULL,
  "responseTypes" TEXT[] NOT NULL,
  "requirePKCE" BOOLEAN,
  "dpopBoundAccessTokens" BOOLEAN DEFAULT FALSE,
  "referenceId" TEXT,
  "metadata" JSONB,
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."oauthResource" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "accessTokenTtl" INTEGER,
  "refreshTokenTtl" INTEGER,
  "signingAlgorithm" TEXT,
  "signingKeyId" TEXT,
  "allowedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "customClaims" JSONB,
  "dpopBoundAccessTokensRequired" BOOLEAN DEFAULT FALSE,
  "disabled" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  "policyVersion" INTEGER DEFAULT 1,
  "metadata" JSONB
);

CREATE TABLE "public"."oauthClientResource" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3),
  UNIQUE ("clientId", "resourceId"),
  FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("resourceId") REFERENCES "public"."oauthResource"("identifier") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."oauthRefreshToken" (
  "id" TEXT PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "clientId" TEXT NOT NULL,
  "sessionId" TEXT,
  "userId" TEXT NOT NULL,
  "referenceId" TEXT,
  "authorizationCodeId" TEXT,
  "resources" TEXT[] NOT NULL,
  "requestedUserInfoClaims" TEXT[] NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3),
  "revoked" TIMESTAMP(3),
  "rotatedAt" TIMESTAMP(3),
  "rotationReplayResponse" TEXT,
  "rotationReplayExpiresAt" TIMESTAMP(3),
  "authTime" TIMESTAMP(3),
  "confirmation" JSONB,
  "scopes" TEXT[] NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."oauthAccessToken" (
  "id" TEXT PRIMARY KEY,
  "token" TEXT UNIQUE,
  "clientId" TEXT NOT NULL,
  "sessionId" TEXT,
  "userId" TEXT,
  "referenceId" TEXT,
  "authorizationCodeId" TEXT,
  "resources" TEXT[] NOT NULL,
  "requestedUserInfoClaims" TEXT[] NOT NULL,
  "refreshId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3),
  "revoked" TIMESTAMP(3),
  "confirmation" JSONB,
  "scopes" TEXT[] NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("refreshId") REFERENCES "public"."oauthRefreshToken"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."oauthConsent" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "userId" TEXT,
  "referenceId" TEXT,
  "resources" TEXT[] NOT NULL,
  "requestedUserInfoClaims" TEXT[] NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."oauthClientAssertion" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "oauthClient_userId_idx" ON "public"."oauthClient"("userId");
CREATE INDEX "oauthClientResource_clientId_idx" ON "public"."oauthClientResource"("clientId");
CREATE INDEX "oauthClientResource_resourceId_idx" ON "public"."oauthClientResource"("resourceId");
CREATE INDEX "oauthRefreshToken_clientId_idx" ON "public"."oauthRefreshToken"("clientId");
CREATE INDEX "oauthRefreshToken_sessionId_idx" ON "public"."oauthRefreshToken"("sessionId");
CREATE INDEX "oauthRefreshToken_userId_idx" ON "public"."oauthRefreshToken"("userId");
CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" ON "public"."oauthRefreshToken"("authorizationCodeId");
CREATE INDEX "oauthAccessToken_clientId_idx" ON "public"."oauthAccessToken"("clientId");
CREATE INDEX "oauthAccessToken_sessionId_idx" ON "public"."oauthAccessToken"("sessionId");
CREATE INDEX "oauthAccessToken_userId_idx" ON "public"."oauthAccessToken"("userId");
CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" ON "public"."oauthAccessToken"("authorizationCodeId");
CREATE INDEX "oauthAccessToken_refreshId_idx" ON "public"."oauthAccessToken"("refreshId");
CREATE INDEX "oauthConsent_clientId_idx" ON "public"."oauthConsent"("clientId");
CREATE INDEX "oauthConsent_userId_idx" ON "public"."oauthConsent"("userId");

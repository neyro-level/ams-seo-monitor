ALTER TABLE "public"."oauthClient"
  ALTER COLUMN "scopes" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "grantTypes" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "responseTypes" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."oauthRefreshToken"
  ALTER COLUMN "resources" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "requestedUserInfoClaims" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."oauthAccessToken"
  ALTER COLUMN "resources" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "requestedUserInfoClaims" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."oauthConsent"
  ALTER COLUMN "resources" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "requestedUserInfoClaims" SET DEFAULT ARRAY[]::TEXT[];

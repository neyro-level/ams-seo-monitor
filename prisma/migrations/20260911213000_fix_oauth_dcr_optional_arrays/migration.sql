ALTER TABLE "public"."oauthClient"
  ALTER COLUMN "contacts" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "postLogoutRedirectUris" SET DEFAULT ARRAY[]::TEXT[];

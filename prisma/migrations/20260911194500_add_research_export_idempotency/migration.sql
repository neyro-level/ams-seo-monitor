ALTER TABLE "research"."Export" ADD COLUMN "idempotencyKey" TEXT;
UPDATE "research"."Export" SET "idempotencyKey" = 'legacy:' || "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "research"."Export" ALTER COLUMN "idempotencyKey" SET NOT NULL;
ALTER TABLE "research"."Export" ADD CONSTRAINT "Export_organizationId_idempotencyKey_key" UNIQUE ("organizationId", "idempotencyKey");

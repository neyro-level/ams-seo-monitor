CREATE TYPE "ProductRole" AS ENUM ('VIEWER', 'OPERATOR', 'ANALYST');

ALTER TABLE "Member"
  ADD CONSTRAINT "Member_id_organizationId_key" UNIQUE ("id", "organizationId");

CREATE TABLE "SeoProjectAccess" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "role" "ProductRole" NOT NULL DEFAULT 'VIEWER',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoProjectAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoProjectAccess_membershipId_projectId_key"
  ON "SeoProjectAccess"("membershipId", "projectId");
CREATE INDEX "SeoProjectAccess_organizationId_projectId_idx"
  ON "SeoProjectAccess"("organizationId", "projectId");
CREATE INDEX "SeoProjectAccess_projectId_idx"
  ON "SeoProjectAccess"("projectId");

ALTER TABLE "SeoProjectAccess"
  ADD CONSTRAINT "SeoProjectAccess_membershipId_organizationId_fkey"
  FOREIGN KEY ("membershipId", "organizationId")
  REFERENCES "Member"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeoProjectAccess"
  ADD CONSTRAINT "SeoProjectAccess_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId")
  REFERENCES "Project"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Member" ("id", "userId", "organizationId", "tenantRole", "version", "createdAt", "updatedAt")
SELECT
  'analyst-' || SUBSTRING(MD5(u."id" || ':' || o."id") FOR 24),
  u."id",
  o."id",
  'VIEWER'::"MembershipRole",
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN "Organization" o
WHERE u."systemRole" = 'SEO_ANALYST'::"SystemRole"
ON CONFLICT ("organizationId", "userId") DO NOTHING;

INSERT INTO "SeoProjectAccess" (
  "id", "membershipId", "organizationId", "projectId", "role", "version", "createdAt", "updatedAt"
)
SELECT
  'seo-' || SUBSTRING(MD5(m."id" || ':' || p."id") FOR 24),
  m."id",
  m."organizationId",
  p."id",
  CASE
    WHEN u."systemRole" = 'SEO_ANALYST'::"SystemRole" THEN 'ANALYST'::"ProductRole"
    WHEN m."tenantRole" = 'ORG_OWNER'::"MembershipRole" THEN 'OPERATOR'::"ProductRole"
    ELSE 'VIEWER'::"ProductRole"
  END,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Member" m
JOIN "User" u ON u."id" = m."userId"
JOIN "Project" p ON p."organizationId" = m."organizationId"
ON CONFLICT ("membershipId", "projectId") DO NOTHING;

ALTER TABLE "Project"
ADD COLUMN "collaborationKey" TEXT;

UPDATE "Project"
SET "collaborationKey" = md5(
  random()::text || clock_timestamp()::text || "id" || coalesce("shareToken", '')
)
WHERE "collaborationKey" IS NULL;

ALTER TABLE "Project"
ALTER COLUMN "collaborationKey" SET NOT NULL;

CREATE UNIQUE INDEX "Project_collaborationKey_key"
ON "Project"("collaborationKey");

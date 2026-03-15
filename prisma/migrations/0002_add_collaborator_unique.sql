DELETE FROM "Collaborator" AS duplicate
USING "Collaborator" AS keeper
WHERE duplicate.id > keeper.id
  AND duplicate."projectId" = keeper."projectId"
  AND duplicate."userId" = keeper."userId";

CREATE UNIQUE INDEX IF NOT EXISTS "Collaborator_projectId_userId_key"
ON "Collaborator"("projectId", "userId");

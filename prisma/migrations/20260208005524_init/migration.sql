-- CreateTable
CREATE TABLE "ProvenanceRecord" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayName" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signatureAlgorithm" TEXT NOT NULL DEFAULT 'Ed25519',
    "signedPayloadHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "license" TEXT NOT NULL,
    "aiTraining" TEXT NOT NULL,
    "aiDerivativeGeneration" TEXT NOT NULL,
    "commercialUse" TEXT NOT NULL,
    "attributionRequired" BOOLEAN NOT NULL,
    "policyNote" TEXT,
    "policyHash" TEXT NOT NULL,

    CONSTRAINT "ProvenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProvenanceRecord_contentHash_idx" ON "ProvenanceRecord"("contentHash");

-- CreateIndex
CREATE INDEX "ProvenanceRecord_creatorId_idx" ON "ProvenanceRecord"("creatorId");

-- AlterTable
ALTER TABLE "ProvenanceRecord" ADD COLUMN     "perceptualHash" TEXT;

-- CreateIndex
CREATE INDEX "ProvenanceRecord_perceptualHash_idx" ON "ProvenanceRecord"("perceptualHash");

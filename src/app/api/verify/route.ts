import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contentHash, recordId, perceptualHash } = body;

    if (!contentHash) {
      return NextResponse.json(
        { error: "contentHash is required" },
        { status: 400 }
      );
    }

    // If a specific record ID is given, verify against that record
    if (recordId) {
      const record = await prisma.provenanceRecord.findUnique({
        where: { id: recordId },
      });

      if (!record) {
        return NextResponse.json(
          { status: "INVALID", reason: "Record not found" },
          { status: 404 }
        );
      }

      const hashMatch = record.contentHash === contentHash;

      return NextResponse.json({
        status: hashMatch ? "HASH_MATCH" : "HASH_MISMATCH",
        record: hashMatch ? record : null,
        message: hashMatch
          ? "File hash matches the registered record. Verify the signature client-side to complete verification."
          : "File hash does not match. The file may have been modified.",
      });
    }

    // Otherwise, look up all records for this hash
    const records = await prisma.provenanceRecord.findMany({
      where: { contentHash },
      orderBy: { signedAt: "asc" },
    });

    if (records.length === 0) {
      // Fallback: perceptual hash search
      if (perceptualHash) {
        const candidates = await prisma.provenanceRecord.findMany({
          where: { perceptualHash: { not: null } },
        });

        const threshold = 10;
        const matches = candidates
          .map((r) => ({
            ...r,
            hammingDistance: hammingDist(perceptualHash, r.perceptualHash!),
          }))
          .filter((r) => r.hammingDistance <= threshold)
          .sort((a, b) => a.hammingDistance - b.hammingDistance);

        if (matches.length > 0) {
          return NextResponse.json({
            status: "PERCEPTUAL_MATCH",
            message: `No exact hash match, but found ${matches.length} visually similar record(s) via perceptual hash.`,
            records: matches,
          });
        }
      }

      return NextResponse.json({
        status: "NOT_FOUND",
        message: "No provenance records found for this file.",
        records: [],
      });
    }

    return NextResponse.json({
      status: "FOUND",
      message: `Found ${records.length} provenance record(s). Verify signatures client-side to complete verification.`,
      records,
    });
  } catch (error) {
    console.error("Error verifying:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

function hammingDist(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    let bits = xor;
    while (bits) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}

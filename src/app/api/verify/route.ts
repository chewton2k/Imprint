import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contentHash, recordId } = body;

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

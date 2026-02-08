import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
    const records = await prisma.provenanceRecord.findMany({
      where: { contentHash: hash },
      orderBy: { signedAt: "asc" },
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No records found for this hash" },
        { status: 404 }
      );
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching records by hash:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

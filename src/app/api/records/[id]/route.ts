import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verify } from "@/lib/crypto";

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await prisma.provenanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error fetching record:", error);
    return NextResponse.json(
      { error: "Failed to fetch record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { timestamp, signature, verify_only } = await request.json();

    if (!timestamp || !signature) {
      return NextResponse.json(
        { error: "Missing timestamp or signature" },
        { status: 400 }
      );
    }

    if (Math.abs(Date.now() - timestamp) > TIMESTAMP_WINDOW_MS) {
      return NextResponse.json(
        { error: "Timestamp expired. Please try again." },
        { status: 400 }
      );
    }

    const record = await prisma.provenanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const message = `delete:${id}:${timestamp}`;
    const valid = await verify(message, signature, record.publicKey);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature. Make sure you are using the correct private key." },
        { status: 403 }
      );
    }

    if (verify_only) {
      return NextResponse.json({ verified: true });
    }

    await prisma.provenanceRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}

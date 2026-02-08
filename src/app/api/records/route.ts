import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      fileName,
      fileSize,
      contentType,
      contentHash,
      displayName,
      creatorId,
      publicKey,
      signedPayloadHash,
      signature,
      signedAt,
      license,
      aiTraining,
      aiDerivativeGeneration,
      commercialUse,
      attributionRequired,
      policyNote,
      policyHash,
    } = body;

    // Validate required fields
    if (
      !title ||
      !fileName ||
      !contentHash ||
      !displayName ||
      !creatorId ||
      !publicKey ||
      !signedPayloadHash ||
      !signature ||
      !signedAt ||
      !license ||
      !aiTraining ||
      !aiDerivativeGeneration ||
      !commercialUse ||
      attributionRequired === undefined ||
      !policyHash
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const record = await prisma.provenanceRecord.create({
      data: {
        title,
        description: description || null,
        fileName,
        fileSize: Number(fileSize),
        contentType,
        contentHash,
        displayName,
        creatorId,
        publicKey,
        signedPayloadHash,
        signature,
        signedAt: new Date(signedAt),
        license,
        aiTraining,
        aiDerivativeGeneration,
        commercialUse,
        attributionRequired: Boolean(attributionRequired),
        policyNote: policyNote || null,
        policyHash,
      },
    });

    return NextResponse.json(
      { id: record.id, message: "Record created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating record:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const records = await prisma.provenanceRecord.findMany({
      orderBy: { signedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        displayName: true,
        contentHash: true,
        signedAt: true,
        license: true,
        aiTraining: true,
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

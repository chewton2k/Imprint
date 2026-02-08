import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.provenanceRecord.findUnique({
    where: { id },
  });

  if (!record) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/records"
          className="text-sm text-neutral-500 hover:underline underline-offset-4"
        >
          &larr; All records
        </Link>
        <h1 className="text-2xl font-bold mt-2">{record.title}</h1>
        {record.description && (
          <p className="text-sm text-neutral-500 mt-1">{record.description}</p>
        )}
      </div>

      {/* Work Details */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Work</h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm space-y-2">
          <Row label="File" value={`${record.fileName} (${(record.fileSize / 1024).toFixed(1)} KB)`} />
          <Row label="Type" value={record.contentType} />
          <Row label="Content Hash" value={record.contentHash} mono />
          <Row label="Registered" value={new Date(record.signedAt).toLocaleString()} />
        </div>
      </section>

      {/* Creator */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Creator</h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm space-y-2">
          <Row label="Display Name" value={record.displayName} />
          <Row label="Creator ID" value={record.creatorId} mono />
          <Row label="Public Key" value={record.publicKey} mono />
        </div>
      </section>

      {/* Authorship Proof */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Authorship Proof</h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm space-y-2">
          <Row label="Algorithm" value={record.signatureAlgorithm} />
          <Row label="Payload Hash" value={record.signedPayloadHash} mono />
          <Row label="Signature" value={record.signature} mono />
          <Row label="Signed At" value={new Date(record.signedAt).toISOString()} />
        </div>
      </section>

      {/* Usage Policy */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Usage Policy</h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm space-y-2">
          <Row label="License" value={record.license.replace(/_/g, " ")} />
          <PolicyRow label="AI Training" value={record.aiTraining} />
          <PolicyRow label="AI Derivatives" value={record.aiDerivativeGeneration} />
          <PolicyRow label="Commercial Use" value={record.commercialUse} />
          <Row
            label="Attribution"
            value={record.attributionRequired ? "Required" : "Not required"}
          />
          {record.policyNote && <Row label="Note" value={record.policyNote} />}
          <Row label="Policy Hash" value={record.policyHash} mono />
        </div>
      </section>

      <section className="text-xs text-neutral-500 space-y-1">
        <p>
          Record ID: <code>{record.id}</code>
        </p>
        <p>Schema version: {record.schemaVersion}</p>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="font-medium shrink-0 w-36">{label}</span>
      <span className={`break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="font-medium shrink-0 w-36">{label}</span>
      <span
        className={`font-semibold ${
          value === "DENIED"
            ? "text-red-600 dark:text-red-400"
            : "text-green-600 dark:text-green-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

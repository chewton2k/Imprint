"use client";

import { useState, useCallback } from "react";
import {
  hashFile,
  buildCanonicalPayload,
  verify,
  type UsagePolicy,
} from "@/lib/crypto";
import { isImageType, computePerceptualHash } from "@/lib/phash";

interface ProvenanceRecord {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  contentType: string;
  contentHash: string;
  perceptualHash: string | null;
  displayName: string;
  creatorId: string;
  publicKey: string;
  signedPayloadHash: string;
  signature: string;
  signedAt: string;
  license: string;
  aiTraining: string;
  aiDerivativeGeneration: string;
  commercialUse: string;
  attributionRequired: boolean;
  policyNote: string | null;
  policyHash: string;
}

type VerifyResult = {
  status: "VERIFIED" | "HASH_MISMATCH" | "SIGNATURE_INVALID" | "NOT_FOUND" | "PERCEPTUAL_MATCH";
  record?: ProvenanceRecord & { hammingDistance?: number };
  message: string;
};

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [computedHash, setComputedHash] = useState("");

  const handleVerify = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setResult(null);
      setHashing(true);

      try {
        const hash = await hashFile(f);
        setComputedHash(hash);
        setHashing(false);
        setVerifying(true);

        // Look up records by hash
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentHash: hash }),
        });

        const data = await res.json();

        if (data.status === "NOT_FOUND" || !data.records?.length) {
          // Fallback: try perceptual hash for images
          if (f && isImageType(f.type)) {
            try {
              const pHash = await computePerceptualHash(f);
              const pRes = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contentHash: hash, perceptualHash: pHash }),
              });
              const pData = await pRes.json();

              if (pData.status === "PERCEPTUAL_MATCH" && pData.records?.length) {
                const pRecord = pData.records[0];
                // Verify signature using the record's contentHash
                const pUsagePolicy: UsagePolicy = {
                  license: pRecord.license,
                  ai_training: pRecord.aiTraining,
                  ai_derivative_generation: pRecord.aiDerivativeGeneration,
                  commercial_use: pRecord.commercialUse,
                  attribution_required: pRecord.attributionRequired,
                  policy_note: pRecord.policyNote || "",
                };
                const pCanonical = buildCanonicalPayload({
                  content_hash: pRecord.contentHash,
                  title: pRecord.title,
                  content_type: pRecord.contentType,
                  creator_id: pRecord.creatorId,
                  usage_policy: pUsagePolicy,
                  signed_at: pRecord.signedAt,
                });
                const pSigValid = await verify(pCanonical, pRecord.signature, pRecord.publicKey);

                if (pSigValid) {
                  setResult({
                    status: "PERCEPTUAL_MATCH",
                    record: pRecord,
                    message: `No exact file match, but a visually similar image was found (Hamming distance: ${pRecord.hammingDistance}). The signature on the original record is valid.`,
                  });
                  return;
                }
              }
            } catch {
              // pHash computation failed, fall through to NOT_FOUND
            }
          }

          setResult({
            status: "NOT_FOUND",
            message: "No provenance records found for this file.",
          });
          return;
        }

        // Verify signature of the first (earliest) record
        const record: ProvenanceRecord = data.records[0];
        const usagePolicy: UsagePolicy = {
          license: record.license,
          ai_training: record.aiTraining,
          ai_derivative_generation: record.aiDerivativeGeneration,
          commercial_use: record.commercialUse,
          attribution_required: record.attributionRequired,
          policy_note: record.policyNote || "",
        };

        const canonicalPayload = buildCanonicalPayload({
          content_hash: record.contentHash,
          title: record.title,
          content_type: record.contentType,
          creator_id: record.creatorId,
          usage_policy: usagePolicy,
          signed_at: record.signedAt,
        });

        const sigValid = await verify(
          canonicalPayload,
          record.signature,
          record.publicKey
        );

        if (sigValid) {
          setResult({
            status: "VERIFIED",
            record,
            message: "Signature verified. This file has a valid provenance record.",
          });
        } else {
          setResult({
            status: "SIGNATURE_INVALID",
            record,
            message:
              "Hash matched but signature verification failed. The record may have been tampered with.",
          });
        }
      } catch {
        setResult({
          status: "NOT_FOUND",
          message: "Verification failed. Please try again.",
        });
      } finally {
        setHashing(false);
        setVerifying(false);
      }
    },
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Verify a Work</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a file to check for provenance records. The file is hashed
          locally — never uploaded.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Select a file to verify</span>
        <input
          type="file"
          onChange={handleVerify}
          disabled={hashing || verifying}
          className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-300 dark:file:border-neutral-700 file:text-sm file:font-medium file:bg-transparent hover:file:bg-neutral-100 dark:hover:file:bg-neutral-900 file:cursor-pointer"
        />
      </label>

      {(hashing || verifying) && (
        <p className="text-sm text-neutral-500">
          {hashing ? "Hashing file..." : "Verifying..."}
        </p>
      )}

      {computedHash && (
        <div className="text-xs font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg break-all">
          SHA-256: {computedHash}
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border p-4 space-y-3 ${
            result.status === "VERIFIED"
              ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950"
              : result.status === "PERCEPTUAL_MATCH"
                ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950"
                : result.status === "NOT_FOUND"
                  ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
                  : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                result.status === "VERIFIED"
                  ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                  : result.status === "PERCEPTUAL_MATCH"
                    ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
                    : result.status === "NOT_FOUND"
                      ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      : "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
              }`}
            >
              {result.status}
            </span>
            <span className="text-sm">{file?.name}</span>
          </div>
          <p className="text-sm">{result.message}</p>

          {result.record && (
            <div className="mt-4 space-y-2 text-sm">
              <h3 className="font-semibold">Record Details</h3>
              <div>
                <span className="font-medium">Title:</span>{" "}
                {result.record.title}
              </div>
              <div>
                <span className="font-medium">Creator:</span>{" "}
                {result.record.displayName}
              </div>
              <div className="break-all text-xs">
                <span className="font-medium">Creator ID:</span>{" "}
                <code>{result.record.creatorId}</code>
              </div>
              <div>
                <span className="font-medium">Signed at:</span>{" "}
                {new Date(result.record.signedAt).toLocaleString()}
              </div>
              {result.status === "PERCEPTUAL_MATCH" && result.record.hammingDistance !== undefined && (
                <div>
                  <span className="font-medium">Hamming Distance:</span>{" "}
                  <span className="text-amber-600 dark:text-amber-400">
                    {result.record.hammingDistance} / 64
                  </span>
                </div>
              )}

              <h3 className="font-semibold pt-2">Usage Policy</h3>
              <div>
                <span className="font-medium">License:</span>{" "}
                {result.record.license.replace(/_/g, " ")}
              </div>
              <div>
                <span className="font-medium">AI Training:</span>{" "}
                <span
                  className={
                    result.record.aiTraining === "DENIED"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }
                >
                  {result.record.aiTraining}
                </span>
              </div>
              <div>
                <span className="font-medium">AI Derivatives:</span>{" "}
                <span
                  className={
                    result.record.aiDerivativeGeneration === "DENIED"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }
                >
                  {result.record.aiDerivativeGeneration}
                </span>
              </div>
              <div>
                <span className="font-medium">Commercial Use:</span>{" "}
                <span
                  className={
                    result.record.commercialUse === "DENIED"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }
                >
                  {result.record.commercialUse}
                </span>
              </div>
              <div>
                <span className="font-medium">Attribution:</span>{" "}
                {result.record.attributionRequired ? "Required" : "Not required"}
              </div>
              {result.record.policyNote && (
                <div>
                  <span className="font-medium">Note:</span>{" "}
                  {result.record.policyNote}
                </div>
              )}

              <a
                href={`/records/${result.record.id}`}
                className="inline-block mt-2 text-sm underline underline-offset-4"
              >
                View full record
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

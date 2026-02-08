"use client";

import { useState, useCallback } from "react";
import {
  generateKeyPair,
  publicKeyToDidKey,
  hashFile,
  buildCanonicalPayload,
  sha256Hash,
  sign,
  type UsagePolicy,
} from "@/lib/crypto";
import { isImageType, computePerceptualHash } from "@/lib/phash";

type Step = "upload" | "metadata" | "policy" | "sign" | "done";

const LICENSE_OPTIONS = [
  "ALL_RIGHTS_RESERVED",
  "CC_BY_4",
  "CC_BY_SA_4",
  "CC_BY_NC_4",
  "CC_BY_NC_SA_4",
  "CC_BY_ND_4",
  "CC_BY_NC_ND_4",
  "CC0",
  "MIT",
  "CUSTOM",
] as const;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [contentHash, setContentHash] = useState("");
  const [hashing, setHashing] = useState(false);

  // Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Policy
  const [license, setLicense] = useState("ALL_RIGHTS_RESERVED");
  const [aiTraining, setAiTraining] = useState("DENIED");
  const [aiDerivative, setAiDerivative] = useState("DENIED");
  const [commercialUse, setCommercialUse] = useState("DENIED");
  const [attributionRequired, setAttributionRequired] = useState(true);
  const [policyNote, setPolicyNote] = useState("");

  // Perceptual Hash
  const [enablePHash, setEnablePHash] = useState(false);
  const [perceptualHash, setPerceptualHash] = useState("");
  const [computingPHash, setComputingPHash] = useState(false);

  // Result
  const [signing, setSigning] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [error, setError] = useState("");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setHashing(true);
      setError("");
      try {
        const hash = await hashFile(f);
        setContentHash(hash);
        setStep("metadata");
      } catch {
        setError("Failed to hash file. Please try again.");
      } finally {
        setHashing(false);
      }
    },
    []
  );

  const handleSign = useCallback(async () => {
    if (!file || !contentHash) return;
    setSigning(true);
    setError("");

    try {
      const keyPair = await generateKeyPair();
      const creatorId = publicKeyToDidKey(keyPair.publicKey);
      const signedAt = new Date().toISOString();

      const usagePolicy: UsagePolicy = {
        license,
        ai_training: aiTraining,
        ai_derivative_generation: aiDerivative,
        commercial_use: commercialUse,
        attribution_required: attributionRequired,
        policy_note: policyNote,
      };

      const canonicalPayload = buildCanonicalPayload({
        content_hash: contentHash,
        title,
        content_type: file.type || "application/octet-stream",
        creator_id: creatorId,
        usage_policy: usagePolicy,
        signed_at: signedAt,
      });

      const signature = await sign(canonicalPayload, keyPair.privateKey);
      const signedPayloadHash = await sha256Hash(canonicalPayload);
      const policyHash = await sha256Hash(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(usagePolicy).sort(([a], [b]) => a.localeCompare(b))
          )
        )
      );

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          contentHash,
          displayName,
          creatorId,
          publicKey: keyPair.publicKey,
          signedPayloadHash,
          signature,
          signedAt,
          license,
          aiTraining,
          aiDerivativeGeneration: aiDerivative,
          commercialUse,
          attributionRequired,
          policyNote,
          policyHash,
          perceptualHash: enablePHash ? perceptualHash : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create record");
      }

      const data = await res.json();
      setRecordId(data.id);
      setStep("done");

      // Save private key as downloadable backup
      const blob = new Blob(
        [
          JSON.stringify(
            {
              creator_id: creatorId,
              public_key: keyPair.publicKey,
              private_key: keyPair.privateKey,
              created_at: signedAt,
              warning:
                "Keep this file safe. Your private key is needed to sign future works under this identity.",
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imprint-keypair-${creatorId.slice(-8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setSigning(false);
    }
  }, [
    file,
    contentHash,
    title,
    description,
    displayName,
    license,
    aiTraining,
    aiDerivative,
    commercialUse,
    attributionRequired,
    policyNote,
    enablePHash,
    perceptualHash,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Register a Work</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Everything happens in your browser. Your file is never uploaded.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 text-xs">
        {(["upload", "metadata", "policy", "sign", "done"] as Step[]).map(
          (s) => (
            <span
              key={s}
              className={`px-3 py-1 rounded-full border ${
                step === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-400"
              }`}
            >
              {s === "upload"
                ? "File"
                : s === "metadata"
                  ? "Details"
                  : s === "policy"
                    ? "Policy"
                    : s === "sign"
                      ? "Sign"
                      : "Done"}
            </span>
          )
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Select a file</span>
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={hashing}
              className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-300 dark:file:border-neutral-700 file:text-sm file:font-medium file:bg-transparent hover:file:bg-neutral-100 dark:hover:file:bg-neutral-900 file:cursor-pointer"
            />
          </label>
          {hashing && (
            <p className="text-sm text-neutral-500">Hashing file...</p>
          )}
        </div>
      )}

      {/* Step 2: Metadata */}
      {step === "metadata" && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg break-all">
            SHA-256: {contentHash}
          </div>
          {file && isImageType(file.type) && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enablePHash}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setEnablePHash(checked);
                    if (checked && !perceptualHash && file) {
                      setComputingPHash(true);
                      try {
                        const ph = await computePerceptualHash(file);
                        setPerceptualHash(ph);
                      } catch {
                        setError("Failed to compute perceptual hash.");
                        setEnablePHash(false);
                      } finally {
                        setComputingPHash(false);
                      }
                    }
                  }}
                  disabled={computingPHash}
                  className="rounded"
                />
                Enable perceptual hash (helps identify visually similar images)
              </label>
              {computingPHash && (
                <p className="text-xs text-neutral-500">Computing perceptual hash...</p>
              )}
              {enablePHash && perceptualHash && (
                <div className="text-xs font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg break-all">
                  pHash: {perceptualHash}
                </div>
              )}
            </div>
          )}
          <label className="block">
            <span className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Creative Work"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description of your work"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">
              Display Name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or pseudonym"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={() => setStep("policy")}
            disabled={!title || !displayName}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 3: Policy */}
      {step === "policy" && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">License</span>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {LICENSE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Usage Permissions</legend>

            <label className="flex items-center gap-3 text-sm">
              <select
                value={aiTraining}
                onChange={(e) => setAiTraining(e.target.value)}
                className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              >
                <option value="DENIED">DENIED</option>
                <option value="ALLOWED">ALLOWED</option>
              </select>
              AI Training
            </label>

            <label className="flex items-center gap-3 text-sm">
              <select
                value={aiDerivative}
                onChange={(e) => setAiDerivative(e.target.value)}
                className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              >
                <option value="DENIED">DENIED</option>
                <option value="ALLOWED">ALLOWED</option>
              </select>
              AI Derivative Generation
            </label>

            <label className="flex items-center gap-3 text-sm">
              <select
                value={commercialUse}
                onChange={(e) => setCommercialUse(e.target.value)}
                className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
              >
                <option value="DENIED">DENIED</option>
                <option value="ALLOWED">ALLOWED</option>
              </select>
              Commercial Use
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={attributionRequired}
                onChange={(e) => setAttributionRequired(e.target.checked)}
                className="rounded"
              />
              Attribution Required
            </label>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium">Policy Note</span>
            <textarea
              value={policyNote}
              onChange={(e) => setPolicyNote(e.target.value)}
              rows={2}
              placeholder="Optional note clarifying your intent"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("metadata")}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep("sign")}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Sign */}
      {step === "sign" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review & Sign</h2>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 text-sm">
            <div>
              <span className="font-medium">File:</span> {file?.name} (
              {file ? (file.size / 1024).toFixed(1) : 0} KB)
            </div>
            <div className="break-all">
              <span className="font-medium">Hash:</span>{" "}
              <code className="text-xs">{contentHash}</code>
            </div>
            <div>
              <span className="font-medium">Title:</span> {title}
            </div>
            <div>
              <span className="font-medium">Creator:</span> {displayName}
            </div>
            <div>
              <span className="font-medium">License:</span>{" "}
              {license.replace(/_/g, " ")}
            </div>
            <div>
              <span className="font-medium">AI Training:</span> {aiTraining}
            </div>
            <div>
              <span className="font-medium">AI Derivatives:</span>{" "}
              {aiDerivative}
            </div>
            <div>
              <span className="font-medium">Commercial:</span> {commercialUse}
            </div>
            <div>
              <span className="font-medium">Attribution:</span>{" "}
              {attributionRequired ? "Required" : "Not required"}
            </div>
            {enablePHash && perceptualHash && (
              <div className="break-all">
                <span className="font-medium">Perceptual Hash:</span>{" "}
                <code className="text-xs">{perceptualHash}</code>
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-500">
            Clicking &quot;Sign & Register&quot; will generate an Ed25519
            keypair in your browser, sign this record, and download your keypair
            file. Keep the keypair safe — it proves your identity.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("policy")}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm"
            >
              Back
            </button>
            <button
              onClick={handleSign}
              disabled={signing}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40"
            >
              {signing ? "Signing..." : "Sign & Register"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-4 space-y-2">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
              Record Created
            </h2>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your provenance record has been signed and stored.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 break-all">
              Record ID: <code>{recordId}</code>
            </p>
          </div>
          <p className="text-xs text-neutral-500">
            A keypair file was downloaded to your device. Keep it safe — you need
            it to sign future works under this identity.
          </p>
          <div className="flex gap-3">
            <a
              href={`/records/${recordId}`}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
            >
              View Record
            </a>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm"
            >
              Register Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

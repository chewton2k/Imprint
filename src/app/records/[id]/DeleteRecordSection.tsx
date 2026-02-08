"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sign } from "@/lib/crypto";

type Stage = "input" | "countdown" | "confirm" | "deleting";

export default function DeleteRecordSection({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);

  // Stored signature + timestamp from the verification step
  const [pendingDelete, setPendingDelete] = useState<{
    timestamp: number;
    signature: string;
  } | null>(null);

  const executeDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setStage("deleting");

    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingDelete),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete record");
      }

      router.push("/records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setStage("input");
      setPendingDelete(null);
    }
  }, [pendingDelete, recordId, router]);

  useEffect(() => {
    if (stage !== "countdown") return;

    if (countdown <= 0) {
      setStage("confirm");
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  async function handleVerify() {
    setError(null);

    try {
      if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        throw new Error("Invalid private key format. Expected 64-character hex string.");
      }

      const timestamp = Date.now();
      const message = `delete:${recordId}:${timestamp}`;
      const signature = await sign(message, privateKey);

      // Verify the signature server-side before starting countdown
      const res = await fetch(`/api/records/${recordId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp, signature, verify_only: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify key");
      }

      // Key verified — store and start countdown
      setPendingDelete({ timestamp, signature });
      setCountdown(3);
      setStage("countdown");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  }

  function cancelCountdown() {
    setStage("input");
    setPendingDelete(null);
    setCountdown(3);
  }

  function reset() {
    setOpen(false);
    setPrivateKey("");
    setShowKey(false);
    setStage("input");
    setError(null);
    setPendingDelete(null);
    setCountdown(3);
  }

  if (!open) {
    return (
      <section className="space-y-2">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-red-600 dark:text-red-400 hover:underline underline-offset-4"
        >
          Delete Record
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
        Delete Record
      </h2>
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-4 space-y-3">
        {stage === "input" && (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              To delete this record, enter the private key from the keypair you
              downloaded during registration. This proves you are the original
              creator.
            </p>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="Private key (hex)"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value.trim())}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 pr-16 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={!privateKey}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Verify & Delete
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === "countdown" && (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Key verified. The record will be permanently deleted, this action is irreversible!
            </p>
            <div className="flex items-center gap-3">
              <button
                disabled
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white opacity-50"
              >
                {countdown}
              </button>
              <button
                onClick={cancelCountdown}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === "confirm" && (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Key verified. The record will be permanently deleted, this action is irreversible!
            </p>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={executeDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirm Delete
              </button>
              <button
                onClick={cancelCountdown}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === "deleting" && (
          <p className="text-sm text-neutral-500">Deleting record…</p>
        )}
      </div>
    </section>
  );
}

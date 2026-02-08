"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface RecordSummary {
  id: string;
  title: string;
  displayName: string;
  contentHash: string;
  signedAt: string;
  license: string;
  aiTraining: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  // Load all records on mount
  useEffect(() => {
    fetch("/api/records")
      .then((res) => res.json())
      .then((data) => setRecords(data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      // Reset to full list
      setLoading(true);
      setSearched(false);
      fetch("/api/records")
        .then((res) => res.json())
        .then((data) => setRecords(data))
        .catch(() => setRecords([]))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/records/by-hash/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSearched(false);
    setLoading(true);
    fetch("/api/records")
      .then((res) => res.json())
      .then((data) => setRecords(data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Provenance Records</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Public registry of works.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by content hash..."
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm font-mono placeholder:font-sans"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium shrink-0"
        >
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {searched ? (
            <>
              No records found for that hash.{" "}
              <button onClick={handleClear} className="underline underline-offset-4">
                Clear search
              </button>
            </>
          ) : (
            <>
              No records yet.{" "}
              <Link href="/register" className="underline underline-offset-4">
                Register a work
              </Link>{" "}
              to get started.
            </>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {searched && (
            <p className="text-sm text-neutral-500">
              {records.length} {records.length === 1 ? "record" : "records"} found.{" "}
              <button onClick={handleClear} className="underline underline-offset-4">
                Clear search
              </button>
            </p>
          )}
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/records/${record.id}`}
              className="block rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{record.title}</h2>
                  <p className="text-sm text-neutral-500">
                    by {record.displayName} &middot;{" "}
                    {new Date(record.signedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      record.aiTraining === "DENIED"
                        ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                        : "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                    }`}
                  >
                    AI Training: {record.aiTraining}
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-2 truncate">
                {record.contentHash}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

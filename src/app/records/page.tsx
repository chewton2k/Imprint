import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const records = await prisma.provenanceRecord.findMany({
    orderBy: { signedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Provenance Records</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Recently registered works.
        </p>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No records yet.{" "}
          <Link href="/register" className="underline underline-offset-4">
            Register a work
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="space-y-3">
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

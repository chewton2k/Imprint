import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">Imprint</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Cryptographic proof of authorship and explicit machine-readable
          consent so creative work can be audited — not silently exploited — in
          the age of AI.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/register"
          className="group block rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2 group-hover:underline underline-offset-4">
            Register a Work
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Upload a file, declare your authorship and usage policy, and sign it
            cryptographically. Takes under a minute.
          </p>
        </Link>

        <Link
          href="/verify"
          className="group block rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2 group-hover:underline underline-offset-4">
            Verify a Work
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Upload a file to check if it has a registered provenance record.
            Verify authorship and inspect usage policies.
          </p>
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>
            Your file is hashed (SHA-256) entirely in your browser — nothing is
            uploaded to a server.
          </li>
          <li>
            An Ed25519 keypair is generated locally. Your private key never
            leaves your device.
          </li>
          <li>
            You set a usage policy (AI training, derivatives, commercial use)
            and sign the record.
          </li>
          <li>
            The signed record is stored. Anyone can verify authorship and policy
            using only the file and the public key.
          </li>
        </ol>
      </section>

      <section className="text-xs text-neutral-500 dark:text-neutral-500 space-y-1">
        <p>
          Imprint does not prevent copying or block AI training. It provides
          proof, signaling, and auditability.
        </p>
        <p>This is not legal advice.</p>
      </section>
    </div>
  );
}

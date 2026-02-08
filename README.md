# Imprint

Imprint is a provenance tool that lets creators prove they authored a piece of work — without uploading the work itself. It creates a tamper-proof, cryptographically signed record that ties your identity to your content.

Think of it like a notarized timestamp for your creative work, except you don't need a notary — just your browser.

## Why it's useful

- **Prove authorship.** If someone copies your work, you have a signed, timestamped record showing you created it first.
- **Set usage terms.** Declare upfront whether your work can be used for AI training, commercial purposes, derivatives, etc.
- **Stay private.** Your file never leaves your device. Only a fingerprint (hash) of the file is stored.
- **Own your identity.** You control your cryptographic keys. No account, no platform lock-in.

## How it works

### 1. File hashing

When you select a file, Imprint generates a SHA-256 hash of it entirely in your browser. This hash is a unique fingerprint — if even one byte of the file changes, the hash changes completely. The file itself is never uploaded or stored anywhere.

### 2. Metadata and usage policy

You add a title, description, and your display name. Then you set a usage policy: what license applies, whether AI training or commercial use is allowed, and whether attribution is required. This policy is stored alongside the record so anyone can see the creator's intent.

### 3. Cryptographic signing

When you click "Sign & Register," the following happens in your browser:

1. An **Ed25519 keypair** is generated — a private key (your secret) and a public key (your identity).
2. The public key is converted to a **DID (Decentralized Identifier)** in the `did:key` format, giving you a portable, self-sovereign identity.
3. All the record data (content hash, title, content type, creator ID, usage policy, timestamp) is assembled into a **canonical JSON payload** — keys sorted alphabetically, no extra whitespace — so the same data always produces the exact same string.
4. This payload is **signed with your private key**. The signature mathematically proves that the holder of that private key created this exact record at this exact time.
5. The signed record is sent to the server and stored in a database.
6. Your keypair is downloaded as a JSON file. Keep it safe — it's your identity for signing future works.

### 4. Perceptual hashing (optional, images only)

For image files, you can optionally enable a **perceptual hash (pHash)** during registration. Unlike SHA-256, which changes if even a single byte differs, a perceptual hash captures the *visual structure* of an image:

1. The image is resized to 32x32 grayscale.
2. A **2D Discrete Cosine Transform (DCT)** extracts frequency information.
3. The top-left 8x8 low-frequency coefficients (excluding DC) are compared to their median, producing a compact **64-bit hash** (16-char hex string).

Two visually identical images — even if re-compressed, resized, or stripped of metadata — will produce the same or very similar pHash. The **Hamming distance** (number of differing bits) between two hashes measures similarity: 0 means identical, ≤10 means very similar.

pHash is **not** part of the cryptographic proof. It is a secondary lookup aid that helps find matching records when the exact SHA-256 no longer matches due to file transformations.

### 5. Verification

Anyone can verify a record:

- **Signature verification:** Given the public key, the signature, and the original payload, Ed25519 verification confirms the record was signed by the holder of the corresponding private key.
- **Content verification:** Given the original file, anyone can re-hash it and compare the result to the stored content hash. If they match, the file is the one the creator registered.
- **Perceptual match (fallback):** If no exact hash match is found and the file is an image, Imprint automatically computes a pHash and searches for visually similar records. Matches are shown with an amber "PERCEPTUAL_MATCH" status and the Hamming distance.

## Architecture

- **Frontend:** Next.js with React. All cryptographic operations (hashing, key generation, signing) happen client-side using the [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519) library and the Web Crypto API.
- **Backend:** Next.js API routes. Stores records in a PostgreSQL database (Supabase) via Prisma.
- **No file storage.** Only metadata, hashes, and signatures are persisted.

## Getting started

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project structure

```
src/
  app/
    page.tsx              # Home page
    register/page.tsx     # Registration flow (upload, metadata, policy, sign)
    verify/page.tsx       # Verification page
    records/page.tsx      # Browse records
    records/[id]/page.tsx # Individual record detail
    api/
      records/route.ts    # POST (create) and GET (list) records
      records/[id]/route.ts
      records/by-hash/[hash]/route.ts
      verify/route.ts     # Signature verification endpoint
  lib/
    crypto.ts             # Ed25519 key generation, signing, hashing, DID creation
    phash.ts              # Perceptual hashing (DCT-based pHash, Hamming distance)
    db.ts                 # Prisma client setup
prisma/
  schema.prisma           # Database schema
```

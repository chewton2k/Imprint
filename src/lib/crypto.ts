import * as ed from "@noble/ed25519";

export interface KeyPair {
  privateKey: string; // hex
  publicKey: string; // hex
}

export interface UsagePolicy {
  license: string;
  ai_training: string;
  ai_derivative_generation: string;
  commercial_use: string;
  attribution_required: boolean;
  policy_note: string;
}

export interface SignedPayloadFields {
  content_hash: string;
  title: string;
  content_type: string;
  creator_id: string;
  usage_policy: UsagePolicy;
  signed_at: string;
}

/**
 * Generate an Ed25519 keypair.
 * Returns hex-encoded private and public keys.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

/**
 * Derive a did:key identifier from a hex-encoded Ed25519 public key.
 * Uses the multicodec prefix 0xed01 for Ed25519.
 */
export function publicKeyToDidKey(publicKeyHex: string): string {
  const pubBytes = hexToBytes(publicKeyHex);
  // multicodec prefix for ed25519-pub: 0xed 0x01
  const multicodec = new Uint8Array([0xed, 0x01, ...pubBytes]);
  const encoded = bytesToBase58(multicodec);
  return `did:key:z${encoded}`;
}

/**
 * Build the canonical signed payload as a deterministic JSON string.
 * Keys are sorted alphabetically, no whitespace.
 */
export function buildCanonicalPayload(fields: SignedPayloadFields): string {
  const sortedPolicy = sortObject(fields.usage_policy);
  const payload = sortObject({
    content_hash: fields.content_hash,
    title: fields.title,
    content_type: fields.content_type,
    creator_id: fields.creator_id,
    usage_policy: sortedPolicy,
    signed_at: fields.signed_at,
  });
  return JSON.stringify(payload);
}

/**
 * Hash a string using SHA-256. Returns hex-encoded hash.
 */
export async function sha256Hash(data: string | Uint8Array): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === "string") {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else {
    buffer = data.buffer as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Hash a file using SHA-256 via streaming. Returns hex-encoded hash.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Sign data with an Ed25519 private key.
 * Returns base64-encoded signature.
 */
export async function sign(
  data: string,
  privateKeyHex: string
): Promise<string> {
  const msgBytes = new TextEncoder().encode(data);
  const privBytes = hexToBytes(privateKeyHex);
  const signature = await ed.signAsync(msgBytes, privBytes);
  return btoa(String.fromCharCode(...signature));
}

/**
 * Verify an Ed25519 signature.
 */
export async function verify(
  data: string,
  signatureBase64: string,
  publicKeyHex: string
): Promise<boolean> {
  const msgBytes = new TextEncoder().encode(data);
  const sigBytes = Uint8Array.from(atob(signatureBase64), (c) =>
    c.charCodeAt(0)
  );
  const pubBytes = hexToBytes(publicKeyHex);
  return ed.verifyAsync(sigBytes, msgBytes, pubBytes);
}

// --- Utility functions ---

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortObject(obj: Record<string, any>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      sorted[key] = sortObject(val as Record<string, unknown>);
    } else {
      sorted[key] = val;
    }
  }
  return sorted;
}

// Simple base58 encoder (Bitcoin alphabet)
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function bytesToBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = "";
  for (const byte of bytes) {
    if (byte === 0) result += BASE58_ALPHABET[0];
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

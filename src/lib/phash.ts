const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "image/avif",
];

export function isImageType(contentType: string): boolean {
  return IMAGE_TYPES.includes(contentType.toLowerCase());
}

/**
 * Compute a perceptual hash for an image file.
 * Loads the image onto a 32x32 grayscale canvas, applies a 2D DCT,
 * extracts the top-left 8x8 low-frequency coefficients (excluding DC),
 * compares to median, and produces a 64-bit hash as a 16-char hex string.
 */
export async function computePerceptualHash(file: File): Promise<string> {
  const img = await loadImage(file);

  // Draw to 32x32 grayscale canvas
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;

  // Convert to grayscale matrix
  const gray: number[][] = [];
  for (let y = 0; y < size; y++) {
    gray[y] = [];
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Luminance formula
      gray[y][x] = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    }
  }

  // Apply 2D DCT
  const dct = dct2d(gray, size);

  // Extract top-left 8x8 low-frequency coefficients, excluding DC (0,0)
  const lowFreq: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (y === 0 && x === 0) continue; // skip DC
      lowFreq.push(dct[y][x]);
    }
  }

  // Compute median
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  // Build 64-bit hash: 63 coefficients from 8x8-1, pad to 64 bits
  // We have 63 values; use first 64 bits (pad last bit as 0)
  let bits = "";
  for (const val of lowFreq) {
    bits += val > median ? "1" : "0";
  }
  bits += "0"; // pad to 64 bits

  // Convert to 16-char hex string
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }

  return hex;
}

/**
 * Compute the Hamming distance between two hex hash strings.
 * XOR the hashes and count differing bits.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // Count bits in xor
    let bits = xor;
    while (bits) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * 2D Discrete Cosine Transform (Type II)
 */
function dct2d(matrix: number[][], n: number): number[][] {
  // Apply 1D DCT to rows
  const rowDct: number[][] = [];
  for (let y = 0; y < n; y++) {
    rowDct[y] = dct1d(matrix[y], n);
  }

  // Apply 1D DCT to columns
  const result: number[][] = [];
  for (let y = 0; y < n; y++) {
    result[y] = new Array(n);
  }

  for (let x = 0; x < n; x++) {
    const col: number[] = [];
    for (let y = 0; y < n; y++) {
      col.push(rowDct[y][x]);
    }
    const dctCol = dct1d(col, n);
    for (let y = 0; y < n; y++) {
      result[y][x] = dctCol[y];
    }
  }

  return result;
}

/**
 * 1D Discrete Cosine Transform (Type II)
 */
function dct1d(input: number[], n: number): number[] {
  const output: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += input[i] * Math.cos((Math.PI * (2 * i + 1) * k) / (2 * n));
    }
    output[k] = sum * Math.sqrt(2 / n) * (k === 0 ? 1 / Math.sqrt(2) : 1);
  }
  return output;
}

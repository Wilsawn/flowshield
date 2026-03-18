/**
 * Security utility helpers for input validation and sanitization.
 * No external dependencies.
 */

/**
 * Validates that a string is a valid Flow blockchain address.
 * A valid Flow address starts with `0x` followed by exactly 16 hex characters.
 *
 * @param addr - The address string to validate.
 * @returns `true` if the address matches the expected format, `false` otherwise.
 */
export function isValidFlowAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{16}$/.test(addr);
}

/**
 * Sanitizes a URL by allowing only `http://` and `https://` schemes.
 * Returns `#` for any other scheme (e.g. `javascript:`, `data:`, `vbscript:`).
 *
 * @param url - The URL string to sanitize.
 * @returns The original URL if it uses an allowed scheme, or `"#"` otherwise.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return "#";
}

/**
 * Validates a financial amount string suitable for FLOW transactions.
 *
 * Rules:
 * - Must be a valid decimal number (no scientific notation).
 * - Must be greater than 0.
 * - Must be at most 1,000,000.
 * - Must have no more than 8 decimal places (FLOW precision).
 * - Must not be NaN or Infinity.
 *
 * @param amount - The amount string to validate.
 * @returns An object with `valid`, the parsed `value`, and an optional `error` message.
 */
export function validateAmount(amount: string): {
  valid: boolean;
  value: number;
  error?: string;
} {
  // Reject scientific notation (e.g. "1e5", "2E-3")
  if (/[eE]/.test(amount)) {
    return { valid: false, value: 0, error: "Scientific notation is not allowed" };
  }

  // Must look like a plain decimal number (optional leading minus caught later)
  if (!/^-?\d+(\.\d+)?$/.test(amount.trim())) {
    return { valid: false, value: 0, error: "Invalid number format" };
  }

  const value = Number(amount);

  if (Number.isNaN(value)) {
    return { valid: false, value: 0, error: "Amount is not a valid number" };
  }

  if (!Number.isFinite(value)) {
    return { valid: false, value: 0, error: "Amount must be a finite number" };
  }

  if (value <= 0) {
    return { valid: false, value: 0, error: "Amount must be greater than 0" };
  }

  if (value > 1_000_000) {
    return { valid: false, value: 0, error: "Amount must not exceed 1,000,000" };
  }

  // Check decimal places
  const parts = amount.trim().split(".");
  if (parts.length === 2 && parts[1].length > 8) {
    return { valid: false, value: 0, error: "Amount must not have more than 8 decimal places" };
  }

  return { valid: true, value };
}

/** Maximum allowed file size in bytes (512 KB). */
const MAX_FILE_SIZE = 512 * 1024;

/** MIME types considered text-like and therefore allowed for upload. */
const ALLOWED_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-yaml",
  "application/yaml",
  "application/toml",
  "application/csv",
];

/**
 * Validates a `File` object for upload.
 *
 * Rules:
 * - Maximum size is 512 KB.
 * - Must be a text-like file (not binary).
 *
 * @param file - The `File` to validate.
 * @returns An object with `valid` and an optional `error` message.
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024).toFixed(1)} KB) exceeds the 512 KB limit`,
    };
  }

  const mime = file.type.toLowerCase();
  const isTextLike = ALLOWED_MIME_PREFIXES.some(
    (prefix) => mime === prefix || mime.startsWith(prefix),
  );

  if (!isTextLike && mime !== "") {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Only text-like files are accepted`,
    };
  }

  return { valid: true };
}

/**
 * Encodes a string for safe interpolation into a URL path or query parameter.
 *
 * @param param - The raw string to encode.
 * @returns The percent-encoded string safe for URL use.
 */
export function sanitizeForUrl(param: string): string {
  return encodeURIComponent(param);
}

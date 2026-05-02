/**
 * Shared validation & sanitization utilities.
 * All functions are pure (no side-effects) and safe to use on client and server.
 */

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/** Strip HTML tags, null bytes, and leading/trailing whitespace. */
export function sanitizeText(value: string): string {
  return value
    .replace(/\0/g, "")           // null bytes
    .replace(/<[^>]*>/g, "")      // HTML tags
    .trim();
}

/**
 * Collapse consecutive whitespace to a single space and sanitize.
 * Good for single-line fields like name or subject.
 */
export function sanitizeLine(value: string): string {
  return sanitizeText(value).replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

/** Returns true for well-formed email addresses (RFC-5322 simplified). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ---------------------------------------------------------------------------
// Phone (Ghana)
// ---------------------------------------------------------------------------

/**
 * Accepts:
 *  - 10-digit local format starting with 0  (e.g. 0241234567)
 *  - +233 / 233 prefix followed by 9 digits  (e.g. +233241234567)
 *  - Spaces and hyphens are ignored
 */
export function isValidGhanaPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(\+?233[23456789]\d{8}|0[23456789]\d{8})$/.test(cleaned);
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * Allows letters (including accented), spaces, hyphens, apostrophes, and dots.
 * Min 2, max 80 characters.
 */
export function isValidName(name: string): boolean {
  return /^[a-zA-ZÀ-ÿ\s'\-.]{2,80}$/.test(name.trim());
}

// ---------------------------------------------------------------------------
// Text length
// ---------------------------------------------------------------------------

export function hasMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

export function hasMaxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

// ---------------------------------------------------------------------------
// Order reference
// ---------------------------------------------------------------------------

/** Alphanumeric characters and hyphens only, 3–40 chars. */
export function isValidOrderRef(ref: string): boolean {
  return /^[A-Z0-9\-]{3,40}$/.test(ref.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Numbers / quantities
// ---------------------------------------------------------------------------

/** Positive integer (qty, rating, etc.) within an inclusive range. */
export function isInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PROOF_SIZE_MB = 10;

export function isValidImageFile(file: File): { ok: boolean; message: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "Only JPEG, PNG, WebP, or GIF images are accepted." };
  }
  if (file.size > MAX_PROOF_SIZE_MB * 1024 * 1024) {
    return { ok: false, message: `File must be smaller than ${MAX_PROOF_SIZE_MB} MB.` };
  }
  return { ok: true, message: "" };
}

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

/**
 * Caps to 100 characters and strips characters that have no use in a product
 * search but could be used in injection attacks.
 */
export function sanitizeSearchQuery(query: string): string {
  return sanitizeLine(query)
    .replace(/[<>"'`;]/g, "")
    .slice(0, 100);
}

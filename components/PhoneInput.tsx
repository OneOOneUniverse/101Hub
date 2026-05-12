"use client";

import { useState, useRef, useEffect } from "react";

export interface Country {
  code: string;   // ISO 3166-1 alpha-2
  name: string;
  dial: string;   // e.g. "+233"
  flag: string;   // emoji flag
  /** regex to validate the *local* digits (after the dial code is stripped) */
  pattern?: RegExp;
  /** expected local digit length(s) */
  localLen?: number | [number, number];
}

export const COUNTRIES: Country[] = [
  // ── Africa ─────────────────────────────────────────────────────────────────
  { code: "GH", name: "Ghana",          dial: "+233", flag: "🇬🇭", localLen: 9,      pattern: /^[23456789]\d{8}$/ },
  { code: "NG", name: "Nigeria",        dial: "+234", flag: "🇳🇬", localLen: 10,     pattern: /^[789][01]\d{8}$/ },
  { code: "KE", name: "Kenya",          dial: "+254", flag: "🇰🇪", localLen: 9,      pattern: /^[17]\d{8}$/ },
  { code: "ZA", name: "South Africa",   dial: "+27",  flag: "🇿🇦", localLen: 9,      pattern: /^[678]\d{8}$/ },
  { code: "EG", name: "Egypt",          dial: "+20",  flag: "🇪🇬", localLen: 10,     pattern: /^1[0125]\d{8}$/ },
  { code: "ET", name: "Ethiopia",       dial: "+251", flag: "🇪🇹", localLen: 9,      pattern: /^9\d{8}$/ },
  { code: "TZ", name: "Tanzania",       dial: "+255", flag: "🇹🇿", localLen: 9,      pattern: /^[67]\d{8}$/ },
  { code: "UG", name: "Uganda",         dial: "+256", flag: "🇺🇬", localLen: 9,      pattern: /^[37]\d{8}$/ },
  { code: "SN", name: "Senegal",        dial: "+221", flag: "🇸🇳", localLen: 9,      pattern: /^[37]\d{8}$/ },
  { code: "CI", name: "Côte d'Ivoire",  dial: "+225", flag: "🇨🇮", localLen: 10,     pattern: /^0[157]\d{8}$/ },
  { code: "CM", name: "Cameroon",       dial: "+237", flag: "🇨🇲", localLen: 9,      pattern: /^[26]\d{8}$/ },
  // ── Americas ───────────────────────────────────────────────────────────────
  { code: "US", name: "United States",  dial: "+1",   flag: "🇺🇸", localLen: 10,     pattern: /^[2-9]\d{9}$/ },
  { code: "CA", name: "Canada",         dial: "+1",   flag: "🇨🇦", localLen: 10,     pattern: /^[2-9]\d{9}$/ },
  // ── Europe ─────────────────────────────────────────────────────────────────
  { code: "GB", name: "United Kingdom", dial: "+44",  flag: "🇬🇧", localLen: 10,     pattern: /^7\d{9}$/ },
  { code: "DE", name: "Germany",        dial: "+49",  flag: "🇩🇪", localLen: [10,11],pattern: /^\d{10,11}$/ },
  { code: "FR", name: "France",         dial: "+33",  flag: "🇫🇷", localLen: 9,      pattern: /^[67]\d{8}$/ },
  { code: "IT", name: "Italy",          dial: "+39",  flag: "🇮🇹", localLen: 10,     pattern: /^3\d{9}$/ },
  { code: "ES", name: "Spain",          dial: "+34",  flag: "🇪🇸", localLen: 9,      pattern: /^[67]\d{8}$/ },
  { code: "NL", name: "Netherlands",    dial: "+31",  flag: "🇳🇱", localLen: 9,      pattern: /^6\d{8}$/ },
  // ── Middle East ────────────────────────────────────────────────────────────
  { code: "AE", name: "UAE",            dial: "+971", flag: "🇦🇪", localLen: 9,      pattern: /^5\d{8}$/ },
  { code: "SA", name: "Saudi Arabia",   dial: "+966", flag: "🇸🇦", localLen: 9,      pattern: /^5\d{8}$/ },
  // ── Asia ───────────────────────────────────────────────────────────────────
  { code: "IN", name: "India",          dial: "+91",  flag: "🇮🇳", localLen: 10,     pattern: /^[6-9]\d{9}$/ },
  { code: "CN", name: "China",          dial: "+86",  flag: "🇨🇳", localLen: 11,     pattern: /^1[3-9]\d{9}$/ },
  { code: "JP", name: "Japan",          dial: "+81",  flag: "🇯🇵", localLen: 10,     pattern: /^[789]0\d{8}$/ },
];

/** Validate a local number (digits only, no dial code) against a Country. */
export function validateLocalNumber(local: string, country: Country): boolean {
  if (!local) return false;
  if (country.pattern) return country.pattern.test(local);
  const len = country.localLen;
  if (typeof len === "number") return local.length === len;
  if (Array.isArray(len)) return local.length >= len[0] && local.length <= len[1];
  // Generic E.164: 7–12 local digits
  return local.length >= 7 && local.length <= 12;
}

/** Build the full E.164 number from dial code + local digits. */
export function buildFullNumber(dial: string, local: string): string {
  const digits = local.replace(/\D/g, "");
  // Strip leading zero if the country format starts with 0 but E.164 drops it
  const stripped = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${dial}${stripped}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  /** Full number value (e.g. "+233241234567") */
  value: string;
  /** Called with the full E.164 number and a validity flag */
  onChange: (fullNumber: string, isValid: boolean) => void;
  error?: string;
  id?: string;
  required?: boolean;
  className?: string;
  /** Default ISO country code to pre-select (default: "GH") */
  defaultCountry?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  error,
  id = "phone",
  required,
  className = "",
  defaultCountry = "GH",
  disabled = false,
}: PhoneInputProps) {
  const defaultC = COUNTRIES.find((c) => c.code === defaultCountry) ?? COUNTRIES[0];

  // Derive initial country + local from value prop
  function parseValue(v: string, fallback: Country): { country: Country; local: string } {
    if (!v) return { country: fallback, local: "" };
    for (const c of COUNTRIES) {
      if (v.startsWith(c.dial)) {
        return { country: c, local: v.slice(c.dial.length) };
      }
    }
    return { country: fallback, local: v.replace(/^\+?\d{1,4}/, "") };
  }

  const initial = parseValue(value, defaultC);
  const [selectedCountry, setSelectedCountry] = useState<Country>(initial.country);
  const [localNumber, setLocalNumber] = useState(initial.local);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync if value changes externally
  useEffect(() => {
    if (!value) return;
    const { country, local } = parseValue(value, defaultC);
    setSelectedCountry(country);
    setLocalNumber(local);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [dropdownOpen]);

  function handleLocalChange(raw: string) {
    // Only allow digits (and optional leading +)
    const digits = raw.replace(/[^\d]/g, "");
    setLocalNumber(digits);
    const full = buildFullNumber(selectedCountry.dial, digits);
    const valid = validateLocalNumber(
      digits.startsWith("0") ? digits.slice(1) : digits,
      selectedCountry,
    );
    onChange(full, valid);
  }

  function handleCountrySelect(c: Country) {
    setSelectedCountry(c);
    setDropdownOpen(false);
    setSearch("");
    const full = buildFullNumber(c.dial, localNumber);
    const stripped = localNumber.startsWith("0") ? localNumber.slice(1) : localNumber;
    const valid = validateLocalNumber(stripped, c);
    onChange(full, valid);
  }

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  const isValid =
    localNumber.length > 0 &&
    validateLocalNumber(
      localNumber.startsWith("0") ? localNumber.slice(1) : localNumber,
      selectedCountry,
    );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-stretch rounded-lg border overflow-hidden transition-colors ${
          error
            ? "border-red-400 ring-1 ring-red-300"
            : "border-[var(--border)] focus-within:border-[var(--brand)] focus-within:ring-1 focus-within:ring-[var(--brand)]/40"
        } bg-[var(--surface)]`}
      >
        {/* Country selector button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2.5 border-r border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50"
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label="Select country code"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-[var(--ink-soft)] text-xs">{selectedCountry.dial}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-[var(--ink-soft)] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Phone number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required={required}
          disabled={disabled}
          value={localNumber}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder="Enter number"
          className="flex-1 px-3 py-2.5 bg-transparent text-sm outline-none text-[var(--ink)] placeholder:text-[var(--ink-soft)] disabled:opacity-50 min-w-0"
          aria-label="Phone number"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
        />

        {/* Validity indicator */}
        {localNumber.length > 0 && (
          <span
            className={`flex items-center pr-3 text-sm ${isValid ? "text-emerald-500" : "text-[var(--ink-soft)]"}`}
            aria-hidden="true"
          >
            {isValid ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      {/* Country dropdown */}
      {dropdownOpen && (
        <div
          role="listbox"
          aria-label="Select country"
          className="absolute left-0 top-full mt-1 z-50 w-72 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        >
          {/* Search */}
          <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-3 py-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] outline-none text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">No countries found</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                role="option"
                aria-selected={c.code === selectedCountry.code}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--surface-alt)] transition-colors text-left ${
                  c.code === selectedCountry.code ? "bg-[var(--brand)]/10 font-semibold" : ""
                }`}
              >
                <span className="text-base leading-none flex-shrink-0">{c.flag}</span>
                <span className="flex-1 text-[var(--ink)]">{c.name}</span>
                <span className="text-[var(--ink-soft)] text-xs">{c.dial}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

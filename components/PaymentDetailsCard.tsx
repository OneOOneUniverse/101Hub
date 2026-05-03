"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";

// ── SVG icons ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, ReactNode> = {
  "phone": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  "user": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  "bank": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  "tag": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};
function getIcon(iconStr: string): ReactNode {
  if (iconStr === "📱" || iconStr === "📲" || iconStr === "phone") return ICON_MAP.phone;
  if (iconStr === "👤" || iconStr === "👥" || iconStr === "user") return ICON_MAP.user;
  if (iconStr === "🏦" || iconStr === "bank") return ICON_MAP.bank;
  if (iconStr === "🔖" || iconStr === "tag") return ICON_MAP.tag;
  // Fallback for anything else — return a simple circle/dot
  return <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="currentColor" className="text-gray-300"/></svg>;
}

// ── Payment details config ──

type PaymentField = {
  label: string;
  value: string;
  icon: string;
};

type PaymentDetailsCardProps = {
  /** Title above the card */
  title?: string;
  /** Array of payment fields to display */
  fields?: PaymentField[];
};

const DEFAULT_FIELDS: PaymentField[] = [
  { label: "Transaction/Phone Number", value: "0548656980", icon: "phone" },
  { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
  { label: "Bank Name", value: "MTN Mobile Money", icon: "bank" },
  { label: "Payment Reference", value: "", icon: "tag" }, // dynamically set per order
];

// ── Copy hook ──

function useCopyState() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  return { copiedField, copyToClipboard };
}

// ── Component ──

export default function PaymentDetailsCard({
  title = "Payment Details",
  fields,
}: PaymentDetailsCardProps) {
  const { copiedField, copyToClipboard } = useCopyState();
  const displayFields = (fields ?? DEFAULT_FIELDS).filter((f) => f.value);

  return (
    <div className="panel p-5 sm:p-6">
      <h3 className="text-base font-bold text-[var(--ink)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--ink-soft)] mb-4">
        Tap the copy button next to each field to copy it to your clipboard.
      </p>

      <div className="space-y-3">
        {displayFields.map((field) => {
          const isCopied = copiedField === field.label;

          return (
            <div
              key={field.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors"
              style={isCopied ? { borderColor: "#22c55e", backgroundColor: "#f0fdf4" } : {}}
            >
              {/* Icon */}
              <span className="text-[var(--ink-soft)] shrink-0">{getIcon(field.icon)}</span>

              {/* Label & Value */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium">
                  {field.label}
                </p>
                <p className="text-sm font-semibold text-[var(--ink)] truncate select-all">
                  {field.value}
                </p>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={() => copyToClipboard(field.label, field.value)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isCopied
                    ? "bg-green-500 text-white"
                    : "bg-white border border-gray-200 text-[var(--ink-soft)] hover:text-[var(--brand)] hover:border-[var(--brand)]"
                }`}
                aria-label={`Copy ${field.label}`}
              >
                {isCopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Toast-style confirmation at bottom of card */}
      {copiedField && (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 animate-slideIn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-500 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <span>
            <strong>{copiedField}</strong> copied to clipboard
          </span>
        </div>
      )}
    </div>
  );
}

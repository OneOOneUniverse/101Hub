"use client";

import { useEffect, useState, useCallback } from "react";
import {
  setToastDispatch,
  setConfirmDispatch,
  type ToastItem,
  type ConfirmItem,
} from "@/lib/toast-store";

// ── Icons ─────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STYLES = {
  success: {
    container: "bg-emerald-50 border-emerald-400 text-emerald-900",
    icon: "text-emerald-500",
    bar: "bg-emerald-400",
  },
  error: {
    container: "bg-red-50 border-red-400 text-red-900",
    icon: "text-red-500",
    bar: "bg-red-400",
  },
  warning: {
    container: "bg-amber-50 border-amber-400 text-amber-900",
    icon: "text-amber-500",
    bar: "bg-amber-400",
  },
  info: {
    container: "bg-blue-50 border-blue-400 text-blue-900",
    icon: "text-blue-500",
    bar: "bg-blue-400",
  },
};

const ICONS = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
};

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastCard({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const style = STYLES[item.type];
  const duration = item.duration ?? 4000;

  useEffect(() => {
    // Trigger enter animation
    const raf = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 300);
    }, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [item.id, duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-12px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        overflow: "hidden",
      }}
      className={`relative flex items-start gap-3 rounded-lg border-l-4 shadow-lg px-4 py-3 max-w-sm w-full pointer-events-auto ${style.container}`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${style.icon}`}>{ICONS[item.type]}</span>
      <p className="flex-1 text-sm font-medium leading-snug pr-4">{item.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(item.id), 300);
        }}
        className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${style.bar}`}
        style={{
          width: visible ? "0%" : "100%",
          transition: `width ${duration}ms linear`,
        }}
      />
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  item,
  onDone,
}: {
  item: ConfirmItem;
  onDone: (id: string) => void;
}) {
  function answer(yes: boolean) {
    item.resolve(yes);
    onDone(item.id);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-xs w-full p-6 space-y-4 animate-slideIn">
        <div className="flex items-start gap-3">
          <span className="text-amber-500 flex-shrink-0 mt-0.5"><WarningIcon /></span>
          <p className="text-sm font-medium text-[var(--ink)] leading-snug">{item.message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => answer(false)}
            className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--ink-soft)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => answer(true)}
            className="px-4 py-1.5 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AppToaster — mount once in the layout ─────────────────────────────────────

export default function AppToaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmItem | null>(null);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [...prev, item]);
  }, []);

  const addConfirm = useCallback((item: ConfirmItem) => {
    setConfirm(item);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeConfirm = useCallback((id: string) => {
    setConfirm((prev) => (prev?.id === id ? null : prev));
  }, []);

  // Register dispatchers once on mount
  useEffect(() => {
    setToastDispatch(addToast);
    setConfirmDispatch(addConfirm);
  }, [addToast, addConfirm]);

  return (
    <>
      {/* Toast stack — top-right on desktop, top-center on mobile */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9990] flex flex-col items-end gap-2 pointer-events-none sm:top-5 sm:right-5"
        style={{ maxWidth: "min(calc(100vw - 2rem), 24rem)" }}
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onRemove={removeToast} />
        ))}
      </div>

      {/* Confirm overlay — rendered above everything */}
      {confirm && (
        <ConfirmDialog item={confirm} onDone={removeConfirm} />
      )}
    </>
  );
}

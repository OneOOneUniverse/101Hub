"use client";

import { useEffect, useRef, useState } from "react";

// ── SVG Icons ───────────────────────────────────────────────────────────────
function ShoppingBagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function GavelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4l5 5-9.5 9.5-5-5z" />
      <line x1="3" y1="21" x2="9.5" y2="14.5" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const NAMES = [
  "Kwame A.", "Ama O.", "Kofi B.", "Abena M.", "Yaw D.", "Akosua T.",
  "Kojo P.", "Adwoa S.", "Kwesi F.", "Efua K.", "Nana Y.", "Akua N.",
  "Kweku L.", "Maame R.", "Kwabena E.", "Fiifi A.", "Araba C.", "Mansa G.",
  "Emmanuel T.", "Gifty A.", "Daniel K.", "Priscilla O.", "Samuel B.", "Agnes F.",
  "Michael A.", "Lydia N.", "Benjamin K.", "Grace A.", "Philip T.", "Ruth M.",
];
const CITIES = [
  "Accra", "Kumasi", "Takoradi", "Cape Coast", "Tamale",
  "Tema", "Sunyani", "Ho", "Koforidua", "Wa",
];
const PRODUCTS = [
  "iPhone 15 Pro", "Samsung Galaxy S24", "AirPods Pro", "JBL Charge 5",
  "HP Pavilion Laptop", "Samsung Smart TV", "PlayStation 5", "Canon EOS Camera",
  "iPad Air", "Xiaomi Redmi Note 13", "Dell XPS 15", "Sony WH-1000XM5",
  "MacBook Air M3", "Nintendo Switch", "GoPro Hero 12",
];
const SERVICES = [
  "Phone Screen Repair", "Laptop Battery Replacement",
  "Smart TV Setup", "CCTV Installation", "AC Servicing",
];

type ToastType = "purchase" | "signup" | "service" | "review" | "view" | "wishlist" | "bid";

type Activity = {
  id: number;
  type: ToastType;
  message: string;
  sub: string;
  icon: ToastType;
  bg: string;
  color: string;
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generate(id: number): Activity {
  const type = rand<ToastType>(["purchase", "purchase", "signup", "service", "review", "wishlist", "bid", "view"]);
  const name = rand(NAMES);
  const city = rand(CITIES);

  switch (type) {
    case "purchase":
      return { id, type, message: `${name} just ordered`, sub: `${rand(PRODUCTS)} · ${city}`, icon: "purchase", bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700" };
    case "signup":
      return { id, type, message: `${name} just joined`, sub: `New member from ${city}`, icon: "signup", bg: "bg-blue-50 border-blue-200", color: "text-blue-700" };
    case "service":
      return { id, type, message: `${name} booked`, sub: `${rand(SERVICES)} · ${city}`, icon: "service", bg: "bg-orange-50 border-orange-200", color: "text-orange-700" };
    case "review":
      return { id, type, message: `${name} left a 5-star review`, sub: `${rand(PRODUCTS)}`, icon: "review", bg: "bg-yellow-50 border-yellow-200", color: "text-yellow-700" };
    case "wishlist":
      return { id, type, message: `${name} saved to wishlist`, sub: `${rand(PRODUCTS)} · ${city}`, icon: "wishlist", bg: "bg-rose-50 border-rose-200", color: "text-rose-700" };
    case "bid":
      return { id, type, message: `${name} placed a bid`, sub: `Live auction · ${city}`, icon: "bid", bg: "bg-purple-50 border-purple-200", color: "text-purple-700" };
    case "view":
    default: {
      const n = Math.floor(Math.random() * 28) + 5;
      return { id, type, message: `${n} people browsing`, sub: "Active right now", icon: "view", bg: "bg-slate-50 border-slate-200", color: "text-slate-700" };
    }
  }
}

function IconFor({ type, color }: { type: ToastType; color: string }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.replace("text-", "bg-").replace("700", "100")} ${color}`}>
      {type === "purchase" && <ShoppingBagIcon />}
      {type === "signup" && <UserPlusIcon />}
      {type === "service" && <WrenchIcon />}
      {type === "review" && <StarIcon />}
      {type === "wishlist" && <HeartIcon />}
      {type === "bid" && <GavelIcon />}
      {type === "view" && <EyeIcon />}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ActivityToast() {
  const [toast, setToast] = useState<Activity | null>(null);
  const [visible, setVisible] = useState(false);
  const idRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't show on server or on admin pages
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  function showNext() {
    idRef.current += 1;
    setToast(generate(idRef.current));
    setVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      // Schedule next after hide animation
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(showNext, randomInterval());
    }, 5_000);
  }

  function randomInterval() {
    return Math.floor(Math.random() * 18_000) + 12_000; // 12–30 s
  }

  useEffect(() => {
    // Initial delay before first toast
    const initial = setTimeout(showNext, 6_000);
    return () => {
      clearTimeout(initial);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (showTimer.current) clearTimeout(showTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-3 z-50 max-w-[260px] sm:bottom-6 sm:left-4 sm:max-w-[280px] transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-lg backdrop-blur-sm ${toast.bg}`}>
        <IconFor type={toast.icon} color={toast.color} />
        <div className="min-w-0">
          <p className={`truncate text-xs font-bold leading-snug ${toast.color}`}>
            {toast.message}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-gray-500">
            {toast.sub}
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
            Just now
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="ml-auto mt-0.5 shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

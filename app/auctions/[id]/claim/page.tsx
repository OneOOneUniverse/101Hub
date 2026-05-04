"use client";

import { useEffect, useState, use, FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import PaystackButton from "@/components/PaystackButton";

type WinData = { id: number; title: string; amount: number; image: string };

function generateRef() {
  return `AUC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default function AuctionClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const auctionId = parseInt(rawId, 10);
  const { user, isLoaded } = useUser();

  const [win, setWin] = useState<WinData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderRef] = useState(generateRef);
  const [status, setStatus] = useState<"form" | "paying" | "success" | "error">("form");
  const [errMsg, setErrMsg] = useState("");

  // Read won auction from sessionStorage (set by victory screen)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("101hub_auction_checkout");
      if (raw) {
        const data = JSON.parse(raw) as WinData;
        if (data.id === auctionId) setWin(data);
      }
    } catch { /* ignore */ }
  }, [auctionId]);

  // Auto-fill from Clerk
  useEffect(() => {
    if (!isLoaded || !user) return;
    const n = user.username ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? "";
    const e = user.primaryEmailAddress?.emailAddress ?? "";
    const p = (user.primaryPhoneNumber?.phoneNumber ?? "").replace(/\D/g, "");
    if (n) setName(n);
    if (e) setEmail(e);
    if (p) setPhone(p);
  }, [isLoaded, user]);

  async function handlePaymentSuccess(reference: string) {
    setStatus("paying");
    try {
      const res = await fetch(`/api/auctions/${auctionId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef,
          paystackRef: reference,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          customerAddress: address,
          amount: win?.amount,
          title: win?.title,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setErrMsg(data.error ?? "Could not record your order. Please contact support.");
        setStatus("error");
      } else {
        try { sessionStorage.removeItem("101hub_auction_checkout"); } catch { /* ignore */ }
        try { localStorage.removeItem(`101hub_mybid_${auctionId}`); } catch { /* ignore */ }
        setStatus("success");
      }
    } catch {
      setErrMsg("Network error while recording your order. Please contact us.");
      setStatus("error");
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("paying");
  }

  if (status === "success") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-black text-[var(--ink)]">Order Placed!</h1>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          Your payment was received and your order is confirmed. We'll contact you at <strong>{email}</strong> with delivery details.
        </p>
        <p className="text-xs text-[var(--ink-soft)]">Order ref: <strong>{orderRef}</strong></p>
        <div className="flex gap-3 justify-center">
          <Link href="/orders" className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-black text-white hover:bg-[var(--brand-deep)]">
            View My Orders
          </Link>
          <Link href="/auctions" className="rounded-full border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-600 hover:border-gray-300">
            More Auctions
          </Link>
        </div>
      </main>
    );
  }

  if (!win) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-black text-[var(--ink)]">No win data found</h1>
        <p className="text-sm text-[var(--ink-soft)]">Please return to the auction page to claim your prize.</p>
        <Link href={`/auctions/${auctionId}`} className="inline-block rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white">
          Go to Auction
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 space-y-6">
      {/* Won item summary */}
      <div className="rounded-2xl overflow-hidden border-4 border-yellow-400 shadow-lg">
        {win.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={win.image} alt={win.title} className="w-full h-40 object-cover" />
        )}
        <div className="bg-yellow-50 p-5 text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">🏆 You Won This Auction</p>
          <p className="text-lg font-black text-gray-900">{win.title}</p>
          <p className="text-3xl font-black text-[var(--brand)]">GHS {win.amount.toFixed(2)}</p>
        </div>
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
          {errMsg}
        </div>
      )}

      {/* Checkout form or Paystack button */}
      {status !== "paying" ? (
        <div className="panel p-6 space-y-5">
          <h2 className="text-base font-black text-[var(--ink)]">Complete Your Purchase</h2>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Full Name <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kwame Mensah"
                required maxLength={80}
                className="input-styled text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required maxLength={254}
                className="input-styled text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Phone Number <span className="text-red-500">*</span></label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024XXXXXXX"
                required maxLength={20}
                className="input-styled text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Delivery Address <span className="text-red-500">*</span></label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your location / area"
                required maxLength={200}
                className="input-styled text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-black text-white hover:bg-[var(--brand-deep)] transition-all active:scale-95 shadow-md"
            >
              Continue to Payment →
            </button>
          </form>
        </div>
      ) : (
        <div className="panel p-6 space-y-5 text-center">
          <h2 className="text-base font-black text-[var(--ink)]">Pay GHS {win.amount.toFixed(2)}</h2>
          <p className="text-sm text-[var(--ink-soft)]">Paying as <strong>{name}</strong> · {email}</p>

          <PaystackButton
            amount={win.amount}
            orderRef={orderRef}
            customerEmail={email}
            customerName={name}
            customerPhone={phone}
            onSuccess={(ref) => void handlePaymentSuccess(ref)}
            onClose={() => setStatus("form")}
          />

          <button
            type="button"
            onClick={() => setStatus("form")}
            className="text-xs text-[var(--ink-soft)] hover:underline"
          >
            ← Change details
          </button>
        </div>
      )}

      <Link href={`/auctions/${auctionId}`} className="block text-center text-xs text-[var(--ink-soft)] hover:text-[var(--brand)]">
        ← Back to Auction
      </Link>
    </main>
  );
}

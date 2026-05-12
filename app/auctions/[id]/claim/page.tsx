"use client";

import { useEffect, useState, use, FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import PaymentDetailsCard from "@/components/PaymentDetailsCard";
import ImageUploadButton from "@/components/ImageUploadButton";
import PhoneInput from "@/components/PhoneInput";

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
  const [proofUrl, setProofUrl] = useState("");
  const [status, setStatus] = useState<"form" | "paying" | "submitting" | "success" | "error">("form");
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
    const p = user.primaryPhoneNumber?.phoneNumber ?? "";
    if (n) setName(n);
    if (e) setEmail(e);
    if (p) setPhone(p);
  }, [isLoaded, user]);

  const emailLocked = isLoaded && Boolean(user?.primaryEmailAddress?.emailAddress);

  async function handleConfirmPayment() {
    setStatus("submitting");
    try {
      const res = await fetch(`/api/auctions/${auctionId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef,
          paymentProofUrl: proofUrl || null,
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
        <h1 className="text-2xl font-black text-[var(--ink)]">Order Submitted!</h1>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          Your order is pending payment verification. We&apos;ll contact you at <strong>{email}</strong> once your payment is confirmed.
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

      {/* Step 1: Contact details form */}
      {status === "form" && (
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
                readOnly={emailLocked}
                onChange={(e) => { if (!emailLocked) setEmail(e.target.value); }}
                placeholder="you@example.com"
                required maxLength={254}
                className={`input-styled text-sm${emailLocked ? " cursor-not-allowed opacity-70 select-none" : ""}`}
              />
              {emailLocked && (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">Using your account email · <a href="/profile" className="text-[var(--brand)] hover:underline">change in profile</a></p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">Phone Number <span className="text-red-500">*</span></label>
              <PhoneInput
                id="claim-phone"
                required
                value={phone}
                onChange={(fullNumber) => setPhone(fullNumber)}
                defaultCountry="GH"
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
      )}

      {/* Step 2: Manual payment */}
      {(status === "paying" || status === "submitting" || status === "error") && (
        <div className="space-y-5">
          <div className="panel p-5 space-y-1">
            <h2 className="text-base font-black text-[var(--ink)]">Pay GHS {win.amount.toFixed(2)}</h2>
            <p className="text-sm text-[var(--ink-soft)]">Paying as <strong>{name}</strong> · {email}</p>
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 space-y-2">
            <p className="text-sm font-bold text-blue-800">How to complete your payment:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Send <strong>GHS {win.amount.toFixed(2)}</strong> to the account details below</li>
              <li>Use <strong>{orderRef}</strong> as your payment reference / note</li>
              <li>Take a screenshot of the payment confirmation</li>
              <li>Upload the screenshot below and tap <em>Confirm Payment</em></li>
            </ol>
          </div>

          {/* Payment account details */}
          <PaymentDetailsCard
            fields={[
              { label: "Transaction / Phone Number", value: "0548656980", icon: "phone" },
              { label: "Account Name", value: "101 Hub Technologies", icon: "user" },
              { label: "Network / Bank", value: "MTN Mobile Money", icon: "bank" },
              { label: "Payment Reference", value: orderRef, icon: "tag" },
            ]}
          />

          {/* Screenshot upload */}
          <div className="panel p-5 space-y-3">
            <p className="text-sm font-bold text-[var(--ink)]">Upload Payment Screenshot <span className="text-red-500">*</span></p>
            <p className="text-xs text-[var(--ink-soft)]">Your screenshot must clearly show the amount, recipient number, and transaction status.</p>
            {proofUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proofUrl} alt="Payment proof" className="w-full rounded-lg border border-green-300 max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setProofUrl("")}
                  className="absolute top-2 right-2 rounded-full bg-red-500 text-white text-xs px-2 py-1 font-bold shadow"
                >
                  Remove
                </button>
              </div>
            ) : (
              <ImageUploadButton
                folder="auction-proofs"
                label="Upload Screenshot"
                onUpload={(url) => setProofUrl(url)}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleConfirmPayment()}
            disabled={status === "submitting" || !proofUrl}
            className="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-black text-white hover:bg-[var(--brand-deep)] transition-all active:scale-95 shadow-md disabled:opacity-60 disabled:pointer-events-none"
          >
            {status === "submitting" ? "Submitting…" : "Confirm Payment →"}
          </button>

          <button
            type="button"
            onClick={() => { setStatus("form"); setErrMsg(""); }}
            className="block w-full text-center text-xs text-[var(--ink-soft)] hover:underline"
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

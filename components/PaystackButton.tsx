"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: {
        key: string;
        email: string;
        amount: number; // in kobo/pesewas (× 100)
        currency: string;
        ref: string;
        firstname?: string;
        lastname?: string;
        phone?: string;
        callback: (response: { reference: string; status: string; transaction: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

type PaystackButtonProps = {
  amount: number; // in GHS
  orderRef: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
};

export default function PaystackButton({
  amount,
  orderRef,
  customerEmail,
  customerName,
  customerPhone,
  onSuccess,
  onClose,
}: PaystackButtonProps) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (window.PaystackPop) {
      setSdkReady(true);
      return;
    }

    const existing = document.getElementById("paystack-inline-js");
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setLoadError("Could not load Paystack. Check your connection and try again.");
    document.head.appendChild(script);
  }, []);

  function handlePay() {
    if (!window.PaystackPop) {
      setLoadError("Paystack is not ready yet. Please wait a moment and try again.");
      return;
    }

    const [firstName, ...rest] = customerName.trim().split(" ");
    const lastName = rest.join(" ");

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: customerEmail,
      amount: Math.round(amount * 100), // convert GHS → pesewas
      currency: "GHS",
      ref: orderRef,
      firstname: firstName,
      lastname: lastName,
      phone: customerPhone,
      callback(response) {
        onSuccess(response.reference);
      },
      onClose() {
        onClose();
      },
    });

    handler.openIframe();
  }

  if (loadError) {
    return <p className="text-sm font-semibold text-red-600">{loadError}</p>;
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={!sdkReady || !publicKey}
      className="w-full rounded-full bg-[#0ba4db] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0993c5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {sdkReady ? `Pay GHS ${amount.toFixed(2)} with Paystack` : "Loading Paystack…"}
    </button>
  );
}

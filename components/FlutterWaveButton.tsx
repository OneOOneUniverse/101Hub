"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCardIcon } from "@/components/Icons";

type FlutterWaveButtonProps = {
  downpayment: number;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onPaymentSuccess: () => void;
  onPaymentFailure: (error: string) => void;
  isLoading?: boolean;
};

declare global {
  interface Window {
    FlutterWaveCheckout?: (config: unknown) => Promise<{ status: string; transaction_id: string }>;
  }
}

export default function FlutterWaveButton({
  downpayment,
  orderRef,
  customerName,
  customerEmail,
  customerPhone,
  onPaymentSuccess,
  onPaymentFailure,
  isLoading = false,
}: FlutterWaveButtonProps) {
  const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Load Flutterwave SDK with timeout and fallback
  useEffect(() => {
    if (!publicKey) {
      setLoadError("Public key not configured");
      setShowManualFallback(true);
      return;
    }

    // Check if script already loaded
    if (window.FlutterWaveCheckout) {
      console.log("✅ Flutterwave SDK already loaded from previous attempt");
      setSdkLoaded(true);
      setLoadError("");
      return;
    }

    // Don't retry more than 1 time
    if (loadAttempts > 1) {
      console.error("❌ Flutterwave SDK failed to load after multiple retries. Falling back to manual payment.");
      setLoadError("Flutterwave unavailable - please use manual payment method");
      setShowManualFallback(true);
      return;
    }

    console.log("🔄 Loading Flutterwave SDK...");

    // Create and append script with timeout
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    
    let loadTimeout: NodeJS.Timeout;

    script.onload = () => {
      clearTimeout(loadTimeout);
      console.log("✅ Flutterwave SDK loaded successfully");
      setSdkLoaded(true);
      setLoadError("");
    };
    
    script.onerror = () => {
      clearTimeout(loadTimeout);
      console.error("❌ Failed to load Flutterwave SDK from CDN");
      setSdkLoaded(false);
      setLoadAttempts((prev) => prev + 1);
    };

    // 8 second timeout for SDK to load
    loadTimeout = setTimeout(() => {
      console.warn("⚠️ Flutterwave SDK load timeout (8s)");
      setSdkLoaded(false);
      setLoadError("Payment system timeout - using manual payment instead");
      setShowManualFallback(true);
    }, 8000);
    
    document.head.appendChild(script);

    return () => {
      clearTimeout(loadTimeout);
    };
  }, [publicKey, loadAttempts]);

  const handlePayment = useCallback(async () => {
    if (!publicKey) {
      onPaymentFailure("Flutterwave is not configured. Please use manual payment method.");
      return;
    }

    if (!sdkLoaded || !window.FlutterWaveCheckout) {
      if (loadError) {
        onPaymentFailure(`Payment system error: ${loadError}`);
      } else {
        onPaymentFailure("Flutterwave is still loading. Please wait a moment and try again.");
      }
      return;
    }

    try {
      console.log("🔄 Initiating payment...", { orderRef, amount: downpayment });
      
      const config = {
        public_key: publicKey,
        tx_ref: orderRef,
        amount: downpayment,
        currency: "GHS",
        payment_options: "card,mobilemoney,ussd",
        customer: {
          email: customerEmail || "noemail@example.com",
          phonenumber: customerPhone,
          name: customerName,
        },
        customizations: {
          title: "101Hub Downpayment",
          description: `40% downpayment for order ${orderRef}`,
          logo: "https://www.101hub.shop/img/log.png",
        },
      };

      const response = await window.FlutterWaveCheckout(config);

      console.log("✅ Payment response:", response);

      if (response.status === "successful") {
        // Verify transaction with backend
        verifyPayment(orderRef, response.transaction_id)
          .then(() => {
            console.log("✅ Payment verified with backend");
            onPaymentSuccess();
          })
          .catch((err) => {
            console.error("❌ Verification failed:", err);
            onPaymentFailure(`Verification failed: ${err.message}`);
          });
      } else {
        onPaymentFailure("Payment was not completed successfully.");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Payment processing failed.";
      console.error("❌ Payment error:", errorMsg);
      onPaymentFailure(errorMsg);
    }
  }, [publicKey, orderRef, downpayment, customerName, customerEmail, customerPhone, onPaymentSuccess, onPaymentFailure, sdkLoaded, loadError]);

  return (
    <>
      {loadError && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          <p className="font-semibold">⚠️ {loadError}</p>
          {!showManualFallback && (
            <button
              onClick={() => {
                setLoadAttempts((prev) => prev + 1);
                setLoadError("");
              }}
              className="mt-2 text-yellow-600 underline hover:text-yellow-800 text-xs"
            >
              Retry Loading
            </button>
          )}
        </div>
      )}
      
      {showManualFallback ? (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <p className="font-semibold">💡 Fallback: Use Manual Payment</p>
          <p className="mt-1 text-xs">Flutterwave is temporarily unavailable. Please go back and select "Manual Transfer (Upload Proof)" instead.</p>
          <button
            onClick={() => onPaymentFailure("Flutterwave unavailable - using manual payment instead")}
            className="mt-2 text-blue-600 underline hover:text-blue-800 text-xs"
          >
            Use Manual Payment Instead
          </button>
        </div>
      ) : (
        <button
          onClick={handlePayment}
          disabled={isLoading || !publicKey || !sdkLoaded || !!loadError}
          className="w-full rounded-full bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          title={loadError ? `Cannot process payment: ${loadError}` : ""}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Processing payment...
            </>
          ) : !sdkLoaded ? (
            <>
              ⏳ Loading payment system... (up to 8 seconds)
            </>
          ) : (
            <>
              <CreditCardIcon size={16} className="inline-block shrink-0" />{" "}Pay GHS {downpayment.toFixed(2)} with Flutterwave
            </>
          )}
        </button>
      )}
    </>
  );
}

async function verifyPayment(orderRef: string, transactionId: string) {
  const response = await fetch("/api/checkout/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderRef, transactionId }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Payment verification failed");
  }

  return response.json();
}

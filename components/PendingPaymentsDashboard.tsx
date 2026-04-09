"use client";

import { useEffect, useState } from "react";

type PendingPayment = {
  orderRef: string;
  customerName: string;
  phone: string;
  amount: number;
  paymentMethod: "flutterwave" | "manual";
  paymentProof?: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
};

export default function PendingPaymentsDashboard() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  async function loadPendingPayments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/pending-payments");
      const data = (await response.json()) as {
        payments: PendingPayment[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not load pending payments");
      }

      setPayments(data.payments);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Could not load pending payments";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(orderRef: string) {
    try {
      const response = await fetch("/api/admin/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef, action: "approve" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not approve payment");
      }

      // Remove from pending list
      setPayments((current) => current.filter((p) => p.orderRef !== orderRef));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Could not approve payment";
      setError(errorMsg);
    }
  }

  async function handleReject(orderRef: string) {
    try {
      const response = await fetch("/api/admin/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef, action: "reject" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not reject payment");
      }

      // Remove from pending list
      setPayments((current) => current.filter((p) => p.orderRef !== orderRef));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Could not reject payment";
      setError(errorMsg);
    }
  }

  const pendingManualPayments = payments.filter((p) => p.paymentMethod === "manual" && p.status === "pending");
  const pendingFlutterWavePayments = payments.filter((p) => p.paymentMethod === "flutterwave" && p.status === "pending");

  return (
    <section className="panel space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">💳 Pending Payments</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Verify downpayments from customer orders</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {loading && <p className="text-sm text-[var(--ink-soft)]">Loading pending payments...</p>}

      {!loading && payments.length === 0 && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">✅ No pending payments</p>
      )}

      {/* Manual Payment Proofs */}
      {pendingManualPayments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--ink)] mb-2">Manual Transfer Verification ({pendingManualPayments.length})</h3>
          <div className="space-y-2">
            {pendingManualPayments.map((payment) => (
              <article
                key={payment.orderRef}
                className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-[var(--ink)]">{payment.customerName}</p>
                    <p className="text-sm text-[var(--ink-soft)]">{payment.phone}</p>
                    <p className="font-mono text-xs text-amber-800 mt-1">{payment.orderRef}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-amber-900">GHS {payment.amount.toFixed(2)}</p>
                    <p className="text-xs text-amber-700">40% downpayment</p>
                  </div>
                </div>

                {payment.paymentProof && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-900">Payment Proof:</p>
                    <button
                      onClick={() => setSelectedProof(payment.paymentProof!)}
                      className="rounded-lg bg-white border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      📸 View Screenshot
                    </button>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleApprove(payment.orderRef)}
                    className="flex-1 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(payment.orderRef)}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `tel:${payment.phone.replace(/\D/g, "")}`,
                        "_blank"
                      )
                    }
                    className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    📞 Call
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Flutterwave Payments (Auto-Verified) */}
      {pendingFlutterWavePayments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--ink)] mb-2">Flutterwave Payments ({pendingFlutterWavePayments.length})</h3>
          <div className="space-y-2">
            {pendingFlutterWavePayments.map((payment) => (
              <article
                key={payment.orderRef}
                className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-[var(--ink)]">{payment.customerName}</p>
                    <p className="text-sm text-[var(--ink-soft)]">{payment.phone}</p>
                    <p className="font-mono text-xs text-green-800 mt-1">{payment.orderRef}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-green-900">GHS {payment.amount.toFixed(2)}</p>
                    <p className="inline-block px-2 py-1 rounded-full bg-green-200 text-xs font-bold text-green-900 mt-1">
                      ✓ VERIFIED
                    </p>
                  </div>
                </div>

                <p className="text-xs text-green-700">
                  Payment verified via Flutterwave. Click approve to confirm order processing.
                </p>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleApprove(payment.orderRef)}
                    className="flex-1 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                  >
                    ✓ Confirm Order
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `tel:${payment.phone.replace(/\D/g, "")}`,
                        "_blank"
                      )
                    }
                    className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    📞 Call
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <p className="font-bold">Payment Proof</p>
              <button
                onClick={() => setSelectedProof(null)}
                className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-200"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedProof}
                alt="Payment proof"
                className="w-full h-auto rounded-lg border border-black/10"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatOrderDate, formatEstimatedDelivery } from "@/lib/order-status";

type PendingPayment = {
  orderRef: string;
  customerName: string;
  phone: string;
  amount: number;
  paymentMethod: "manual";
  paymentProof?: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
};

type DeliveryEstimateModal = {
  orderRef: string;
  value: string;
} | null;

export default function PendingPaymentsDashboard() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [estimateModal, setEstimateModal] = useState<DeliveryEstimateModal>(null);
  const [approving, setApproving] = useState<string | null>(null);

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

  async function handleApprove(orderRef: string, estimatedDeliveryDate?: string) {
    setApproving(orderRef);
    try {
      const response = await fetch("/api/admin/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderRef, 
          action: "approve",
          ...(estimatedDeliveryDate && { estimatedDeliveryDate })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not approve payment");
      }

      // Remove from pending list
      setPayments((current) => current.filter((p) => p.orderRef !== orderRef));
      setEstimateModal(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Could not approve payment";
      setError(errorMsg);
    } finally {
      setApproving(null);
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

  return (
    <section className="panel space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">💳 Pending Payments</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Verify payments from customer orders</p>
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
                    <p className="text-xs text-amber-700 mt-1.5">📅 Payment: {formatOrderDate(payment.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-amber-900">GHS {payment.amount.toFixed(2)}</p>
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
                    onClick={() => setEstimateModal({ orderRef: payment.orderRef, value: "" })}
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

      {/* Delivery Estimate Modal */}
      {estimateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
            <h3 className="text-xl font-bold text-[var(--ink)]">Set Delivery Estimate</h3>
            <p className="text-sm text-[var(--ink-soft)]">Enter estimated delivery time for this order (optional)</p>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--ink)]">
                Delivery Estimate
              </label>
              <input
                type="text"
                placeholder="e.g., 2 days, 24 hours, or 15 Apr 2:30 PM"
                value={estimateModal.value}
                onChange={(e) => setEstimateModal({ ...estimateModal, value: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-[var(--ink-soft)]">
                You can enter: "2 days", "24 hours", or a specific date/time. Leave empty to skip.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEstimateModal(null)}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-bold text-[var(--ink)] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleApprove(estimateModal.orderRef, estimateModal.value || undefined)}
                disabled={approving === estimateModal.orderRef}
                className="flex-1 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {approving === estimateModal.orderRef ? "Approving..." : "Approve & Set Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

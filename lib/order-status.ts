export type OrderStatus = 
  | "payment_pending" 
  | "payment_pending_admin_review" 
  | "payment_verified" 
  | "payment_rejected"
  | "confirmed" 
  | "in_transit" 
  | "delivered" 
  | "completed"
  | "cancelled";

export type PaymentMethod = "paystack" | "flutterwave" | "manual";

export interface OrderData {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail?: string;
  customerNote?: string;
  items: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  delivery: number;
  processingFee?: number;
  total: number;
  deliveryType?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "verified" | "rejected";
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  estimatedDeliveryDate?: string; // ISO string or human-readable estimate like "2 days" or "24 hours"
}

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    payment_pending: "⏳ Waiting for Payment",
    payment_pending_admin_review: "🔍 We Got Your Payment",
    payment_verified: "✅ Payment Confirmed",
    payment_rejected: "❌ Payment Issue",
    confirmed: "🎉 Order Confirmed",
    in_transit: "🚚 On the Way",
    delivered: "📦 Delivered",
    completed: "✅ Complete",
    cancelled: "❌ Cancelled",
  };
  return labels[status] || status;
}

export function getOrderStatusDescription(status: OrderStatus): string {
  const descriptions: Record<OrderStatus, string> = {
    payment_pending:
      "We're waiting for your payment. Please complete your payment to place the order.",
    payment_pending_admin_review:
      "We received your payment and our team is currently confirming it. This usually takes a few hours. You'll get an email once it's approved — no action needed from you.",
    payment_verified:
      "Your payment has been confirmed! We're now preparing your order.",
    payment_rejected:
      "We couldn't confirm your payment. Please contact us so we can sort it out quickly.",
    confirmed:
      "Your order is confirmed and is being prepared for delivery.",
    in_transit:
      "Your order is on its way! Our delivery driver is heading to your address.",
    delivered:
      "Your order has been delivered. We hope you love it!",
    completed:
      "Your order is complete. Thank you for shopping with us!",
    cancelled:
      "This order has been cancelled. Contact us if you need a refund.",
  };
  return descriptions[status] || "";
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    payment_pending: "bg-yellow-100 text-yellow-900 border-yellow-200",
    payment_pending_admin_review: "bg-amber-100 text-amber-900 border-amber-200",
    payment_verified: "bg-green-100 text-green-900 border-green-200",
    payment_rejected: "bg-red-100 text-red-900 border-red-200",
    confirmed: "bg-blue-100 text-blue-900 border-blue-200",
    in_transit: "bg-cyan-100 text-cyan-900 border-cyan-200",
    delivered: "bg-emerald-100 text-emerald-900 border-emerald-200",
    completed: "bg-green-100 text-green-900 border-green-200",
    cancelled: "bg-red-100 text-red-900 border-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-900 border-gray-200";
}

/** Returns true if the customer is still allowed to cancel this order */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === "payment_pending" || status === "payment_pending_admin_review";
}

export function getOrderTimeline(orderStatus: OrderStatus) {
  const steps = [
    { status: "payment_pending", label: "Payment Sent" },
    { status: "payment_pending_admin_review", label: "Payment Being Checked" },
    { status: "payment_verified", label: "Payment Confirmed" },
    { status: "confirmed", label: "Order Confirmed" },
    { status: "in_transit", label: "On the Way" },
    { status: "delivered", label: "Delivered" },
  ] as Array<{ status: string; label: string; completed: boolean; current?: boolean }>;

  // For terminal statuses not in the timeline, show all steps as incomplete
  if (orderStatus === "payment_rejected" || orderStatus === "cancelled" || orderStatus === "completed") {
    return steps.map((step) => ({ ...step, completed: false, current: false }));
  }

  let passedCurrent = false;
  return steps.map((step) => {
    if (step.status === orderStatus) {
      passedCurrent = true;
      return { ...step, completed: true, current: true };
    }
    if (passedCurrent) {
      // Steps after the current one are not yet reached
      return { ...step, completed: false, current: false };
    }
    // Steps before the current one are already done
    return { ...step, completed: true, current: false };
  });
}

export function getPaymentMethodDisplay(method: PaymentMethod): string {
  if (method === "flutterwave") return "Flutterwave (Online)";
  if (method === "paystack") return "Paystack (Online)";
  return "Manual Transfer";
}

// Utility to create/retrieve order from localStorage
export function saveOrderToLocal(order: OrderData): void {
  if (typeof window === "undefined") return;
  const orders = getOrdersFromLocal();
  const existingIndex = orders.findIndex((o) => o.orderRef === order.orderRef);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }
  localStorage.setItem("101hub-orders", JSON.stringify(orders));
}

export function getOrderFromLocal(orderRef: string): OrderData | null {
  if (typeof window === "undefined") return null;
  const orders = getOrdersFromLocal();
  return orders.find((o) => o.orderRef === orderRef) || null;
}

export function getOrdersFromLocal(): OrderData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("101hub-orders");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Format creation date and time (e.g., "10 Apr 2026, 2:30 PM") */
export function formatOrderDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/** Format estimated delivery (either ISO date or text description) */
export function formatEstimatedDelivery(estimate?: string): string {
  if (!estimate) return "Not set";
  
  // Check if it's an ISO date string (contains T or is a date-like format)
  if (estimate.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(estimate)) {
    try {
      const date = new Date(estimate);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return estimate;
    }
  }
  
  // Otherwise return as-is (e.g., "2 days", "24 hours")
  return estimate;
}

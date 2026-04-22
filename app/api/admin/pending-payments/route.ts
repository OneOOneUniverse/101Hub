import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type PendingPayment = {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  amount: number;
  paymentMethod: "manual";
  paymentProof?: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("order_ref, customer_name, customer_email, customer_phone, total, payment_method, payment_proof, payment_status, created_at")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[pending-payments] Supabase error:", error);
      return NextResponse.json({ error: "Could not load pending payments" }, { status: 500 });
    }

    const payments: PendingPayment[] = (data ?? []).map((row) => ({
      orderRef: row.order_ref as string,
      customerName: row.customer_name as string,
      customerEmail: row.customer_email as string,
      phone: row.customer_phone as string,
      amount: row.total as number,
      paymentMethod: row.payment_method as "paystack" | "manual",
      paymentProof: row.payment_proof as string | undefined,
      status: row.payment_status as "pending" | "verified" | "rejected",
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ payments, total: payments.length }, { status: 200 });
  } catch (error) {
    console.error("[pending-payments] Error:", error);
    return NextResponse.json({ error: "Could not load pending payments" }, { status: 500 });
  }
}

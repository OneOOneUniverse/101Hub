import { NextResponse } from "next/server";

type VerifyPaymentPayload = {
  orderRef?: string;
  reference?: string;
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    gateway_response: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyPaymentPayload;
  const reference = body.reference ?? body.orderRef;

  if (!reference) {
    return NextResponse.json(
      { error: "reference is required" },
      { status: 400 }
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey || secretKey.startsWith("sk_test_xxx")) {
    console.error("[verify-payment] Paystack secret key not configured");
    return NextResponse.json(
      { error: "Payment verification not available — configure PAYSTACK_SECRET_KEY" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = (await response.json()) as PaystackVerifyResponse;

    if (!response.ok || !data.status) {
      console.error("[verify-payment] Paystack API error:", data.message);
      return NextResponse.json(
        { error: data.message ?? "Payment verification failed" },
        { status: 400 }
      );
    }

    if (data.data.status === "success") {
      return NextResponse.json({
        success: true,
        message: "Payment verified successfully",
        transaction: {
          reference: data.data.reference,
          amount: data.data.amount / 100, // pesewas → GHS
          currency: data.data.currency,
          gatewayResponse: data.data.gateway_response,
        },
      });
    }

    return NextResponse.json(
      { error: `Payment not successful — status: ${data.data.status}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[verify-payment] Error:", error);
    return NextResponse.json(
      { error: "Payment verification error" },
      { status: 500 }
    );
  }
}


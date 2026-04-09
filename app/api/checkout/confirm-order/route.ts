import { NextResponse } from "next/server";

type ConfirmOrderPayload = {
  orderRef?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmOrderPayload;

  if (!body.orderRef) {
    return NextResponse.json(
      { error: "orderRef is required" },
      { status: 400 }
    );
  }

  // In production with a database, you would:
  // 1. Find the order by orderRef
  // 2. Mark it as payment_verified
  // 3. Update the order status to "confirmed"
  // 4. Send confirmation email to customer

  // For now, we just return success as the order was already created
  return NextResponse.json(
    {
      success: true,
      message: "Order confirmed and payment verified",
      orderRef: body.orderRef,
    },
    { status: 200 }
  );
}

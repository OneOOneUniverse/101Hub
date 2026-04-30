import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export async function POST(request: Request) {
  let body: { code?: string; subtotal?: number };
  try {
    body = (await request.json()) as { code?: string; subtotal?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const subtotal = Number(body.subtotal ?? 0);

  if (!code) {
    return NextResponse.json({ error: "Discount code is required" }, { status: 400 });
  }

  const content = await getSiteContent();
  const codes = content.discountCodes ?? [];

  const found = codes.find((c) => c.code === code);

  if (!found || !found.enabled) {
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 });
  }

  // Check expiry
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This discount code has expired" }, { status: 410 });
  }

  // Check usage limit
  if (found.maxUsages && found.maxUsages > 0 && found.usageCount >= found.maxUsages) {
    return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 410 });
  }

  // Check minimum order
  if (found.minOrderAmount && subtotal < found.minOrderAmount) {
    return NextResponse.json(
      { error: `Minimum order of GHS ${found.minOrderAmount.toFixed(2)} required for this code` },
      { status: 422 }
    );
  }

  const discountAmount =
    found.type === "percent"
      ? Math.min(subtotal, (subtotal * found.value) / 100)
      : Math.min(subtotal, found.value);

  return NextResponse.json({
    valid: true,
    code: found.code,
    type: found.type,
    value: found.value,
    discountAmount: Math.round(discountAmount * 100) / 100,
    description:
      found.type === "percent"
        ? `${found.value}% off your order`
        : `GHS ${found.value.toFixed(2)} off your order`,
  });
}

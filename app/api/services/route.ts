import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

type ServiceRequestPayload = {
  packageId?: string;
  customerName?: string;
  phone?: string;
  issue?: string;
  preferredTime?: string;
};

export async function GET() {
  const { services } = await getSiteContent();
  return NextResponse.json({ items: services });
}

export async function POST(request: Request) {
  const { services, features } = await getSiteContent();
  let body: ServiceRequestPayload;

  try {
    body = (await request.json()) as ServiceRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.packageId || !body.customerName || !body.phone || !body.issue) {
    return NextResponse.json(
      { error: "packageId, customerName, phone and issue are required" },
      { status: 400 }
    );
  }

  if (!features.services) {
    return NextResponse.json({ error: "Services are currently unavailable" }, { status: 403 });
  }

  const selected = services.find((item) => item.id === body.packageId);

  if (!selected) {
    return NextResponse.json({ error: "Unknown service package" }, { status: 404 });
  }

  return NextResponse.json(
    {
      success: true,
      ticketRef: `SV-${Date.now()}`,
      package: selected.name,
      preferredTime: body.preferredTime || "Not specified",
      message: "Service request submitted. Our team will contact you shortly.",
    },
    { status: 201 }
  );
}

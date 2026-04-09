import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

type ServiceRequest = {
  id: number;
  ticket_ref: string;
  package_name: string;
  customer_name: string;
  customer_phone: string;
  issue: string;
  preferred_time: string | null;
  status: string;
  created_at: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminCheck = await isCurrentUserAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: requests, error: dbError } = await supabaseAdmin
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: "Could not fetch service requests" }, { status: 500 });
    }

    return NextResponse.json({
      requests: (requests as ServiceRequest[]) || [],
    });
  } catch (err) {
    console.error("[admin/service-requests] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Update service request status (pending → assigned → completed, etc.) */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminCheck = await isCurrentUserAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type UpdatePayload = {
    ticketRef?: string;
    status?: string;
  };

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.ticketRef || !body.status) {
    return NextResponse.json(
      { error: "ticketRef and status are required" },
      { status: 400 }
    );
  }

  const validStatuses = ["pending", "assigned", "completed", "cancelled"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const { error: dbError } = await supabaseAdmin
      .from("service_requests")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("ticket_ref", body.ticketRef);

    if (dbError) {
      return NextResponse.json({ error: "Could not update service request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/service-requests] Update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

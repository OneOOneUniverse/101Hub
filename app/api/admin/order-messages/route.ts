import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

type OrderMessage = {
  id: number;
  orderRef: string;
  message: string;
  messageType: "update" | "milestone" | "custom";
  isHighlighted: boolean;
  createdAt: string;
};

type GetMessagesPayload = {
  orderRef?: string;
};

type DeleteMessagePayload = {
  messageId?: number;
};

export async function GET(request: Request) {
  // Admin guard — single currentUser() call reads publicMetadata directly (reliable)
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const meta = user.publicMetadata as Record<string, unknown> | undefined;
  const role = typeof meta?.role === 'string' ? meta.role.toLowerCase() : '';
  const emails = user.emailAddresses.map((e) => e.emailAddress);
  if (role !== 'admin' && role !== 'supervisor' && !emails.some((e) => isAdminEmail(e))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const orderRef = url.searchParams.get("orderRef");

  if (!orderRef) {
    return NextResponse.json(
      { error: "orderRef query parameter is required." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("order_messages")
      .select("id, order_ref, message, message_type, is_highlighted, created_at")
      .eq("order_ref", orderRef)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[order-messages GET] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not load messages." },
        { status: 500 }
      );
    }

    const messages: OrderMessage[] = (data ?? []).map((row) => ({
      id: row.id as number,
      orderRef: row.order_ref as string,
      message: row.message as string,
      messageType: (row.message_type ?? "custom") as any,
      isHighlighted: row.is_highlighted as boolean,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err) {
    console.error("[order-messages GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load messages." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Admin guard — single currentUser() call reads publicMetadata directly (reliable)
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const meta2 = user.publicMetadata as Record<string, unknown> | undefined;
  const role2 = typeof meta2?.role === 'string' ? meta2.role.toLowerCase() : '';
  const emails2 = user.emailAddresses.map((e) => e.emailAddress);
  if (role2 !== 'admin' && role2 !== 'supervisor' && !emails2.some((e) => isAdminEmail(e))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: DeleteMessagePayload;
  try {
    body = (await request.json()) as DeleteMessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const messageId = body.messageId;
  if (typeof messageId !== "number" || messageId <= 0) {
    return NextResponse.json(
      { error: "Valid messageId is required." },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabaseAdmin
      .from("order_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("[order-messages DELETE] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not delete message." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[order-messages DELETE] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete message." },
      { status: 500 }
    );
  }
}

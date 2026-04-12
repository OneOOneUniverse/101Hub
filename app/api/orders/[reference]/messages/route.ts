import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type CustomerMessage = {
  id: number;
  message: string;
  messageType: "update" | "milestone" | "custom";
  isHighlighted: boolean;
  createdAt: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  if (!reference) {
    return NextResponse.json(
      { error: "Order reference required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("order_messages")
      .select("id, message, message_type, is_highlighted, created_at")
      .eq("order_ref", reference)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[customer-order-messages] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not load messages." },
        { status: 500 }
      );
    }

    const messages: CustomerMessage[] = (data ?? []).map((row) => ({
      id: row.id as number,
      message: row.message as string,
      messageType: (row.message_type ?? "custom") as any,
      isHighlighted: row.is_highlighted as boolean,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err) {
    console.error("[customer-order-messages] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load messages." },
      { status: 500 }
    );
  }
}

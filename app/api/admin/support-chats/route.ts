import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyUser } from "@/lib/db-notifications";

/** GET — list all open support chats for the admin panel */
export async function GET() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: chats } = await supabaseAdmin
    .from("support_chats")
    .select("*, support_messages(count)")
    .eq("status", "open")
    .order("updated_at", { ascending: false });

  return NextResponse.json(chats ?? []);
}

/** POST — admin sends a proactive message to a specific chat */
export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { chatId, content, imageUrl } = (await req.json()) as {
    chatId: number;
    content?: string;
    imageUrl?: string;
  };

  if (!chatId || (!content && !imageUrl)) {
    return NextResponse.json({ error: "chatId and content/imageUrl required" }, { status: 400 });
  }

  const { data: msg, error } = await supabaseAdmin
    .from("support_messages")
    .insert({
      chat_id: chatId,
      sender_role: "admin",
      content: content ?? null,
      image_url: imageUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  await supabaseAdmin
    .from("support_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  // Notify the customer (if logged in) that admin replied
  const { data: chat } = await supabaseAdmin
    .from("support_chats")
    .select("user_id")
    .eq("id", chatId)
    .single();

  if (chat?.user_id) {
    const preview = (content ?? "Image").slice(0, 80);
    void notifyUser(chat.user_id, "message", "💬 Support Reply", preview, {
      chatId,
      link: "/",
    });
  }

  return NextResponse.json(msg);
}

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/** GET — fetch messages for a chat session */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // Find or create the chat
  let { data: chat } = await supabaseAdmin
    .from("support_chats")
    .select("id")
    .eq("session_id", sessionId)
    .single();

  if (!chat) {
    const user = await currentUser();
    const { data: newChat } = await supabaseAdmin
      .from("support_chats")
      .insert({
        session_id: sessionId,
        user_id: user?.id ?? null,
        status: "open",
      })
      .select("id")
      .single();
    chat = newChat;
  }

  if (!chat) {
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }

  const { data: messages } = await supabaseAdmin
    .from("support_messages")
    .select("*")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ chatId: chat.id, messages: messages ?? [] });
}

/** POST — send a message (customer or admin) */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    chatId?: number;
    sessionId?: string;
    content?: string;
    imageUrl?: string;
    senderRole?: string;
  };

  const { content, imageUrl, senderRole } = body;

  if (!content && !imageUrl) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const role = senderRole === "admin" ? "admin" : "customer";

  // Resolve chat ID
  let chatId = body.chatId;
  if (!chatId && body.sessionId) {
    const { data: chat } = await supabaseAdmin
      .from("support_chats")
      .select("id")
      .eq("session_id", body.sessionId)
      .single();
    chatId = chat?.id;
  }

  if (!chatId) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const { data: msg, error } = await supabaseAdmin
    .from("support_messages")
    .insert({
      chat_id: chatId,
      sender_role: role,
      content: content ?? null,
      image_url: imageUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  // Update chat timestamp
  await supabaseAdmin
    .from("support_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  return NextResponse.json(msg);
}

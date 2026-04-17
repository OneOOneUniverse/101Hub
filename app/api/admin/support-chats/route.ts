import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
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

  // Resolve Clerk user IDs to display names
  const results = chats ?? [];
  const userIds = results
    .map((c: { user_id: string | null }) => c.user_id)
    .filter((id): id is string => !!id);

  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    try {
      const client = await clerkClient();
      const uniqueIds = [...new Set(userIds)];
      const resolved = await Promise.allSettled(
        uniqueIds.map((uid) => client.users.getUser(uid)),
      );
      for (const r of resolved) {
        if (r.status === "fulfilled" && r.value) {
          const u = r.value;
          const name =
            [u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.username ||
            u.emailAddresses[0]?.emailAddress ||
            u.id;
          nameMap[u.id] = name;
        }
      }
    } catch (err) {
      console.error("[support-chats] Failed to resolve user names:", err);
    }
  }

  const enriched = results.map((chat: { user_id: string | null }) => ({
    ...chat,
    user_name: chat.user_id ? nameMap[chat.user_id] ?? null : null,
  }));

  return NextResponse.json(enriched);
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
  try {
    const { data: chat } = await supabaseAdmin
      .from("support_chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (chat?.user_id) {
      const preview = (content ?? "Image").slice(0, 80);
      await notifyUser(chat.user_id, "message", "💬 Support Reply", preview, {
        chatId,
        link: "/",
      });
    }
  } catch (notifErr) {
    console.error("[admin/support-chats] Notification failed:", notifErr);
  }

  return NextResponse.json(msg);
}

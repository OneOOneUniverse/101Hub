"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──

type Message = {
  id: number;
  chat_id: number;
  sender_role: "customer" | "admin";
  content: string | null;
  image_url: string | null;
  created_at: string;
};

// ── Session ID (persisted in localStorage) ──

function getChatSessionId(): string {
  const KEY = "101hub_support_session";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ── Component ──

export default function LiveSupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef("");

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing messages
  const loadMessages = useCallback(async () => {
    if (!sessionId.current) return;
    try {
      const res = await fetch(
        `/api/support/messages?sessionId=${sessionId.current}`
      );
      const data = await res.json();
      if (data.chatId) setChatId(data.chatId);
      if (data.messages) setMessages(data.messages);
    } catch {
      // silent
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    sessionId.current = getChatSessionId();
    loadMessages();
  }, [loadMessages]);

  // Subscribe to Supabase Realtime for new messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`support-chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Increment unread if chat is closed and message is from admin
          if (!open && newMsg.sender_role === "admin") {
            setUnread((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, open]);

  // Send text message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");
    try {
      await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          chatId,
          content: text,
          senderRole: "customer",
        }),
      });
    } catch {
      // restore input on failure
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  // Upload and send image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch("/api/support/upload", {
        method: "POST",
        body: form,
      });
      const { url, error } = await uploadRes.json();
      if (error) throw new Error(error);

      await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          chatId,
          imageUrl: url,
          senderRole: "customer",
        }),
      });
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* ── Chat Toggle Button ── */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setUnread(0);
        }}
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-[var(--brand)] text-white shadow-xl flex items-center justify-center hover:bg-[var(--brand-deep)] active:scale-95 transition-transform"
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? (
          // X icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          // Chat icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
          </svg>
        )}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div
          className="fixed bottom-36 sm:bottom-22 right-5 z-40 w-[340px] max-w-[calc(100vw-2.5rem)] rounded-2xl shadow-2xl border border-gray-200 bg-white flex flex-col overflow-hidden"
          style={{ height: "min(480px, calc(100vh - 10rem))" }}
        >
          {/* Header */}
          <div className="bg-[var(--brand)] text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">101 Hub Support</p>
              <p className="text-[11px] opacity-80">We typically reply instantly</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-8">
                👋 Hi! How can we help you today?
              </p>
            )}

            {messages.map((msg) => {
              const isAdmin = msg.sender_role === "admin";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isAdmin
                        ? "bg-white text-[var(--ink)] border border-gray-200 rounded-bl-sm"
                        : "bg-[var(--brand)] text-white rounded-br-sm"
                    }`}
                  >
                    {msg.content && <p>{msg.content}</p>}
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Shared image"
                        className="mt-1 rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                        onClick={() => window.open(msg.image_url!, "_blank")}
                      />
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        isAdmin ? "text-gray-400" : "text-white/60"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
            {/* Image upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-[var(--brand)] hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Attach image"
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </button>

            {/* Text input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 min-w-0 text-sm bg-gray-100 rounded-full px-3.5 py-2 outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-[var(--ink)]"
            />

            {/* Send */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="shrink-0 w-8 h-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center hover:bg-[var(--brand-deep)] disabled:opacity-40 transition-colors"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

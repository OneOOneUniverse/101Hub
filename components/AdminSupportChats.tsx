"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Chat = {
  id: number;
  user_id: string | null;
  session_id: string;
  status: string;
  page_url: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: number;
  chat_id: number;
  sender_role: "customer" | "admin";
  content: string | null;
  image_url: string | null;
  created_at: string;
};

export default function AdminSupportChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load open chats
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support-chats");
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 15000);
    return () => clearInterval(interval);
  }, [loadChats]);

  // Load messages for selected chat
  const loadMessages = useCallback(async (chatId: number) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    try {
      const res = await fetch(`/api/support/messages?sessionId=${chat.session_id}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // silent
    }
  }, [chats]);

  // Poll messages for active chat
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedChat) { setMessages([]); return; }

    loadMessages(selectedChat);
    pollRef.current = setInterval(() => loadMessages(selectedChat), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedChat, loadMessages]);

  // Scroll to bottom of messages container
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Send reply
  const sendReply = async () => {
    if (!reply.trim() || !selectedChat || sending) return;
    setSending(true);
    const text = reply;
    setReply("");
    try {
      await fetch("/api/admin/support-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat, content: text }),
      });
      await loadMessages(selectedChat);
    } catch {
      setReply(text);
    } finally {
      setSending(false);
    }
  };

  // Upload image and send
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/support/upload", { method: "POST", body: form });
      const { url, error } = await uploadRes.json();
      if (error) throw new Error(error);

      await fetch("/api/admin/support-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat, imageUrl: url }),
      });
      await loadMessages(selectedChat);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="panel p-6 text-sm text-[var(--ink-soft)]">Loading support chats...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 450 }}>
      {/* Chat List */}
      <div className="panel p-0 overflow-hidden md:col-span-1">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-[var(--ink)]">
            Open Chats ({chats.length})
          </h3>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {chats.length === 0 ? (
            <p className="p-4 text-xs text-[var(--ink-soft)]">No open chats right now.</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  selectedChat === chat.id
                    ? "bg-[var(--brand)]/10 border-l-4 border-l-[var(--brand)]"
                    : "hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--ink)] truncate">
                  {chat.user_id ? `User: ${chat.user_id.slice(0, 12)}...` : `Guest: ${chat.session_id.slice(0, 8)}...`}
                </p>
                <p className="text-[10px] text-[var(--ink-soft)] mt-0.5">
                  {new Date(chat.updated_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="panel p-0 overflow-hidden md:col-span-2 flex flex-col">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--ink-soft)]">
            Select a chat to view messages
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--ink)]">Conversation</h3>
              <button
                onClick={() => loadMessages(selectedChat)}
                className="text-xs text-[var(--brand)] font-medium hover:underline"
              >
                Refresh
              </button>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50" style={{ maxHeight: 320 }}>
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-8">No messages yet.</p>
              )}
              {messages.map((msg) => {
                const isAdmin = msg.sender_role === "admin";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      isAdmin
                        ? "bg-[var(--brand)] text-white rounded-br-sm"
                        : "bg-white text-[var(--ink)] border border-gray-200 rounded-bl-sm"
                    }`}>
                      {msg.content && <p>{msg.content}</p>}
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Shared"
                          className="mt-1 rounded-lg max-w-full max-h-40 object-cover cursor-pointer"
                          onClick={() => window.open(msg.image_url!, "_blank")}
                        />
                      )}
                      <p className={`text-[10px] mt-1 ${isAdmin ? "text-white/60" : "text-gray-400"}`}>
                        {isAdmin ? "You" : "Customer"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Reply Bar */}
            <div className="border-t border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
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
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-[var(--brand)] hover:bg-gray-100 disabled:opacity-50"
                aria-label="Send image"
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
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Type a reply..."
                className="flex-1 min-w-0 text-sm bg-gray-100 rounded-full px-3.5 py-2 outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="shrink-0 w-8 h-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center hover:bg-[var(--brand-deep)] disabled:opacity-40"
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

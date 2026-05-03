"use client";

import { useEffect, useState } from "react";

// SVG icons
function ChatBubbleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function MailIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function TargetIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>; }
function StarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function InboxIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>; }


type OrderMessage = {
  id: number;
  orderRef: string;
  message: string;
  messageType: "update" | "milestone" | "custom";
  isHighlighted: boolean;
  createdAt: string;
};

interface OrderMessageProps {
  orderRef: string;
  isCompact?: boolean;
}

export default function OrderMessaging({ orderRef, isCompact = false }: OrderMessageProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState<"update" | "milestone" | "custom">("update");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  useEffect(() => {
    void loadMessages();
  }, [orderRef]);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/admin/order-messages?orderRef=${orderRef}`);
      const data = (await res.json()) as { messages?: OrderMessage[]; error?: string };
      if (res.ok) {
        setMessages(data.messages ?? []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/send-order-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef,
          message: newMessage,
          messageType,
          isHighlighted,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send message");
      setNewMessage("");
      setIsHighlighted(false);
      setMessageType("update");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(messageId: number) {
    if (!confirm("Delete this message?")) return;
    setError("");
    try {
      const res = await fetch("/api/admin/order-messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete message");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete message");
    }
  }

  const highlightedCount = messages.filter((m) => m.isHighlighted).length;
  const updateCount = messages.filter((m) => m.messageType === "update").length;

  if (isCompact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white hover:shadow-lg transition"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><ChatBubbleIcon /> {messages.length} Message{messages.length !== 1 ? "s" : ""}</span>
          {highlightedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold"><StarIcon /> {highlightedCount}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatBubbleIcon />
            <h3 className="font-bold">Messages & Updates</h3>
          </div>
          {isCompact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xl leading-none hover:bg-white/20 rounded px-2 py-1"
            >
              ×
            </button>
          )}
        </div>
        {messages.length > 0 && (
          <p className="text-xs text-purple-100 mt-1">
            {messages.length} message{messages.length !== 1 ? "s" : ""} • {highlightedCount} highlighted
          </p>
        )}
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 font-medium">
          <span className="inline-flex items-center gap-1"><AlertIcon /> {error}</span>
        </div>
      )}

      {/* Messages List */}
      <div className="space-y-2 overflow-y-auto max-h-80 p-4">
        {loading && messages.length === 0 ? (
          <div className="text-center py-8 text-purple-600">
            <svg className="animate-spin mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            <p className="text-sm text-purple-600">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-purple-500">
            <InboxIcon />
            <p className="text-sm">No messages yet. Send your first update!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm transition-all ${
                msg.isHighlighted
                  ? "border-2 border-yellow-400 bg-yellow-50 shadow-md"
                  : "border border-purple-200 bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-purple-900 flex items-center gap-1.5">
                    {msg.messageType === "update" && <MailIcon />}
                    {msg.messageType === "milestone" && <TargetIcon />}
                    {msg.messageType === "custom" && <ChatBubbleIcon />}
                    {msg.isHighlighted && <StarIcon />}
                    <span className="capitalize">{msg.messageType}</span>
                  </p>
                  <p className="mt-1.5 text-purple-900 break-words">{msg.message}</p>
                  <p className="mt-2 text-xs text-purple-500 font-medium">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => void deleteMessage(msg.id)}
                  className="ml-2 text-xs px-2 py-1 text-red-600 hover:bg-red-100 hover:text-red-900 rounded transition font-bold shrink-0"
                  title="Delete message"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Message Form */}
      <div className="border-t-2 border-purple-200 bg-white p-4 space-y-3">
        <form onSubmit={sendMessage} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-purple-900 block mb-1.5">
              Message
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tell customer about their order status..."
              className="w-full rounded-lg border-2 border-purple-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-purple-500 mt-1">
              {newMessage.length}/500 characters
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-bold text-purple-900 block mb-1">
                Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as any)}
                className="w-full rounded-lg border-2 border-purple-200 bg-white px-2 py-2 text-xs outline-none transition focus:border-purple-500"
              >
                <option value="update">Update</option>
                <option value="milestone">Milestone</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="col-span-2 flex items-end">
              <label className="w-full flex items-center gap-2 rounded-lg border-2 border-purple-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 transition">
                <input
                  type="checkbox"
                  checked={isHighlighted}
                  onChange={(e) => setIsHighlighted(e.target.checked)}
                  className="rounded accent-purple-600"
                />
                <span className="font-bold text-purple-900"><StarIcon /> Highlight</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Sending...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send Message to Customer
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

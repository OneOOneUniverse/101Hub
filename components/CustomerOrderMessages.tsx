"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/components/NotificationProvider";

function ChatIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}
function MailIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function MilestoneIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
}
function StarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}

type CustomerMessage = {
  id: number;
  message: string;
  messageType: "update" | "milestone" | "custom";
  isHighlighted: boolean;
  createdAt: string;
};

interface CustomerOrderMessagesProps {
  orderRef: string;
}

export default function CustomerOrderMessages({ orderRef }: CustomerOrderMessagesProps) {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const prevCountRef = useRef(-1);
  const { addNotification } = useNotifications();

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}/messages`);
        const data = (await res.json()) as { messages?: CustomerMessage[] };
        if (res.ok) {
          const fetched = data.messages ?? [];
          setMessages(fetched);

          // Toast when new messages arrive (skip initial load)
          if (prevCountRef.current !== -1 && fetched.length > prevCountRef.current) {
            const newest = fetched[0];
            addNotification(
              'message',
              'New message from 101 Hub',
              newest?.message ?? 'You have a new update on your order'
            );
          }
          prevCountRef.current = fetched.length;
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadMessages();
  }, [orderRef, addNotification]);

  if (loading && messages.length === 0) {
    return null;
  }

  if (messages.length === 0) {
    return null;
  }

  return (
    <section className="panel p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
          <ChatIcon />
          Order Updates from Store
        </h2>
        <p className="text-xs text-purple-600 mt-1">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-4 border-2 transition-all ${
              msg.isHighlighted
                ? "border-yellow-400 bg-yellow-50 shadow-md"
                : "border-purple-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                  {msg.messageType === "update" && <MailIcon />}
                  {msg.messageType === "milestone" && <MilestoneIcon />}
                  {msg.messageType === "custom" && <ChatIcon />}
                  {msg.isHighlighted && <StarIcon />}
                  <span className="capitalize">{msg.messageType}</span>
                </p>
                <p className="mt-2 text-sm text-gray-800 break-words">{msg.message}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

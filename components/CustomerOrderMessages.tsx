"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/components/NotificationProvider";

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
              '💬 New message from 101 Hub',
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
    const interval = setInterval(() => {
      void loadMessages();
    }, 10000);
    return () => clearInterval(interval);
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
          <span className="text-2xl">💬</span>
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
                  {msg.messageType === "update" && "📬"}
                  {msg.messageType === "milestone" && "🎯"}
                  {msg.messageType === "custom" && "💬"}
                  {msg.isHighlighted && "⭐"}
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

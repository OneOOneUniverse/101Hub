"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SEEN_KEY = "101hub-features-seen";

const FEATURES = [
  {
    emoji: "🛍️",
    title: "Shop Products",
    desc: "Browse gadgets, fashion, home essentials and more.",
    href: "/products",
  },
  {
    emoji: "⚡",
    title: "Flash Sale",
    desc: "Limited-time deals at massive discounts. New drops daily.",
    href: "/flash-sale",
  },
  {
    emoji: "🎮",
    title: "Deals Hub & Games",
    desc: "Play spin wheel, scratch cards & trivia to earn discount points.",
    href: "/deals",
  },
  {
    emoji: "🏪",
    title: "Special Stores",
    desc: "Curated collections with fixed store prices — add direct to cart.",
    href: "/deals",
  },
  {
    emoji: "🛠️",
    title: "Professional Services",
    desc: "Book device setup, installation, repairs and more.",
    href: "/services",
  },
  {
    emoji: "👥",
    title: "Referral Rewards",
    desc: "Invite friends and earn cashback rewards on every purchase they make.",
    href: "/referral",
  },
  {
    emoji: "❤️",
    title: "Wishlist",
    desc: "Save items to buy later — accessible from any device when signed in.",
    href: "/wishlist",
  },
  {
    emoji: "📦",
    title: "Order Tracking",
    desc: "Track your orders in real time from your profile.",
    href: "/orders",
  },
];

export default function FeaturesTour() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        // Small delay so the page loads first
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked — skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="ft-overlay" role="dialog" aria-modal="true" aria-label="What's on 101 Hub">
      <div className="ft-panel">
        {/* Header */}
        <div className="ft-head">
          <div>
            <p className="ft-eyebrow">✦ Welcome to 101 Hub</p>
            <h2 className="ft-title">Everything you can do here</h2>
          </div>
          <button className="ft-close" onClick={dismiss} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid */}
        <div className="ft-grid">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} className="ft-card" onClick={dismiss}>
              <span className="ft-emoji">{f.emoji}</span>
              <div>
                <p className="ft-name">{f.title}</p>
                <p className="ft-desc">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="ft-foot">
          <button className="ft-got-it" onClick={dismiss}>Got it — Start Exploring →</button>
        </div>
      </div>

      <style jsx>{`
        .ft-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: ft-fade 0.3s ease;
        }
        @keyframes ft-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .ft-panel {
          background: #0d0d1a;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 1.5rem;
          width: 100%;
          max-width: 680px;
          max-height: 88vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          animation: ft-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
        }
        @keyframes ft-up {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ft-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.6rem 1.6rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .ft-eyebrow {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a78bfa;
          margin: 0 0 0.3rem;
        }

        .ft-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .ft-close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ft-close:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .ft-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
          padding: 1.2rem 1.4rem;
        }

        .ft-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          border-radius: 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.025);
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
          cursor: pointer;
        }
        .ft-card:hover {
          background: rgba(124, 58, 237, 0.1);
          border-color: rgba(167, 139, 250, 0.25);
          transform: translateY(-2px);
        }

        .ft-emoji {
          font-size: 1.5rem;
          flex-shrink: 0;
          line-height: 1;
          margin-top: 0.05rem;
        }

        .ft-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 0.2rem;
        }

        .ft-desc {
          font-size: 0.7rem;
          color: #475569;
          margin: 0;
          line-height: 1.55;
        }

        .ft-foot {
          padding: 0.8rem 1.4rem 1.4rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: flex-end;
        }

        .ft-got-it {
          padding: 0.6rem 1.6rem;
          border: none;
          border-radius: 99px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ft-got-it:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
        }

        @media (max-width: 500px) {
          .ft-grid { grid-template-columns: 1fr; }
          .ft-title { font-size: 1.1rem; }
          .ft-head { padding: 1.2rem 1.2rem 0.8rem; }
          .ft-grid { padding: 0.8rem 1rem; }
          .ft-foot { padding: 0.6rem 1rem 1.2rem; }
        }
      `}</style>
    </div>
  );
}

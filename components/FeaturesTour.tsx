"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SEEN_KEY = "101hub-features-seen";

// ── Mini SVG icons ────────────────────────────────────────────────────────────
function IcoBag() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}
function IcoZap() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IcoGamepad() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>;
}
function IcoTag() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function IcoWrench() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
}
function IcoUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IcoHeart() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
}
function IcoPackage() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}

const FEATURES = [
  { icon: <IcoBag />, title: "Shop Products", desc: "Browse gadgets, fashion, home essentials and more.", href: "/products" },
  { icon: <IcoZap />, title: "Flash Sale", desc: "Limited-time deals at massive discounts. New drops daily.", href: "/flash-sale" },
  { icon: <IcoGamepad />, title: "Deals Hub & Games", desc: "Play spin wheel, scratch cards & trivia to earn discount points.", href: "/deals" },
  { icon: <IcoTag />, title: "Special Stores", desc: "Curated collections with fixed store prices — add direct to cart.", href: "/deals" },
  { icon: <IcoWrench />, title: "Professional Services", desc: "Book device setup, installation, repairs and more.", href: "/services" },
  { icon: <IcoUsers />, title: "Referral Rewards", desc: "Invite friends and earn cashback rewards on every purchase they make.", href: "/referral" },
  { icon: <IcoHeart />, title: "Wishlist", desc: "Save items to buy later — accessible from any device when signed in.", href: "/wishlist" },
  { icon: <IcoPackage />, title: "Order Tracking", desc: "Track your orders in real time from your profile.", href: "/orders" },
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
            <p className="ft-eyebrow">Welcome to 101 Hub</p>
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
              <span className="ft-icon">{f.icon}</span>
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
          color: #ff6b35;
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
          background: rgba(255, 107, 53, 0.08);
          border-color: rgba(255, 107, 53, 0.3);
          transform: translateY(-2px);
        }

        .ft-icon {
          font-size: 1.15rem;
          flex-shrink: 0;
          line-height: 1;
          margin-top: 0.1rem;
          color: #ff6b35;
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
          background: linear-gradient(135deg, #ff6b35, #d94020);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ft-got-it:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.45);
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

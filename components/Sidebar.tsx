"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { getAvatarById } from "@/lib/avatar-options";
import { usePathname } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const { signOut } = useClerk();
  const { user } = useUser();
  const userId = user?.id;
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const avatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(avatarId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [features, setFeatures] = useState({
    flashSale: true,
    wishlist: true,
    services: true,
    cart: true,
    checkout: true,
    dealsHub: false,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/store", { cache: "default" });
        const data = (await res.json()) as { features?: Record<string, boolean> };
        if (active && data.features) {
          setFeatures({
            flashSale: data.features.flashSale ?? true,
            wishlist: data.features.wishlist ?? true,
            services: data.features.services ?? true,
            cart: data.features.cart ?? true,
            checkout: data.features.checkout ?? true,
            dealsHub: data.features.dealsHub ?? false,
          });
        }
      } catch { /* keep defaults */ }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/user/status", { cache: "no-store" });
        const data = (await res.json()) as { isAdmin?: boolean };
        if (active && res.ok) setIsAdmin(Boolean(data.isAdmin));
      } catch { if (active) setIsAdmin(false); }
    }
    void load();
    return () => { active = false; };
  }, [userId]);

  // Close on route change
  useEffect(() => { onClose(); }, [pathname, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirectUrl: "/login" });
    setLoggingOut(false);
  }

  const linkClass = (href: string) =>
    `sidebar-link${pathname === href ? " sidebar-link--active" : ""}`;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar ${open ? "sidebar--open" : ""}`}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="sidebar-header">
          <button
            onClick={onClose}
            className="sidebar-close"
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="sidebar-title">Menu</span>
        </div>

        {/* User info */}
        {userId && avatar ? (
          <div className="sidebar-user">
            <Image
              src={avatar.src}
              alt={avatar.name}
              width={40}
              height={40}
              className="sidebar-user-avatar"
            />
            <div>
              <p className="sidebar-user-name">{user?.firstName ?? "Hi there"}</p>
              <p className="sidebar-user-email">{user?.primaryEmailAddress?.emailAddress ?? ""}</p>
            </div>
          </div>
        ) : null}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <Link href="/" className={linkClass("/")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
              Home
            </Link>
            <Link href="/products" className={linkClass("/products")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Products
            </Link>
            {features.flashSale && (
              <Link href="/flash-sale" className={linkClass("/flash-sale")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Flash Sale
              </Link>
            )}
            {features.services && (
              <Link href="/services" className={linkClass("/services")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                Services
              </Link>
            )}
            {features.dealsHub && (
              <Link href="/deals" className={linkClass("/deals")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Deals Hub
              </Link>
            )}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <Link href="/orders" className={linkClass("/orders")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Track Order
            </Link>
            {features.wishlist && (
              <Link href="/wishlist" className={linkClass("/wishlist")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Wishlist
              </Link>
            )}
            {features.cart && (
              <Link href="/cart" className={linkClass("/cart")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Cart
              </Link>
            )}
            {features.checkout && (
              <Link href="/checkout" className={linkClass("/checkout")} onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                Checkout
              </Link>
            )}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <Link href="/referral" className={linkClass("/referral")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              Referrals
            </Link>
            <Link href="/faqs" className={linkClass("/faqs")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              FAQs
            </Link>
            <Link href="/app" className={linkClass("/app")} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Get App
            </Link>
          </div>

          {userId && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section">
                <Link href="/profile" className={linkClass("/profile")} onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                  Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={linkClass("/admin")} onClick={onClose}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => { onClose(); void handleLogout(); }}
                  disabled={loggingOut}
                  className="sidebar-link sidebar-logout"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  {loggingOut ? "Logging out…" : "Logout"}
                </button>
              </div>
            </>
          )}

          {!userId && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section">
                <Link href="/login" className={linkClass("/login")} onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Login
                </Link>
                <Link href="/signup" className={linkClass("/signup")} onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </nav>
      </aside>

      <style jsx global>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          max-width: 85vw;
          background: #1a1a1a;
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .sidebar--open {
          transform: translateX(0);
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .sidebar-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sidebar-close:hover {
          background: rgba(255,255,255,0.1);
        }
        .sidebar-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .sidebar-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #ff6b35;
        }
        .sidebar-user-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }
        .sidebar-user-email {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }
        .sidebar-nav {
          flex: 1;
          padding: 8px 0;
          overflow-y: auto;
        }
        .sidebar-section {
          padding: 4px 12px;
        }
        .sidebar-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 4px 20px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 28px;
          color: rgba(255,255,255,0.85);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }
        .sidebar-link:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .sidebar-link--active {
          background: rgba(255,107,53,0.15);
          color: #ff6b35;
        }
        .sidebar-link--active:hover {
          background: rgba(255,107,53,0.22);
        }
        .sidebar-logout {
          color: rgba(255,100,100,0.85);
        }
        .sidebar-logout:hover {
          background: rgba(255,100,100,0.1);
          color: #ff6464;
        }
        .sidebar-logout:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}

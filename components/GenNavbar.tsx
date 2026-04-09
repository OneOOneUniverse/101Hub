"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import CartBadge from "./CartBadge";
import { useClerk, useUser } from "@clerk/nextjs";
import { getAvatarById } from "@/lib/avatar-options";

export default function GenNavbar({
  onCartClick,
}: {
  onCartClick?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const { user } = useUser();
  const userId = user?.id;
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const avatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(avatarId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [storeName, setStoreName] = useState("101Hub");

  useEffect(() => {
    let isActive = true;

    async function loadBranding() {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        const data = (await response.json()) as { logoUrl?: string; storeName?: string };
        if (isActive) {
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.storeName) setStoreName(data.storeName);
        }
      } catch {
        // keep defaults
      }
    }

    void loadBranding();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    let isActive = true;

    async function loadAdminStatus() {
      try {
        const response = await fetch("/api/user/status", { cache: "no-store" });
        const data = (await response.json()) as { isAdmin?: boolean };

        if (!response.ok) {
          return;
        }

        if (isActive) {
          setIsAdmin(Boolean(data.isAdmin));
        }
      } catch {
        if (isActive) {
          setIsAdmin(false);
        }
      }
    }

    void loadAdminStatus();

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirectUrl: "/login" });
    setLoggingOut(false);
  }

  return (
    <nav className={`gen-nav${menuOpen ? " mobile-open" : ""}`} id="gen-nav">
      <div className="gen-logo">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            className="gen-logo-img"
            style={{ height: "40px", width: "auto", maxWidth: "180px", objectFit: "contain", display: "block" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const text = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (text) text.style.display = "block";
            }}
          />
        ) : (
          <Image src="/favicon.ico" alt={storeName} width={36} height={36} />
        )}
        <span className="gen-logo-text" style={logoUrl ? { display: "none" } : undefined}>{storeName}</span>
      </div>
      <button
        className="gen-hamburger"
        id="gen-ham"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span></span><span></span><span></span>
      </button>
      <ul id="gen-menu" className={menuOpen ? "open" : ""}>
        <li><Link href="/">Home</Link></li>
        <li>
          <a href="#">Products <span className="gen-arrow">▾</span></a>
          <ul>
            <li><Link href="/products">All Products</Link></li>
            <li><Link href="/flash-sale">Flash Sale</Link></li>
            <li><Link href="/wishlist">Wishlist</Link></li>
          </ul>
        </li>
        <li>
          <a href="#">Services <span className="gen-arrow">▾</span></a>
          <ul>
            <li><Link href="/services">All Services</Link></li>
            <li><Link href="/checkout">Checkout</Link></li>
          </ul>
        </li>
        <li><Link href="/orders">Track Order</Link></li>
      </ul>
      <div className="gen-nav-actions">
        {/* Cart badge — desktop only; mobile uses FAB */}
        <div className="gen-cart-desktop">
          {onCartClick && <CartBadge onClick={onCartClick} />}
        </div>
        {/* Profile avatar — always visible on all screen sizes */}
        <div className="gen-profile-wrap" ref={profileRef}>
          <button
            className="gen-profile-btn"
            aria-label={userId ? "Account menu" : "Login"}
            onClick={() =>
              userId ? setProfileOpen((v) => !v) : (window.location.href = "/login")
            }
          >
            {userId && avatar ? (
              <Image
                src={avatar.src}
                alt={avatar.name}
                width={32}
                height={32}
                className="gen-avatar-img"
              />
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            )}
          </button>
          {profileOpen && userId && (
            <div className="gen-profile-dropdown">
              <Link href="/profile" onClick={() => setProfileOpen(false)} className="gen-profile-item">
                Profile
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setProfileOpen(false)} className="gen-profile-item">
                  Admin
                </Link>
              )}
              <button
                className="gen-profile-item gen-logout-btn"
                onClick={() => { setProfileOpen(false); void handleLogout(); }}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        .gen-nav {
          display: flex;
          align-items: center;
          background: #000000;
          min-height: 52px;
          border-radius: 8px;
          border: 2px solid #ff6b35;
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
          padding: 0 16px;
          position: relative;
          flex-wrap: wrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
        }
        .gen-nav *, .gen-nav *::before, .gen-nav *::after { box-sizing: border-box; }
        .gen-nav ul { list-style: none; margin: 0; padding: 0; }
        .gen-logo { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-right: auto; }
        .gen-logo-img { height: 40px; width: auto; max-width: 160px; object-fit: contain; display: block; }
        .gen-logo-text { color: #fff; font-size: 18px; font-weight: 600; white-space: nowrap; }
        .gen-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; align-items: center; justify-content: center; flex-direction:column; gap:0; }
        .gen-hamburger span { display: block; background: #fff; transition: all .3s; width:22px; height:2px; border-radius:2px; margin:3px 0; }
        .gen-nav > ul { display: flex; justify-content:center; flex-wrap: wrap; }
        .gen-nav > ul > li { position: relative; }
        .gen-nav > ul > li > a { display: flex; align-items: center; gap: 4px; padding: 0 16px; height: 52px; color: #fff; font-size: 14px; font-weight: 500; text-transform: none; text-decoration: none; transition: background .2s, color .2s; white-space: nowrap; }
        .gen-nav > ul > li > a:hover, .gen-nav > ul > li:hover > a { background: #ff6b35; color: #000; }
        .gen-arrow { font-size: .7em; opacity: .8; }
        .gen-nav > ul > li > ul { display: none; position: absolute; top: 100%; left: 0; background: #1a1a1a; min-width: 170px; border-radius: 0 0 6px 6px; box-shadow: 0 8px 24px rgba(255,107,53,.18); z-index: 1000; overflow: hidden; }
        .gen-nav > ul > li:hover > ul { display: block; }
        .gen-nav > ul > li > ul > li > a { display: block; padding: 10px 18px; color: #fff; font-size: 13px; text-decoration: none; transition: background .15s, color .15s; }
        .gen-nav > ul > li > ul > li > a:hover { background: #ff6b35; color: #000; }
        .gen-nav > ul > li > ul > li:last-child { border-radius: 0 0 6px 6px; overflow: hidden; }
        .gen-nav > ul > li > ul > li:last-child > a { border-radius: 0 0 6px 6px; }
        /* Nav actions — always visible, pushed to far right */
        .gen-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .gen-cart-desktop { display: flex; align-items: center; }
        /* Profile button */
        .gen-profile-wrap { position: relative; }
        .gen-profile-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #ff6b35; background: #1a1a1a; color: #fff; cursor: pointer; padding: 0; transition: border-color .2s, box-shadow .2s; overflow: hidden; }
        .gen-profile-btn:hover { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,107,53,.35); }
        .gen-avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; display: block; }
        .gen-profile-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #1a1a1a; border: 1px solid #ff6b35; border-radius: 8px; min-width: 150px; box-shadow: 0 8px 24px rgba(0,0,0,.4); z-index: 2000; overflow: hidden; }
        .gen-profile-item { display: block; width: 100%; padding: 10px 16px; color: #fff; font-size: 13px; font-weight: 500; text-decoration: none; background: none; border: none; text-align: left; cursor: pointer; transition: background .15s, color .15s; }
        .gen-profile-item:hover { background: #ff6b35; color: #000; }
        .gen-logout-btn:disabled { opacity: .5; cursor: not-allowed; }
        @media (max-width: 768px) {
          .gen-hamburger { display: flex; }
          .gen-nav { display: flex; flex-wrap: wrap; }
          .gen-logo { margin-right: auto; justify-self: unset; }
          .gen-cart-desktop { display: none; }
          .gen-nav > ul { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; background: #000000; border-radius: 0 0 8px 8px; box-shadow: 0 12px 32px rgba(0,0,0,.2); z-index: 9999; padding: 8px 0; overflow: hidden; }
          .gen-nav > ul.open { display: flex; }
          .gen-nav.mobile-open { border-radius: 8px 8px 0 0; }
          .gen-nav > ul > li > a { height: auto; padding: 14px 20px; }
          .gen-nav > ul > li:last-child { border-radius: 0; overflow: visible; }
          .gen-nav > ul > li:last-child > a { border-radius: 0; }
          .gen-nav > ul > li > ul { display: block; position: static; box-shadow: none; border-radius: 0; overflow: visible; background: rgba(255,107,53,.1); min-width: 0; }
          .gen-nav > ul > li > ul > li:last-child { border-radius: 0; overflow: visible; }
          .gen-nav > ul > li > ul > li:last-child > a { border-radius: 0; }
          .gen-nav > ul > li > ul > li > a { padding: 10px 32px; }
          .gen-nav.mobile-open .gen-hamburger span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
          .gen-nav.mobile-open .gen-hamburger span:nth-child(2) { opacity: 0; }
          .gen-nav.mobile-open .gen-hamburger span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        }
      `}</style>
    </nav>
  );
}

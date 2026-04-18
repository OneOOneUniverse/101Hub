"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { useClerk, useUser } from "@clerk/nextjs";
import { getAvatarById } from "@/lib/avatar-options";

export default function GenNavbar({
  onSidebarToggle,
}: {
  onSidebarToggle?: () => void;
}) {
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
        const response = await fetch("/api/store", { cache: "default" });
        const data = (await response.json()) as {
          logoUrl?: string;
          storeName?: string;
        };
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
    <nav className="gen-nav" id="gen-nav">
      {/* Hamburger — opens sidebar */}
      <button
        className="gen-hamburger"
        aria-label="Open menu"
        onClick={onSidebarToggle}
      >
        <span></span><span></span><span></span>
      </button>

      <Link href="/" className="gen-logo">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            className="gen-logo-img"
            style={{ height: "40px", width: "auto", maxWidth: "120px", objectFit: "contain", display: "block" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const text = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (text) text.style.display = "block";
            }}
          />
        ) : (
          <Image src="/img/log.png" alt={storeName} width={36} height={36} />
        )}
        <span className="gen-logo-text">{storeName}</span>
      </Link>

      <div className="gen-nav-actions">
        {/* Notification bell */}
        <NotificationBell />
        {/* Profile avatar */}
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
          gap: 8px;
        }
        .gen-nav *, .gen-nav *::before, .gen-nav *::after { box-sizing: border-box; }
        .gen-logo { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-right: auto; text-decoration: none; }
        .gen-logo-img { height: 40px; width: auto; max-width: 160px; object-fit: contain; display: block; }
        .gen-logo-text { color: #fff; font-size: 18px; font-weight: 600; white-space: nowrap; }
        .gen-hamburger {
          display: flex;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          flex-shrink: 0;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .gen-hamburger:hover { background: rgba(255,255,255,0.1); }
        .gen-hamburger span { display: block; background: #fff; width: 20px; height: 2px; border-radius: 2px; margin: 3px 0; }
        /* Nav actions — always visible, pushed to far right */
        .gen-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        /* Profile button */
        .gen-profile-wrap { position: relative; }
        .gen-profile-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #ff6b35; background: #1a1a1a; color: #fff; cursor: pointer; padding: 0; transition: border-color .2s, box-shadow .2s; overflow: hidden; }
        .gen-profile-btn:hover { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,107,53,.35); }
        .gen-avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; display: block; }
        .gen-profile-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #1a1a1a; border: 1px solid #ff6b35; border-radius: 8px; min-width: 150px; box-shadow: 0 8px 24px rgba(0,0,0,.4); z-index: 2000; overflow: hidden; }
        .gen-profile-item { display: block; width: 100%; padding: 10px 16px; color: #fff; font-size: 13px; font-weight: 500; text-decoration: none; background: none; border: none; text-align: left; cursor: pointer; transition: background .15s, color .15s; }
        .gen-profile-item:hover { background: #ff6b35; color: #000; }
        .gen-logout-btn:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </nav>
  );
}

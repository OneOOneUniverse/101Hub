"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getAvatarById } from "@/lib/avatar-options";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const avatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(avatarId);

  return (
    <aside className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform ${open ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300`}>
      <div className="flex items-center justify-between p-4 border-b border-black/10">
        <div className="flex items-center gap-2">
          <Image src={avatar.src} alt={avatar.name} width={40} height={40} className="rounded-full border border-black/15" />
          <span className="font-bold text-[var(--brand-deep)]">Settings</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close sidebar" className="text-2xl font-bold">×</button>
      </div>
      <nav className="flex flex-col gap-2 p-4 text-[var(--ink-soft)]">
        <Link href="/profile" className="hover:text-[var(--brand-deep)] py-2">Profile</Link>
        <Link href="/settings" className="hover:text-[var(--brand-deep)] py-2">Account Settings</Link>
        <Link href="/notifications" className="hover:text-[var(--brand-deep)] py-2">Notifications</Link>
        <Link href="/privacy" className="hover:text-[var(--brand-deep)] py-2">Privacy</Link>
      </nav>
    </aside>
  );
}

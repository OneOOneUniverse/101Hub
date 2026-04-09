"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

export default function LogoutButton() {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ redirectUrl: "/login" });
    setLoading(false);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleLogout()}
      className="hover:text-[var(--brand-deep)] disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}

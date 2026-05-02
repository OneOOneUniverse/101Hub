import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth";
import Link from "next/link";
import AdminAuctionsPage from "./AdminAuctionsPage";

export default async function AdminAuctionsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/login?from=/admin/auctions");
  if (!(await isCurrentUserAdmin())) redirect("/profile");

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-4 sm:py-10">
      <div className="mb-5 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
        <Link href="/admin" className="hover:text-purple-700 font-semibold transition-colors">
          ← Admin Dashboard
        </Link>
      </div>
      <AdminAuctionsPage />
    </main>
  );
}

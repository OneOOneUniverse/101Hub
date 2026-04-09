import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login?from=/admin");
  }

  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/profile");
  }

  return <>{children}</>;
}
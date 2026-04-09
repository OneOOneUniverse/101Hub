import "server-only";
import { currentUser } from "@clerk/nextjs/server";

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return normalized;
  }

  // Treat gmail/googlemail aliases as the same mailbox.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const localWithoutTag = localPart.split("+")[0]?.replace(/\./g, "") ?? localPart;
    return `${localWithoutTag}@gmail.com`;
  }

  return normalized;
}

function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();
  return allowlist.has(normalizeEmail(email));
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser();

  if (!user) {
    return false;
  }

  const metadata = user.publicMetadata as Record<string, unknown> | undefined;
  const role = typeof metadata?.role === "string" ? metadata.role.toLowerCase() : "";
  if (role === "admin") {
    return true;
  }

  const emails = user.emailAddresses.map((item) => item.emailAddress);
  return emails.some((email) => isAdminEmail(email));
}
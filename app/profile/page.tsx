import Image from "next/image";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileAvatarPicker from "@/components/ProfileAvatarPicker";
import ThemeToggle from "@/components/ThemeToggle";
import { avatarOptions, getAvatarById } from "@/lib/avatar-options";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login?from=/profile");
  }

  const user = await currentUser();
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const currentAvatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(currentAvatarId);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email found";

  return (
    <section className="panel p-6">
      <p className="inline-flex rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">
        Profile
      </p>
      <h1 className="mt-3 text-3xl font-black text-[var(--brand-deep)]">Your Account</h1>
      <p className="mt-2 text-[var(--ink-soft)]">Manage your profile details and choose an avatar.</p>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 sm:flex-row sm:items-center">
        <Image
          src={avatar.src}
          alt={`${avatar.name} avatar`}
          width={104}
          height={104}
          className="h-24 w-24 rounded-full border-4 border-[var(--brand)]/20"
        />

        <div>
          <p className="text-lg font-black text-[var(--brand-deep)]">{fullName || "101Hub User"}</p>
          <p className="text-sm text-[var(--ink-soft)]">{email}</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Current avatar: {avatar.name}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <ProfileAvatarPicker initialAvatarId={avatar.id} options={avatarOptions} />
      </div>

      <div className="mt-4">
        <ThemeToggle />
      </div>
    </section>
  );
}

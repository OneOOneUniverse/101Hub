"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AvatarOption } from "@/lib/avatar-options";

type Props = {
  initialAvatarId: string;
  options: AvatarOption[];
};

export default function ProfileAvatarPicker({ initialAvatarId, options }: Readonly<Props>) {
  const router = useRouter();
  const [selectedAvatarId, setSelectedAvatarId] = useState(initialAvatarId);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateAvatar(avatarId: string) {
    setSaved(false);
    setError("");

    startTransition(async () => {
      const previous = selectedAvatarId;
      setSelectedAvatarId(avatarId);

      try {
        const response = await fetch("/api/user/avatar", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatarId }),
        });
        const contentType = response.headers.get("content-type") || "";
        let data: { error?: string };
        if (contentType.includes("application/json")) {
          data = (await response.json()) as { error?: string };
        } else {
          throw new Error("Server returned non-JSON response.");
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Could not update avatar.");
        }

        setSaved(true);
        router.refresh();
      } catch (requestError) {
        setSelectedAvatarId(previous);
        setError(requestError instanceof Error ? requestError.message : "Could not update avatar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--brand-deep)]">Choose your avatar</p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {options.map((option) => {
          const isSelected = option.id === selectedAvatarId;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => updateAvatar(option.id)}
              disabled={isPending}
              className={`rounded-2xl border p-2 transition ${
                isSelected
                  ? "border-[var(--brand)] bg-[var(--brand)]/10"
                  : "border-black/10 bg-white hover:border-[var(--brand)]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label={`Choose ${option.name} avatar`}
              aria-pressed={isSelected}
            >
              <Image
                src={option.src}
                alt={option.name}
                width={64}
                height={64}
                className="mx-auto h-12 w-12 rounded-full"
              />
              <span className="mt-2 block text-xs font-semibold text-[var(--ink-soft)]">{option.name}</span>
            </button>
          );
        })}
      </div>

      {saved ? <p className="text-sm font-semibold text-emerald-700">Avatar updated.</p> : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

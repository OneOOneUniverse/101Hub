"use client";

import { useRef, useState } from "react";

interface ImageUploadButtonProps {
  onUpload: (url: string) => void;
  onUploadAll?: (urls: string[]) => void;
  folder?: string;
  multiple?: boolean;
  label?: string;
}

export default function ImageUploadButton({
  onUpload,
  onUploadAll,
  folder = "products",
  multiple = false,
  label = "Upload",
}: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError("");

    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("folder", folder);

        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body,
        });

        const data = (await response.json()) as { url?: string; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed.");
        }

        if (data.url) {
          uploaded.push(data.url);
        }
      }

      if (onUploadAll) {
        onUploadAll(uploaded);
      } else {
        for (const url of uploaded) {
          onUpload(url);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void handleFiles(event.target.files);
          }
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="whitespace-nowrap rounded-full border border-[var(--brand)] px-3 py-1.5 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Uploading…" : label}
      </button>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

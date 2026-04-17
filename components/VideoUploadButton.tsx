"use client";

import { useRef, useState } from "react";

interface VideoUploadButtonProps {
  onUpload: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function VideoUploadButton({
  onUpload,
  folder = "videos",
  label = "Upload Video",
}: VideoUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    setProgress("Uploading…");

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      body.append("type", "video");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      if (data.url) {
        onUpload(data.url);
        setProgress("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setProgress("");
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
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.[0]) {
            void handleFile(event.target.files[0]);
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
      {progress ? <p className="text-xs font-medium text-[var(--ink-soft)]">{progress}</p> : null}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

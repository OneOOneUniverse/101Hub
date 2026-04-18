"use client";

import { useRef, useState } from "react";

interface VideoUploadButtonProps {
  onUpload: (url: string) => void;
  folder?: string;
  label?: string;
}

type SignatureResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
  apiKey: string;
  resourceType: string;
};

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
      // 1. Get a signed upload token from our server (tiny JSON, no file data)
      const sigResponse = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, resourceType: "video" }),
      });

      if (!sigResponse.ok) {
        const text = await sigResponse.text();
        let message = "Failed to authorise upload.";
        try { message = (JSON.parse(text) as { error?: string }).error ?? message; } catch { /* keep default */ }
        throw new Error(message);
      }

      const sig = (await sigResponse.json()) as SignatureResponse;

      // 2. Upload directly to Cloudinary (no Vercel size limit)
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sig.apiKey);
      body.append("timestamp", String(sig.timestamp));
      body.append("signature", sig.signature);
      body.append("folder", sig.folder);

      const cloudResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
        { method: "POST", body }
      );

      if (!cloudResponse.ok) {
        const errData = (await cloudResponse.json()) as { error?: { message?: string } };
        throw new Error(errData.error?.message ?? "Cloudinary upload failed.");
      }

      const result = (await cloudResponse.json()) as { secure_url: string };
      if (result.secure_url) {
        onUpload(result.secure_url);
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

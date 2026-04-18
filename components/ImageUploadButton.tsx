"use client";

import { useRef, useState } from "react";

interface ImageUploadButtonProps {
  onUpload: (url: string) => void;
  onUploadAll?: (urls: string[]) => void;
  folder?: string;
  multiple?: boolean;
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
      // 1. Get a signed upload token from our server (tiny JSON, no file data)
      const sigResponse = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, resourceType: "image" }),
      });

      if (!sigResponse.ok) {
        const text = await sigResponse.text();
        let message = "Failed to authorise upload.";
        try { message = (JSON.parse(text) as { error?: string }).error ?? message; } catch { /* keep default */ }
        throw new Error(message);
      }

      const sig = (await sigResponse.json()) as SignatureResponse;

      // 2. Upload each file directly to Cloudinary (no Vercel size limit)
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", sig.apiKey);
        body.append("timestamp", String(sig.timestamp));
        body.append("signature", sig.signature);
        body.append("folder", sig.folder);

        const cloudResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: "POST", body }
        );

        if (!cloudResponse.ok) {
          const errData = (await cloudResponse.json()) as { error?: { message?: string } };
          throw new Error(errData.error?.message ?? "Cloudinary upload failed.");
        }

        const result = (await cloudResponse.json()) as { secure_url: string };
        if (result.secure_url) {
          uploaded.push(result.secure_url);
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

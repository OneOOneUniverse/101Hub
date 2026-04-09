"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/site-content-types";

const STORE_CACHE_TTL_MS = 30_000;

let cachedContent: SiteContent | null = null;
let cachedAt = 0;
let pendingContentRequest: Promise<SiteContent> | null = null;

async function loadStoreContent(): Promise<SiteContent> {
  const isFresh = cachedContent && Date.now() - cachedAt < STORE_CACHE_TTL_MS;

  if (isFresh && cachedContent) {
    return cachedContent;
  }

  if (!pendingContentRequest) {
    pendingContentRequest = fetch("/api/store", { cache: "no-store" })
      .then(async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response.");
        }

        const data = (await response.json()) as SiteContent & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Could not load site content.");
        }

        cachedContent = data;
        cachedAt = Date.now();
        return data;
      })
      .finally(() => {
        pendingContentRequest = null;
      });
  }

  return pendingContentRequest;
}

export function useStoreContent() {
  const [content, setContent] = useState<SiteContent | null>(cachedContent);
  const [loading, setLoading] = useState(!cachedContent);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!cachedContent) {
        setLoading(true);
      }
      setError("");

      try {
        const data = await loadStoreContent();

        if (isActive) {
          setContent(data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Could not load site content.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return { content, loading, error };
}
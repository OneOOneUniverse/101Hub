import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Product } from "@/lib/site-content-types";
import { getProductGallery as getGeneratedGallery } from "@/lib/store-data";

const PRODUCT_IMAGE_ROOT = path.join(process.cwd(), "public", "img", "products");
const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function toProductFolderName(product: Product): string {
  const source = product.slug.trim() || product.id.trim();
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "product-unknown";
}

function normalizePublicImagePath(value: string): string {
  const trimmed = value.trim().replace(/\\/g, "/");
  // Absolute URLs (Cloudinary, CDN, etc.) are returned unchanged
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function getProductFolderGallery(product: Product): Promise<string[]> {
  const folderName = toProductFolderName(product);
  const folderPath = path.join(PRODUCT_IMAGE_ROOT, folderName);

  try {
    const files = await fs.readdir(folderPath, { withFileTypes: true });

    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => supportedImageExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }))
      .map((fileName) => `/img/products/${folderName}/${fileName}`);
  } catch {
    return [];
  }
}

export async function getResolvedProductGallery(product: Product, count = 4): Promise<string[]> {
  const configured = (product.images ?? []).map(normalizePublicImagePath);
  const folderImages = await getProductFolderGallery(product);
  const primaryImage = product.image?.trim() ? [normalizePublicImagePath(product.image)] : [];

  const merged = Array.from(new Set([...configured, ...folderImages, ...primaryImage]));

  if (merged.length) {
    return merged;
  }

  return getGeneratedGallery(product, count);
}

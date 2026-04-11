/**
 * Social Media Sharing Utility
 * Generates share URLs and handles sharing for various platforms
 */

export type SocialPlatform = 
  | "whatsapp" 
  | "facebook" 
  | "twitter" 
  | "linkedin" 
  | "telegram"
  | "email";

export interface ShareOptions {
  url: string;
  title: string;
  description?: string;
  price?: string;
  discount?: number;
  imageUrl?: string;
}

/**
 * Format an attractive product share message
 */
export function formatProductShareMessage(options: ShareOptions): string {
  let message = `✨ ${options.title}\n`;
  
  if (options.price) {
    message += `💰 ${options.price}`;
    if (options.discount && options.discount > 0) {
      message += ` (-${options.discount}% OFF)`;
    }
    message += "\n";
  }
  
  if (options.description) {
    message += `\n${options.description}\n`;
  }
  
  message += `\n🛍️ Shop at 101Hub: ${options.url}`;
  return message;
}

/**
 * Generate share URL for WhatsApp
 */
export function getWhatsAppShareUrl(options: ShareOptions): string {
  const message = formatProductShareMessage(options);
  const text = encodeURIComponent(message);
  return `https://wa.me/?text=${text}`;
}

/**
 * Generate share URL for WhatsApp Business
 */
export function getWhatsAppBusinessShareUrl(options: ShareOptions): string {
  return getWhatsAppShareUrl(options);
}

/**
 * Generate share URL for Facebook
 */
export function getFacebookShareUrl(options: ShareOptions): string {
  const params = new URLSearchParams({
    u: options.url,
    quote: `${options.title}${options.price ? ` - ${options.price}` : ''}`,
    hashtag: "#101Hub",
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Generate share URL for Twitter/X
 */
export function getTwitterShareUrl(options: ShareOptions): string {
  const text = `Check out: ${options.title}${options.price ? ` - ${options.price}` : ''}${options.discount ? ` (-${options.discount}% OFF!)` : ''}`;
  const params = new URLSearchParams({
    url: options.url,
    text: text,
    hashtags: "101Hub,shopping,gadgets",
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate share URL for LinkedIn
 */
export function getLinkedInShareUrl(options: ShareOptions): string {
  const description = `${options.title}${options.price ? ` - ${options.price}` : ''}`;
  const params = new URLSearchParams({
    url: options.url,
    title: description,
    summary: options.description || "",
    source: "101Hub",
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Generate share URL for Telegram
 */
export function getTelegramShareUrl(options: ShareOptions): string {
  const message = formatProductShareMessage(options);
  const params = new URLSearchParams({
    url: options.url,
    text: message,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

/**
 * Generate share URL for Email
 */
export function getEmailShareUrl(options: ShareOptions): string {
  const subject = encodeURIComponent(`Check out: ${options.title}${options.price ? ` - ${options.price}` : ''}`);
  const message = formatProductShareMessage(options);
  const body = encodeURIComponent(message);
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Generate share URL for Instagram (opens Instagram app or web)
 * Note: Instagram doesn't support direct URL sharing via web, so we open the app
 */
export function getInstagramShareUrl(options: ShareOptions): string {
  // Instagram doesn't support deep linking with URLs
  // This will open Instagram where users can manually share
  return `instagram://`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  }
}

/**
 * Check if Web Share API is available
 */
export function isWebShareAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * Use native Web Share API if available
 */
export async function nativeShare(options: ShareOptions): Promise<void> {
  if (!isWebShareAvailable()) {
    throw new Error("Web Share API not available");
  }

  await navigator.share({
    title: options.title,
    text: options.description || options.title,
    url: options.url,
  });
}

/**
 * Get all available share platforms
 */
export const shareablePlatforms = [
  {
    id: "whatsapp" as const,
    name: "WhatsApp",
    icon: "💬",
    getUrl: getWhatsAppShareUrl,
  },
  {
    id: "facebook" as const,
    name: "Facebook",
    icon: "f",
    getUrl: getFacebookShareUrl,
  },
  {
    id: "twitter" as const,
    name: "Twitter",
    icon: "𝕏",
    getUrl: getTwitterShareUrl,
  },
  {
    id: "linkedin" as const,
    name: "LinkedIn",
    icon: "in",
    getUrl: getLinkedInShareUrl,
  },
  {
    id: "telegram" as const,
    name: "Telegram",
    icon: "✈",
    getUrl: getTelegramShareUrl,
  },
  {
    id: "email" as const,
    name: "Email",
    icon: "✉",
    getUrl: getEmailShareUrl,
  },
];

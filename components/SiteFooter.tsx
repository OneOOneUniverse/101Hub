"use client";

import Link from "next/link";
import type { FooterContent } from "@/lib/site-content-types";

const socialIcons: Record<
  keyof Omit<FooterContent, "phone" | "email" | "address">,
  { label: string; path: string }
> = {
  facebook: {
    label: "Facebook",
    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  instagram: {
    label: "Instagram",
    path: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5z",
  },
  twitter: {
    label: "X (Twitter)",
    path: "M4 4l16 16M4 20L20 4",
  },
  youtube: {
    label: "YouTube",
    path: "M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM10 15.5V8.5l6 3.5-6 3.5z",
  },
  tiktok: {
    label: "TikTok",
    path: "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5",
  },
  whatsapp: {
    label: "WhatsApp",
    path: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  },
};

type SocialKey = keyof typeof socialIcons;

interface SiteFooterProps {
  storeName: string;
  footerText: string;
  footer?: FooterContent;
}

export default function SiteFooter({ storeName, footerText, footer }: SiteFooterProps) {
  const hasContact = footer?.phone || footer?.email || footer?.address;
  const socialLinks = footer
    ? (Object.keys(socialIcons) as SocialKey[]).filter((key) => !!footer[key])
    : [];
  const hasSocial = socialLinks.length > 0;

  return (
    <footer className="mt-auto border-t border-black/10 bg-[var(--surface)] pb-8 pt-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-5">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand column */}
          <div className="space-y-3">
            <p className="text-base font-black text-[var(--brand-deep)]">{storeName}</p>
            <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{footerText}</p>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--brand-deep)]">Shop</p>
            <nav className="flex flex-col gap-1.5">
              {[
                { href: "/products", label: "All Products" },
                { href: "/services", label: "Services" },
                { href: "/flash-sale", label: "Flash Sale" },
                { href: "/orders", label: "My Orders" },
                { href: "/wishlist", label: "Wishlist" },
                { href: "/faqs", label: "FAQs" },
                { href: "/app", label: "Download App" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact & Social */}
          {(hasContact || hasSocial) && (
            <div className="space-y-4">
              {hasContact && (
                <div className="space-y-2">
                  <p className="text-sm font-bold uppercase tracking-wider text-[var(--brand-deep)]">Contact</p>
                  {footer?.phone && (
                    <a
                      href={`tel:${footer.phone}`}
                      className="flex items-center gap-2 text-sm text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.1 12 19.79 19.79 0 0 1 1.07 3.3 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                      </svg>
                      {footer.phone}
                    </a>
                  )}
                  {footer?.email && (
                    <a
                      href={`mailto:${footer.email}`}
                      className="flex items-center gap-2 text-sm text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {footer.email}
                    </a>
                  )}
                  {footer?.address && (
                    <p className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 shrink-0" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {footer.address}
                    </p>
                  )}
                </div>
              )}

              {hasSocial && (
                <div className="space-y-2">
                  <p className="text-sm font-bold uppercase tracking-wider text-[var(--brand-deep)]">Follow Us</p>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.map((key) => {
                      const { label, path } = socialIcons[key];
                      const href = footer![key]!;
                      const url = href.startsWith("http") ? href : `https://${href}`;
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="flex items-center justify-center w-9 h-9 rounded-full border border-black/10 bg-white text-[var(--ink-soft)] shadow-sm transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                          </svg>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Community Banner */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#25d366]/10 to-[#128c7e]/10 border border-[#25d366]/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#25d366] text-white flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--brand-deep)]">Join Our WhatsApp Community</p>
              <p className="text-xs text-[var(--ink-soft)]">Get exclusive deals, flash sales & updates first!</p>
            </div>
          </div>
          <a
            href="https://chat.whatsapp.com/L64bsLjQdtz5K0PdyeILR1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#128c7e] active:scale-95"
          >
            Join Group
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </a>
        </div>

        <div className="mt-6 border-t border-black/10 pt-5 text-center text-xs text-[var(--ink-soft)]">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

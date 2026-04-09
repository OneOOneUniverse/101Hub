"use client";

import { useEffect, useMemo, useState } from "react";
import {
  productCategories,
  type HighlightCard,
  type Product,
  type PromoSlide,
  type ServicePackage,
  type SiteContent,
  type SiteFeatures,
} from "@/lib/site-content-types";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";
import ActiveOrdersDashboard from "@/components/ActiveOrdersDashboard";
import ImageUploadButton from "@/components/ImageUploadButton";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function createProduct(): Product {
  const id = createId("product");

  return {
    id,
    slug: id,
    name: "",
    category: productCategories[0],
    description: "",
    price: 0,
    stock: 0,
    rating: 4,
    badge: "",
    image: "",
    images: [],
  };
}

function parseLinesToImagePaths(value: string): string[] {
  return value
    .split(/\r?\n|\\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createService(): ServicePackage {
  return {
    id: createId("service"),
    name: "",
    turnaround: "Same day",
    price: 0,
    details: "",
    image: "",
  };
}

function createSlide(): PromoSlide {
  return {
    id: createId("promo"),
    src: "/promo-1.svg",
    alt: "Promotional banner",
    title: "",
    subtitle: "",
  };
}

function createHighlight(): HighlightCard {
  return {
    id: createId("highlight"),
    title: "",
    description: "",
  };
}

function isoToDateTimeLocal(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="space-y-1">
      <span className="block text-sm font-semibold text-[var(--brand-deep)]">{label}</span>
      {children}
    </label>
  );
}

function inputClassName(multiline = false) {
  return multiline
    ? "min-h-28 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--brand)]"
    : "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--brand)]";
}

function Section({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="panel space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--brand-deep)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

type AdminSectionId =
  | "dashboard"
  | "features"
  | "store"
  | "homepage"
  | "promo"
  | "flash"
  | "products"
  | "services"
  | "sms";

const adminSections: Array<{ id: AdminSectionId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "features", label: "Features" },
  { id: "store", label: "Store Basics" },
  { id: "homepage", label: "Homepage" },
  { id: "promo", label: "Promo Slider" },
  { id: "flash", label: "Flash Sale" },
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "sms", label: "Broadcast SMS" },
];

export default function AdminPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSectionId>("dashboard");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success?: string; error?: string } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!content) {
      return [] as Array<{ product: Product; index: number }>;
    }

    const term = productSearch.trim().toLowerCase();

    return content.products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => {
        if (!term) {
          return true;
        }

        return `${product.id} ${product.slug} ${product.name} ${product.category}`
          .toLowerCase()
          .includes(term);
      });
  }, [content, productSearch]);

  useEffect(() => {
    void loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/content", { cache: "no-store" });
      const data = (await response.json()) as SiteContent & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not load admin content.");
      }

      setContent(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load admin content.");
    } finally {
      setLoading(false);
    }
  }

  function updateFeatures(feature: keyof SiteFeatures, value: boolean) {
    setContent((current) =>
      current
        ? {
            ...current,
            features: {
              ...current.features,
              [feature]: value,
            },
          }
        : current
    );
    setMessage("");
  }

  async function sendSms() {
    const msg = smsMessage.trim();
    if (!msg) return;
    setSmsSending(true);
    setSmsResult(null);
    try {
      const response = await fetch("/api/admin/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        total?: number;
        sent?: number;
        failed?: number;
        error?: string;
      };
      if (!response.ok) {
        setSmsResult({ error: data.error ?? "SMS send failed." });
      } else {
        setSmsResult({
          success: `Sent to ${data.sent ?? 0} of ${data.total ?? 0} customers.${
            (data.failed ?? 0) > 0 ? ` ${data.failed} failed.` : ""
          }`,
        });
        setSmsMessage("");
      }
    } catch {
      setSmsResult({ error: "Network error — could not reach the server." });
    } finally {
      setSmsSending(false);
    }
  }

  async function saveContent() {
    if (!content) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(content),
      });

      const data = (await response.json()) as SiteContent & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not save changes.");
      }

      setContent(data);
      setMessage("Changes saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel p-6">
        <h1 className="text-3xl font-black text-[var(--brand-deep)]">Admin</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Loading content editor...</p>
      </section>
    );
  }

  if (!content) {
    return (
      <section className="panel p-6">
        <h1 className="text-3xl font-black text-[var(--brand-deep)]">Admin</h1>
        <p className="mt-2 text-red-600">{error || "No content available."}</p>
        <button
          type="button"
          onClick={() => void loadContent()}
          className="mt-4 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">
              Admin Console
            </p>
            <h1 className="mt-3 text-3xl font-black text-[var(--brand-deep)]">Manage Website Content</h1>
            <p className="mt-2 max-w-3xl text-[var(--ink-soft)]">
              Control site features and manage editable content for the homepage, promotions,
              flash sale, products, and services.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Last saved: {new Date(content.updatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadContent()}
              className="rounded-full border border-[var(--brand)] px-5 py-2.5 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void saveContent()}
              disabled={saving}
              className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>

      <section className="panel p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {adminSections.map((item) => {
            const isActive = item.id === activeSection;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--brand)] text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeSection === "dashboard" ? (
        <>
          <PendingPaymentsDashboard />

          <ActiveOrdersDashboard />
        </>
      ) : null}

      {activeSection === "features" ? (
        <Section
          title="Feature Switches"
          description="Turn key site experiences on or off without editing code."
        >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(content.features).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-bold capitalize text-[var(--brand-deep)]">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {value ? "Currently enabled" : "Currently disabled"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={value}
                onChange={(event) => updateFeatures(key as keyof SiteFeatures, event.target.checked)}
                className="h-5 w-5 accent-[var(--brand)]"
              />
            </label>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "store" ? (
        <Section title="Store Basics" description="Update shared branding and footer copy.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Store name">
            <input
              value={content.storeName}
              onChange={(event) => setContent({ ...content, storeName: event.target.value })}
              className={inputClassName()}
            />
          </Field>
          <Field label="Store description">
            <input
              value={content.storeDescription}
              onChange={(event) => setContent({ ...content, storeDescription: event.target.value })}
              className={inputClassName()}
            />
          </Field>
        </div>

        <Field label="Footer text">
          <textarea
            value={content.footerText}
            onChange={(event) => setContent({ ...content, footerText: event.target.value })}
            className={inputClassName(true)}
          />
        </Field>

        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-bold text-[var(--brand-deep)]">Navbar Logo</p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              Recommended size: <strong>200 × 50 px</strong> (max 400 × 100 px) · PNG or WebP with transparent background · Aspect ratio 3:1 to 5:1 for best results · Min height 40 px.
            </p>
          </div>

          {content.logoUrl ? (
            <div className="flex items-center gap-4 rounded-xl border border-black/10 bg-[var(--surface)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.logoUrl}
                alt="Current navbar logo"
                className="h-10 w-auto max-w-[180px] object-contain"
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-[var(--ink-soft)] break-all">{content.logoUrl}</p>
                <div className="flex gap-2">
                  <ImageUploadButton
                    folder="logo"
                    label="Replace logo"
                    onUpload={(url) => setContent({ ...content, logoUrl: url })}
                  />
                  <button
                    type="button"
                    onClick={() => setContent({ ...content, logoUrl: "" })}
                    className="whitespace-nowrap rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--ink-soft)]">No custom logo uploaded — the site name text is shown in the navbar.</p>
              <ImageUploadButton
                folder="logo"
                label="Upload logo"
                onUpload={(url) => setContent({ ...content, logoUrl: url })}
              />
            </div>
          )}
        </div>
        </Section>
      ) : null}

      {activeSection === "homepage" ? (
        <Section title="Homepage" description="Edit the hero and supporting highlight cards.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Badge">
            <input
              value={content.home.badge}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, badge: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Hero title">
            <input
              value={content.home.title}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, title: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
        </div>

        <Field label="Hero description">
          <textarea
            value={content.home.description}
            onChange={(event) =>
              setContent({
                ...content,
                home: { ...content.home, description: event.target.value },
              })
            }
            className={inputClassName(true)}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Primary CTA label">
            <input
              value={content.home.primaryCtaLabel}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, primaryCtaLabel: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Primary CTA href">
            <input
              value={content.home.primaryCtaHref}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, primaryCtaHref: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Secondary CTA label">
            <input
              value={content.home.secondaryCtaLabel}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, secondaryCtaLabel: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Secondary CTA href">
            <input
              value={content.home.secondaryCtaHref}
              onChange={(event) =>
                setContent({
                  ...content,
                  home: { ...content.home, secondaryCtaHref: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[var(--brand-deep)]">Highlight Cards</h3>
            <button
              type="button"
              onClick={() =>
                setContent({
                  ...content,
                  home: {
                    ...content.home,
                    highlights: [...content.home.highlights, createHighlight()],
                  },
                })
              }
              className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
            >
              Add Highlight
            </button>
          </div>

          {content.home.highlights.map((highlight, index) => (
            <article key={`${highlight.id}-${index}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <Field label="Title">
                  <input
                    value={highlight.title}
                    onChange={(event) => {
                      const highlights = [...content.home.highlights];
                      highlights[index] = { ...highlight, title: event.target.value };
                      setContent({ ...content, home: { ...content.home, highlights } });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Description">
                  <input
                    value={highlight.description}
                    onChange={(event) => {
                      const highlights = [...content.home.highlights];
                      highlights[index] = { ...highlight, description: event.target.value };
                      setContent({ ...content, home: { ...content.home, highlights } });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const highlights = [...content.home.highlights];
                      highlights.splice(index, 1);
                      setContent({
                        ...content,
                        home: {
                          ...content.home,
                          highlights,
                        },
                      });
                    }}
                    className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "promo" ? (
        <Section title="Promo Slider" description="Manage the rotating banners displayed above the page content.">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setContent({ ...content, promoSlides: [...content.promoSlides, createSlide()] })}
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
          >
            Add Promo Slide
          </button>
        </div>

        <div className="space-y-3">
          {content.promoSlides.map((slide, index) => (
            <article key={`${slide.id}-${index}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Slide id">
                  <input
                    value={slide.id}
                    onChange={(event) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, id: event.target.value };
                      setContent({ ...content, promoSlides });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Image path">
                  <input
                    value={slide.src}
                    onChange={(event) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, src: event.target.value };
                      setContent({ ...content, promoSlides });
                    }}
                    className={inputClassName()}
                  />
                  <ImageUploadButton
                    folder="promo-slides"
                    onUpload={(url) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, src: url };
                      setContent({ ...content, promoSlides });
                    }}
                    label="Upload Image"
                  />
                </Field>
                <Field label="Alt text">
                  <input
                    value={slide.alt}
                    onChange={(event) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, alt: event.target.value };
                      setContent({ ...content, promoSlides });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Title">
                  <input
                    value={slide.title}
                    onChange={(event) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, title: event.target.value };
                      setContent({ ...content, promoSlides });
                    }}
                    className={inputClassName()}
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <Field label="Subtitle">
                  <textarea
                    value={slide.subtitle}
                    onChange={(event) => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides[index] = { ...slide, subtitle: event.target.value };
                      setContent({ ...content, promoSlides });
                    }}
                    className={inputClassName(true)}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const promoSlides = [...content.promoSlides];
                      promoSlides.splice(index, 1);
                      setContent({
                        ...content,
                        promoSlides,
                      });
                    }}
                    className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "flash" ? (
        <Section title="Flash Sale" description="Edit the banner, page copy, sale window, and featured products.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Duration in hours">
            <input
              type="number"
              min={1}
              value={content.flashSale.durationHours}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: {
                    ...content.flashSale,
                    durationHours: Number(event.target.value || 1),
                  },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Timer end date/time (optional)">
            <input
              type="datetime-local"
              value={isoToDateTimeLocal(content.flashSale.endsAt)}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: {
                    ...content.flashSale,
                    endsAt: dateTimeLocalToIso(event.target.value),
                  },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Discount percentage">
            <input
              type="number"
              min={1}
              max={95}
              value={content.flashSale.discountPercentage}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: {
                    ...content.flashSale,
                    discountPercentage: Number(event.target.value || 1),
                  },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Banner eyebrow">
            <input
              value={content.flashSale.bannerEyebrow}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, bannerEyebrow: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Page eyebrow">
            <input
              value={content.flashSale.pageEyebrow}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, pageEyebrow: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Banner title">
            <input
              value={content.flashSale.bannerTitle}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, bannerTitle: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Page title">
            <input
              value={content.flashSale.pageTitle}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, pageTitle: event.target.value },
                })
              }
              className={inputClassName()}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Banner description">
            <textarea
              value={content.flashSale.bannerDescription}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, bannerDescription: event.target.value },
                })
              }
              className={inputClassName(true)}
            />
          </Field>
          <Field label="Page description">
            <textarea
              value={content.flashSale.pageDescription}
              onChange={(event) =>
                setContent({
                  ...content,
                  flashSale: { ...content.flashSale, pageDescription: event.target.value },
                })
              }
              className={inputClassName(true)}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-black text-[var(--brand-deep)]">Featured Products</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {content.products.map((product, index) => {
              const checked = content.flashSale.featuredProductIds.includes(product.id);

              return (
                <label
                  key={`${product.id}-${index}`}
                  className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const featuredProductIds = event.target.checked
                        ? [...content.flashSale.featuredProductIds, product.id]
                        : content.flashSale.featuredProductIds.filter((id) => id !== product.id);

                      setContent({
                        ...content,
                        flashSale: { ...content.flashSale, featuredProductIds },
                      });
                    }}
                    className="mt-1 h-4 w-4 accent-[var(--brand)]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[var(--brand-deep)]">{product.name}</p>
                    <p className="text-xs text-[var(--ink-soft)]">{product.category}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        </Section>
      ) : null}

      {activeSection === "products" ? (
        <Section title="Products" description="Add, edit, or remove storefront products.">
        <div className="mb-4 flex justify-start">
          <button
            type="button"
            onClick={() => setContent({ ...content, products: [createProduct(), ...content.products] })}
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
          >
            Add Product
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:min-w-72 lg:max-w-xl">
            <Field label="Find product by name, id, or slug">
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search product in admin list"
                className={inputClassName()}
              />
            </Field>
          </div>
        </div>

        <p className="text-sm text-[var(--ink-soft)]">
          Showing {filteredProducts.length} of {content.products.length} products.
        </p>

        <div className="space-y-4">
          {filteredProducts.map(({ product, index }) => (
            <article key={`${product.id}-${index}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <Field label="Product id">
                  <input
                    value={product.id}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, id: event.target.value };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={product.slug}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, slug: event.target.value };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={product.name}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, name: event.target.value };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={product.category}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = {
                        ...product,
                        category: event.target.value as Product["category"],
                      };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  >
                    {productCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Badge">
                  <input
                    value={product.badge ?? ""}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, badge: event.target.value };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Image URL or path">
                  <input
                    value={product.image ?? ""}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, image: event.target.value };
                      setContent({ ...content, products });
                    }}
                    placeholder="/products/phone.jpg or https://..."
                    className={inputClassName()}
                  />
                  <ImageUploadButton
                    folder={`products/${product.slug || product.id}`}
                    onUpload={(url) => {
                      const products = [...content.products];
                      products[index] = { ...product, image: url };
                      setContent({ ...content, products });
                    }}
                    label="Upload Image"
                  />
                </Field>
                <Field label="Price">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={product.price}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, price: Number(event.target.value || 0) };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Stock">
                  <input
                    type="number"
                    min={0}
                    value={product.stock}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, stock: Number(event.target.value || 0) };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Rating">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={product.rating}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, rating: Number(event.target.value || 0) };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                <Field label="Description">
                  <textarea
                    value={product.description}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = { ...product, description: event.target.value };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName(true)}
                  />
                </Field>
                <Field label="Gallery image paths (one per line)">
                  <textarea
                    value={(product.images ?? []).join("\n")}
                    onChange={(event) => {
                      const products = [...content.products];
                      products[index] = {
                        ...product,
                        images: parseLinesToImagePaths(event.target.value),
                      };
                      setContent({ ...content, products });
                    }}
                    placeholder="/img/products/my-product/1.jpg\n/img/products/my-product/2.jpg"
                    className={inputClassName(true)}
                  />
                  <ImageUploadButton
                    folder={`products/${product.slug || product.id}`}
                    multiple
                    onUpload={(url) => {
                      const products = [...content.products];
                      const existing = products[index].images ?? [];
                      products[index] = { ...products[index], images: [...existing, url] };
                      setContent({ ...content, products });
                    }}
                    label="Upload Gallery Image(s)"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const nextProducts = [...content.products];
                      nextProducts.splice(index, 1);
                      const featuredProductIds = content.flashSale.featuredProductIds.filter(
                        (id) => id !== product.id
                      );

                      setContent({
                        ...content,
                        products: nextProducts,
                        flashSale: { ...content.flashSale, featuredProductIds },
                      });
                    }}
                    className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "services" ? (
        <Section title="Services" description="Manage the service packages shown on the services page.">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setContent({ ...content, services: [...content.services, createService()] })}
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
          >
            Add Service
          </button>
        </div>

        <div className="space-y-4">
          {content.services.map((service, index) => (
            <article key={`${service.id}-${index}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <Field label="Service id">
                  <input
                    value={service.id}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, id: event.target.value };
                      setContent({ ...content, services });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={service.name}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, name: event.target.value };
                      setContent({ ...content, services });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Turnaround">
                  <input
                    value={service.turnaround}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, turnaround: event.target.value };
                      setContent({ ...content, services });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Price">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={service.price}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, price: Number(event.target.value || 0) };
                      setContent({ ...content, services });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Image URL or path">
                  <input
                    value={service.image ?? ""}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, image: event.target.value };
                      setContent({ ...content, services });
                    }}
                    placeholder="/services/setup.jpg or https://..."
                    className={inputClassName()}
                  />
                  <ImageUploadButton
                    folder="services"
                    onUpload={(url) => {
                      const services = [...content.services];
                      services[index] = { ...service, image: url };
                      setContent({ ...content, services });
                    }}
                    label="Upload Image"
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                <Field label="Details">
                  <textarea
                    value={service.details}
                    onChange={(event) => {
                      const services = [...content.services];
                      services[index] = { ...service, details: event.target.value };
                      setContent({ ...content, services });
                    }}
                    className={inputClassName(true)}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const services = [...content.services];
                      services.splice(index, 1);
                      setContent({
                        ...content,
                        services,
                      });
                    }}
                    className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "sms" ? (
        <Section
          title="Broadcast SMS"
          description="Send a text message to every customer who has placed an order. Uses Africa&#39;s Talking — make sure AFRICASTALKING_API_KEY is set in .env.local."
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="block text-sm font-semibold text-[var(--brand-deep)]">Message</span>
                <span
                  className={`text-xs font-semibold ${
                    smsMessage.length > 160 ? "text-red-600" : "text-[var(--ink-soft)]"
                  }`}
                >
                  {smsMessage.length} / 160
                </span>
              </div>
              <textarea
                value={smsMessage}
                onChange={(event) => {
                  setSmsMessage(event.target.value);
                  setSmsResult(null);
                }}
                maxLength={160}
                rows={4}
                placeholder="Type your SMS broadcast message here…"
                className="min-h-28 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void sendSms()}
                disabled={smsSending || smsMessage.trim().length === 0 || smsMessage.length > 160}
                className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {smsSending ? "Sending…" : "Send to All Customers"}
              </button>
              <p className="text-xs text-[var(--ink-soft)]">
                Recipients are pulled from all orders with a recorded phone number.
              </p>
            </div>

            {smsResult?.success ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {smsResult.success}
              </p>
            ) : null}
            {smsResult?.error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {smsResult.error}
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
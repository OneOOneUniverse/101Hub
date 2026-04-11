"use client";

import { useEffect, useMemo, useState } from "react";
import { TruckIcon } from "@/components/Icons";
import {
  defaultProductCategories,
  getProductCategories,
  type Category,
  type CategoryFeature,
  type DeliverySettings,
  type DeliveryType,
  type FooterContent,
  type LocationDeliveryFee,
  type PaymentSettings,
  type Product,
  type PromoSlide,
  type ServicePackage,
  type SiteContent,
  type SiteFeatures,
  type HighlightCard,
  type PaymentWalkthroughStep,
} from "@/lib/site-content-types";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";
import ActiveOrdersDashboard from "@/components/ActiveOrdersDashboard";
import ServiceRequestsDashboard from "@/components/ServiceRequestsDashboard";
import ImageUploadButton from "@/components/ImageUploadButton";
import GalleryImageManager from "@/components/GalleryImageManager";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  defaultFee: 15,
  freeDeliveryItemThreshold: 5,
  locationFees: [],
  deliveryTypes: [],
  processingFee: 4,
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  paystackEnabled: true,
  manualEnabled: true,
};

function withDeliveryDefaults(data: SiteContent): SiteContent {
  return {
    ...data,
    deliverySettings: data.deliverySettings ?? DEFAULT_DELIVERY_SETTINGS,
    paymentSettings: data.paymentSettings ?? DEFAULT_PAYMENT_SETTINGS,
  };
}

function createProduct(): Product {
  const id = createId("product");

  return {
    id,
    slug: id,
    name: "",
    category: defaultProductCategories[0],
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
    images: [],
  };
}

function createPaymentWalkthroughStep(): PaymentWalkthroughStep {
  return {
    id: createId("step"),
    stepNumber: 1,
    title: "",
    description: "",
    bulletPoints: [],
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

function createCategoryFeature(): CategoryFeature {
  return {
    id: createId("feat"),
    name: "",
    description: "",
  };
}

function createCategory(): Category {
  return {
    id: createId("cat"),
    name: "",
    description: "",
    features: [],
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
  | "categories"
  | "delivery"
  | "payments"
  | "services"
  | "payment-walkthrough"
  | "footer"
  | "sms";

const adminSections: Array<{ id: AdminSectionId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "features", label: "Features" },
  { id: "store", label: "Store Basics" },
  { id: "homepage", label: "Homepage" },
  { id: "promo", label: "Promo Slider" },
  { id: "flash", label: "Flash Sale" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "delivery", label: "Delivery" },
  { id: "payments", label: "Payments" },
  { id: "services", label: "Services" },
  { id: "payment-walkthrough", label: "Payment Walkthrough" },
  { id: "footer", label: "Footer" },
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  function toggleProduct(id: string) {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

      setContent(withDeliveryDefaults(data));
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

      setContent(withDeliveryDefaults(data));
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

          <ServiceRequestsDashboard />
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

              <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
                <h3 className="text-sm font-semibold text-[var(--brand-deep)]">Offer/Event Configuration (Optional)</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Event/Offer Name">
                    <input
                      value={slide.eventName ?? ""}
                      onChange={(event) => {
                        const promoSlides = [...content.promoSlides];
                        promoSlides[index] = { ...slide, eventName: event.target.value || undefined };
                        setContent({ ...content, promoSlides });
                      }}
                      placeholder="e.g., Summer Sale, Black Friday"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Link To">
                    <select
                      value={
                        slide.actionUrl === "" ||
                        slide.actionUrl === "/flash-sale" ||
                        slide.actionUrl === "/products" ||
                        slide.actionUrl === "/services" ||
                        slide.actionUrl === "/wishlist" ||
                        slide.actionUrl === "/cart"
                          ? slide.actionUrl ?? ""
                          : slide.actionUrl
                          ? "custom"
                          : ""
                      }
                      onChange={(event) => {
                        const promoSlides = [...content.promoSlides];
                        if (event.target.value === "custom") {
                          // Keep current custom URL or show input
                          promoSlides[index] = { ...slide, actionUrl: slide.actionUrl };
                        } else {
                          promoSlides[index] = { ...slide, actionUrl: event.target.value || undefined };
                        }
                        setContent({ ...content, promoSlides });
                      }}
                      className={inputClassName()}
                    >
                      <option value="">-- No Link --</option>
                      <option value="/flash-sale">Flash Sale</option>
                      <option value="/products">All Products</option>
                      <option value="/services">Services</option>
                      <option value="/wishlist">Wishlist</option>
                      <option value="/cart">Shopping Cart</option>
                      <option value="custom">Custom URL...</option>
                    </select>
                  </Field>
                </div>

                {slide.actionUrl &&
                  slide.actionUrl !== "/flash-sale" &&
                  slide.actionUrl !== "/products" &&
                  slide.actionUrl !== "/services" &&
                  slide.actionUrl !== "/wishlist" &&
                  slide.actionUrl !== "/cart" && (
                    <Field label="Custom URL">
                      <input
                        type="text"
                        value={slide.actionUrl}
                        onChange={(event) => {
                          const promoSlides = [...content.promoSlides];
                          promoSlides[index] = { ...slide, actionUrl: event.target.value || undefined };
                          setContent({ ...content, promoSlides });
                        }}
                        placeholder="e.g., https://example.com or /custom-path"
                        className={inputClassName()}
                      />
                    </Field>
                  )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Start Date (Optional)">
                    <input
                      type="datetime-local"
                      value={isoToDateTimeLocal(slide.startDate)}
                      onChange={(event) => {
                        const promoSlides = [...content.promoSlides];
                        promoSlides[index] = {
                          ...slide,
                          startDate: dateTimeLocalToIso(event.target.value),
                        };
                        setContent({ ...content, promoSlides });
                      }}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="End Date (Optional)">
                    <input
                      type="datetime-local"
                      value={isoToDateTimeLocal(slide.endDate)}
                      onChange={(event) => {
                        const promoSlides = [...content.promoSlides];
                        promoSlides[index] = {
                          ...slide,
                          endDate: dateTimeLocalToIso(event.target.value),
                        };
                        setContent({ ...content, promoSlides });
                      }}
                      className={inputClassName()}
                    />
                  </Field>
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
            onClick={() => {
            const newProduct = createProduct();
            setContent({ ...content, products: [newProduct, ...content.products] });
            setExpandedProducts((prev) => new Set([...prev, newProduct.id]));
          }}
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
          {filteredProducts.map(({ product, index }) => {
            const isExpanded = expandedProducts.has(product.id);
            return (
            <article key={`${product.id}-${index}`} className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[var(--brand)]/5 transition-colors"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-bold text-[var(--brand-deep)] truncate">
                    {product.name || <span className="text-[var(--ink-soft)] font-normal italic">Unnamed product</span>}
                  </span>
                  {product.category ? (
                    <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-deep)]">
                      {product.category}
                    </span>
                  ) : null}
                  {product.price > 0 ? (
                    <span className="text-sm text-[var(--ink-soft)]">GHS {product.price.toLocaleString()}</span>
                  ) : null}
                  {product.stock === 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>
                  ) : (
                    <span className="text-xs text-[var(--ink-soft)]">Stock: {product.stock}</span>
                  )}
                </div>
                <span className="shrink-0 text-[var(--brand-deep)] text-lg" aria-hidden>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded ? (
              <div className="border-t border-black/10 p-4">
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
                        category: event.target.value,
                      };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  >
                    {getProductCategories(content.categories).map((category) => (
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
                <Field label="Discount % (optional)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={product.discount ?? ""}
                    placeholder="Leave empty for no discount"
                    onChange={(event) => {
                      const products = [...content.products];
                      const discountValue = event.target.value ? Number(event.target.value) : undefined;
                      products[index] = { ...product, discount: discountValue };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                  {product.discount ? (
                    <p className="mt-1 text-xs text-green-700">
                      🏷️ Sale price: GHS {(product.price * ((100 - product.discount) / 100)).toFixed(2)} (saves GHS {(product.price * (product.discount / 100)).toFixed(2)})
                    </p>
                  ) : null}
                </Field>
                <Field label="Delivery Fee (GHS, optional)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={product.deliveryFee ?? ""}
                    placeholder="Leave empty to use location/default fee"
                    disabled={product.noDeliveryFee === true}
                    onChange={(event) => {
                      const products = [...content.products];
                      const feeValue = event.target.value ? Number(event.target.value) : undefined;
                      products[index] = { ...product, deliveryFee: feeValue };
                      setContent({ ...content, products });
                    }}
                    className={inputClassName()}
                  />
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    Per-product delivery charge. Overrides location fee for this product.
                  </p>
                </Field>
                <div className="flex flex-col justify-start gap-2 pt-1">
                  <span className="text-sm font-semibold text-[var(--brand-deep)]">No Delivery Fee</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={product.noDeliveryFee === true}
                      onChange={(event) => {
                        const products = [...content.products];
                        products[index] = {
                          ...product,
                          noDeliveryFee: event.target.checked || undefined,
                          deliveryFee: event.target.checked ? undefined : product.deliveryFee,
                        };
                        setContent({ ...content, products });
                      }}
                      className="h-4 w-4 accent-[var(--brand)]"
                    />
                    <span className="text-sm text-[var(--ink)]">Free delivery for this product</span>
                  </label>
                  {product.noDeliveryFee && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><TruckIcon size={14} /> This product ships for free</p>
                  )}
                </div>
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
                <div className="lg:col-span-2">
                  <GalleryImageManager
                    images={product.images ?? []}
                    onChange={(newImages) => {
                      const products = [...content.products];
                      products[index] = { ...product, images: newImages };
                      setContent({ ...content, products });
                    }}
                    productId={product.id}
                    productSlug={product.slug}
                    label="Product Gallery Images (Variation/Detail Images) 🖼️"
                  />
                </div>
              </div>

              <div className="flex items-end mt-4">
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
              ) : null}
            </article>
            );
          })}
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

              <div className="mt-4">
                <GalleryImageManager
                  images={service.images ?? []}
                  onChange={(newImages) => {
                    const services = [...content.services];
                    services[index] = { ...service, images: newImages };
                    setContent({ ...content, services });
                  }}
                  productId={service.id}
                  productSlug={service.id}
                  label="Service Gallery Images (Additional Photos) 🖼️"
                />
              </div>

              <div className="mt-4 border-t border-black/10 pt-4">
                <h4 className="mb-4 text-sm font-bold text-[var(--ink-soft)]">Provider Contact Details</h4>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  <Field label="Provider Name">
                    <input
                      value={service.providerName ?? ""}
                      onChange={(event) => {
                        const services = [...content.services];
                        services[index] = { ...service, providerName: event.target.value };
                        setContent({ ...content, services });
                      }}
                      placeholder="e.g., Tech Expert"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={service.phone ?? ""}
                      onChange={(event) => {
                        const services = [...content.services];
                        services[index] = { ...service, phone: event.target.value };
                        setContent({ ...content, services });
                      }}
                      placeholder="+233 548656980"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={service.email ?? ""}
                      onChange={(event) => {
                        const services = [...content.services];
                        services[index] = { ...service, email: event.target.value };
                        setContent({ ...content, services });
                      }}
                      placeholder="contact@101hub.com"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Current Offers">
                    <input
                      value={service.currentOffers ?? ""}
                      onChange={(event) => {
                        const services = [...content.services];
                        services[index] = { ...service, currentOffers: event.target.value };
                        setContent({ ...content, services });
                      }}
                      placeholder="e.g., Free optimization"
                      className={inputClassName()}
                    />
                  </Field>
                </div>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "payment-walkthrough" ? (
        <Section title="Manual Payment Walkthrough" description="Edit the step-by-step instructions shown to customers during checkout for manual payments. Add images to demonstrate each step.">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const walkthrough = content.paymentWalkthrough ?? [];
              const newStep = createPaymentWalkthroughStep();
              newStep.stepNumber = (walkthrough.length ?? 0) + 1;
              setContent({ ...content, paymentWalkthrough: [...walkthrough, newStep] });
            }}
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
          >
            Add Step
          </button>
        </div>

        <div className="space-y-4">
          {(content.paymentWalkthrough ?? []).map((step, index) => (
            <article key={`${step.id}-${index}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Step Number">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={step.stepNumber}
                    onChange={(event) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { ...step, stepNumber: Number(event.target.value || 1) };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Title">
                  <input
                    value={step.title}
                    onChange={(event) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { ...step, title: event.target.value };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    placeholder="e.g., Open Your Mobile Money App"
                    className={inputClassName()}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Description">
                  <textarea
                    value={step.description}
                    onChange={(event) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { ...step, description: event.target.value };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    placeholder="Detailed description of this step..."
                    className={inputClassName(true)}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Bullet Points (one per line)">
                  <textarea
                    value={(step.bulletPoints ?? []).join("\n")}
                    onChange={(event) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { 
                        ...step, 
                        bulletPoints: parseLinesToImagePaths(event.target.value) 
                      };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    placeholder="Line 1&#10;Line 2&#10;Line 3..."
                    className={inputClassName(true)}
                  />
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">Each line becomes a bullet point</p>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Step Image (Screenshot/Demo)">
                  <input
                    value={step.image ?? ""}
                    onChange={(event) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { ...step, image: event.target.value };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    placeholder="/payment-walkthrough/step-1.jpg or https://..."
                    className={inputClassName()}
                  />
                  <ImageUploadButton
                    folder="payment-walkthrough"
                    onUpload={(url) => {
                      const walkthrough = [...(content.paymentWalkthrough ?? [])];
                      walkthrough[index] = { ...step, image: url };
                      setContent({ ...content, paymentWalkthrough: walkthrough });
                    }}
                    label="Upload Image"
                  />
                  {step.image && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">Preview:</p>
                      <img 
                        src={step.image} 
                        alt={step.title}
                        className="h-48 max-w-full rounded-lg border border-black/10 object-cover"
                      />
                    </div>
                  )}
                </Field>
              </div>

              <div className="mt-4 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const walkthrough = [...(content.paymentWalkthrough ?? [])];
                    walkthrough.splice(index, 1);
                    setContent({
                      ...content,
                      paymentWalkthrough: walkthrough,
                    });
                  }}
                  className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  Remove Step
                </button>
              </div>
            </article>
          ))}
        </div>
        </Section>
      ) : null}

      {activeSection === "categories" ? (
        <Section title="Categories & Features" description="Manage product categories and their associated features.">

          {/* "All" category card image */}
          <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[var(--brand-deep)] mb-3">"All" Category Card Image</p>
            <Field label="Background image shown on the All products card">
              <div className="flex flex-col gap-1.5">
                {content.allCategoryImage ? (
                  <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[var(--surface)] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={content.allCategoryImage} alt="All category" className="h-12 w-16 rounded-lg object-cover border border-black/10" />
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-xs text-[var(--ink-soft)] truncate">{content.allCategoryImage}</p>
                      <div className="flex gap-2">
                        <ImageUploadButton
                          folder="categories"
                          label="Replace"
                          onUpload={(url) => setContent({ ...content, allCategoryImage: url })}
                        />
                        <button
                          type="button"
                          onClick={() => setContent({ ...content, allCategoryImage: undefined })}
                          className="whitespace-nowrap rounded-full border border-red-300 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ImageUploadButton
                    folder="categories"
                    label="Upload All Card Image"
                    onUpload={(url) => setContent({ ...content, allCategoryImage: url })}
                  />
                )}
                <p className="text-xs text-[var(--ink-soft)]">Displayed as background on the "All" category card</p>
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide">
                {content.categories.length} {content.categories.length === 1 ? "Category" : "Categories"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {content.categories.map((cat) => (
                  <span key={cat.id} className="rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
                    {cat.name} <span className="ml-1 text-[var(--ink-soft)]">({cat.features.length})</span>
                  </span>
                ))}
                {content.categories.length === 0 && (
                  <p className="text-xs italic text-[var(--ink-soft)]">No categories yet</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setContent({ ...content, categories: [...content.categories, createCategory()] })}
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
            >
              Add Category
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {content.categories.map((category, categoryIndex) => (
              <article key={`${category.id}-${categoryIndex}`} className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category Name">
                      <input
                        value={category.name}
                        onChange={(event) => {
                          const categories = [...content.categories];
                          categories[categoryIndex] = { ...category, name: event.target.value };
                          setContent({ ...content, categories });
                        }}
                        className={inputClassName()}
                        placeholder="e.g., Phones & Tablets"
                      />
                    </Field>
                    <Field label="Category Image (shown on card)">
                      <div className="flex flex-col gap-1.5">
                        {category.image ? (
                          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[var(--surface)] p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={category.image} alt={category.name} className="h-12 w-16 rounded-lg object-cover border border-black/10" />
                            <div className="flex flex-col gap-1 min-w-0">
                              <p className="text-xs text-[var(--ink-soft)] truncate">{category.image}</p>
                              <div className="flex gap-2">
                                <ImageUploadButton
                                  folder="categories"
                                  label="Replace"
                                  onUpload={(url) => {
                                    const categories = [...content.categories];
                                    categories[categoryIndex] = { ...category, image: url };
                                    setContent({ ...content, categories });
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const categories = [...content.categories];
                                    categories[categoryIndex] = { ...category, image: undefined };
                                    setContent({ ...content, categories });
                                  }}
                                  className="whitespace-nowrap rounded-full border border-red-300 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <ImageUploadButton
                            folder="categories"
                            label="Upload Category Image"
                            onUpload={(url) => {
                              const categories = [...content.categories];
                              categories[categoryIndex] = { ...category, image: url };
                              setContent({ ...content, categories });
                            }}
                          />
                        )}
                        <p className="text-xs text-[var(--ink-soft)]">Displayed as background on the category card</p>
                      </div>
                    </Field>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const categories = [...content.categories];
                        categories.splice(categoryIndex, 1);
                        setContent({ ...content, categories });
                      }}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                    >
                      Remove Category
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--brand-deep)]">Features ({category.features.length})</p>
                      <button
                        type="button"
                        onClick={() => {
                          const categories = [...content.categories];
                          const newFeature = createCategoryFeature();
                          categories[categoryIndex] = {
                            ...category,
                            features: [...category.features, newFeature],
                          };
                          setContent({ ...content, categories });
                        }}
                        className="rounded-full border border-[var(--brand)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="space-y-1">
                      {category.features.map((feature, featureIndex) => (
                        <div key={`${feature.id}-${featureIndex}`} className="flex items-center gap-2 rounded-lg bg-[var(--brand)]/5 px-3 py-2">
                          <input
                            type="text"
                            value={feature.name}
                            onChange={(event) => {
                              const categories = [...content.categories];
                              const features = [...category.features];
                              features[featureIndex] = { ...feature, name: event.target.value };
                              categories[categoryIndex] = { ...category, features };
                              setContent({ ...content, categories });
                            }}
                            placeholder="Feature name"
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-soft)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const categories = [...content.categories];
                              const features = [...category.features];
                              features.splice(featureIndex, 1);
                              categories[categoryIndex] = { ...category, features };
                              setContent({ ...content, categories });
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {category.features.length === 0 && (
                        <p className="text-xs italic text-[var(--ink-soft)]">No features yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {content.categories.length === 0 && (
              <p className="rounded-2xl border border-black/10 bg-white p-4 text-sm italic text-[var(--ink-soft)]">No categories yet. Click "Add Category" to get started.</p>
            )}
          </div>
        </Section>
      ) : null}

      {activeSection === "delivery" ? (
        <Section title="Delivery Settings" description="Set delivery fees by location, per-product overrides, and the free-delivery item threshold.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default delivery fee (GHS)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={content.deliverySettings.defaultFee}
                onChange={(event) =>
                  setContent({
                    ...content,
                    deliverySettings: {
                      ...content.deliverySettings,
                      defaultFee: Number(event.target.value || 0),
                    },
                  })
                }
                className={inputClassName()}
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">Applies when no location is selected and the product has no custom delivery fee.</p>
            </Field>
            <Field label="Free delivery item threshold">
              <input
                type="number"
                min={1}
                step="1"
                value={content.deliverySettings.freeDeliveryItemThreshold}
                onChange={(event) =>
                  setContent({
                    ...content,
                    deliverySettings: {
                      ...content.deliverySettings,
                      freeDeliveryItemThreshold: Number(event.target.value || 1),
                    },
                  })
                }
                className={inputClassName()}
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">Customers who add this many or more items get free delivery automatically.</p>
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[var(--brand-deep)]">Location-Based Delivery Fees</h3>
              <button
                type="button"
                onClick={() => {
                  const newLoc: LocationDeliveryFee = {
                    id: `loc-${Math.random().toString(36).slice(2, 8)}`,
                    name: "",
                    fee: 0,
                  };
                  setContent({
                    ...content,
                    deliverySettings: {
                      ...content.deliverySettings,
                      locationFees: [...content.deliverySettings.locationFees, newLoc],
                    },
                  });
                }}
                className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
              >
                Add Location
              </button>
            </div>

            {content.deliverySettings.locationFees.length === 0 && (
              <p className="text-sm text-[var(--ink-soft)]">No locations configured yet. Delivery will use the default fee.</p>
            )}

            {content.deliverySettings.locationFees.map((loc, locIndex) => (
              <article key={loc.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <Field label="Location name">
                  <input
                    value={loc.name}
                    onChange={(event) => {
                      const locationFees = [...content.deliverySettings.locationFees];
                      locationFees[locIndex] = { ...loc, name: event.target.value };
                      setContent({ ...content, deliverySettings: { ...content.deliverySettings, locationFees } });
                    }}
                    placeholder="e.g. Accra Central"
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Fee (GHS)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={loc.fee}
                    onChange={(event) => {
                      const locationFees = [...content.deliverySettings.locationFees];
                      locationFees[locIndex] = { ...loc, fee: Number(event.target.value || 0) };
                      setContent({ ...content, deliverySettings: { ...content.deliverySettings, locationFees } });
                    }}
                    className={`${inputClassName()} w-28`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => {
                    const locationFees = [...content.deliverySettings.locationFees];
                    locationFees.splice(locIndex, 1);
                    setContent({ ...content, deliverySettings: { ...content.deliverySettings, locationFees } });
                  }}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          {/* Processing Fee */}
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[var(--brand-deep)]">Processing Fee</h3>
            <Field label="Processing fee per order (GHS)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={content.deliverySettings.processingFee}
                onChange={(event) =>
                  setContent({
                    ...content,
                    deliverySettings: {
                      ...content.deliverySettings,
                      processingFee: Number(event.target.value || 0),
                    },
                  })
                }
                className={inputClassName()}
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">A flat fee charged on every order to cover payment processing costs. Set to 0 to disable.</p>
            </Field>
          </div>

          {/* Delivery Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[var(--brand-deep)]">Delivery Types</h3>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">Add delivery methods like &quot;Door to Door&quot; or &quot;Pickup&quot;. When configured, customers choose one at checkout.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newType: DeliveryType = {
                    id: `dtype-${Math.random().toString(36).slice(2, 8)}`,
                    name: "",
                    fee: 0,
                    description: "",
                  };
                  setContent({
                    ...content,
                    deliverySettings: {
                      ...content.deliverySettings,
                      deliveryTypes: [...(content.deliverySettings.deliveryTypes ?? []), newType],
                    },
                  });
                }}
                className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand-deep)] hover:bg-[var(--brand)]/10 whitespace-nowrap"
              >
                Add Type
              </button>
            </div>

            {(content.deliverySettings.deliveryTypes ?? []).length === 0 && (
              <p className="text-sm text-[var(--ink-soft)]">No delivery types configured. Location-based fees will be used instead.</p>
            )}

            {(content.deliverySettings.deliveryTypes ?? []).map((dt, dtIndex) => (
              <article key={dt.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <Field label="Type name">
                  <input
                    value={dt.name}
                    onChange={(event) => {
                      const deliveryTypes = [...(content.deliverySettings.deliveryTypes ?? [])];
                      deliveryTypes[dtIndex] = { ...dt, name: event.target.value };
                      setContent({ ...content, deliverySettings: { ...content.deliverySettings, deliveryTypes } });
                    }}
                    placeholder="e.g. Door to Door"
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Description (optional)">
                  <input
                    value={dt.description ?? ""}
                    onChange={(event) => {
                      const deliveryTypes = [...(content.deliverySettings.deliveryTypes ?? [])];
                      deliveryTypes[dtIndex] = { ...dt, description: event.target.value };
                      setContent({ ...content, deliverySettings: { ...content.deliverySettings, deliveryTypes } });
                    }}
                    placeholder="e.g. Delivered straight to your door"
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Fee (GHS)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={dt.fee}
                    onChange={(event) => {
                      const deliveryTypes = [...(content.deliverySettings.deliveryTypes ?? [])];
                      deliveryTypes[dtIndex] = { ...dt, fee: Number(event.target.value || 0) };
                      setContent({ ...content, deliverySettings: { ...content.deliverySettings, deliveryTypes } });
                    }}
                    className={`${inputClassName()} w-28`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => {
                    const deliveryTypes = [...(content.deliverySettings.deliveryTypes ?? [])];
                    deliveryTypes.splice(dtIndex, 1);
                    setContent({ ...content, deliverySettings: { ...content.deliverySettings, deliveryTypes } });
                  }}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4">
            <p className="text-sm font-bold text-[var(--brand-deep)] mb-1">How delivery fees work</p>
            <ul className="text-xs text-[var(--ink-soft)] space-y-1 list-disc list-inside">
              <li>If all items in the cart have "Free delivery" enabled, delivery is GHS 0.</li>
              <li>If the cart has <strong>{content.deliverySettings.freeDeliveryItemThreshold}+ items</strong>, delivery is free automatically.</li>
              <li>If delivery types are configured, the selected type fee is used as the delivery charge.</li>
              <li>Otherwise, the customer's chosen location fee applies.</li>
              <li>If a product has a custom per-product fee set, that fee overrides the location fee for that product.</li>
              <li>If no location is chosen and no product fee is set, the default fee (GHS {content.deliverySettings.defaultFee}) applies.</li>
              <li>A processing fee of GHS {content.deliverySettings.processingFee} is added to every non-empty order.</li>
            </ul>
          </div>
        </Section>
      ) : null}

      {activeSection === "payments" ? (
        <Section title="Payment Methods" description="Control which payment methods customers can use at checkout.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-[var(--brand-deep)]">Paystack (Card / Mobile Money / Bank Transfer)</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">Customers can pay online via card, MoMo, or bank transfer through Paystack.</p>
                </div>
                <input
                  type="checkbox"
                  checked={content.paymentSettings?.paystackEnabled ?? true}
                  onChange={(event) =>
                    setContent({
                      ...content,
                      paymentSettings: {
                        ...(content.paymentSettings ?? { paystackEnabled: true, manualEnabled: true }),
                        paystackEnabled: event.target.checked,
                      },
                    })
                  }
                  className="h-5 w-5 accent-[var(--brand)]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 cursor-pointer border-t border-black/10 pt-4">
                <div>
                  <p className="text-sm font-bold text-[var(--brand-deep)]">Manual Transfer (Upload Payment Proof)</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">Customers pay via mobile money or bank transfer and upload a screenshot as proof.</p>
                </div>
                <input
                  type="checkbox"
                  checked={content.paymentSettings?.manualEnabled ?? true}
                  onChange={(event) =>
                    setContent({
                      ...content,
                      paymentSettings: {
                        ...(content.paymentSettings ?? { paystackEnabled: true, manualEnabled: true }),
                        manualEnabled: event.target.checked,
                      },
                    })
                  }
                  className="h-5 w-5 accent-[var(--brand)]"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900 mb-1">⚠️ Important</p>
              <p className="text-xs text-amber-800">At least one payment method must be usable at checkout. Disabling all methods will prevent customers from placing orders. Paystack also requires a valid API key to function — set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code> in your environment.</p>
            </div>
          </div>
        </Section>
      ) : null}

      {activeSection === "footer" ? (
        <Section
          title="Footer"
          description="Set contact information and social media links shown in the site footer."
        >
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone number">
                <input
                  value={content.footer?.phone ?? ""}
                  onChange={(event) =>
                    setContent({
                      ...content,
                      footer: { ...content.footer, phone: event.target.value },
                    })
                  }
                  placeholder="+233 20 000 0000"
                  className={inputClassName()}
                />
              </Field>
              <Field label="Email address">
                <input
                  type="email"
                  value={content.footer?.email ?? ""}
                  onChange={(event) =>
                    setContent({
                      ...content,
                      footer: { ...content.footer, email: event.target.value },
                    })
                  }
                  placeholder="hello@101hub.store"
                  className={inputClassName()}
                />
              </Field>
              <Field label="Physical address">
                <input
                  value={content.footer?.address ?? ""}
                  onChange={(event) =>
                    setContent({
                      ...content,
                      footer: { ...content.footer, address: event.target.value },
                    })
                  }
                  placeholder="Accra, Ghana"
                  className={inputClassName()}
                />
              </Field>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold text-[var(--brand-deep)]">Social Media Links</p>
              <p className="mb-4 text-xs text-[var(--ink-soft)]">Enter the full URL or handle for each platform. Leave blank to hide it from the footer.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
                    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
                    { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
                    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
                    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
                    { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/233200000000" },
                  ] as Array<{ key: keyof FooterContent; label: string; placeholder: string }>
                ).map(({ key, label, placeholder }) => (
                  <Field key={key} label={label}>
                    <input
                      value={(content.footer?.[key] as string) ?? ""}
                      onChange={(event) =>
                        setContent({
                          ...content,
                          footer: { ...content.footer, [key]: event.target.value },
                        })
                      }
                      placeholder={placeholder}
                      className={inputClassName()}
                    />
                  </Field>
                ))}
              </div>
            </div>
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
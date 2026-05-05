"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VendorStatus = "none" | "pending" | "approved" | "rejected";

type ProductVariant = {
  id: string;
  label: string;
  attribute: string;
  priceOverride?: number;
  priceAdjustment?: number;
};

type VendorProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string | null;
  images: string[];
  variants?: ProductVariant[];
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
};

type VendorService = {
  id: string;
  name: string;
  description: string;
  price: number;
  turnaround: string;
  image: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
};

const PRODUCT_CATEGORIES = [
  "Electronics & Gadgets",
  "Phones & Tablets",
  "Fashion & Clothing",
  "Health & Beauty",
  "Home & Office",
  "Appliances",
  "Computing",
  "Sporting Goods",
  "Baby Products",
  "Gaming",
  "Other",
];

export default function VendorDashboard() {
  const router = useRouter();
  const [vendorStatus, setVendorStatus] = useState<VendorStatus | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "services">("overview");

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category: "", stock: "1", image: "", images: [] as string[], variants: [] as ProductVariant[] });
  const [productUploading, setProductUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const productFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", price: "", turnaround: "", image: "" });
  const [serviceUploading, setServiceUploading] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const serviceFileRef = useRef<HTMLInputElement>(null);

  // Load vendor status
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/vendor/status", { cache: "no-store" });
      if (res.status === 401) { router.push("/login?from=/vendor/dashboard"); return; }
      const data = (await res.json()) as { status: VendorStatus; businessName?: string; adminNotes?: string };
      setVendorStatus(data.status);
      setBusinessName(data.businessName ?? "");
      setAdminNotes(data.adminNotes ?? "");
    })();
  }, [router]);

  // Load products/services when approved
  useEffect(() => {
    if (vendorStatus !== "approved") return;
    void loadAll();
  }, [vendorStatus]);

  async function loadAll() {
    setLoadingData(true);
    const [pRes, sRes] = await Promise.all([
      fetch("/api/vendor/products", { cache: "no-store" }),
      fetch("/api/vendor/services", { cache: "no-store" }),
    ]);
    if (pRes.ok) { const d = (await pRes.json()) as { items: VendorProduct[] }; setProducts(d.items); }
    if (sRes.ok) { const d = (await sRes.json()) as { items: VendorService[] }; setServices(d.items); }
    setLoadingData(false);
  }

  async function uploadImage(file: File): Promise<string> {
    const sigRes = await fetch("/api/vendor/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "products", resourceType: "image" }),
    });
    if (!sigRes.ok) throw new Error("Failed to get upload token.");
    const sig = (await sigRes.json()) as { signature: string; timestamp: number; folder: string; cloudName: string; apiKey: string; resourceType: string };
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", sig.apiKey);
    body.append("timestamp", String(sig.timestamp));
    body.append("signature", sig.signature);
    body.append("folder", sig.folder);
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, { method: "POST", body });
    if (!cloudRes.ok) throw new Error("Image upload failed.");
    const result = (await cloudRes.json()) as { secure_url: string };
    return result.secure_url;
  }

  async function handleProductImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductUploading(true);
    setProductError("");
    try {
      const url = await uploadImage(file);
      setProductForm((p) => ({ ...p, image: url }));
    } catch (err) {
      setProductError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProductUploading(false);
    }
  }

  async function handleGalleryImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    setProductError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        uploaded.push(url);
      }
      setProductForm((p) => ({ ...p, images: [...p.images, ...uploaded] }));
    } catch (err) {
      setProductError(err instanceof Error ? err.message : "Gallery upload failed.");
    } finally {
      setGalleryUploading(false);
      if (galleryFileRef.current) galleryFileRef.current.value = "";
    }
  }

  function addVariant() {
    const id = `v-${Math.random().toString(36).slice(2, 8)}`;
    const attribute = productForm.variants[0]?.attribute ?? "Size";
    setProductForm((p) => ({ ...p, variants: [...p.variants, { id, label: "", attribute }] }));
  }

  function removeVariant(id: string) {
    setProductForm((p) => ({ ...p, variants: p.variants.filter((v) => v.id !== id) }));
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    setProductForm((p) => ({ ...p, variants: p.variants.map((v) => v.id === id ? { ...v, ...patch } : v) }));
  }

  async function handleServiceImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setServiceUploading(true);
    setServiceError("");
    try {
      const url = await uploadImage(file);
      setServiceForm((p) => ({ ...p, image: url }));
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setServiceUploading(false);
    }
  }

  function startEditProduct(p: VendorProduct) {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      category: p.category,
      stock: String(p.stock),
      image: p.image ?? "",
      images: p.images ?? [],
      variants: p.variants ?? [],
    });
    setProductError("");
    setShowProductForm(true);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductError("");
    setProductSaving(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock: parseInt(productForm.stock, 10),
        image: productForm.image || null,
        images: productForm.images,
        variants: productForm.variants.length > 0 ? productForm.variants : undefined,
      };
      const res = await fetch("/api/vendor/products", {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProductId ? { id: editingProductId, ...payload } : payload),
      });
      const data = (await res.json()) as { error?: string; item?: VendorProduct };
      if (!res.ok) { setProductError(data.error ?? "Failed to save product."); return; }
      if (editingProductId) {
        setProducts((prev) => prev.map((p) => p.id === editingProductId ? data.item! : p));
      } else {
        setProducts((prev) => [data.item!, ...prev]);
      }
      setEditingProductId(null);
      setProductForm({ name: "", description: "", price: "", category: "", stock: "1", image: "", images: [], variants: [] });
      setShowProductForm(false);
    } catch {
      setProductError("Network error.");
    } finally {
      setProductSaving(false);
    }
  }

  function startEditService(sv: VendorService) {
    setEditingServiceId(sv.id);
    setServiceForm({
      name: sv.name,
      description: sv.description,
      price: String(sv.price),
      turnaround: sv.turnaround,
      image: sv.image ?? "",
    });
    setServiceError("");
    setShowServiceForm(true);
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    setServiceError("");
    setServiceSaving(true);
    try {
      const payload = {
        name: serviceForm.name,
        description: serviceForm.description,
        price: parseFloat(serviceForm.price),
        turnaround: serviceForm.turnaround,
        image: serviceForm.image || null,
      };
      const res = await fetch("/api/vendor/services", {
        method: editingServiceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingServiceId ? { id: editingServiceId, ...payload } : payload),
      });
      const data = (await res.json()) as { error?: string; item?: VendorService };
      if (!res.ok) { setServiceError(data.error ?? "Failed to save service."); return; }
      if (editingServiceId) {
        setServices((prev) => prev.map((s) => s.id === editingServiceId ? data.item! : s));
      } else {
        setServices((prev) => [data.item!, ...prev]);
      }
      setEditingServiceId(null);
      setServiceForm({ name: "", description: "", price: "", turnaround: "", image: "" });
      setShowServiceForm(false);
    } catch {
      setServiceError("Network error.");
    } finally {
      setServiceSaving(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/vendor/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDeleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`/api/vendor/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setServices((prev) => prev.filter((s) => s.id !== id));
  }

  // Loading
  if (vendorStatus === null) {
    return (
      <div style={s.centerPage}>
        <div style={s.spinner} />
        <p style={{ color: "var(--ink-soft,#888)", marginTop: 12 }}>Loading your dashboard…</p>
      </div>
    );
  }

  // Not applied
  if (vendorStatus === "none") {
    return (
      <div style={s.centerPage}>
        <div style={s.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
          <h1 style={s.heading}>Become a Vendor</h1>
          <p style={s.subtext}>You haven&apos;t applied to sell on 101 Hub yet. Fill a quick form and our team will review your application.</p>
          <a href="/vendor/apply" style={s.btnPrimary}>Apply Now</a>
        </div>
      </div>
    );
  }

  // Pending
  if (vendorStatus === "pending") {
    return (
      <div style={s.centerPage}>
        <div style={s.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <h1 style={s.heading}>Application Under Review</h1>
          <p style={s.subtext}>Your vendor application is being reviewed by our admin team. We&apos;ll notify you once it&apos;s approved.</p>
          <div style={s.infoBox}>
            <strong>What happens next?</strong>
            <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Admin reviews your business details</li>
              <li>You get approved (or feedback if more info needed)</li>
              <li>Access your dashboard to start uploading products</li>
            </ul>
          </div>
          <a href="/" style={{ ...s.btnPrimary, background: "var(--ink,#333)" }}>Back to Home</a>
        </div>
      </div>
    );
  }

  // Rejected
  if (vendorStatus === "rejected") {
    return (
      <div style={s.centerPage}>
        <div style={s.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <h1 style={s.heading}>Application Not Approved</h1>
          <p style={s.subtext}>Unfortunately your vendor application was not approved at this time.</p>
          {adminNotes && (
            <div style={{ ...s.infoBox, background: "rgba(229,62,62,0.08)", borderColor: "rgba(229,62,62,0.25)" }}>
              <strong>Feedback from admin:</strong>
              <p style={{ marginTop: 6, marginBottom: 0 }}>{adminNotes}</p>
            </div>
          )}
          <a href="mailto:support@101hub.shop" style={s.btnPrimary}>Contact Support</a>
        </div>
      </div>
    );
  }

  // Approved — full dashboard
  const approvedProducts = products.filter((p) => p.status === "approved").length;
  const approvedServices = services.filter((sv) => sv.status === "approved").length;
  const pendingCount = products.filter((p) => p.status === "pending").length + services.filter((sv) => sv.status === "pending").length;

  return (
    <div style={s.dashPage}>
      {/* Header */}
      <div style={s.dashHeader}>
        <div>
          <div style={s.badge}>Vendor Dashboard</div>
          <h1 style={s.dashHeading}>{businessName}</h1>
          <p style={{ color: "var(--ink-soft,#777)", fontSize: 14, margin: 0 }}>Manage your products and services</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {(["overview", "products", "services"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
          >
            {tab === "overview" ? "📊 Overview" : tab === "products" ? "📦 Products" : "🛠 Services"}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statNum}>{products.length}</div>
            <div style={s.statLabel}>Total Products</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: "#38a169" }}>{approvedProducts}</div>
            <div style={s.statLabel}>Published Products</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{services.length}</div>
            <div style={s.statLabel}>Total Services</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: "#38a169" }}>{approvedServices}</div>
            <div style={s.statLabel}>Published Services</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: "#dd6b20" }}>{pendingCount}</div>
            <div style={s.statLabel}>Pending Review</div>
          </div>
        </div>
      )}

      {/* Products tab */}
      {activeTab === "products" && (
        <div>
          <div style={s.tabActions}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft,#777)" }}>
              Products marked as &quot;pending&quot; will be published after admin approval.
            </p>
            <button onClick={() => { setShowProductForm(true); setProductError(""); }} style={s.btnAdd}>
              + Add Product
            </button>
          </div>

          {showProductForm && (
            <form onSubmit={(e) => void handleAddProduct(e)} style={s.formCard}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{editingProductId ? "Edit Product" : "New Product"}</h3>
              <div style={s.formGrid}>
                <div style={s.fg}>
                  <label style={s.lbl}>Product Name *</label>
                  <input required value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. iPhone 15 Pro" style={s.inp} />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Category *</label>
                  <select required value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} style={s.inp}>
                    <option value="">Select…</option>
                    {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Price (GHS) *</label>
                  <input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" style={s.inp} />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Stock Quantity *</label>
                  <input required type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} style={s.inp} />
                </div>
              </div>
              <div style={{ ...s.fg, marginTop: 8 }}>
                <label style={s.lbl}>Description *</label>
                <textarea required rows={3} value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the product…" style={{ ...s.inp, resize: "vertical" }} />
              </div>
              {/* Cover image */}
              <div style={{ ...s.fg, marginTop: 8 }}>
                <label style={s.lbl}>Cover Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {productForm.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productForm.image} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
                  )}
                  <button type="button" onClick={() => productFileRef.current?.click()} disabled={productUploading} style={{ ...s.btnSecondary, fontSize: 13 }}>
                    {productUploading ? "Uploading…" : productForm.image ? "Change Cover" : "Upload Cover Image"}
                  </button>
                  <input ref={productFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleProductImageUpload(e)} />
                </div>
              </div>

              {/* Gallery images */}
              <div style={{ ...s.fg, marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 12 }}>
                <label style={s.lbl}>Gallery Images <span style={{ fontWeight: 400, color: "var(--ink-soft,#888)" }}>(optional — up to 8 extra photos)</span></label>
                {productForm.images.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, marginTop: 8 }}>
                    {productForm.images.map((url, idx) => (
                      <div key={`${url}-${idx}`} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`gallery ${idx + 1}`} style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", top: 2, right: 2, display: "flex", gap: 2 }}>
                          {idx > 0 && (
                            <button type="button" title="Move left" onClick={() => {
                              const imgs = [...productForm.images];
                              [imgs[idx], imgs[idx - 1]] = [imgs[idx - 1], imgs[idx]];
                              setProductForm((p) => ({ ...p, images: imgs }));
                            }} style={s.galleryBtn}>‹</button>
                          )}
                          {idx < productForm.images.length - 1 && (
                            <button type="button" title="Move right" onClick={() => {
                              const imgs = [...productForm.images];
                              [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]];
                              setProductForm((p) => ({ ...p, images: imgs }));
                            }} style={s.galleryBtn}>›</button>
                          )}
                          <button type="button" title="Remove" onClick={() => setProductForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))} style={{ ...s.galleryBtn, background: "rgba(229,62,62,0.85)", color: "#fff" }}>✕</button>
                        </div>
                        <div style={{ position: "absolute", bottom: 2, left: 4, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>#{idx + 1}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <button type="button" disabled={galleryUploading} onClick={() => galleryFileRef.current?.click()} style={{ ...s.btnSecondary, fontSize: 13 }}>
                    {galleryUploading ? "Uploading…" : "Upload Gallery Images"}
                  </button>
                  <input ref={galleryFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => void handleGalleryImageUpload(e)} />
                  <span style={{ fontSize: 12, color: "var(--ink-soft,#888)" }}>or paste a URL:</span>
                  <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 180 }}>
                    <input id="gallery-url-input" placeholder="https://…" style={{ ...s.inp, flex: 1 }} />
                    <button type="button" onClick={() => {
                      const inp = document.getElementById("gallery-url-input") as HTMLInputElement;
                      const url = inp?.value.trim();
                      if (url?.startsWith("http")) {
                        setProductForm((p) => ({ ...p, images: [...p.images, url] }));
                        inp.value = "";
                      }
                    }} style={{ ...s.btnSecondary, fontSize: 13, whiteSpace: "nowrap" }}>Add</button>
                  </div>
                </div>
                {productForm.images.length > 0 && (
                  <button type="button" onClick={() => setProductForm((p) => ({ ...p, images: [] }))} style={{ marginTop: 4, fontSize: 12, color: "#c53030", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Clear all gallery images
                  </button>
                )}
              </div>

              {/* Price Variants */}
              <div style={{ ...s.fg, marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <div>
                    <label style={s.lbl}>Price Variants <span style={{ fontWeight: 400, color: "var(--ink-soft,#888)" }}>(optional)</span></label>
                    <p style={{ fontSize: 12, color: "var(--ink-soft,#888)", margin: "2px 0 0" }}>Add size/colour/weight options with different prices.</p>
                  </div>
                  <button type="button" onClick={addVariant} style={{ ...s.btnSecondary, fontSize: 12, whiteSpace: "nowrap" }}>+ Add Variant</button>
                </div>
                {productForm.variants.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Shared attribute name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft,#888)", whiteSpace: "nowrap" }}>Attribute name:</span>
                      <input
                        value={productForm.variants[0]?.attribute ?? "Size"}
                        onChange={(e) => setProductForm((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, attribute: e.target.value })) }))}
                        placeholder="e.g. Size, Colour, Weight"
                        style={{ ...s.inp, maxWidth: 160 }}
                      />
                    </div>
                    {productForm.variants.map((variant) => (
                      <div key={variant.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: 10, border: "1px solid rgba(0,0,0,0.08)" }}>
                        <div style={s.fg}>
                          <label style={{ ...s.lbl, fontSize: 11 }}>Label</label>
                          <input value={variant.label} onChange={(e) => updateVariant(variant.id, { label: e.target.value })} placeholder="e.g. Small, Red, 1kg" style={s.inp} />
                        </div>
                        <div style={s.fg}>
                          <label style={{ ...s.lbl, fontSize: 11 }}>Price Override (GHS)</label>
                          <input type="number" min={0} step="0.01" value={variant.priceOverride ?? ""} placeholder="Full price for this variant" onChange={(e) => updateVariant(variant.id, { priceOverride: e.target.value ? Number(e.target.value) : undefined, priceAdjustment: undefined })} style={s.inp} />
                        </div>
                        <div style={s.fg}>
                          <label style={{ ...s.lbl, fontSize: 11 }}>Price Adjustment (±GHS)</label>
                          <input type="number" step="0.01" value={variant.priceAdjustment ?? ""} placeholder="e.g. +10 or -5" disabled={variant.priceOverride !== undefined} onChange={(e) => updateVariant(variant.id, { priceAdjustment: e.target.value ? Number(e.target.value) : undefined })} style={{ ...s.inp, opacity: variant.priceOverride !== undefined ? 0.5 : 1 }} />
                        </div>
                        <button type="button" onClick={() => removeVariant(variant.id)} title="Remove variant" style={{ alignSelf: "flex-end", background: "rgba(229,62,62,0.1)", color: "#c53030", border: "none", borderRadius: 6, width: 32, height: 36, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                    {productForm.variants.length > 0 && (() => {
                      const price = parseFloat(productForm.price || "0");
                      const prices = productForm.variants.map((v) => v.priceOverride ?? price + (v.priceAdjustment ?? 0));
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return min !== max ? (
                        <p style={{ fontSize: 12, color: "var(--ink-soft,#888)" }}>Price range: GHS {min.toFixed(2)} – GHS {max.toFixed(2)}</p>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {productError && <p style={s.errText}>{productError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" disabled={productSaving} style={s.btnPrimary}>{productSaving ? "Saving…" : editingProductId ? "Save Changes" : "Submit for Review"}</button>
                <button type="button" onClick={() => { setShowProductForm(false); setEditingProductId(null); setProductForm({ name: "", description: "", price: "", category: "", stock: "1", image: "", images: [], variants: [] }); }} style={s.btnSecondary}>Cancel</button>
              </div>
            </form>
          )}

          {loadingData ? <p style={s.emptyMsg}>Loading…</p> : products.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 36 }}>📦</div>
              <p>No products yet. Add your first product!</p>
            </div>
          ) : (
            <div style={s.itemList}>
              {products.map((p) => (
                <div key={p.id} style={s.itemRow}>
                  {p.image && <img src={p.image} alt={p.name} style={s.itemImg} />}
                  {!p.image && <div style={s.itemImgPlaceholder}>📦</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemName}>{p.name}</div>
                    <div style={s.itemMeta}>
                      {p.category} · GHS {p.price.toFixed(2)} · Stock: {p.stock}
                      {(p.images?.length ?? 0) > 0 && <span> · {p.images.length} gallery photo{p.images.length !== 1 ? "s" : ""}</span>}
                      {(p.variants?.length ?? 0) > 0 && <span> · {p.variants!.length} variant{p.variants!.length !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                  <button onClick={() => startEditProduct(p)} style={{ ...s.deleteBtn, background: "rgba(49,130,206,0.12)", color: "#2b6cb0" }} title="Edit">✎</button>
                  <button onClick={() => void handleDeleteProduct(p.id)} style={s.deleteBtn} title="Delete">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services tab */}
      {activeTab === "services" && (
        <div>
          <div style={s.tabActions}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft,#777)" }}>
              Services marked as &quot;pending&quot; will be published after admin approval.
            </p>
            <button onClick={() => { setShowServiceForm(true); setServiceError(""); }} style={s.btnAdd}>
              + Add Service
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={(e) => void handleAddService(e)} style={s.formCard}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{editingServiceId ? "Edit Service" : "New Service"}</h3>
              <div style={s.formGrid}>
                <div style={s.fg}>
                  <label style={s.lbl}>Service Name *</label>
                  <input required value={serviceForm.name} onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Phone Screen Repair" style={s.inp} />
                </div>
                <div style={s.fg}>
                  <label style={s.lbl}>Price (GHS) *</label>
                  <input required type="number" min="0.01" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" style={s.inp} />
                </div>
                <div style={{ ...s.fg, gridColumn: "1 / -1" }}>
                  <label style={s.lbl}>Turnaround Time *</label>
                  <input required value={serviceForm.turnaround} onChange={(e) => setServiceForm((p) => ({ ...p, turnaround: e.target.value }))} placeholder="e.g. 24 hours, 2–3 days" style={s.inp} />
                </div>
              </div>
              <div style={{ ...s.fg, marginTop: 8 }}>
                <label style={s.lbl}>Description *</label>
                <textarea required rows={3} value={serviceForm.description} onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the service you offer…" style={{ ...s.inp, resize: "vertical" }} />
              </div>
              <div style={{ ...s.fg, marginTop: 8 }}>
                <label style={s.lbl}>Service Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {serviceForm.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={serviceForm.image} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
                  )}
                  <button type="button" onClick={() => serviceFileRef.current?.click()} disabled={serviceUploading} style={{ ...s.btnSecondary, fontSize: 13 }}>
                    {serviceUploading ? "Uploading…" : serviceForm.image ? "Change Image" : "Upload Image"}
                  </button>
                  <input ref={serviceFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleServiceImageUpload(e)} />
                </div>
              </div>
              {serviceError && <p style={s.errText}>{serviceError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={serviceSaving} style={s.btnPrimary}>{serviceSaving ? "Saving…" : editingServiceId ? "Save Changes" : "Submit for Review"}</button>
                <button type="button" onClick={() => { setShowServiceForm(false); setEditingServiceId(null); setServiceForm({ name: "", description: "", price: "", turnaround: "", image: "" }); }} style={s.btnSecondary}>Cancel</button>
              </div>
            </form>
          )}

          {loadingData ? <p style={s.emptyMsg}>Loading…</p> : services.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 36 }}>🛠</div>
              <p>No services yet. Add your first service!</p>
            </div>
          ) : (
            <div style={s.itemList}>
              {services.map((sv) => (
                <div key={sv.id} style={s.itemRow}>
                  {sv.image && <img src={sv.image} alt={sv.name} style={s.itemImg} />}
                  {!sv.image && <div style={s.itemImgPlaceholder}>🛠</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemName}>{sv.name}</div>
                    <div style={s.itemMeta}>GHS {sv.price.toFixed(2)} · {sv.turnaround}</div>
                  </div>
                  <StatusBadge status={sv.status} />
                  <button onClick={() => startEditService(sv)} style={{ ...s.deleteBtn, background: "rgba(49,130,206,0.12)", color: "#2b6cb0" }} title="Edit">✎</button>
                  <button onClick={() => void handleDeleteService(sv.id)} style={s.deleteBtn} title="Delete">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(221,107,32,0.12)", color: "#dd6b20", label: "Pending" },
    approved: { bg: "rgba(56,161,105,0.12)", color: "#276749", label: "Published" },
    rejected: { bg: "rgba(229,62,62,0.12)", color: "#c53030", label: "Rejected" },
  };
  const c = colors[status];
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

const s: Record<string, React.CSSProperties> = {
  centerPage: { minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,107,53,0.2)", borderTopColor: "#ff6b35", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  card: { background: "var(--surface-strong,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: "36px 32px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" },
  heading: { fontSize: 22, fontWeight: 900, color: "var(--brand-deep,#1a1a1a)", margin: "0 0 8px" },
  subtext: { fontSize: 14, color: "var(--ink-soft,#666)", lineHeight: 1.6, margin: "0 0 20px" },
  btnPrimary: { display: "inline-block", background: "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none" },
  btnSecondary: { background: "rgba(0,0,0,0.06)", color: "var(--ink,#333)", border: "none", borderRadius: 8, padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  btnAdd: { background: "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" },
  infoBox: { background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, padding: "14px 16px", textAlign: "left", fontSize: 13, marginBottom: 20 },
  dashPage: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  dashHeader: { marginBottom: 24 },
  badge: { display: "inline-block", background: "rgba(255,107,53,0.12)", color: "#ff6b35", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "4px 10px", borderRadius: 20, marginBottom: 8 },
  dashHeading: { fontSize: 24, fontWeight: 900, color: "var(--brand-deep,#1a1a1a)", margin: "0 0 4px" },
  tabs: { display: "flex", gap: 4, borderBottom: "2px solid rgba(0,0,0,0.08)", marginBottom: 24 },
  tab: { background: "none", border: "none", padding: "10px 16px", fontSize: 14, fontWeight: 600, color: "var(--ink-soft,#888)", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -2 },
  tabActive: { color: "#ff6b35", borderBottomColor: "#ff6b35" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
  statCard: { background: "var(--surface-strong,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px 14px", textAlign: "center" },
  statNum: { fontSize: 28, fontWeight: 900, color: "#ff6b35" },
  statLabel: { fontSize: 12, color: "var(--ink-soft,#888)", marginTop: 4 },
  tabActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 },
  formCard: { background: "var(--surface-strong,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "20px", marginBottom: 20 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fg: { display: "flex", flexDirection: "column", gap: 5 },
  lbl: { fontSize: 12, fontWeight: 600, color: "var(--ink,#333)" },
  inp: { padding: "9px 11px", borderRadius: 7, border: "1.5px solid rgba(0,0,0,0.15)", fontSize: 14, background: "var(--bg,#fff)", color: "var(--ink,#222)", width: "100%", boxSizing: "border-box" },
  errText: { color: "#e53e3e", fontSize: 13, margin: "4px 0 0" },
  itemList: { display: "flex", flexDirection: "column", gap: 8 },
  itemRow: { display: "flex", alignItems: "center", gap: 12, background: "var(--surface-strong,#fff)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "10px 14px" },
  itemImg: { width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 },
  itemImgPlaceholder: { width: 44, height: 44, background: "rgba(0,0,0,0.04)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  itemName: { fontWeight: 600, fontSize: 14, color: "var(--ink,#222)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemMeta: { fontSize: 12, color: "var(--ink-soft,#888)", marginTop: 2 },
  deleteBtn: { background: "rgba(229,62,62,0.1)", color: "#c53030", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyState: { textAlign: "center", color: "var(--ink-soft,#888)", padding: "48px 16px", fontSize: 14 },
  emptyMsg: { textAlign: "center", color: "var(--ink-soft,#888)", padding: 24 },
  galleryBtn: { background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
};

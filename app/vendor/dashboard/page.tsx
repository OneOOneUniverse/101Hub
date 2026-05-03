"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VendorStatus = "none" | "pending" | "approved" | "rejected";

type VendorProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string | null;
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
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category: "", stock: "1", image: "" });
  const [productUploading, setProductUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const productFileRef = useRef<HTMLInputElement>(null);

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
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

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductError("");
    setProductSaving(true);
    try {
      const res = await fetch("/api/vendor/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          category: productForm.category,
          stock: parseInt(productForm.stock, 10),
          image: productForm.image || null,
        }),
      });
      const data = (await res.json()) as { error?: string; item?: VendorProduct };
      if (!res.ok) { setProductError(data.error ?? "Failed to add product."); return; }
      setProducts((prev) => [data.item!, ...prev]);
      setProductForm({ name: "", description: "", price: "", category: "", stock: "1", image: "" });
      setShowProductForm(false);
    } catch {
      setProductError("Network error.");
    } finally {
      setProductSaving(false);
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    setServiceError("");
    setServiceSaving(true);
    try {
      const res = await fetch("/api/vendor/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description,
          price: parseFloat(serviceForm.price),
          turnaround: serviceForm.turnaround,
          image: serviceForm.image || null,
        }),
      });
      const data = (await res.json()) as { error?: string; item?: VendorService };
      if (!res.ok) { setServiceError(data.error ?? "Failed to add service."); return; }
      setServices((prev) => [data.item!, ...prev]);
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
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>New Product</h3>
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
              <div style={{ ...s.fg, marginTop: 8 }}>
                <label style={s.lbl}>Product Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {productForm.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productForm.image} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
                  )}
                  <button type="button" onClick={() => productFileRef.current?.click()} disabled={productUploading} style={{ ...s.btnSecondary, fontSize: 13 }}>
                    {productUploading ? "Uploading…" : productForm.image ? "Change Image" : "Upload Image"}
                  </button>
                  <input ref={productFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleProductImageUpload(e)} />
                </div>
              </div>
              {productError && <p style={s.errText}>{productError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={productSaving} style={s.btnPrimary}>{productSaving ? "Saving…" : "Submit for Review"}</button>
                <button type="button" onClick={() => setShowProductForm(false)} style={s.btnSecondary}>Cancel</button>
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
                    <div style={s.itemMeta}>{p.category} · GHS {p.price.toFixed(2)} · Stock: {p.stock}</div>
                  </div>
                  <StatusBadge status={p.status} />
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
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>New Service</h3>
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
                <button type="submit" disabled={serviceSaving} style={s.btnPrimary}>{serviceSaving ? "Saving…" : "Submit for Review"}</button>
                <button type="button" onClick={() => setShowServiceForm(false)} style={s.btnSecondary}>Cancel</button>
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
};

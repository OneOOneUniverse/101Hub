"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
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
  "Professional Services",
  "Food & Beverages",
  "Other",
];

export default function VendorApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: "",
    description: "",
    phone: "",
    location: "",
    category: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        if (res.status === 409) {
          // Already applied — send them to dashboard
          router.push("/vendor/dashboard");
          return;
        }
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.heading}>Application Submitted!</h1>
          <p style={styles.subtext}>
            Your vendor application has been received. Our team will review it and
            get back to you shortly. You&apos;ll be notified once your account is approved.
          </p>
          <button style={styles.btnPrimary} onClick={() => router.push("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Vendor Programme</div>
        <h1 style={styles.heading}>Become a Vendor</h1>
        <p style={styles.subtext}>
          Fill in your business details below. Our admin team will review your
          application before your products go live.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
          <div style={styles.group}>
            <label style={styles.label}>Business / Store Name *</label>
            <input
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="e.g. TechZone Ghana"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>What do you sell? *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Briefly describe the products or services you plan to offer…"
              required
              rows={3}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.group, flex: 1 }}>
              <label style={styles.label}>Phone Number *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 0244123456"
                required
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.group, flex: 1 }}>
              <label style={styles.label}>Location *</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Accra, Ghana"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Primary Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Website / Social Link (optional)</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://yourstore.com or instagram.com/yourstore"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "Submitting…" : "Submit Application"}
          </button>

          <p style={styles.note}>
            Already applied?{" "}
            <a href="/vendor/dashboard" style={styles.link}>Check your dashboard</a>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    background: "var(--bg, #f5f5f5)",
  },
  card: {
    background: "var(--surface-strong, #fff)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 560,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  badge: {
    display: "inline-block",
    background: "rgba(255,107,53,0.12)",
    color: "#ff6b35",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: 20,
    marginBottom: 12,
  },
  heading: {
    margin: "0 0 8px",
    fontSize: 26,
    fontWeight: 900,
    color: "var(--brand-deep, #1a1a1a)",
  },
  subtext: {
    margin: "0 0 24px",
    fontSize: 14,
    color: "var(--ink-soft, #555)",
    lineHeight: 1.6,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink, #222)",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid rgba(0,0,0,0.15)",
    fontSize: 14,
    background: "var(--bg, #fff)",
    color: "var(--ink, #222)",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  btnPrimary: {
    padding: "12px",
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 13,
    margin: 0,
  },
  note: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--ink-soft, #666)",
    margin: 0,
  },
  link: {
    color: "#ff6b35",
    fontWeight: 600,
    textDecoration: "none",
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
};

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function guardAdmin() {
  const { userId } = await auth();
  if (!userId) return "Unauthorized.";
  const ok = await isCurrentUserAdmin();
  if (!ok) return "Forbidden.";
  return null;
}

// GET — list all contacts
export async function GET() {
  const err = await guardAdmin();
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized." ? 401 : 403 });

  const { data, error } = await supabaseAdmin
    .from("sms_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[sms-contacts] GET error:", error.message);
    return NextResponse.json({ error: "Could not fetch contacts." }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}

// POST — add a contact
export async function POST(request: Request) {
  const err = await guardAdmin();
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized." ? 401 : 403 });

  let body: { name?: string; phone?: string; note?: string };
  try {
    body = (await request.json()) as { name?: string; phone?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const rawPhone = body.phone?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!rawPhone) return NextResponse.json({ error: "Phone is required." }, { status: 400 });

  // Normalise to E.164 (+233…)
  let phone = rawPhone.replace(/\s/g, "");
  if (phone.startsWith("0") && phone.length === 10) {
    phone = `+233${phone.slice(1)}`;
  } else if (phone.startsWith("233") && !phone.startsWith("+")) {
    phone = `+${phone}`;
  } else if (!phone.startsWith("+")) {
    phone = `+${phone}`;
  }

  const { data, error } = await supabaseAdmin
    .from("sms_contacts")
    .insert({ name, phone, note })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This phone number is already in the contact list." }, { status: 409 });
    }
    console.error("[sms-contacts] POST error:", error.message);
    return NextResponse.json({ error: "Could not add contact." }, { status: 500 });
  }

  return NextResponse.json({ contact: data }, { status: 201 });
}

// DELETE — remove a contact by id
export async function DELETE(request: Request) {
  const err = await guardAdmin();
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized." ? 401 : 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id param required." }, { status: 400 });

  const { error } = await supabaseAdmin.from("sms_contacts").delete().eq("id", id);

  if (error) {
    console.error("[sms-contacts] DELETE error:", error.message);
    return NextResponse.json({ error: "Could not delete contact." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PATCH — bulk import unique customer phones from orders table
export async function PATCH() {
  const err = await guardAdmin();
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized." ? 401 : 403 });

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("customer_name, customer_phone")
    .not("customer_phone", "is", null)
    .not("customer_phone", "eq", "");

  if (ordersError) {
    console.error("[sms-contacts] PATCH orders error:", ordersError.message);
    return NextResponse.json({ error: "Could not read orders." }, { status: 500 });
  }

  function normalisePhone(raw: string): string {
    const p = raw.replace(/\s/g, "");
    if (p.startsWith("0") && p.length === 10) return `+233${p.slice(1)}`;
    if (p.startsWith("233") && !p.startsWith("+")) return `+${p}`;
    if (!p.startsWith("+")) return `+${p}`;
    return p;
  }

  // Deduplicate by normalised phone, preferring the first occurrence
  const seen = new Map<string, string>(); // phone -> name
  for (const row of orders ?? []) {
    const raw = String(row.customer_phone ?? "").trim();
    if (!raw) continue;
    const phone = normalisePhone(raw);
    if (!seen.has(phone)) {
      seen.set(phone, String(row.customer_name ?? "").trim() || "Customer");
    }
  }

  if (seen.size === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const rows = Array.from(seen.entries()).map(([phone, name]) => ({
    name,
    phone,
    note: "Imported from orders",
  }));

  // ignoreDuplicates: true means it skips rows that conflict on the phone unique constraint
  const { data: inserted, error: upsertError } = await supabaseAdmin
    .from("sms_contacts")
    .upsert(rows, { onConflict: "phone", ignoreDuplicates: true })
    .select();

  if (upsertError) {
    console.error("[sms-contacts] PATCH upsert error:", upsertError.message);
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }

  const imported = inserted?.length ?? 0;
  const skipped = seen.size - imported;

  return NextResponse.json({ imported, skipped, total: seen.size });
}

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

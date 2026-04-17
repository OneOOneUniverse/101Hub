import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { sendBroadcastEmail } from "@/lib/email";

type BroadcastPayload = {
  subject?: string;
  body?: string;
};

export async function POST(request: Request) {
  // Admin guard
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminCheck = await isCurrentUserAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: BroadcastPayload;
  try {
    payload = (await request.json()) as BroadcastPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const subject = payload.subject?.trim();
  const body = payload.body?.trim();

  if (!subject) {
    return NextResponse.json({ error: "subject is required." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "body is required." }, { status: 400 });
  }

  // Fetch all user emails from Clerk (paginated)
  const emails: string[] = [];
  const client = await clerkClient();
  let offset = 0;
  const limit = 100;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: users } = await client.users.getUserList({
        limit,
        offset,
      });

      if (!users || users.length === 0) break;

      for (const user of users) {
        const primary = user.emailAddresses.find(
          (e) => e.id === user.primaryEmailAddressId,
        );
        const email = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
        if (email) {
          emails.push(email);
        }
      }

      if (users.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    console.error("[broadcast-email] Failed to fetch users from Clerk:", err);
    return NextResponse.json(
      { error: "Could not fetch user list from Clerk." },
      { status: 500 },
    );
  }

  if (emails.length === 0) {
    return NextResponse.json(
      { error: "No user emails found." },
      { status: 404 },
    );
  }

  // Send broadcast
  const result = await sendBroadcastEmail(emails, subject, body);

  return NextResponse.json({
    success: true,
    total: emails.length,
    sent: result.sent,
    failed: result.failed,
  });
}

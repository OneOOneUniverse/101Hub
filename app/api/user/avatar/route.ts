import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { avatarOptions, getAvatarById } from "@/lib/avatar-options";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await currentUser();
  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const avatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(avatarId);

  return NextResponse.json({
    avatarId: avatar.id,
    avatarSrc: avatar.src,
    options: avatarOptions,
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const avatarId =
    typeof (body as Record<string, unknown>).avatarId === "string"
      ? (body as Record<string, unknown>).avatarId
      : "";

  const avatar = avatarOptions.find((item) => item.id === avatarId);

  if (!avatar) {
    return NextResponse.json({ error: "Invalid avatar option." }, { status: 400 });
  }

  const user = await currentUser();
  const currentPublicMetadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const client = await clerkClient();

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...currentPublicMetadata,
      avatarId,
    },
  });

  return NextResponse.json({ ok: true, avatarId: avatar.id, avatarSrc: avatar.src });
}

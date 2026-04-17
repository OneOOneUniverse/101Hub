import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { isCurrentUserAdmin } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const folder = formData.get("folder");
  const mediaType = formData.get("type"); // "image" or "video"

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isVideo = mediaType === "video";

  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

  if (isVideo) {
    if (!allowedVideoTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only video files are allowed (MP4, WebM, MOV, AVI)." }, { status: 400 });
    }
  } else {
    if (!allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only image files are allowed (JPEG, PNG, WebP, GIF, AVIF)." }, { status: 400 });
    }
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100 MB video, 10 MB image
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${isVideo ? "100" : "10"} MB.` },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadFolder =
    typeof folder === "string" && folder.trim()
      ? `gadget-hub/${folder.trim().replace(/[^a-z0-9-_/]/gi, "-")}`
      : `gadget-hub/${isVideo ? "videos" : "products"}`;

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: uploadFolder,
          resource_type: isVideo ? "video" : "image",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Upload failed."));
          } else {
            resolve(result as { secure_url: string });
          }
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: `${isVideo ? "Video" : "Image"} upload failed. Check Cloudinary credentials.` }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  AdCreativeError,
  isCreativeVariant,
  isManagedAdPlacement,
  uploadAdCreative,
} from "@/lib/adCreatives";
import { hasAdminSession } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const placement = String(formData.get("placement") ?? "");
    const creativeVariant = String(formData.get("creativeVariant") ?? "default");
    const file = formData.get("file");

    if (!isManagedAdPlacement(placement)) {
      return NextResponse.json(
        { ok: false, error: "Unknown advertising placement." },
        { status: 400 },
      );
    }

    if (!isCreativeVariant(creativeVariant)) {
      return NextResponse.json(
        { ok: false, error: "Unknown creative variant." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Creative file is required." },
        { status: 400 },
      );
    }

    const creative = await uploadAdCreative({
      placement,
      creativeVariant,
      file,
      name: String(formData.get("name") ?? ""),
      clickUrl: String(formData.get("clickUrl") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      uploadedBy: "LeedsWire Admin",
    });

    return NextResponse.json({ ok: true, creative });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire creatives] upload failed", error);
    }

    if (error instanceof AdCreativeError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        {
          status:
            error.code === "INVALID_CREATIVE" ||
            error.code === "INVALID_CLICK_URL"
              ? 400
              : 503,
        },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unable to upload creative." },
      { status: 503 },
    );
  }
}

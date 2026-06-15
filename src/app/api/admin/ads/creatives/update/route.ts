import { NextResponse } from "next/server";
import {
  AdCreativeError,
  deleteAdCreative,
  setCreativeActive,
} from "@/lib/adCreatives";
import { hasAdminSession } from "@/lib/admin/auth";

type CreativeAction = "activate" | "deactivate" | "delete";

function isCreativeAction(value: string): value is CreativeAction {
  return value === "activate" || value === "deactivate" || value === "delete";
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      creativeId?: string;
      action?: string;
    };
    const creativeId = body.creativeId?.trim();
    const action = body.action?.trim() ?? "";

    if (!creativeId) {
      return NextResponse.json(
        { ok: false, error: "Creative ID is required." },
        { status: 400 },
      );
    }

    if (!isCreativeAction(action)) {
      return NextResponse.json(
        { ok: false, error: "Unknown creative action." },
        { status: 400 },
      );
    }

    if (action === "delete") {
      const deleted = await deleteAdCreative({
        creativeId,
        performedBy: "LeedsWire Admin",
      });

      return NextResponse.json({ ok: true, deleted });
    }

    const creative = await setCreativeActive({
      creativeId,
      active: action === "activate",
      performedBy: "LeedsWire Admin",
    });

    return NextResponse.json({ ok: true, creative });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire creatives] update failed", error);
    }

    if (error instanceof AdCreativeError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.code === "INVALID_CREATIVE" ? 400 : 503 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unable to update creative." },
      { status: 503 },
    );
  }
}

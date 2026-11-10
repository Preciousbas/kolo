import { readCircle } from "@/lib/circle";
import {
  demoNameByAddress,
  readSavedDemoState,
  savedStateAsCircleView,
} from "@/lib/demo-state";
import { getPackageId } from "@/lib/config";
import { redact } from "@/lib/redact";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const saved = readSavedDemoState();
  const names = demoNameByAddress(saved);

  try {
    const view = await readCircle({
      id,
      packageId: getPackageId() || saved.packageId || undefined,
      nameByAddress: names,
    });
    const body = JSON.stringify({
      ...view,
      name: saved.name,
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    const fallback = savedStateAsCircleView(saved);
    const body = JSON.stringify({
      ...fallback,
      name: saved.name,
      id: id || fallback.id,
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  }
}

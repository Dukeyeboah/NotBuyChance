import { runBasicSuggestions } from "@/lib/agent/discover";
import { discoveryRequestSchema, toDiscoveryInput } from "@/lib/validation";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 100_000) {
      return Response.json({ error: "That request is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The comparison request could not be read." }, { status: 400 });
  }

  const parsed = discoveryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Some details need another look." },
      { status: 400 },
    );
  }
  const ready = toDiscoveryInput(parsed.data.draft);
  if (!ready.ok) return Response.json({ error: ready.error }, { status: 400 });

  try {
    const recommendations = await runBasicSuggestions(ready.input);
    return Response.json({
      recommendations,
      note: "These ideas use the profile only. They are not Qloo results and they are not verified events.",
    });
  } catch (error) {
    console.error("[api/compare]", error instanceof Error ? error.message : "unknown");
    return Response.json(
      { error: "The basic comparison didn't finish. You can try again." },
      { status: 502 },
    );
  }
}

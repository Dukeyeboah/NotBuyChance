import { interpretRefinement, runDiscovery } from "@/lib/agent/discover";
import { discoveryRequestSchema, toDiscoveryInput } from "@/lib/validation";

export const maxDuration = 60;

const hits = new Map<string, number[]>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function clientMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("QLOO_API_KEY")) return "Qloo isn't configured on the server.";
  if (message.includes("OPENAI_API_KEY")) return "The language model isn't configured on the server.";
  if (message.includes("rejected the API key")) {
    return "Qloo rejected the API key. The key and QLOO_API_BASE need to be for the same host.";
  }
  if (message.includes("Qloo request failed")) return "Qloo didn't respond. You can try again.";
  if (message.includes("Model request failed")) return "The discovery model didn't respond. You can try again.";
  return "Discovery didn't finish. You can try again.";
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return Response.json(
      { error: "Too many discovery requests. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 100_000) {
      return Response.json({ error: "That request is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The discovery request could not be read." }, { status: 400 });
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        let input = ready.input;
        let summary: string | undefined;
        let patch = undefined;
        const note = parsed.data.refinementMessage?.trim();
        if (note) {
          send({ id: "understanding", message: "Reading what you'd like to change.", type: "phase" });
          const refined = await interpretRefinement(input, note);
          input = refined.input;
          summary = refined.summary;
          patch = refined.patch;
        }
        const result = await runDiscovery(input, (phase) => {
          send({ type: "phase", ...phase });
        }, note);
        send({ type: "result", result: { ...result, summary, patch } });
      } catch (error) {
        console.error("[api/discover]", error instanceof Error ? error.message : "unknown");
        send({ type: "error", message: clientMessage(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

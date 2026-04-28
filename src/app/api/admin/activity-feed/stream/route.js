import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import { isToegestaneAdminEmail } from "../../../../../lib/admin-paths";

/**
 * Server-Sent Events stream voor de admin activity-feed.
 *
 * Werkwijze:
 * - Auth: alleen admin met geldige sessie + e-mail in de allowlist.
 * - Query: ?since=<lastId>&type=<type|"alle">
 * - Pollt de ActivityEvent-tabel elke 3 seconden op id > since (en
 *   type-match), en schrijft elk nieuw event als één SSE-message.
 * - Stuurt elke 15 sec een keepalive-comment (':' regel) zodat
 *   tussenproxies de connectie niet droppen.
 * - Sluit de stream zelf na ~50 sec; EventSource reconnect automatisch
 *   en past dan het laatste id aan via Last-Event-ID.
 *
 * BigInt-quirk: ActivityEvent.id is BigInt; JSON.stringify kan dat niet
 * standaard. We converteren naar string voor het JSON-payload.
 */

export const dynamic = "force-dynamic";

const POLL_MS = 3000;
const KEEPALIVE_MS = 15000;
const MAX_DUUR_MS = 50000; // Net binnen Vercel 60s function-limit

function serializeEvent(e) {
  return {
    id: String(e.id),
    type: e.type,
    tijdstip: e.tijdstip.toISOString(),
    actorId: e.actorId,
    actorRol: e.actorRol,
    targetType: e.targetType,
    targetId: e.targetId,
    payload: e.payload,
  };
}

export async function GET(request) {
  const admin = await getCurrentUser();
  if (
    !admin ||
    !admin.isAdmin ||
    admin.rol !== "admin" ||
    !isToegestaneAdminEmail(admin.email)
  ) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const typeFilter = url.searchParams.get("type");
  const lastEventId = request.headers.get("last-event-id");
  // Voorrang: Last-Event-ID header (bij reconnect) > since query-param > 0
  const startId = BigInt(lastEventId || sinceParam || "0");

  const encoder = new TextEncoder();
  let cursor = startId;
  let pollInterval;
  let keepaliveInterval;
  let dichtTimer;
  let gesloten = false;

  const stream = new ReadableStream({
    async start(controller) {
      function schrijf(text) {
        if (gesloten) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          gesloten = true;
        }
      }

      function sluit() {
        if (gesloten) return;
        gesloten = true;
        clearInterval(pollInterval);
        clearInterval(keepaliveInterval);
        clearTimeout(dichtTimer);
        try {
          controller.close();
        } catch {}
      }

      // Begin met een keepalive-comment + ack-message zodat de client
      // weet dat de connectie staat
      schrijf(`: connected\n\n`);
      schrijf(
        `event: ack\ndata: ${JSON.stringify({ since: String(cursor) })}\n\n`
      );

      async function pollEnSchrijf() {
        if (gesloten) return;
        try {
          const where = { id: { gt: cursor } };
          if (typeFilter && typeFilter !== "alle") where.type = typeFilter;
          const nieuwe = await prisma.activityEvent.findMany({
            where,
            orderBy: { id: "asc" },
            take: 50,
          });
          for (const e of nieuwe) {
            const data = JSON.stringify(serializeEvent(e));
            // SSE: 'id:' regel laat de browser bij reconnect
            // de Last-Event-ID terugsturen — daarmee gaan we verder
            // waar we waren zonder dubbele entries.
            schrijf(`id: ${e.id}\ndata: ${data}\n\n`);
            cursor = e.id;
          }
        } catch (err) {
          console.error("[sse] poll-fout:", err);
        }
      }

      // Eerste poll direct na connect (voor events die in de tussentijd
      // tussen page-render en SSE-open zijn aangemaakt)
      await pollEnSchrijf();

      pollInterval = setInterval(pollEnSchrijf, POLL_MS);
      keepaliveInterval = setInterval(() => schrijf(`: ping\n\n`), KEEPALIVE_MS);
      dichtTimer = setTimeout(sluit, MAX_DUUR_MS);

      // Client disconnect: cleanup
      request.signal?.addEventListener("abort", sluit);
    },
    cancel() {
      gesloten = true;
      clearInterval(pollInterval);
      clearInterval(keepaliveInterval);
      clearTimeout(dichtTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // schakelt buffering uit op Nginx-style proxies
    },
  });
}

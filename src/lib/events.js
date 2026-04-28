import { createHash } from "crypto";
import { after } from "next/server";
import { prisma } from "./prisma";

/**
 * Sovereign Guardian — ActivityEvent emit-helper
 *
 * Roep emitActivity() aan vanuit elke API-route die een belangrijke
 * business-actie doet (klus aangemaakt, lead gekocht, review geplaatst,
 * gebruiker geregistreerd, etc.).
 *
 * Het emitten gebeurt via Next.js after() — het gebeurt NA de response,
 * dus de gebruiker wacht er niet op. Faalt het emitten? Dan wordt het
 * gelogd maar de gebruiker merkt er niets van.
 *
 * Dit vormt het fundament voor:
 * - Live activity feed
 * - User Journey Timeline
 * - KPI-aggregaties (klussen vandaag, leads-trend)
 * - Anomalie-detectie (bursts, ongebruikelijke patronen)
 */

// Gestandaardiseerde event-types — voeg toe wanneer nieuwe modules
// erbij komen, maar wijzig nooit een bestaand type (breekt historie).
export const EVENT_TYPES = {
  KLUS_AANGEMAAKT: "klus.aangemaakt",
  KLUS_GOEDGEKEURD: "klus.goedgekeurd",
  KLUS_VERWIJDERD: "klus.verwijderd",
  KLUS_GESLOTEN: "klus.gesloten",
  LEAD_GEKOCHT: "lead.gekocht",
  REVIEW_GEPLAATST: "review.geplaatst",
  REACTIE_GEPLAATST: "reactie.geplaatst",
  GEBRUIKER_GEREGISTREERD: "gebruiker.geregistreerd",
  GEBRUIKER_INGELOGD: "gebruiker.ingelogd",
  ADMIN_INGREEP: "admin.ingreep",
};

function hashIp(ip) {
  if (!ip) return null;
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

/**
 * Schrijf één event naar de ActivityEvent-tabel.
 * Wordt asynchroon uitgevoerd via after() zodat de hoofdrequest niet
 * wacht. Bij fout wordt gelogd, niet gegooid — events zijn observability,
 * geen business-critical writes.
 *
 * @param {object} args
 * @param {string} args.type - één van EVENT_TYPES (of een nieuwe gestandaardiseerde dotted-naam)
 * @param {object|null} args.actor - { id, rol } van wie het deed; null voor system-events
 * @param {string|null} args.targetType - 'klus' | 'lead' | 'review' | 'user' | etc.
 * @param {number|null} args.targetId
 * @param {object} args.payload - event-specifieke data (zonder PII waar mogelijk)
 * @param {string|null} args.ipAdres - voor IP-hash
 */
export function emitActivity({
  type,
  actor = null,
  targetType = null,
  targetId = null,
  payload = {},
  ipAdres = null,
}) {
  if (!type || typeof type !== "string" || !type.includes(".")) {
    console.warn("[events] emitActivity: ongeldig type, skipped:", type);
    return;
  }

  const eventData = {
    type,
    actorId: actor?.id ?? null,
    actorRol: actor?.rol ?? null,
    targetType,
    targetId,
    payload,
    ipHash: hashIp(ipAdres),
  };

  // after() zorgt dat de event-write NA de response gebeurt. De
  // gebruiker wacht er niet op. Bij geen-after-context (bv. cron-job)
  // schrijven we synchroon.
  try {
    after(async () => {
      try {
        await prisma.activityEvent.create({ data: eventData });
      } catch (err) {
        console.error("[events] kon event niet schrijven:", type, err);
      }
    });
  } catch {
    // after() is niet beschikbaar (bv. binnen een cron). Schrijf synchroon.
    prisma.activityEvent
      .create({ data: eventData })
      .catch((err) =>
        console.error("[events] sync write mislukt:", type, err)
      );
  }
}

/**
 * Hulp-helper voor het ophalen van het IP uit een Request — netjes
 * met fallback op forwarding-headers voor Vercel/proxies.
 */
export function ipFromRequest(request) {
  if (!request) return null;
  const xff = request.headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers?.get?.("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

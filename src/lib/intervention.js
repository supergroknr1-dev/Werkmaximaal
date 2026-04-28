import { appendAudit, AUDIT_CATEGORIEEN, AUDIT_MIN_REDEN } from "./audit";

/**
 * Sovereign Guardian — Intervention helper (server-side)
 *
 * Wordt aangeroepen door admin-routes die data muteren. Leest de
 * X-Intervention-Reden + X-Intervention-Categorie headers (gezet door
 * de client-wrapper in lib/intervention-api.js), valideert ze en
 * schrijft een audit-log rij via appendAudit.
 *
 * Bij ontbrekende of ongeldige headers wordt InterventionError gegooid;
 * de caller vangt die en stuurt een 400-response terug.
 */

export class InterventionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "InterventionError";
    this.status = status;
  }
}

function leesIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  return real ? real.trim() : null;
}

/**
 * Lees + valideer headers en schrijf een audit-log rij.
 *
 * @param {object} args
 * @param {Request} args.request - de inkomende Next-request
 * @param {object} args.admin - { id, naam } van de admin (uit getCurrentUser)
 * @param {string} args.actie - dotted naam, bv. 'vakman.verwijderd'
 * @param {string} args.targetType - 'user' | 'klus' | 'review' | etc.
 * @param {number|null} args.targetId
 * @param {object} args.payload - context (before/after, betrokken velden)
 * @returns {Promise<object>} de aangemaakte AuditLog rij
 * @throws {InterventionError} bij ontbreken/ongeldige headers
 */
export async function logIntervention({
  request,
  admin,
  actie,
  targetType,
  targetId = null,
  payload = {},
}) {
  const redenRaw = request.headers.get("x-intervention-reden");
  const categorie = request.headers.get("x-intervention-categorie");

  if (!redenRaw) {
    throw new InterventionError(
      "Reden ontbreekt. Vul de bevestigings-dialoog in voor admin-acties."
    );
  }
  if (!categorie) {
    throw new InterventionError(
      "Categorie ontbreekt. Kies een categorie in de bevestigings-dialoog."
    );
  }
  if (!AUDIT_CATEGORIEEN.includes(categorie)) {
    throw new InterventionError(`Onbekende categorie: ${categorie}`);
  }

  let reden;
  try {
    reden = decodeURIComponent(redenRaw).trim();
  } catch {
    throw new InterventionError("Reden bevat ongeldige tekens.");
  }
  if (reden.length < AUDIT_MIN_REDEN) {
    throw new InterventionError(
      `Reden moet minimaal ${AUDIT_MIN_REDEN} tekens zijn (was ${reden.length}).`
    );
  }

  return appendAudit({
    admin,
    actie,
    actieCategorie: categorie,
    targetType,
    targetId,
    payload,
    reden,
    ipAdres: leesIp(request),
    userAgent: request.headers.get("user-agent") || null,
  });
}

import { createHash } from "crypto";
import { prisma } from "./prisma";

/**
 * Sovereign Guardian — Audit Log helper
 *
 * Elke admin-actie die data muteert moet via deze helper. Twee redenen:
 * 1. Verplichte reden (≥ 30 tekens) zorgt dat acties achteraf
 *    herleidbaar zijn.
 * 2. Hash-chain: elke rij bevat de SHA-256 van de vorige rij. Als
 *    iemand een rij verwijdert of aanpast, breekt de chain en wordt
 *    dat opgemerkt door de verify-cron.
 *
 * Database-level borging tegen UPDATE/DELETE komt later via Postgres-
 * rules. Voor nu vertrouwen we op de application-laag + verify.
 */

const MIN_REDEN_LENGTE = 30;

const TOEGESTANE_CATEGORIEEN = [
  "compliance", // KYC, klus-moderatie, account-pause
  "pricing", // Lead-prijs, surge, boost-campagnes
  "ranking", // Match-algoritme, Trusted-Pro
  "support", // Wachtwoord-reset, bemiddeling, impersonatie
  "data", // Inzage PII, regulatory export
  "settings", // Admin-rollen, alert-routing, retentie
];

function bufferToHex(buf) {
  if (!buf) return null;
  return Buffer.from(buf).toString("hex");
}

/**
 * Bereken de SHA-256 hash voor een audit-log rij.
 * Combineert de relevante velden + de vorige hash om de keten op
 * te bouwen.
 */
function computeHash(row, vorigHash) {
  const hash = createHash("sha256");
  hash.update(String(row.adminId));
  hash.update("|");
  hash.update(row.actie);
  hash.update("|");
  hash.update(row.actieCategorie);
  hash.update("|");
  hash.update(row.targetType);
  hash.update("|");
  hash.update(String(row.targetId ?? ""));
  hash.update("|");
  hash.update(JSON.stringify(row.payload ?? {}));
  hash.update("|");
  hash.update(row.reden);
  hash.update("|");
  hash.update(row.tijdstip.toISOString());
  if (vorigHash) {
    hash.update("|");
    hash.update(vorigHash);
  }
  return hash.digest();
}

/**
 * Voeg een entry toe aan de audit-log.
 *
 * @param {object} args
 * @param {object} args.admin - { id, naam }
 * @param {string} args.actie - bv. 'vakman.frozen' | 'klus.verwijderd'
 * @param {string} args.actieCategorie - één van TOEGESTANE_CATEGORIEEN
 * @param {string} args.targetType - 'user' | 'klus' | 'review' | etc.
 * @param {number|null} args.targetId
 * @param {object} args.payload - context (before/after, kvk-nummer, etc.)
 * @param {string} args.reden - verplicht ≥ 30 tekens
 * @param {string|null} args.ipAdres
 * @param {string|null} args.userAgent
 * @param {number|null} args.goedgekeurdDoor - voor 4-ogen-flow
 * @returns {Promise<object>} de aangemaakte AuditLog rij
 * @throws {Error} bij ongeldige input
 */
export async function appendAudit({
  admin,
  actie,
  actieCategorie,
  targetType,
  targetId = null,
  payload = {},
  reden,
  ipAdres = null,
  userAgent = null,
  goedgekeurdDoor = null,
}) {
  // Input-validatie
  if (!admin || !admin.id) {
    throw new Error("appendAudit: admin object met id is verplicht");
  }
  if (typeof actie !== "string" || !actie.includes(".")) {
    throw new Error(
      "appendAudit: actie moet een dotted naam zijn, bv. 'vakman.frozen'"
    );
  }
  if (!TOEGESTANE_CATEGORIEEN.includes(actieCategorie)) {
    throw new Error(
      `appendAudit: actieCategorie moet één van: ${TOEGESTANE_CATEGORIEEN.join(", ")}`
    );
  }
  if (typeof reden !== "string" || reden.trim().length < MIN_REDEN_LENGTE) {
    throw new Error(
      `appendAudit: reden moet minimaal ${MIN_REDEN_LENGTE} tekens zijn`
    );
  }

  // Lees laatste hash voor de chain. We gebruiken een transactie zodat
  // er geen race condition is: als twee admins tegelijk een actie doen,
  // ziet de tweede de eerste rij.
  const result = await prisma.$transaction(async (tx) => {
    const laatste = await tx.auditLog.findFirst({
      orderBy: { id: "desc" },
      select: { rijHash: true },
    });
    const vorigHash = laatste?.rijHash ?? null;

    const tijdstip = new Date();
    const conceptRij = {
      tijdstip,
      adminId: admin.id,
      actie,
      actieCategorie,
      targetType,
      targetId,
      payload,
      reden: reden.trim(),
    };
    const rijHash = computeHash(conceptRij, vorigHash);

    return tx.auditLog.create({
      data: {
        ...conceptRij,
        adminNaam: admin.naam || `admin#${admin.id}`,
        ipAdres,
        userAgent,
        goedgekeurdDoor,
        goedgekeurdOp: goedgekeurdDoor ? new Date() : null,
        vorigHash,
        rijHash,
      },
    });
  });

  return result;
}

/**
 * Verifieer de hele hash-chain. Geeft `{ ok: true, geverifieerd: N }`
 * of `{ ok: false, breukBijId: BigInt, reden: string }`.
 *
 * Wordt gebruikt door de nightly verify-cron en kan ook handmatig
 * vanuit de admin-UI worden aangeroepen.
 */
export async function verifyAuditChain({ batchSize = 1000 } = {}) {
  let cursor = 0n;
  let geverifieerd = 0;
  let vorigHash = null;

  while (true) {
    const rows = await prisma.auditLog.findMany({
      where: { id: { gt: cursor } },
      orderBy: { id: "asc" },
      take: batchSize,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      // Check vorigHash-link
      const expectedVorig = vorigHash;
      const actualVorigHex = bufferToHex(row.vorigHash);
      const expectedVorigHex = bufferToHex(expectedVorig);
      if (actualVorigHex !== expectedVorigHex) {
        return {
          ok: false,
          breukBijId: row.id,
          reden: `vorigHash-mismatch (verwacht ${expectedVorigHex}, gevonden ${actualVorigHex})`,
        };
      }

      // Recompute eigen hash
      const expectedHash = computeHash(row, vorigHash);
      if (bufferToHex(expectedHash) !== bufferToHex(row.rijHash)) {
        return {
          ok: false,
          breukBijId: row.id,
          reden: "rijHash-mismatch — payload of velden zijn gewijzigd",
        };
      }

      vorigHash = row.rijHash;
      geverifieerd += 1;
    }

    cursor = rows[rows.length - 1].id;
  }

  return { ok: true, geverifieerd };
}

export const AUDIT_CATEGORIEEN = TOEGESTANE_CATEGORIEEN;
export const AUDIT_MIN_REDEN = MIN_REDEN_LENGTE;

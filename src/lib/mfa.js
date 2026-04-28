import { authenticator } from "otplib";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

/**
 * MFA-helper rond `otplib` (TOTP / RFC 6238).
 *
 * Workflow:
 *   1. `genereerSecret()` → base32 secret + otpauth-URI + QR-data-URL.
 *      Toon QR + secret op de setup-pagina. Slaat NIETS op in de DB —
 *      dat doet de verify-stap pas zodra de gebruiker een geldige code
 *      heeft ingevoerd.
 *   2. `verifieerCode(secret, code)` → true/false.
 *   3. `genereerRecoveryCodes()` → 8 plaintext codes + bcrypt-hashes.
 *      Plaintext eenmalig tonen, hashes in DB opslaan.
 *   4. `verifieerRecoveryCode(plaintext, hashes)` → { ok, nieuweHashes }.
 *      Bij succes: hash uit array verwijderen zodat de code niet
 *      hergebruikt kan worden.
 */

// Time-window: tolereer 4 stappen voor en achter (= ±2 minuten) zodat
// kloksynchronisatie-verschillen tussen server en telefoon niet leiden
// tot "code klopt niet". TOTP-standaard is ±30s, maar in de praktijk
// hebben telefoons soms meer drift; ±2 min is nog ruim binnen veilige
// marges (een gestolen 6-cijferige code blijft maar ~5 min geldig).
authenticator.options = { window: 4, step: 30 };

const ISSUER = "Werkmaximaal";

export function genereerSecret() {
  return authenticator.generateSecret();
}

export async function genereerSetupData({ accountLabel, secret }) {
  const otpauthUri = authenticator.keyuri(accountLabel, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  return { otpauthUri, qrDataUrl };
}

export function verifieerCode(secret, code) {
  if (!secret || typeof code !== "string") return false;
  const opgeschoond = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(opgeschoond)) return false;
  try {
    return authenticator.check(opgeschoond, secret);
  } catch {
    return false;
  }
}

const RECOVERY_AANTAL = 8;
const RECOVERY_LENGTE = 10; // 10 hex-tekens = ruim voldoende entropie

function genereerEnkeleRecoveryCode() {
  // 5 random bytes → 10 hex chars, in twee groepen van 5 voor leesbaarheid
  const hex = randomBytes(5).toString("hex").toUpperCase();
  return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`;
}

export async function genereerRecoveryCodes() {
  const plaintext = [];
  const hashes = [];
  for (let i = 0; i < RECOVERY_AANTAL; i += 1) {
    const code = genereerEnkeleRecoveryCode();
    plaintext.push(code);
    hashes.push(await bcrypt.hash(code, 10));
  }
  return { plaintext, hashes };
}

/**
 * Probeer een recovery-code te matchen. Bij succes geeft de helper een
 * nieuwe hashes-array terug zonder de gebruikte hash erin — caller
 * moet die naar de DB schrijven om hergebruik te voorkomen.
 */
export async function verifieerRecoveryCode(plaintextRaw, hashes) {
  if (!plaintextRaw || !Array.isArray(hashes)) return { ok: false };
  const plaintext = plaintextRaw.replace(/\s/g, "").toUpperCase();
  if (!/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(plaintext)) return { ok: false };
  for (let i = 0; i < hashes.length; i += 1) {
    const klopt = await bcrypt.compare(plaintext, hashes[i]);
    if (klopt) {
      const nieuweHashes = hashes.filter((_, idx) => idx !== i);
      return { ok: true, nieuweHashes };
    }
  }
  return { ok: false };
}

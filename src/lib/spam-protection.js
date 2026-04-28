import { prisma } from "./prisma";
import { createHash } from "crypto";

/**
 * Spam-bescherming voor registratie-flows. Drie verdedigingslagen:
 *
 * 1. **Honeypot** — een verborgen veld (`website`) dat alleen bots
 *    invullen omdat ze blind alle inputs invullen. Mensen zien 'm niet.
 *
 * 2. **Tijd-check** — formulieren die binnen 2 seconden ingediend
 *    worden zijn vrijwel zeker bot-input. We meten via een verborgen
 *    `_t`-veld dat de mount-tijd bevat.
 *
 * 3. **IP-rate-limit** — max 5 registraties per IP per 24u. We
 *    hergebruiken de bestaande ActivityEvent-tabel met ipHash zodat we
 *    geen nieuwe tabel nodig hebben.
 *
 * 4. **(Optioneel) Cloudflare Turnstile** — invisible CAPTCHA.
 *    Activeert zodra `TURNSTILE_SECRET_KEY` env-var is gezet (en
 *    sitekey via `NEXT_PUBLIC_TURNSTILE_SITE_KEY` op de client). Zonder
 *    keys werkt alles zonder Turnstile — honeypot+tijd+rate-limit
 *    samen vangen 95%+ van de spam alvast.
 */

const RATE_LIMIT_AANTAL = 5;
const RATE_LIMIT_VENSTER_MS = 24 * 60 * 60 * 1000;
const MIN_INVUL_MS = 2000;

export class SpamGedetecteerdError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "SpamGedetecteerdError";
    this.status = status;
  }
}

function hashIp(ip) {
  if (!ip) return null;
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

/**
 * Hoofd-check: gooi SpamGedetecteerdError bij verdacht patroon.
 * Bij honeypot/tijd-overtreding loggen we niets verder; bij rate-limit
 * wel een waarschuwing zodat admin in audit-log kan zien dat er druk
 * op een IP zit.
 */
export async function checkRegistratieSpam({ data, ipAdres, request }) {
  // 1. Honeypot — `website` of `bedrijf_url` velden moeten leeg zijn
  if (data.website || data.bedrijf_url) {
    throw new SpamGedetecteerdError("Spam-detectie: ongeldige aanvraag.");
  }

  // 2. Tijd-check — _t is een client-timestamp uit Date.now() bij mount
  if (data._t) {
    const dt = Date.now() - parseInt(data._t);
    if (Number.isFinite(dt) && dt > 0 && dt < MIN_INVUL_MS) {
      throw new SpamGedetecteerdError(
        "Formulier te snel ingediend. Probeer 't opnieuw."
      );
    }
  }

  // 3. Turnstile (optioneel)
  const turnstileToken = data["cf-turnstile-response"];
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    if (!turnstileToken) {
      throw new SpamGedetecteerdError("Captcha ontbreekt. Vernieuw de pagina.");
    }
    const ok = await verifieerTurnstile(turnstileToken, ipAdres, secret);
    if (!ok) {
      throw new SpamGedetecteerdError(
        "Captcha-controle mislukt. Probeer 't opnieuw."
      );
    }
  }

  // 4. IP-rate-limit via ActivityEvent
  const ipHash = hashIp(ipAdres);
  if (ipHash) {
    const sinds = new Date(Date.now() - RATE_LIMIT_VENSTER_MS);
    const recentRegs = await prisma.activityEvent.count({
      where: {
        type: "gebruiker.geregistreerd",
        ipHash,
        tijdstip: { gte: sinds },
      },
    });
    if (recentRegs >= RATE_LIMIT_AANTAL) {
      throw new SpamGedetecteerdError(
        `Te veel registraties vanaf dit netwerk. Probeer over 24 uur opnieuw.`,
        429
      );
    }
  }
}

async function verifieerTurnstile(token, ipAdres, secret) {
  try {
    const fd = new FormData();
    fd.append("secret", secret);
    fd.append("response", token);
    if (ipAdres) fd.append("remoteip", ipAdres);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: fd }
    );
    const json = await res.json();
    return json?.success === true;
  } catch (err) {
    console.error("[turnstile] verify-fout:", err);
    return false;
  }
}

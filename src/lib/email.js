import { Resend } from "resend";

/**
 * Email-helper rond Resend.
 *
 * Configuratie via env:
 *   RESEND_API_KEY   - vereist om mails te versturen
 *   EMAIL_VAN        - afzender, default 'Werkmaximaal <onboarding@resend.dev>'
 *                      Op productie aanpassen naar een geverifieerd domein
 *                      (bv. 'klussen@werkmaximaal.nl').
 *   EMAIL_BASE_URL   - basis-URL voor links in mails (klus-pagina), default
 *                      'https://werkmaximaal.vercel.app'.
 *
 * Fail-soft: als RESEND_API_KEY ontbreekt loggen we een warning en doen niets.
 * Zo kunnen we lokaal testen zonder echte mails te sturen, en blokkeert
 * een gemiste env-var nooit een succesvolle klus-goedkeuring.
 */

const VAN = process.env.EMAIL_VAN || "Werkmaximaal <onboarding@resend.dev>";
const BASE_URL = process.env.EMAIL_BASE_URL || "https://werkmaximaal.vercel.app";

let resend = null;
function getResend() {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Stuur één vakman een bericht over een nieuwe klus in zijn werkgebied.
 *
 * @param {object} args
 * @param {object} args.vakman - { id, email, naam, bedrijfsnaam, vakmanType }
 * @param {object} args.klus   - { id, titel, beschrijving, postcode, plaats, categorie }
 * @returns {Promise<{ ok: boolean, skipped?: string, error?: string, id?: string }>}
 */
export async function stuurVakmanLeadAlert({ vakman, klus }) {
  const client = getResend();
  if (!client) {
    console.warn(
      "[email] RESEND_API_KEY niet gezet — overgeslagen:",
      `vakman=${vakman.email}`,
      `klus=${klus.id}`
    );
    return { ok: false, skipped: "geen-api-key" };
  }

  const naam = vakman.bedrijfsnaam || vakman.naam || "vakman";
  const klusUrl = `${BASE_URL}/klussen/${klus.id}`;
  const onderwerp = `Nieuwe klus in jouw werkgebied: ${klus.titel}`;

  const klusBeschrijving = klus.beschrijving
    ? klus.beschrijving.length > 250
      ? klus.beschrijving.slice(0, 250) + "…"
      : klus.beschrijving
    : "";

  const html = `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <tr><td style="padding:24px 28px 8px 28px;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Werkmaximaal</p>
            <h1 style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">Nieuwe klus in jouw werkgebied</h1>
          </td></tr>
          <tr><td style="padding:8px 28px 16px 28px;font-size:14px;line-height:1.55;color:#334155;">
            <p style="margin:0;">Hoi ${escapeHtml(naam)},</p>
            <p style="margin:12px 0 0 0;">Er is een nieuwe klus aangemaakt die binnen je werkgebied valt. Bekijk 'm en koop de lead als je interesse hebt — de eerste die kan helpen krijgt vaak de klus.</p>
          </td></tr>
          <tr><td style="padding:0 28px 4px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
              <tr><td style="padding:14px 16px;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(klus.titel)}</p>
                <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">${escapeHtml(klus.categorie || "Geen categorie")} &middot; ${escapeHtml(klus.postcode || "")} ${escapeHtml(klus.plaats || "")}</p>
                ${klusBeschrijving ? `<p style="margin:10px 0 0 0;font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(klusBeschrijving)}</p>` : ""}
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:20px 28px 24px 28px;">
            <a href="${klusUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 18px;border-radius:6px;">Bekijk klus</a>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
            Je krijgt deze mail omdat je werkgebied (postcode/plaats) overeenkomt met de klus. Wil je deze meldingen niet meer ontvangen? Laat het ons weten.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const tekst = [
    `Hoi ${naam},`,
    "",
    `Er is een nieuwe klus aangemaakt die binnen je werkgebied valt.`,
    "",
    `Klus: ${klus.titel}`,
    `Categorie: ${klus.categorie || "—"}`,
    `Locatie: ${klus.postcode || ""} ${klus.plaats || ""}`.trim(),
    klusBeschrijving ? `\n${klusBeschrijving}` : "",
    "",
    `Bekijk de klus: ${klusUrl}`,
    "",
    "— Werkmaximaal",
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    const res = await client.emails.send({
      from: VAN,
      to: vakman.email,
      subject: onderwerp,
      html,
      text: tekst,
    });
    return { ok: true, id: res?.data?.id };
  } catch (err) {
    console.error("[email] verzending mislukt:", vakman.email, err?.message);
    return { ok: false, error: err?.message || "onbekende fout" };
  }
}

/**
 * Stuur een chat-notificatie naar de wederpartij. Wordt aangeroepen vanuit
 * de chat-POST-handler (fire-and-forget via after()) zodra een bericht
 * is opgeslagen.
 *
 * @param {object} args
 * @param {object} args.ontvanger - { email, naam, bedrijfsnaam? }
 * @param {string} args.afzenderNaam - bedrijfsnaam of naam van de afzender
 * @param {string} args.klusTitel
 * @param {string} args.tekst - bericht-inhoud (wordt afgekapt op 250 tekens in preview)
 * @param {string} args.link - absolute URL naar de pagina waar ontvanger kan reageren
 */
export async function stuurChatNotificatie({ ontvanger, afzenderNaam, klusTitel, tekst, link }) {
  const client = getResend();
  if (!client) {
    console.warn(
      "[email] RESEND_API_KEY niet gezet — chat-notificatie overgeslagen:",
      `naar=${ontvanger.email}`
    );
    return { ok: false, skipped: "geen-api-key" };
  }

  const naam = ontvanger.bedrijfsnaam || ontvanger.naam || "daar";
  const onderwerp = `Nieuw bericht van ${afzenderNaam} over ${klusTitel}`;
  const preview = tekst.length > 250 ? tekst.slice(0, 250) + "…" : tekst;

  const html = `<!DOCTYPE html>
<html lang="nl">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <tr><td style="padding:24px 28px 8px 28px;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Werkmaximaal</p>
            <h1 style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">Nieuw bericht van ${escapeHtml(afzenderNaam)}</h1>
          </td></tr>
          <tr><td style="padding:8px 28px 16px 28px;font-size:14px;line-height:1.55;color:#334155;">
            <p style="margin:0;">Hoi ${escapeHtml(naam)},</p>
            <p style="margin:12px 0 0 0;"><strong>${escapeHtml(afzenderNaam)}</strong> stuurde u een bericht over <em>${escapeHtml(klusTitel)}</em>:</p>
          </td></tr>
          <tr><td style="padding:0 28px 4px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-left:3px solid #10b981;border-radius:0 6px 6px 0;">
              <tr><td style="padding:14px 16px;font-size:14px;line-height:1.55;color:#334155;white-space:pre-wrap;">${escapeHtml(preview)}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:20px 28px 24px 28px;">
            <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 18px;border-radius:6px;">Open gesprek</a>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
            U krijgt deze mail omdat ${escapeHtml(afzenderNaam)} u een bericht stuurde via Werkmaximaal. Reageer alleen via de link hierboven — antwoorden op deze mail komt niet aan.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const tekstVersie = [
    `Hoi ${naam},`,
    "",
    `${afzenderNaam} stuurde u een bericht over "${klusTitel}":`,
    "",
    preview,
    "",
    `Open gesprek: ${link}`,
    "",
    "— Werkmaximaal",
  ].join("\n");

  try {
    const res = await client.emails.send({
      from: VAN,
      to: ontvanger.email,
      subject: onderwerp,
      html,
      text: tekstVersie,
    });
    return { ok: true, id: res?.data?.id };
  } catch (err) {
    console.error("[email] chat-notificatie mislukt:", ontvanger.email, err?.message);
    return { ok: false, error: err?.message || "onbekende fout" };
  }
}

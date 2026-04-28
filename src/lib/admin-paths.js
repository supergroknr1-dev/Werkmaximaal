/**
 * Centrale plek voor admin-paden + de e-mail-allowlist.
 *
 * Om de admin-URL te roteren:
 * 1. Pas `ADMIN_LOGIN_PATH` + `ADMIN_LOGIN_API` hieronder aan
 * 2. Hernoem `src/app/management-secure-login/` en
 *    `src/app/api/management-login/` naar de nieuwe paden
 * 3. Pas `middleware.js` aan zodat het de oude URL 404'd
 *
 * Die handmatige stap is bewust — Next.js routing volgt mappen, dus
 * de URL en de folder moeten gelijk zijn.
 *
 * `ADMIN_EMAIL` is wél env-configureerbaar zodat een andere admin
 * (bijv. een nieuwe medewerker) toegevoegd kan worden zonder code-deploy.
 */

export const ADMIN_LOGIN_PATH = "/management-secure-login";
export const ADMIN_LOGIN_API = "/api/management-login";

export const ADMIN_EMAIL =
  (process.env.ADMIN_EMAIL || "s.ozkara09@gmail.com").toLowerCase();

export function isToegestaneAdminEmail(email) {
  if (!email) return false;
  return String(email).toLowerCase() === ADMIN_EMAIL;
}

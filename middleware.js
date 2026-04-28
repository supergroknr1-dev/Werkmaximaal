import { NextResponse } from "next/server";

/**
 * Sovereign Guardian — request-boundary middleware
 *
 * Drie verantwoordelijkheden:
 *
 * 1. Strikte 404 voor de oude admin-URL's (`/admin-login*`,
 *    `/api/admin-login*`). Bots die deze paden scannen krijgen niets
 *    terug. Voorkomt ook dat oude bookmarks per ongeluk werken.
 *
 * 2. Redirect naar de admin-login als iemand `/admin*` opvraagt zónder
 *    sessie-cookie. Spaart een server-rendering (geen DB-call) en geeft
 *    bots geen 200-response op admin-paden.
 *
 * 3. (Niet in middleware) De échte e-mail-allowlist + rol-check
 *    gebeurt in `src/app/admin/layout.js`. Middleware draait op de Edge
 *    en heeft geen DB-toegang; vandaar de tweetraps-aanpak.
 *
 * NB: de admin-URL is geconfigureerd in `src/lib/admin-paths.js`.
 *     We dupliceren 'm hier omdat middleware geen src-imports kan
 *     resolven via tsconfig-paths in alle setups; aanpassen op
 *     beide plekken bij rotatie.
 */

const ADMIN_LOGIN_PATH = "/management-secure-login";
const SESSION_COOKIE = "werkmaximaal_session";

// Oude paden die we hard 404'en — bots laat staan, oude bookmarks ook
const VERBODEN_PADEN = ["/admin-login", "/api/admin-login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Verboden oude paden — directe 404
  if (
    VERBODEN_PADEN.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. Admin-paden zonder sessie-cookie → redirect naar login
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const cookie = request.cookies.get(SESSION_COOKIE);
    if (!cookie) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN_PATH;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/admin-login",
    "/admin-login/:path*",
    "/api/admin-login",
    "/api/admin-login/:path*",
  ],
};

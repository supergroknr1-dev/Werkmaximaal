"use client";

import { usePathname } from "next/navigation";
import IngelogdSidebar from "./IngelogdSidebar";
import IngelogdTopBar from "./IngelogdTopBar";
import AdminToolbar from "./AdminToolbar";
import CookieBanner from "./CookieBanner";
import PubliekFooter from "./PubliekFooter";
import { ADMIN_LOGIN_PATH } from "../lib/admin-paths";

/**
 * Wrapper voor de hele app. Drie verantwoordelijkheden:
 *  - IngelogdSidebar tonen voor ingelogde consumenten/vakmannen op
 *    niet-/admin- en niet-auth-pagina's
 *  - AdminToolbar bovenin tonen voor admins op publieke pagina's
 *    (en voor shadow-mode altijd, ook op auth-pagina's)
 *  - Gewone passthrough in alle andere gevallen
 */
const AUTH_PATHS = [
  "/inloggen",
  "/registreren",
  "/voltooien",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
  "/management-secure-login",
];

export default function GlobalShell({ user, adminInfo, children }) {
  const pathname = usePathname() || "/";

  const opAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const opAuthPad = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Sidebar alleen voor consument/vakman — admin heeft eigen layout,
  // andere rollen krijgen alleen de topbalk op publieke pagina's.
  const moetSidebar =
    !!user &&
    (user.rol === "consument" || user.rol === "vakman") &&
    !opAdmin &&
    !opAuthPad;

  // Admin-toolbar verbergen op /admin/* (admin is daar al in z'n
  // eigen omgeving) en op auth-pagina's (anders: 'Terug naar Admin'
  // op het login-scherm — verwarrend).
  // Shadow-mode tonen we wél op auth-pagina's: dan kan de admin
  // direct stoppen als 'ie per ongeluk doorklikt.
  const toonToolbar =
    adminInfo &&
    !opAdmin &&
    (adminInfo.kind === "shadow" || !opAuthPad);

  // Topbalk tonen op alle pagina's waar de user ingelogd is — behalve op
  // /admin/* (admin-layout monteert er zelf één met juiste redirect-URL)
  // en auth-pagina's (zou afleiden van inloggen).
  const toonTopBar = !!user && !opAdmin && !opAuthPad;
  const topBar = toonTopBar ? (
    <IngelogdTopBar
      naam={user.naam}
      voornaam={user.voornaam}
      redirectNa={user.rol === "admin" ? ADMIN_LOGIN_PATH : "/"}
    />
  ) : null;

  const inhoud = moetSidebar ? (
    <div className="min-h-screen bg-gray-50">
      <IngelogdSidebar
        rol={user.rol}
        vakmanType={user.vakmanType}
        naam={user.naam}
      />
      <div className="md:pl-60">
        {topBar}
        {children}
      </div>
    </div>
  ) : (
    <>
      {topBar}
      {children}
    </>
  );

  // Cookie-banner + footer alleen op publieke pagina's — niet op
  // admin-area (heeft eigen navigatie) en niet op auth-flows (zou
  // afleiden van inloggen).
  const toonPubliekChrome = !opAdmin && !opAuthPad;

  return (
    <>
      {toonToolbar && <AdminToolbar info={adminInfo} />}
      {inhoud}
      {toonPubliekChrome && <PubliekFooter />}
      {toonPubliekChrome && <CookieBanner />}
    </>
  );
}

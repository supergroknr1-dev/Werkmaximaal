"use client";

import { usePathname } from "next/navigation";
import IngelogdSidebar from "./IngelogdSidebar";

/**
 * Wrapper voor de hele app. Toont de IngelogdSidebar links wanneer:
 *  - er een ingelogde gebruiker is (rol consument of vakman), én
 *  - we niet binnen /admin zitten (heeft eigen sidebar), én
 *  - we niet op een auth-pagina zitten (/inloggen, /registreren, etc.)
 * In alle andere gevallen (anoniem of admin) rendert de wrapper de
 * children gewoon zonder shell.
 */
const AUTH_PATHS = [
  "/inloggen",
  "/registreren",
  "/voltooien",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
];

export default function GlobalShell({ user, children }) {
  const pathname = usePathname() || "/";

  const opAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const opAuthPad = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const moetSidebar = !!user && !opAdmin && !opAuthPad;

  if (!moetSidebar) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <IngelogdSidebar
        rol={user.rol}
        vakmanType={user.vakmanType}
        naam={user.naam}
      />
      <div className="md:pl-60">{children}</div>
    </div>
  );
}

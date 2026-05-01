import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { ADMIN_LOGIN_PATH, isToegestaneAdminEmail } from "../../lib/admin-paths";

export const metadata = {
  title: "Admin Center — Werkmaximaal",
};

/**
 * Top-level admin-layout: auth + admin-rol-check.
 *
 * Geen MFA-gate hier — die zit in `src/app/admin/(gated)/layout.js`
 * zodat `/admin/mfa-setup` en eventuele andere setup-pagina's
 * bereikbaar blijven voor een admin die nog geen MFA heeft.
 *
 * Geen Sidebar hier — die zit in de (gated)-layout zodat de mfa-setup
 * pagina een schone, donkere full-screen layout kan gebruiken.
 */
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect(ADMIN_LOGIN_PATH);

  // Drie checks tegelijk: rol, isAdmin-vlag, én e-mail-allowlist.
  // De allowlist is de hardste lijn — zelfs als rol/isAdmin per ongeluk
  // op true staan voor een ander account, weigeren we toegang.
  if (
    !user.isAdmin ||
    user.rol !== "admin" ||
    !isToegestaneAdminEmail(user.email)
  ) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Geen toegang
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Deze pagina is alleen toegankelijk voor beheerders.
          </p>
          <Link
            href="/"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

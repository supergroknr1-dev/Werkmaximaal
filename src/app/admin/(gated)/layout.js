import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import Sidebar from "./Sidebar";

/**
 * (gated)-layout: alleen toegankelijk voor admins met MFA actief.
 *
 * Admins zonder ingestelde MFA worden naar `/admin/mfa-setup` gestuurd.
 * Die route zit BUITEN deze (gated)-groep — anders zou de gate de
 * setup-pagina ook blokkeren en kreeg de admin een redirect-lus.
 */
export default async function GatedAdminLayout({ children }) {
  const user = await getCurrentUser();
  // Bovenliggende layout heeft auth+isAdmin al gecheckt; we komen hier
  // alleen voor een echte admin. Maar getCurrentUser opnieuw aanroepen
  // is goedkoop en geeft ons totpEnabled — dat hebben we hier nodig.
  if (!user || user.rol !== "admin") {
    redirect("/admin-login");
  }
  if (!user.totpEnabled) {
    redirect("/admin/mfa-setup");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar adminNaam={user.naam} />
      <div className="md:pl-60">
        <main className="px-6 md:px-10 py-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

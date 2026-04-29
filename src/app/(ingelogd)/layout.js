import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import IngelogdTopBar from "@/components/IngelogdTopBar";

// Alle pagina's onder de (ingelogd)-route-groep vereisen een sessie.
// De sidebar zelf zit op root-niveau (zie GlobalShell), dus deze
// layout doet de auth-check, monteert de top-balk en bepaalt de
// padding rond de pagina-content.
export const metadata = {
  title: "Mijn omgeving — Werkmaximaal",
};

export default async function IngelogdLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");

  return (
    <>
      <IngelogdTopBar naam={user.naam} voornaam={user.voornaam} />
      <main className="px-4 md:px-10 py-6 md:py-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </>
  );
}

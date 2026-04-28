import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

export const metadata = {
  title: "Berichten — Werkmaximaal",
};

export default async function BerichtenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Mijn omgeving
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Berichten
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Direct contact met vakmannen die zich op uw klussen hebben aangemeld.
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={20} className="text-slate-400" strokeWidth={2} />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Berichten komen binnenkort
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Hier kunt u straks rechtstreeks chatten met vakmannen die uw lead
          hebben gekocht. Voor nu staat hun e-mail en telefoon onder elke
          klus op de pagina <em>Mijn klussen</em>.
        </p>
      </div>
    </div>
  );
}

import { Map as MapIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { postcodeNaarCoords } from "@/lib/pdok";
import LiveKaart from "./LiveKaart";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live monitor — Werkmaximaal Admin",
};

/**
 * Admin-only kaart van actieve klussen in Nederland. Status per klus:
 *   - nieuw        🔵 — goedgekeurd, niet-gesloten, géén leads gekocht
 *   - chat-actief  🟠 — heeft lead met chatBericht in laatste 7 dagen
 *   - wachtend     🟡 — heeft wel lead(s) maar geen recente chat
 *
 * Gesloten klussen worden niet getoond. "Recent afgehandeld"-status
 * vereist een gesloten_op-timestamp op Klus (toekomstige migratie).
 *
 * Privacy: deze pagina is admin-only via de (gated)-layout. Volledige
 * postcode is daarom OK om te tonen. Coördinaten worden server-side
 * berekend via PDOK (cached 7 dagen) en pas met de marker-data
 * meegestuurd — niet ophaalbaar voor niet-admins.
 */
export default async function LiveMonitorPage() {
  const zevenDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const klussen = await prisma.klus.findMany({
    where: {
      goedgekeurd: true,
      gesloten: false,
      postcode: { not: null },
    },
    select: {
      id: true,
      titel: true,
      categorie: true,
      postcode: true,
      plaats: true,
      aangemaakt: true,
      _count: { select: { leads: true } },
      leads: {
        select: {
          id: true,
          chatBerichten: {
            select: { aangemaakt: true },
            orderBy: { aangemaakt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { aangemaakt: "desc" },
  });

  // Statusbepaling + geocoding (parallel via Promise.all)
  const punten = (
    await Promise.all(
      klussen.map(async (k) => {
        const coords = await postcodeNaarCoords(k.postcode);
        if (!coords) return null;
        const heeftRecenteChat = k.leads.some(
          (l) => l.chatBerichten[0]?.aangemaakt > zevenDagenGeleden
        );
        const status = heeftRecenteChat
          ? "chat-actief"
          : k._count.leads === 0
          ? "nieuw"
          : "wachtend";
        return {
          id: k.id,
          titel: k.titel,
          categorie: k.categorie,
          plaats: k.plaats,
          postcode: k.postcode,
          aangemaakt: k.aangemaakt.toISOString(),
          aantalLeads: k._count.leads,
          status,
          lat: coords.lat,
          lon: coords.lon,
        };
      })
    )
  ).filter(Boolean);

  const tellingen = {
    nieuw: punten.filter((p) => p.status === "nieuw").length,
    "chat-actief": punten.filter((p) => p.status === "chat-actief").length,
    wachtend: punten.filter((p) => p.status === "wachtend").length,
  };

  return (
    <>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center · Monitoring
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight inline-flex items-center gap-2">
          <MapIcon size={22} className="text-slate-700" />
          Live monitor
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {punten.length} actieve klus{punten.length === 1 ? "" : "sen"} op de kaart.
        </p>
      </header>

      <section className="bg-white border border-slate-200 rounded-md shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-4 text-xs">
          <Legenda kleur="bg-blue-500" label="Nieuw" aantal={tellingen.nieuw} hint="Geen leads gekocht" />
          <Legenda kleur="bg-orange-500" label="Chat actief" aantal={tellingen["chat-actief"]} hint="Bericht in laatste 7 dagen" />
          <Legenda kleur="bg-slate-400" label="Wachtend" aantal={tellingen.wachtend} hint="Lead gekocht, geen recente chat" />
        </div>
      </section>

      <LiveKaart punten={punten} />
    </>
  );
}

function Legenda({ kleur, label, aantal, hint }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${kleur} border-2 border-white shadow`} />
      <div>
        <span className="font-semibold text-slate-900">{label}</span>{" "}
        <span className="text-slate-500 tabular-nums">({aantal})</span>
        <p className="text-[10px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

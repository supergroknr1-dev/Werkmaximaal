import { Map as MapIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { postcodeNaarCoords } from "@/lib/pdok";
import LiveKaart from "./LiveKaart";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live monitor — Werkmaximaal Admin",
};

const POLL_SECONDEN = 60;

/**
 * Admin-only kaart van klussen in Nederland. Filtert klussen op
 * geldige NL-postcode (4 cijfers + 2 letters). Drie statussen:
 *
 *   - nieuw         🔵 — niet-gesloten en geen recente chat
 *   - chat-actief   🟠 — niet-gesloten met chatBericht in laatste 7 dagen
 *   - afgehandeld   🟢 — gesloten EN bijgewerktOp ≤ 3 dagen geleden
 *
 * Klussen die langer dan 3 dagen gesloten zijn vallen automatisch van
 * de kaart af. Privacy: pagina is admin-only via (gated)-layout, dus
 * volledige postcode tonen is OK. Coördinaten worden server-side via
 * PDOK omgezet (cached 7 dagen) en pas met marker-data meegestuurd.
 */
export default async function LiveMonitorPage() {
  const nu = Date.now();
  const zevenDagenGeleden = new Date(nu - 7 * 24 * 60 * 60 * 1000);
  const drieDagenGeleden = new Date(nu - 3 * 24 * 60 * 60 * 1000);

  const klussen = await prisma.klus.findMany({
    where: {
      goedgekeurd: true,
      postcode: { not: null },
      OR: [
        // Open klussen blijven altijd zichtbaar
        { gesloten: false },
        // Recent gesloten klussen blijven 3 dagen zichtbaar
        { gesloten: true, bijgewerktOp: { gte: drieDagenGeleden } },
      ],
    },
    select: {
      id: true,
      titel: true,
      categorie: true,
      postcode: true,
      plaats: true,
      gesloten: true,
      aangemaakt: true,
      bijgewerktOp: true,
      _count: { select: { leads: true } },
      leads: {
        select: {
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

  // Geocode alle klussen parallel — postcodes die PDOK niet kent
  // worden later gefilterd via .filter(Boolean).
  const punten = (
    await Promise.all(
      klussen.map(async (k) => {
          const coords = await postcodeNaarCoords(k.postcode);
          if (!coords) return null;

          let status;
          if (k.gesloten) {
            status = "afgehandeld";
          } else {
            const heeftRecenteChat = k.leads.some(
              (l) => l.chatBerichten[0]?.aangemaakt > zevenDagenGeleden
            );
            status = heeftRecenteChat ? "chat-actief" : "nieuw";
          }

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
    afgehandeld: punten.filter((p) => p.status === "afgehandeld").length,
  };
  const totaalActief = tellingen.nieuw + tellingen["chat-actief"];

  return (
    <>
      <AutoRefresh seconden={POLL_SECONDEN} />

      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center · Monitoring
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight inline-flex items-center gap-2">
          <MapIcon size={22} className="text-slate-700" />
          Live monitor
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Totaal actieve klussen:{" "}
          <span className="font-semibold text-slate-900 tabular-nums">
            {totaalActief}
          </span>
          {" · "}
          <span className="text-xs">ververst elke {POLL_SECONDEN} sec</span>
        </p>
      </header>

      <section className="bg-white border border-slate-200 rounded-md shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-4 text-xs">
          <Legenda
            kleur="bg-blue-500"
            label="Nieuw"
            aantal={tellingen.nieuw}
            hint="Open, geen recente chat"
          />
          <Legenda
            kleur="bg-orange-500"
            label="Chat actief"
            aantal={tellingen["chat-actief"]}
            hint="Bericht in laatste 7 dagen"
          />
          <Legenda
            kleur="bg-emerald-500"
            label="Afgehandeld"
            aantal={tellingen.afgehandeld}
            hint="Gesloten in laatste 3 dagen"
          />
        </div>
      </section>

      <LiveKaart punten={punten} />
    </>
  );
}

function Legenda({ kleur, label, aantal, hint }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-3 h-3 rounded-full ${kleur} border-2 border-white shadow`}
      />
      <div>
        <span className="font-semibold text-slate-900">{label}</span>{" "}
        <span className="text-slate-500 tabular-nums">({aantal})</span>
        <p className="text-[10px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

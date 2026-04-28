import { prisma } from "../../../../lib/prisma";
import { getLeadPrijs } from "../../../../lib/lead-prijs";
import KlussenTabel from "./KlussenTabel";

export default async function AdminKlussenPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const beginFilter = sp.filter === "te-keuren" ? "te-keuren" : "alle";
  const [klussen, prijzen] = await Promise.all([
    prisma.klus.findMany({
      orderBy: [
        { goedgekeurd: "asc" },
        { gesloten: "asc" },
        { aangemaakt: "desc" },
      ],
      include: {
        user: { select: { naam: true, email: true } },
        reacties: { select: { id: true } },
        leads: { select: { id: true, bedrag: true } },
      },
    }),
    getLeadPrijs(),
  ]);

  const rijen = klussen.map((k) => ({
    id: k.id,
    titel: k.titel,
    categorie: k.categorie,
    plaats: k.plaats,
    postcode: k.postcode,
    straatnaam: k.straatnaam,
    voorkeurVakmanType: k.voorkeurVakmanType,
    gesloten: k.gesloten,
    goedgekeurd: k.goedgekeurd,
    aangemaakt: k.aangemaakt.toISOString(),
    eigenaarNaam: k.user?.naam ?? null,
    reactiesCount: k.reacties.length,
    leadsCount: k.leads.length,
    leadsBedrag: k.leads.reduce((s, l) => s + l.bedrag, 0),
  }));

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Klussen monitor
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {rijen.length} klussen — interactie-ratio (reacties / leads) en omzet per klus.
        </p>
      </header>

      <KlussenTabel
        klussen={rijen}
        prijzen={prijzen}
        beginFilter={beginFilter}
      />
    </>
  );
}

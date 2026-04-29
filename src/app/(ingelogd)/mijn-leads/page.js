import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import LeadChat from "@/components/LeadChat";

export const metadata = {
  title: "Mijn leads — Werkmaximaal",
};

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDatumTijd(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

export default async function MijnLeadsPage({ searchParams }) {
  const session = await getSession();
  if (!session.userId) redirect("/inloggen");

  const sp = (await searchParams) ?? {};
  const openChatLeadId = sp.chat ? parseInt(sp.chat) : null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, naam: true, rol: true, vakmanType: true },
  });
  if (!user) {
    session.destroy();
    redirect("/inloggen");
  }

  if (user.rol !== "vakman") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
          >
            ← Terug naar overzicht
          </Link>
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Alleen voor vakmannen
            </h1>
            <p className="text-sm text-slate-500">
              Deze pagina toont de leads die u als vakman heeft gekocht.
              Consumenten zien hun eigen klussen op{" "}
              <Link href="/mijn-klussen" className="text-slate-900 hover:underline">
                Mijn klussen
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  const leads = await prisma.lead.findMany({
    where: { vakmanId: user.id },
    orderBy: { gekochtOp: "desc" },
    include: {
      klus: {
        include: {
          user: {
            select: {
              id: true,
              naam: true,
              voornaam: true,
              achternaam: true,
              email: true,
              werkTelefoon: true,
              straatnaam: true,
              huisnummer: true,
              huisnummerToevoeging: true,
              adres: true,
              postcode: true,
              plaats: true,
            },
          },
          leads: { select: { id: true } },
          reacties: { select: { id: true } },
        },
      },
      _count: {
        select: {
          chatBerichten: {
            where: { vanUserId: { not: user.id }, gelezen: false },
          },
        },
      },
    },
  });

  const open = leads.filter((l) => !l.klus.gesloten);
  const afgerond = leads.filter((l) => l.klus.gesloten);
  const totaalBesteed = leads.reduce((s, l) => s + l.bedrag, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
            {user.vakmanType === "professional" ? "Vakman" : "Buurtklusser"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Mijn leads
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overzicht van uw gekochte leads en de contactgegevens van de klant.
          </p>
        </header>

        {leads.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
                Totaal leads
              </p>
              <p className="text-xl font-semibold text-slate-900 tabular-nums">
                {leads.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
                Open klussen
              </p>
              <p className="text-xl font-semibold text-emerald-700 tabular-nums">
                {open.length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
                Besteed
              </p>
              <p className="text-xl font-semibold text-slate-900 tabular-nums">
                {formatBedrag(totaalBesteed)}
              </p>
            </div>
          </div>
        )}

        {leads.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-slate-500 text-sm text-center">
            U heeft nog geen leads gekocht.{" "}
            <Link href="/" className="text-slate-900 hover:underline">
              Zoek een klus →
            </Link>
          </div>
        )}

        {open.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Open klussen ({open.length})
            </h2>
            <div className="space-y-3">
              {open.map((lead) => (
                <LeadKaart key={lead.id} lead={lead} eigenUserId={user.id} openChat={lead.id === openChatLeadId} />
              ))}
            </div>
          </section>
        )}

        {afgerond.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Afgerond / gesloten door klant ({afgerond.length})
            </h2>
            <div className="space-y-3">
              {afgerond.map((lead) => (
                <LeadKaart key={lead.id} lead={lead} eigenUserId={user.id} openChat={lead.id === openChatLeadId} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function LeadKaart({ lead, eigenUserId, openChat }) {
  const klus = lead.klus;
  const klant = klus.user;

  const klantNaam =
    klant?.voornaam || klant?.achternaam
      ? `${klant.voornaam ?? ""} ${klant.achternaam ?? ""}`.trim()
      : klant?.naam ?? "Onbekend";

  const klusAdres = klus.straatnaam
    ? `${klus.straatnaam} ${klus.huisnummer ?? ""}, ${klus.postcode ?? ""} ${klus.plaats}`
    : klus.plaats;

  return (
    <div
      className={`bg-white border rounded-md p-5 transition-colors ${
        klus.gesloten ? "border-slate-200 opacity-75" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <Link
            href={`/klussen/${klus.id}`}
            className="text-base font-medium text-slate-900 hover:underline"
          >
            {klus.titel}
          </Link>
          <p className="text-xs text-slate-500 mt-1">
            {klus.categorie || "Geen categorie"} · Geplaatst {formatDatum(klus.aangemaakt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {klus.gesloten ? (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Gesloten
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Open
            </span>
          )}
          <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            {formatBedrag(lead.bedrag)}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mt-3">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
          Contactgegevens klant
        </p>
        <dl className="text-sm space-y-1.5">
          <div className="flex">
            <dt className="w-24 text-slate-500 shrink-0">Naam</dt>
            <dd className="text-slate-900 font-medium">{klantNaam}</dd>
          </div>
          {klant?.email && (
            <div className="flex">
              <dt className="w-24 text-slate-500 shrink-0">E-mail</dt>
              <dd>
                <a
                  href={`mailto:${klant.email}`}
                  className="text-slate-700 hover:underline"
                >
                  {klant.email}
                </a>
              </dd>
            </div>
          )}
          {klant?.werkTelefoon && (
            <div className="flex">
              <dt className="w-24 text-slate-500 shrink-0">Telefoon</dt>
              <dd>
                <a
                  href={`tel:${klant.werkTelefoon}`}
                  className="text-slate-700 hover:underline font-mono"
                >
                  {klant.werkTelefoon}
                </a>
              </dd>
            </div>
          )}
          <div className="flex">
            <dt className="w-24 text-slate-500 shrink-0">Adres klus</dt>
            <dd className="text-slate-900">{klusAdres}</dd>
          </div>
        </dl>
      </div>

      <LeadChat
        leadId={lead.id}
        eigenUserId={eigenUserId}
        initialUnread={lead._count?.chatBerichten ?? 0}
        initialOpen={openChat}
      />

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span>Lead gekocht {formatDatumTijd(lead.gekochtOp)}</span>
        {klus.leads.length > 1 && (
          <>
            <span>·</span>
            <span>
              {klus.leads.length - 1} andere vakman
              {klus.leads.length - 1 === 1 ? "" : "nen"} kocht
              {klus.leads.length - 1 === 1 ? "" : "en"} ook deze lead
            </span>
          </>
        )}
      </div>
    </div>
  );
}

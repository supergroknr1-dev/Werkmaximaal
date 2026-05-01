import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Berichten — Werkmaximaal",
};

/**
 * Verzamel-inbox: alle leads waar de huidige user een chat-thread heeft,
 * gesorteerd op meest recente activiteit. Klik opent /mijn-leads of
 * /mijn-klussen met die specifieke chat al uitgeklapt (?chat=<leadId>).
 */
export default async function BerichtenPage() {
  const session = await getSession();
  if (!session.userId) redirect("/inloggen");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user) redirect("/inloggen");

  // Bouw waar-clausule afhankelijk van rol. Admin valt buiten deze pagina.
  const where = {
    chatBerichten: { some: {} },
    ...(user.rol === "vakman"
      ? { vakmanId: user.id }
      : user.rol === "consument"
      ? { klus: { userId: user.id } }
      : { id: -1 }), // admin: lege resultaten
  };

  const leads = await prisma.lead.findMany({
    where,
    include: {
      klus: {
        select: {
          id: true,
          titel: true,
          userId: true,
          user: {
            select: {
              id: true,
              naam: true,
              voornaam: true,
              achternaam: true,
              bedrijfsnaam: true,
              profielFotoUrl: true,
            },
          },
        },
      },
      vakman: {
        select: {
          id: true,
          naam: true,
          bedrijfsnaam: true,
          profielFotoUrl: true,
        },
      },
      chatBerichten: {
        orderBy: { aangemaakt: "desc" },
        take: 1,
        select: {
          id: true,
          tekst: true,
          aangemaakt: true,
          vanUserId: true,
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

  // Sorteer op laatste bericht (Prisma kan niet op nested aggregate sorteren)
  leads.sort((a, b) => {
    const aT = a.chatBerichten[0]?.aangemaakt ?? 0;
    const bT = b.chatBerichten[0]?.aangemaakt ?? 0;
    return new Date(bT) - new Date(aT);
  });

  const targetBasis = user.rol === "vakman" ? "/mijn-leads" : "/mijn-klussen";

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
          {user.rol === "vakman"
            ? "Alle gesprekken met klanten waarvan je een lead hebt gekocht."
            : "Alle gesprekken met vakmannen die zich op je klussen hebben aangemeld."}
        </p>
      </header>

      {leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={20} className="text-slate-400" strokeWidth={2} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Nog geen gesprekken
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {user.rol === "vakman"
              ? "Zodra je een lead koopt en de klant aanschrijft, verschijnt het gesprek hier."
              : "Zodra een vakman zich op je klus aanmeldt en je een bericht stuurt, verschijnt het gesprek hier."}
          </p>
        </div>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-md shadow-sm divide-y divide-slate-200 overflow-hidden">
          {leads.map((lead) => {
            const wederpartij =
              user.rol === "vakman" ? lead.klus.user : lead.vakman;
            const naam =
              wederpartij.bedrijfsnaam ||
              [wederpartij.voornaam, wederpartij.achternaam]
                .filter(Boolean)
                .join(" ") ||
              wederpartij.naam ||
              "Onbekend";
            const laatste = lead.chatBerichten[0];
            const ikBenAfzender = laatste?.vanUserId === user.id;
            const unread = lead._count?.chatBerichten ?? 0;

            return (
              <li key={lead.id}>
                <Link
                  href={`${targetBasis}?chat=${lead.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <Avatar naam={naam} fotoUrl={wederpartij.profielFotoUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p
                        className={`text-sm truncate ${
                          unread > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-800"
                        }`}
                      >
                        {naam}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                        {formatRelatief(laatste?.aangemaakt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-0.5">
                      {lead.klus.titel}
                    </p>
                    <p
                      className={`text-xs truncate ${
                        unread > 0 && !ikBenAfzender ? "text-slate-900 font-medium" : "text-slate-500"
                      }`}
                    >
                      {ikBenAfzender && (
                        <span className="text-slate-400">Jij: </span>
                      )}
                      {laatste?.tekst}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[11px] font-bold rounded-full bg-orange-600 text-white shrink-0 mt-1">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Avatar({ naam, fotoUrl }) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
      />
    );
  }
  const initialen = naam
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
      {initialen || "?"}
    </div>
  );
}

function formatRelatief(datum) {
  if (!datum) return "";
  const dt = new Date(datum);
  const now = new Date();
  const diffMs = now - dt;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "nu";
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} u`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} d`;
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

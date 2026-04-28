import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "../../../../lib/prisma";
import VerwijderFotoKnop from "./VerwijderFotoKnop";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Showcase-moderatie — Werkmaximaal Admin",
};

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ShowcaseModerationPage() {
  const fotos = await prisma.showcaseFoto.findMany({
    orderBy: { aangemaakt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          naam: true,
          bedrijfsnaam: true,
          email: true,
          vakmanType: true,
        },
      },
    },
  });

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Admin Center · Moderatie
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Showcase-foto's
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {fotos.length}{" "}
          {fotos.length === 1 ? "foto" : "foto's"} geüpload door vakmannen.
          Verwijder ongepaste of frauduleuze inhoud — vakman krijgt geen
          melding maar de actie staat in het audit-log.
        </p>
      </header>

      {fotos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-12 text-center text-sm text-slate-500">
          Nog geen showcase-foto's geüpload.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm flex flex-col"
            >
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.beschrijving || ""}
                  loading="lazy"
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                />
              </a>
              <div className="p-3 flex-1 flex flex-col">
                <Link
                  href={`/vakmannen/${f.user.id}`}
                  className="text-sm font-medium text-slate-900 hover:underline inline-flex items-center gap-1 truncate"
                >
                  {f.user.bedrijfsnaam || f.user.naam}
                  <ExternalLink size={11} className="text-slate-400 shrink-0" />
                </Link>
                <p className="text-[11px] text-slate-500 truncate">
                  {f.user.email}
                </p>
                {f.beschrijving && (
                  <p className="text-xs text-slate-700 mt-2 line-clamp-3">
                    {f.beschrijving}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-2">
                  {formatDatum(f.aangemaakt)}
                </p>
                <div className="mt-2">
                  <VerwijderFotoKnop
                    fotoId={f.id}
                    naam={f.user.bedrijfsnaam || f.user.naam}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

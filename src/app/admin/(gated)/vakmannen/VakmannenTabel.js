"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2, ShieldCheck, ShieldAlert, Pencil, ExternalLink, UserCog } from "lucide-react";
import {
  useInterventionConfirm,
  interventionHeaders,
} from "../../../../lib/intervention-api";

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TypeBadge({ type }) {
  if (type === "professional") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
        Vakman
      </span>
    );
  }
  if (type === "hobbyist") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        Handige Harrie
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
      Onbekend
    </span>
  );
}

function KvkBadge({ vakman }) {
  if (vakman.vakmanType === "hobbyist") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded text-slate-500">
        n.v.t.
      </span>
    );
  }
  if (vakman.kvkNummer) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
        <ShieldCheck size={11} strokeWidth={2.5} />
        Geverifieerd
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
      <ShieldAlert size={11} strokeWidth={2.5} />
      Niet geverifieerd
    </span>
  );
}

export default function VakmannenTabel({ vakmannen }) {
  const router = useRouter();
  const [zoek, setZoek] = useState("");
  const [typeFilter, setTypeFilter] = useState("alle");
  const [bezigId, setBezigId] = useState(null);
  const { open: bevestigIngreep, modal: ingreepModal } = useInterventionConfirm();

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return vakmannen.filter((v) => {
      if (typeFilter !== "alle" && v.vakmanType !== typeFilter) return false;
      if (!term) return true;
      const haystack = [
        v.naam,
        v.bedrijfsnaam,
        v.email,
        v.regioPostcode,
        v.kvkNummer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [vakmannen, zoek, typeFilter]);

  async function shadowStart(v) {
    const naam = v.bedrijfsnaam || v.naam;
    const ok = await bevestigIngreep({
      titel: "Bekijk als deze vakman",
      beschrijving: `${naam} (${v.email}) — je sessie wordt tijdelijk overgenomen tot je 'Stop shadowen' klikt`,
      defaultCategorie: "support",
      bevestigLabel: "Start shadowen",
      onBevestig: async ({ reden, actieCategorie }) => {
        const res = await fetch(`/api/admin/shadow/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...interventionHeaders({ reden, actieCategorie }),
          },
          body: JSON.stringify({ vakmanId: v.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Shadow starten mislukt.");
        }
      },
    });
    if (ok) {
      // Hard reload zodat de session-cookie effect heeft op de
      // server-rendered admin-pagina ook
      router.push("/");
      router.refresh();
    }
  }

  async function verwijder(v) {
    const naam = v.bedrijfsnaam || v.naam;
    const ok = await bevestigIngreep({
      titel: "Account definitief verwijderen",
      beschrijving: `${naam} (${v.email})`,
      defaultCategorie: "compliance",
      bevestigLabel: "Verwijderen",
      onBevestig: async ({ reden, actieCategorie }) => {
        setBezigId(v.id);
        try {
          const res = await fetch(`/api/admin/vakmannen/${v.id}`, {
            method: "DELETE",
            headers: interventionHeaders({ reden, actieCategorie }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Verwijderen is mislukt.");
          }
        } finally {
          setBezigId(null);
        }
      },
    });
    if (ok) router.refresh();
  }

  return (
    <>
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam, bedrijf, e-mail of postcode..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {[
            { val: "alle", label: "Alle" },
            { val: "professional", label: "Vakman" },
            { val: "hobbyist", label: "Handige Harrie" },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setTypeFilter(opt.val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                typeFilter === opt.val
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {gefilterd.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-slate-500">
          Geen vakmannen gevonden.
        </div>
      ) : (
        <>
        {/* Mobiele kaart-weergave: één kaart per vakman, alle info verticaal gestapeld */}
        <ul className="md:hidden divide-y divide-slate-100">
          {gefilterd.map((v) => (
            <li key={v.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {v.bedrijfsnaam || v.naam}
                  </p>
                  {v.bedrijfsnaam && (
                    <p className="text-xs text-slate-500 truncate">{v.naam}</p>
                  )}
                  <p className="text-xs text-slate-500 truncate">{v.email}</p>
                </div>
                <TypeBadge type={v.vakmanType} />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-slate-500">
                <KvkBadge vakman={v} />
                {v.kvkNummer && (
                  <span className="font-mono">{v.kvkNummer}</span>
                )}
                {v.regioPostcode && (
                  <span className="font-mono">{v.regioPostcode}</span>
                )}
                <span>{formatDatum(v.aangemaakt)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/vakmannen/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
                >
                  <ExternalLink size={13} />
                  Profiel
                </Link>
                <button
                  type="button"
                  onClick={() => shadowStart(v)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200"
                >
                  <UserCog size={13} />
                  Bekijk als
                </button>
                <Link
                  href={`/admin/vakmannen/${v.id}/bewerken`}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
                >
                  <Pencil size={13} />
                  Bewerken
                </Link>
                <button
                  type="button"
                  onClick={() => verwijder(v)}
                  disabled={bezigId === v.id}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {bezigId === v.id ? "..." : "Verwijderen"}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop tabel-weergave */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="text-left px-5 py-3">Naam</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">KvK</th>
                <th className="text-left px-3 py-3">Postcode</th>
                <th className="text-left px-3 py-3">Aangemeld</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gefilterd.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">
                      {v.bedrijfsnaam || v.naam}
                    </p>
                    {v.bedrijfsnaam && (
                      <p className="text-xs text-slate-500">{v.naam}</p>
                    )}
                    <p className="text-xs text-slate-500">{v.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <TypeBadge type={v.vakmanType} />
                  </td>
                  <td className="px-3 py-3">
                    <KvkBadge vakman={v} />
                    {v.kvkNummer && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {v.kvkNummer}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700 font-mono text-xs">
                    {v.regioPostcode || "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-xs">
                    {formatDatum(v.aangemaakt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/vakmannen/${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open publiek profiel in nieuw tabblad"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <ExternalLink size={13} />
                        Profiel
                      </Link>
                      <button
                        type="button"
                        onClick={() => shadowStart(v)}
                        title="Bekijk als deze vakman (shadow mode)"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-700 transition-colors"
                      >
                        <UserCog size={13} />
                        Bekijk als
                      </button>
                      <Link
                        href={`/admin/vakmannen/${v.id}/bewerken`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Pencil size={13} />
                        Bewerken
                      </Link>
                      <button
                        type="button"
                        onClick={() => verwijder(v)}
                        disabled={bezigId === v.id}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {bezigId === v.id ? "Bezig..." : "Verwijderen"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
    {ingreepModal}
    </>
  );
}

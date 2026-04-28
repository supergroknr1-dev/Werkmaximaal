"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Trash2,
  ExternalLink,
  CircleDot,
  CircleCheck,
  Clock,
  ShieldCheck,
} from "lucide-react";
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

function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

function VoorkeurBadge({ voorkeur }) {
  if (voorkeur === "professional") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        Vakman
      </span>
    );
  }
  if (voorkeur === "hobbyist") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        Buurtklusser
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
      Beide
    </span>
  );
}

export default function KlussenTabel({ klussen, prijzen, beginFilter = "alle" }) {
  const router = useRouter();
  const [zoek, setZoek] = useState("");
  const [filter, setFilter] = useState(beginFilter);
  const [bezigId, setBezigId] = useState(null);
  const [keurId, setKeurId] = useState(null);
  const { open: bevestigIngreep, modal: ingreepModal } = useInterventionConfirm();

  function leadPrijs(voorkeur) {
    if (voorkeur === "hobbyist") return prijzen.hobbyist;
    return prijzen.pro;
  }

  function potentieleOmzet(klus) {
    return klus.leadsBedrag;
  }

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return klussen.filter((k) => {
      if (filter === "professional" && k.voorkeurVakmanType !== "professional")
        return false;
      if (filter === "hobbyist" && k.voorkeurVakmanType !== "hobbyist")
        return false;
      if (filter === "open" && (k.gesloten || !k.goedgekeurd)) return false;
      if (filter === "gesloten" && !k.gesloten) return false;
      if (filter === "te-keuren" && (k.goedgekeurd || k.gesloten)) return false;
      if (!term) return true;
      const haystack = [
        k.titel,
        k.plaats,
        k.postcode,
        k.straatnaam,
        k.eigenaarNaam,
        k.categorie,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [klussen, zoek, filter]);

  async function verwijder(k) {
    const ok = await bevestigIngreep({
      titel: "Klus definitief verwijderen",
      beschrijving: `"${k.titel}" — reacties en leads gaan ook weg`,
      defaultCategorie: "compliance",
      bevestigLabel: "Verwijderen",
      onBevestig: async ({ reden, actieCategorie }) => {
        setBezigId(k.id);
        try {
          const res = await fetch(`/api/klussen/${k.id}`, {
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

  async function keur(k, goedgekeurd) {
    const ok = await bevestigIngreep({
      titel: goedgekeurd ? "Klus goedkeuren" : "Klus afkeuren",
      beschrijving: `"${k.titel}" — ${goedgekeurd ? "wordt zichtbaar voor vakmannen" : "wordt verborgen"}`,
      defaultCategorie: "compliance",
      bevestigLabel: goedgekeurd ? "Goedkeuren" : "Afkeuren",
      onBevestig: async ({ reden, actieCategorie }) => {
        setKeurId(k.id);
        try {
          const res = await fetch(`/api/klussen/${k.id}/keuren`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...interventionHeaders({ reden, actieCategorie }),
            },
            body: JSON.stringify({ goedgekeurd }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Bijwerken is mislukt.");
          }
        } finally {
          setKeurId(null);
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
            placeholder="Zoek op titel, postcode, plaats of consument..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { val: "alle", label: "Alle" },
            { val: "te-keuren", label: "Te keuren" },
            { val: "open", label: "Live" },
            { val: "gesloten", label: "Gesloten" },
            { val: "professional", label: "Vakman" },
            { val: "hobbyist", label: "Buurtklusser" },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setFilter(opt.val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                filter === opt.val
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
          Geen klussen gevonden.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="text-left px-5 py-3">Klus</th>
                <th className="text-left px-3 py-3">Consument</th>
                <th className="text-left px-3 py-3">Voorkeur</th>
                <th className="text-right px-3 py-3">Lead-prijs</th>
                <th className="text-right px-3 py-3">Reacties / Leads</th>
                <th className="text-right px-3 py-3">Omzet</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gefilterd.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">
                      <Link
                        href={`/klussen/${k.id}`}
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        {k.titel}
                        <ExternalLink size={12} className="text-slate-400" />
                      </Link>
                    </p>
                    <p className="text-xs text-slate-500">
                      {k.categorie || "Geen categorie"} · {formatDatum(k.aangemaakt)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-slate-900">{k.eigenaarNaam || "—"}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {k.postcode || ""} {k.plaats}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <VoorkeurBadge voorkeur={k.voorkeurVakmanType} />
                  </td>
                  <td className="px-3 py-3 text-right text-slate-900 font-medium tabular-nums">
                    {formatBedrag(leadPrijs(k.voorkeurVakmanType))}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700 tabular-nums">
                    {k.reactiesCount} / {k.leadsCount}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-900 font-medium tabular-nums">
                    {formatBedrag(potentieleOmzet(k))}
                  </td>
                  <td className="px-3 py-3">
                    {k.gesloten ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <CircleCheck size={12} />
                        Gesloten
                      </span>
                    ) : !k.goedgekeurd ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                        <Clock size={12} />
                        Te keuren
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                        <CircleDot size={12} />
                        Live
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      {!k.goedgekeurd && !k.gesloten && (
                        <button
                          type="button"
                          onClick={() => keur(k, true)}
                          disabled={keurId === k.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck size={13} />
                          {keurId === k.id ? "Bezig..." : "Goedkeuren"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => verwijder(k)}
                        disabled={bezigId === k.id}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {bezigId === k.id ? "Bezig..." : "Verwijderen"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    {ingreepModal}
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ShieldAlert } from "lucide-react";

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function weergaveNaam(c) {
  if (c.voornaam || c.achternaam) {
    return `${c.voornaam ?? ""} ${c.achternaam ?? ""}`.trim();
  }
  return c.naam;
}

export default function ConsumentenTabel({ consumenten }) {
  const router = useRouter();
  const [zoek, setZoek] = useState("");
  const [filter, setFilter] = useState("alle");
  const [bezigId, setBezigId] = useState(null);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return consumenten.filter((c) => {
      if (filter === "met-klussen" && c.klussenCount === 0) return false;
      if (filter === "zonder-klussen" && c.klussenCount > 0) return false;
      if (!term) return true;
      const haystack = [
        c.naam,
        c.voornaam,
        c.achternaam,
        c.email,
        c.telefoon,
        c.adres,
        c.postcode,
        c.plaats,
        c.categorieen?.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [consumenten, zoek, filter]);

  async function verwijder(c) {
    const naam = weergaveNaam(c);
    const heeftKlussen = c.klussenCount > 0;
    const waarschuwing = heeftKlussen
      ? `Account "${naam}" verwijderen? Dit verwijdert ook ${c.klussenCount} klus${
          c.klussenCount === 1 ? "" : "sen"
        } en alle bijbehorende reacties.`
      : `Account "${naam}" definitief verwijderen?`;
    if (!confirm(waarschuwing)) return;
    setBezigId(c.id);
    const res = await fetch(`/api/admin/consumenten/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Verwijderen is mislukt.");
      setBezigId(null);
      return;
    }
    router.refresh();
    setBezigId(null);
  }

  return (
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
            placeholder="Zoek op naam, e-mail, postcode, beroep..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {[
            { val: "alle", label: "Alle" },
            { val: "met-klussen", label: "Met klussen" },
            { val: "zonder-klussen", label: "Zonder klussen" },
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
          Geen consumenten gevonden.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 whitespace-nowrap">Voornaam</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Achternaam</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Adres</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Postcode</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Plaats</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">E-mail</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Telefoon</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Beroep van klussen</th>
                <th className="text-right px-3 py-3 whitespace-nowrap">Aantal klussen</th>
                <th className="text-left px-3 py-3 whitespace-nowrap">Aangemeld</th>
                <th className="text-right px-4 py-3 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gefilterd.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900 font-medium">
                        {c.voornaam || (
                          <span className="text-slate-300">—</span>
                        )}
                      </span>
                      {c.isAdmin && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                          <ShieldAlert size={9} />
                          Admin
                        </span>
                      )}
                    </div>
                    {!c.voornaam && !c.achternaam && (
                      <p className="text-[11px] text-slate-500">{c.naam}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-900">
                    {c.achternaam || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                    {c.adres || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-700 font-mono text-xs">
                    {c.postcode || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                    {c.plaats || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <a
                      href={`mailto:${c.email}`}
                      className="text-slate-700 hover:text-slate-900 hover:underline text-xs"
                    >
                      {c.email}
                    </a>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {c.telefoon ? (
                      <a
                        href={`tel:${c.telefoon}`}
                        className="text-slate-700 hover:text-slate-900 hover:underline text-xs font-mono"
                      >
                        {c.telefoon}
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {c.categorieen.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.categorieen.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span
                      className={`text-sm tabular-nums ${
                        c.klussenCount > 0
                          ? "text-slate-900 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {c.klussenCount}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-xs">
                    {formatDatum(c.aangemaakt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => verwijder(c)}
                      disabled={bezigId === c.id || c.isAdmin}
                      title={
                        c.isAdmin
                          ? "Admin-accounts kunnen niet via deze interface worden verwijderd"
                          : ""
                      }
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                      {bezigId === c.id ? "Bezig..." : "Verwijderen"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

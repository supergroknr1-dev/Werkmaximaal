"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Mail, Phone, ShieldAlert } from "lucide-react";

function formatDatum(datum) {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ConsumentenTabel({ consumenten }) {
  const router = useRouter();
  const [zoek, setZoek] = useState("");
  const [filter, setFilter] = useState("alle"); // alle / met-klussen / zonder-klussen
  const [bezigId, setBezigId] = useState(null);

  const gefilterd = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return consumenten.filter((c) => {
      if (filter === "met-klussen" && c.klussenCount === 0) return false;
      if (filter === "zonder-klussen" && c.klussenCount > 0) return false;
      if (!term) return true;
      const haystack = [c.naam, c.email, c.telefoon]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [consumenten, zoek, filter]);

  async function verwijder(c) {
    const heeftKlussen = c.klussenCount > 0;
    const waarschuwing = heeftKlussen
      ? `Account "${c.naam}" verwijderen? Dit verwijdert ook ${c.klussenCount} klus${
          c.klussenCount === 1 ? "" : "sen"
        } en alle bijbehorende reacties.`
      : `Account "${c.naam}" definitief verwijderen?`;
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
            placeholder="Zoek op naam, e-mail of telefoon..."
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
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                <th className="text-left px-5 py-3">Consument</th>
                <th className="text-left px-3 py-3">Contact</th>
                <th className="text-right px-3 py-3">Klussen</th>
                <th className="text-left px-3 py-3">Aangemeld</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gefilterd.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{c.naam}</p>
                      {c.isAdmin && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
                          <ShieldAlert size={10} />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">ID #{c.id}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-slate-700 inline-flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400" />
                      <a
                        href={`mailto:${c.email}`}
                        className="hover:underline"
                      >
                        {c.email}
                      </a>
                    </p>
                    {c.telefoon ? (
                      <p className="text-xs text-slate-700 inline-flex items-center gap-1.5 mt-0.5">
                        <Phone size={12} className="text-slate-400" />
                        <a
                          href={`tel:${c.telefoon}`}
                          className="hover:underline"
                        >
                          {c.telefoon}
                        </a>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">
                        geen telefoonnummer
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
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
                  <td className="px-3 py-3 text-slate-600 text-xs">
                    {formatDatum(c.aangemaakt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => verwijder(c)}
                      disabled={bezigId === c.id || c.isAdmin}
                      title={
                        c.isAdmin
                          ? "Admin-accounts kunnen niet via deze interface verwijderd worden"
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

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live activity-feed via SSE.
 *
 * - Server geeft de initiële 100 events mee via `initialEvents`.
 * - Wij openen een `EventSource` op /api/admin/activity-feed/stream
 *   met `?since=<hoogste-id>&type=<filter>`. Nieuwe events worden
 *   bovenaan ingevoegd; oudste worden afgeknipt boven de 200.
 * - "Net-binnen"-events krijgen 6 seconden een groene rand zodat de
 *   admin direct ziet wat er nieuw is.
 *
 * Statusindicator (rechtsboven):
 *   • verbinden  — connectie wordt opgebouwd
 *   • live       — verbonden, klaar om events te ontvangen
 *   • offline    — verbinding gesloten/onbereikbaar; auto-reconnect
 *                  doet z'n werk via EventSource zelf.
 */

const MAX_EVENTS = 200;
const HIGHLIGHT_MS = 6000;

const TYPE_LABELS = {
  "klus.aangemaakt": { label: "Klus aangemaakt", icon: "📝", kleur: "slate" },
  "klus.goedgekeurd": { label: "Klus goedgekeurd", icon: "✅", kleur: "emerald" },
  "klus.afgekeurd": { label: "Klus afgekeurd", icon: "🚫", kleur: "rose" },
  "klus.verwijderd": { label: "Klus verwijderd", icon: "🗑", kleur: "rose" },
  "klus.gesloten": { label: "Klus gesloten", icon: "🔒", kleur: "slate" },
  "lead.gekocht": { label: "Lead gekocht", icon: "💼", kleur: "emerald" },
  "review.geplaatst": { label: "Review", icon: "⭐", kleur: "amber" },
  "reactie.geplaatst": { label: "Reactie", icon: "💬", kleur: "blue" },
  "gebruiker.geregistreerd": { label: "Nieuwe registratie", icon: "✨", kleur: "blue" },
  "gebruiker.ingelogd": { label: "Login", icon: "🔓", kleur: "slate" },
  "admin.ingreep": { label: "Admin-ingreep", icon: "🛡", kleur: "rose" },
};

const KLEUR_KLASSEN = {
  slate: "bg-slate-50 text-slate-700 border-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatTijdstip(datum) {
  const ts = new Date(datum).getTime();
  const verschil = Date.now() - ts;
  const minuten = Math.floor(verschil / 60_000);
  const uren = Math.floor(verschil / 3_600_000);
  if (minuten < 1) return "zojuist";
  if (minuten < 60) return `${minuten} min geleden`;
  if (uren < 24) return `${uren} uur geleden`;
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityFeedLive({ initialEvents, filter }) {
  const [events, setEvents] = useState(initialEvents);
  const [status, setStatus] = useState("verbinden");
  const [highlightIds, setHighlightIds] = useState(() => new Set());
  // tick triggert een re-render zodat 'X min geleden' actueel blijft
  const [, setTick] = useState(0);
  const sourceRef = useRef(null);

  useEffect(() => {
    // Hoogste id uit de initial set; SSE-stream geeft ons alleen
    // events met id > deze waarde
    const startId =
      events.length > 0
        ? events.reduce(
            (max, e) => (BigInt(e.id) > BigInt(max) ? e.id : max),
            "0"
          )
        : "0";

    const url = `/api/admin/activity-feed/stream?since=${startId}&type=${filter || "alle"}`;
    const es = new EventSource(url);
    sourceRef.current = es;

    es.onopen = () => setStatus("live");
    es.onerror = () => setStatus("offline");

    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        setEvents((prev) => {
          // Dedup op id (kan voorkomen na reconnect)
          if (prev.some((e) => e.id === event.id)) return prev;
          const nieuw = [event, ...prev];
          return nieuw.length > MAX_EVENTS ? nieuw.slice(0, MAX_EVENTS) : nieuw;
        });
        setHighlightIds((prev) => {
          const set = new Set(prev);
          set.add(event.id);
          return set;
        });
        setTimeout(() => {
          setHighlightIds((prev) => {
            const set = new Set(prev);
            set.delete(event.id);
            return set;
          });
        }, HIGHLIGHT_MS);
      } catch (err) {
        console.error("[sse] parse-fout:", err);
      }
    };

    return () => {
      es.close();
      sourceRef.current = null;
    };
    // We willen ALLEEN herstarten bij een filterwissel. De events-state
    // wordt verder zonder unmount onderhouden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Iedere 30 sec re-renderen voor de relatieve tijd
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          {events.length} event{events.length === 1 ? "" : "s"} zichtbaar
          {filter !== "alle" && (
            <>
              {" "}voor type{" "}
              <span className="font-mono text-slate-700">{filter}</span>
            </>
          )}
        </p>
        <StatusBadge status={status} />
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-12 text-center text-sm text-slate-500">
          Nog geen events vastgelegd voor deze filter.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100">
          {events.map((e) => {
            const meta = TYPE_LABELS[e.type] || {
              label: e.type,
              icon: "•",
              kleur: "slate",
            };
            const highlight = highlightIds.has(e.id);
            return (
              <div
                key={e.id}
                className={`px-5 py-3 text-sm transition-colors border-l-2 ${
                  highlight
                    ? "bg-emerald-50 border-l-emerald-500"
                    : "border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-md border flex items-center justify-center text-base ${KLEUR_KLASSEN[meta.kleur]}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-slate-900 truncate">
                        {meta.label}
                      </p>
                      <p className="text-xs text-slate-500 shrink-0 font-mono">
                        {formatTijdstip(e.tijdstip)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.actorRol && (
                        <>
                          door <span className="font-medium">{e.actorRol}</span>{" "}
                          #{e.actorId}
                        </>
                      )}
                      {e.targetType && e.targetId && (
                        <>
                          <span className="mx-1.5">·</span>
                          target: {e.targetType} #{e.targetId}
                        </>
                      )}
                    </p>
                    {e.payload && Object.keys(e.payload).length > 0 && (
                      <pre className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1 mt-1.5 overflow-x-auto">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }) {
  const map = {
    verbinden: {
      tekst: "verbinden",
      kleur: "bg-slate-100 text-slate-600",
      stip: "bg-slate-400",
    },
    live: {
      tekst: "live",
      kleur: "bg-emerald-50 text-emerald-700",
      stip: "bg-emerald-500 animate-pulse",
    },
    offline: {
      tekst: "offline",
      kleur: "bg-rose-50 text-rose-700",
      stip: "bg-rose-500",
    },
  };
  const m = map[status] || map.verbinden;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded ${m.kleur}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.stip}`} />
      {m.tekst}
    </span>
  );
}

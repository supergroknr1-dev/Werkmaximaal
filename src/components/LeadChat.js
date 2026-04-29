"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, ChevronDown } from "lucide-react";

const POLL_MS = 5000;
const MAX_TEKST = 2000;

/**
 * Uitklapbaar chat-paneel onder een LeadKaart. Gebruikt door:
 *   - vakman op /mijn-leads (label "Chat met klant")
 *   - consument op /mijn-klussen (label "Chat met {vakman-naam}")
 *
 *   - Dicht: knop met label en optionele unread-badge
 *   - Open : berichten-lijst (eigen rechts/groen, wederpartij links/grijs),
 *            input-veld, polling elke 5 sec
 *
 * GET /api/leads/:id/chat markeert wederpartij-berichten direct als gelezen,
 * dus het openen van de chat reset de unread-counter.
 */
export default function LeadChat({
  leadId,
  eigenUserId,
  initialUnread = 0,
  label = "Chat met klant",
}) {
  const [open, setOpen] = useState(false);
  const [berichten, setBerichten] = useState([]);
  const [unread, setUnread] = useState(initialUnread);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const eindeRef = useRef(null);
  const pollRef = useRef(null);
  const eersteOpen = useRef(true);

  async function laadBerichten() {
    try {
      const res = await fetch(`/api/leads/${leadId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setBerichten(data);
        setUnread(0); // server heeft net alle wederpartij-berichten als gelezen gemarkeerd
      }
    } catch {
      // stilletjes; volgende poll probeert opnieuw
    }
  }

  useEffect(() => {
    if (!open) return;
    laadBerichten();
    pollRef.current = setInterval(laadBerichten, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  // Auto-scroll naar onderste bericht bij elk update of na open
  useEffect(() => {
    if (open && eindeRef.current) {
      eindeRef.current.scrollIntoView({
        behavior: eersteOpen.current ? "auto" : "smooth",
      });
      eersteOpen.current = false;
    }
  }, [berichten, open]);

  async function verstuur(e) {
    e?.preventDefault();
    const t = tekst.trim();
    if (!t || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: t }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Bericht versturen mislukt.");
      setBerichten((p) => [...p, json]);
      setTekst("");
    } catch (err) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  }

  function formatTijd(d) {
    return new Date(d).toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDagLabel(d) {
    const dt = new Date(d);
    const vandaag = new Date();
    const isVandaag = dt.toDateString() === vandaag.toDateString();
    if (isVandaag) return "Vandaag";
    const gisteren = new Date();
    gisteren.setDate(vandaag.getDate() - 1);
    if (dt.toDateString() === gisteren.toDateString()) return "Gisteren";
    return dt.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: dt.getFullYear() === vandaag.getFullYear() ? undefined : "numeric",
    });
  }

  function groepeerPerDag(b) {
    const groepen = [];
    let huidig = null;
    for (const m of b) {
      const dag = new Date(m.aangemaakt).toDateString();
      if (!huidig || huidig.dag !== dag) {
        huidig = { dag, datum: m.aangemaakt, items: [] };
        groepen.push(huidig);
      }
      huidig.items.push(m);
    }
    return groepen;
  }

  return (
    <div className="mt-3 border border-slate-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <MessageSquare size={16} className="text-slate-500" />
          {label}
          {unread > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-emerald-600 text-white">
              {unread}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="bg-white">
          <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
            {berichten.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Nog geen berichten. Stuur het eerste bericht hieronder.
              </p>
            ) : (
              groepeerPerDag(berichten).map((g) => (
                <div key={g.dag} className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">
                    {formatDagLabel(g.datum)}
                  </p>
                  {g.items.map((m) => {
                    const vanMij = m.vanUserId === eigenUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${vanMij ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                            vanMij
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          {m.tekst}
                          <p
                            className={`text-[10px] mt-1 ${
                              vanMij ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {formatTijd(m.aangemaakt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={eindeRef} />
          </div>

          <form
            onSubmit={verstuur}
            className="border-t border-slate-200 px-3 py-2 flex items-end gap-2"
          >
            <textarea
              value={tekst}
              onChange={(e) => setTekst(e.target.value.slice(0, MAX_TEKST))}
              placeholder="Schrijf een bericht..."
              rows={1}
              maxLength={MAX_TEKST}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  verstuur();
                }
              }}
              className="flex-1 resize-none text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!tekst.trim() || bezig}
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md w-10 h-10 transition-colors shrink-0"
              aria-label="Verstuur"
            >
              <Send size={16} />
            </button>
          </form>

          {fout && <p className="px-3 pb-2 text-xs text-rose-600">{fout}</p>}
        </div>
      )}
    </div>
  );
}

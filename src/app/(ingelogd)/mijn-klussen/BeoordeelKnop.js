"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WACHTTIJD_DAGEN = 10;
const MAX_FOTOS = 5;

function dagenSinds(datum) {
  const ms = Date.now() - new Date(datum).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function Sterren({ score }) {
  return (
    <span className="text-amber-500" aria-label={`${score} van 5 sterren`}>
      {"★".repeat(score)}
      <span className="text-slate-300">{"★".repeat(5 - score)}</span>
    </span>
  );
}

export default function BeoordeelKnop({ lead }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [tekst, setTekst] = useState("");
  const [fotos, setFotos] = useState([]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  if (lead.review) {
    return (
      <div className="text-xs flex items-center gap-1.5">
        <Sterren score={lead.review.score} />
        <span className="text-slate-500">Beoordeeld</span>
      </div>
    );
  }

  const dagenGeleden = dagenSinds(lead.gekochtOp);
  const dagenWachten = WACHTTIJD_DAGEN - dagenGeleden;
  if (dagenWachten > 0) {
    return (
      <span className="text-[11px] text-slate-400">
        Beoordelen kan over {dagenWachten}{" "}
        {dagenWachten === 1 ? "dag" : "dagen"}
      </span>
    );
  }

  async function uploadFoto(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/reviews/upload", {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload mislukt");
    return { url: json.url, naam: json.naam || file.name };
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (fotos.length + files.length > MAX_FOTOS) {
      setFout(`Maximaal ${MAX_FOTOS} foto's per review.`);
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      const nieuwe = [];
      for (const f of files) {
        const result = await uploadFoto(f);
        nieuwe.push(result);
      }
      setFotos((prev) => [...prev, ...nieuwe]);
    } catch (err) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  }

  function verwijderFoto(idx) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (score < 1) {
      setFout("Geef een score van 1 tot 5 sterren.");
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          score,
          tekst,
          fotoUrls: fotos.map((f) => f.url),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Opslaan mislukt");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-orange-700 hover:text-orange-800 hover:underline"
      >
        Beoordeel vakman →
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Beoordeel {lead.vakman.bedrijfsnaam || lead.vakman.naam}
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Score
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className={`text-3xl leading-none transition-colors ${
                      n <= score
                        ? "text-amber-500"
                        : "text-slate-300 hover:text-amber-400"
                    }`}
                    aria-label={`${n} ${n === 1 ? "ster" : "sterren"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Toelichting (optioneel)
              </label>
              <textarea
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Hoe ging het met deze vakman?"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {tekst.length}/2000
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Foto&apos;s (max {MAX_FOTOS})
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                disabled={bezig || fotos.length >= MAX_FOTOS}
                className="text-xs"
              />
              {fotos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {fotos.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200"
                    >
                      <span className="truncate">{f.naam}</span>
                      <button
                        type="button"
                        onClick={() => verwijderFoto(i)}
                        className="text-red-600 hover:text-red-800 ml-2 shrink-0"
                      >
                        verwijder
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {fout && <p className="text-xs text-red-600 mb-3">{fout}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={bezig}
                className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={bezig || score < 1}
                className="text-xs px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {bezig ? "Bezig..." : "Plaats review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

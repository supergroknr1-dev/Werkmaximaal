"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, X, ImagePlus } from "lucide-react";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIM = 1600; // langste-zijde na resize
const KWALITEIT = 0.85;
const MAX_FOTOS = 20;

/**
 * Showcase-galerij met multi-image drag-and-drop upload.
 *
 * Performance-trick: we resizen de afbeelding CLIENT-SIDE met canvas
 * vóór upload. Een 12 MP-telefoonfoto van 4 MB wordt zo ~300 KB en de
 * upload + opslag blijft licht. We converteren naar WebP (kleiner én
 * universeel ondersteund in moderne browsers).
 *
 * Bij parallelle uploads heeft elk bestand z'n eigen progress-state
 * zodat de admin direct ziet welke nog bezig zijn.
 */
export default function ShowcaseGalerij({ vakmanId }) {
  const [fotos, setFotos] = useState([]);
  const [bezig, setBezig] = useState([]); // [{ id, naam }] tijdens upload
  const [fout, setFout] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/profiel/showcase")
      .then((r) => r.json())
      .then(setFotos)
      .catch(() => {});
  }, []);

  async function resizeNaarBlob(file) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Kan afbeelding niet lezen"));
      });
      const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob mislukt"))),
          "image/webp",
          KWALITEIT
        );
      });
    } finally {
      URL.revokeObjectURL(img.src);
    }
  }

  async function uploadEen(file) {
    const tempId = `${Date.now()}-${file.name}`;
    setBezig((p) => [...p, { id: tempId, naam: file.name }]);
    try {
      const blob = await resizeNaarBlob(file);
      const fd = new FormData();
      fd.append(
        "file",
        new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
          type: "image/webp",
        })
      );
      const res = await fetch("/api/profiel/showcase", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload mislukt");
      setFotos((p) => [...p, json]);
    } catch (err) {
      setFout(`${file.name}: ${err.message}`);
    } finally {
      setBezig((p) => p.filter((b) => b.id !== tempId));
    }
  }

  async function handleFiles(filesList) {
    const arr = Array.from(filesList);
    setFout(null);
    const ruimte = MAX_FOTOS - fotos.length - bezig.length;
    if (ruimte <= 0) {
      setFout(`Maximum bereikt: ${MAX_FOTOS} foto's per vakman.`);
      return;
    }
    const tePlaatsen = arr.slice(0, ruimte);
    if (arr.length > ruimte) {
      setFout(`Slechts ${ruimte} van ${arr.length} foto's konden erbij — limiet is ${MAX_FOTOS}.`);
    }
    for (const file of tePlaatsen) {
      if (!TOEGESTANE_TYPES.includes(file.type)) {
        setFout(`${file.name}: alleen JPG, PNG of WEBP toegestaan.`);
        continue;
      }
      // Niet await'en zodat parallelle uploads spelen
      uploadEen(file);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }

  async function verwijderFoto(id) {
    if (!confirm("Foto verwijderen?")) return;
    const res = await fetch(`/api/profiel/showcase/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFotos((p) => p.filter((f) => f.id !== id));
    } else {
      const j = await res.json().catch(() => ({}));
      setFout(j.error || "Verwijderen mislukt.");
    }
  }

  const aantalTotaal = fotos.length + bezig.length;
  const portfolioVoltooid = fotos.length >= 5;

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-slate-900">
          Showcase-galerij
        </h2>
        <p className="text-xs text-slate-500">
          {aantalTotaal} / {MAX_FOTOS}
          {portfolioVoltooid && (
            <span className="ml-2 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              ✦ Portfolio voltooid
            </span>
          )}
        </p>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Upload foto's van opgeleverde klussen. Verschijnt op{" "}
        <a
          href={`/vakmannen/${vakmanId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-700 underline hover:text-slate-900"
        >
          jouw publieke profiel
        </a>
        . We comprimeren automatisch zodat je telefoon-foto's snel laden.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
          drag
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <Upload size={24} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-700 mb-1">
          Sleep foto's hierheen of{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-emerald-700 underline hover:text-emerald-800"
          >
            kies bestanden
          </button>
        </p>
        <p className="text-[11px] text-slate-500">
          JPG, PNG of WEBP — meerdere tegelijk OK.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {fout && (
        <p className="text-xs text-rose-600 mt-3">{fout}</p>
      )}

      {(fotos.length > 0 || bezig.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="relative aspect-square rounded overflow-hidden border border-slate-200 bg-slate-100 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.beschrijving || "Showcase foto"}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => verwijderFoto(f.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-700 hover:bg-rose-600 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                aria-label="Verwijder foto"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {bezig.map((b) => (
            <div
              key={b.id}
              className="aspect-square rounded border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-[11px] text-slate-500 animate-pulse"
            >
              <ImagePlus size={20} className="mb-1 text-slate-400" />
              Uploaden...
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

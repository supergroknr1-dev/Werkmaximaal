"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Lightbox-overlay voor de showcase-galerij. Klik op een grid-foto
 * opent 'm groot, met pijl-toetsen / swipe / klik-buttons door de
 * galerij heen. Esc sluit. Body-scroll wordt vergrendeld zolang open.
 */
export default function Lightbox({ fotos }) {
  const [open, setOpen] = useState(null); // index of null

  useEffect(() => {
    if (open === null) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => Math.min(fotos.length - 1, i + 1));
      if (e.key === "ArrowLeft") setOpen((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, fotos.length]);

  if (!fotos || fotos.length === 0) return null;

  const huidige = open === null ? null : fotos[open];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOpen(i)}
            className="block aspect-square rounded overflow-hidden border border-slate-200 bg-slate-100 group focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.url}
              alt={f.beschrijving || `Showcase foto ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {huidige && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Sluiten"
          >
            <X size={20} />
          </button>

          {open > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open - 1);
              }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Vorige"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <div
            className="max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={huidige.url}
              alt={huidige.beschrijving || ""}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            {huidige.beschrijving && (
              <p className="text-sm text-white/90 mt-3 text-center max-w-2xl">
                {huidige.beschrijving}
              </p>
            )}
            <p className="text-xs text-white/60 mt-2">
              {open + 1} / {fotos.length}
            </p>
          </div>

          {open < fotos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open + 1);
              }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Volgende"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

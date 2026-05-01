"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeftRight } from "lucide-react";
import VoorNaTegel from "../../../components/VoorNaTegel";

/**
 * Lightbox-overlay voor de showcase-galerij. Klik op een grid-foto
 * opent 'm groot, met pijl-toetsen / swipe / klik-buttons door de
 * galerij heen. Esc sluit. Body-scroll wordt vergrendeld zolang open.
 *
 * Voor/Na-paren krijgen in de grid een split-view tegel, en in de
 * lightbox een slider waarmee de bezoeker tussen Voor en Na kan schuiven.
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
            className="block aspect-square rounded overflow-hidden border border-slate-200 bg-slate-100 group focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {f.urlNa ? (
              <VoorNaTegel urlVoor={f.url} urlNa={f.urlNa} alt={f.beschrijving} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={f.beschrijving || `Showcase foto ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            )}
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
            className="w-full max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {huidige.urlNa ? (
              <VoorNaSlider urlVoor={huidige.url} urlNa={huidige.urlNa} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={huidige.url}
                alt={huidige.beschrijving || ""}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
            )}
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

/**
 * Slider-vergelijking voor een Voor/Na-paar. De Na-foto ligt onder, de
 * Voor-foto ligt erbovenop maar is geclipt tot links van de slider-positie.
 * Drag of klik in de container om de slider te verplaatsen. Werkt op
 * muis én touch via Pointer Events.
 *
 * Aspect-[4/3] container zodat beide foto's altijd op exact dezelfde
 * pixel-coördinaten staan en de slider naadloos uitlijnt.
 */
function VoorNaSlider({ urlVoor, urlNa }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  function moveTo(clientX) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl bg-black select-none touch-none cursor-ew-resize"
      style={{ aspectRatio: "4 / 3", maxHeight: "80vh" }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) moveTo(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    >
      {/* Onderlaag: Na-foto, altijd zichtbaar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urlNa}
        alt="Na"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      {/* Bovenlaag: Voor-foto, geclipt tot links van de slider */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlVoor}
          alt="Voor"
          className="w-full h-full object-contain"
        />
      </div>
      {/* Slider-handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.6)]"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center">
          <ArrowLeftRight size={18} className="text-slate-700" />
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-2 py-1 bg-black/70 text-white rounded pointer-events-none">
        Voor
      </span>
      <span className="absolute top-3 right-3 text-xs font-bold uppercase tracking-wider px-2 py-1 bg-black/70 text-white rounded pointer-events-none">
        Na
      </span>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

const MIN_DIM = 400;
const TARGET_DIM = 600;
const KWALITEIT = 0.85;

/**
 * Inline foto-editor met overlay-balk onder aan de profielfoto.
 *
 * - magBewerken={true} verschijnt op de eigen profielpagina van de
 *   vakman én op profielen wanneer een admin kijkt. De overlay-balk
 *   onder de foto opent direct de bestand-picker bij click.
 * - Bij selectie: image gelezen → afmetingen ≥ 400×400 → preview-modal
 *   → 'Ga door' croppt naar vierkant + resized naar 600×600 webp →
 *   upload naar Blob → PUT /api/profielfoto → router.refresh().
 *
 * State-management blijft local (useState); pagina ververst via
 * router.refresh() zonder full reload zodat URL en scroll-positie
 * behouden blijven.
 */
export default function ProfielFotoEditor({
  vakmanId,
  huidigeFotoUrl,
  initialen,
  alt,
}) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBestand, setPreviewBestand] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  function kiesBestand(file) {
    setFout(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFout("Alleen JPG, PNG of WEBP.");
      return;
    }
    // Lees afmetingen vóór preview tonen
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      if (img.naturalWidth < MIN_DIM || img.naturalHeight < MIN_DIM) {
        URL.revokeObjectURL(objectUrl);
        setFout(
          `Foto is ${img.naturalWidth}×${img.naturalHeight}px — minimaal ${MIN_DIM}×${MIN_DIM}px vereist.`
        );
        return;
      }
      setPreviewUrl(objectUrl);
      setPreviewBestand(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFout("Kan deze afbeelding niet lezen.");
    };
    img.src = objectUrl;
  }

  async function cropEnUpload() {
    if (!previewBestand) return;
    setBezig(true);
    setFout(null);
    try {
      const blob = await cropNaarVierkant(previewBestand);
      const fd = new FormData();
      fd.append(
        "file",
        new File([blob], "profiel.webp", { type: "image/webp" })
      );
      const upRes = await fetch("/api/upload/profielfoto", {
        method: "POST",
        body: fd,
      });
      const upJson = await upRes.json().catch(() => ({}));
      if (!upRes.ok) throw new Error(upJson.error || "Upload mislukt");

      const saveRes = await fetch("/api/profielfoto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: upJson.url, vakmanId }),
      });
      const saveJson = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saveJson.error || "Opslaan mislukt");

      // Cleanup + refresh — server-rendered profielpagina ziet nieuwe URL
      sluitPreview();
      router.refresh();
    } catch (err) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  }

  function sluitPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBestand(null);
  }

  return (
    <>
      <div className="relative w-20 h-20 shrink-0 group">
        {huidigeFotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={huidigeFotoUrl}
            alt={alt || "Profielfoto"}
            className="w-20 h-20 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-semibold">
            {initialen}
          </div>
        )}

        {/* Klik-overlay over de hele foto + halve cirkel onderaan met
            label. transform-origin staat op center zodat de balk
            mooi op de cirkelvorm valt. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Foto uploaden"
        >
          <span
            className="absolute inset-x-0 bottom-0 bg-black/50 group-hover:bg-black/85 text-white text-[9px] font-medium uppercase tracking-wider py-1 transition-colors flex flex-col items-center justify-center leading-tight"
          >
            <Camera size={11} className="mb-0.5" />
            <span>Foto uploaden</span>
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            kiesBestand(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-center w-20 shrink-0">
        Min. 400×400 (1:1)
      </p>

      {previewUrl && (
        <PreviewModal
          previewUrl={previewUrl}
          fout={fout}
          bezig={bezig}
          onAnnuleer={sluitPreview}
          onBevestig={cropEnUpload}
        />
      )}
      {!previewUrl && fout && (
        <p className="absolute mt-2 text-[11px] text-rose-600">{fout}</p>
      )}
    </>
  );
}

function PreviewModal({ previewUrl, fout, bezig, onAnnuleer, onBevestig }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={() => !bezig && onAnnuleer()}
    >
      <div
        className="bg-white rounded-md shadow-lg max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Profielfoto wijzigen
          </h3>
          <button
            type="button"
            onClick={onAnnuleer}
            disabled={bezig}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
            aria-label="Sluiten"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          De foto wordt automatisch bijgesneden naar een vierkant en
          verkleind tot {TARGET_DIM}×{TARGET_DIM}px.
        </p>
        <div className="relative aspect-square w-full bg-slate-100 rounded overflow-hidden mb-4 border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Voorbeeld"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Cirkel-frame overlay zodat duidelijk is hoe 't gaat ogen */}
          <div className="absolute inset-0 ring-[9999px] ring-white/60 rounded-full pointer-events-none" />
        </div>
        {fout && (
          <p className="text-xs text-rose-600 mb-3">{fout}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onAnnuleer}
            disabled={bezig}
            className="text-xs px-3 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onBevestig}
            disabled={bezig}
            className="text-xs px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {bezig ? "Bezig..." : "Ga door"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Center-crop een afbeelding naar een vierkant en resize naar
 * TARGET_DIM × TARGET_DIM. Output: webp blob met KWALITEIT.
 */
async function cropNaarVierkant(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Kan afbeelding niet lezen"));
    });
    const min = Math.min(img.width, img.height);
    const sx = (img.width - min) / 2;
    const sy = (img.height - min) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_DIM;
    canvas.height = TARGET_DIM;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, min, min, 0, 0, TARGET_DIM, TARGET_DIM);
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

"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, X, ImagePlus, ChevronRight, ChevronLeft, ChevronDown, Check, ArrowLeftRight } from "lucide-react";
import VoorNaTegel from "../../../components/VoorNaTegel";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIM = 1600;
const KWALITEIT = 0.85;
const MAX_FOTOS = 20;

/**
 * Showcase-galerij met 2-stappen "project publiceren"-wizard.
 *
 * Bestaande foto's staan in de grid bovenaan (klik X om te verwijderen).
 *
 * Wizard-flow voor nieuwe uploads:
 *   Stap 1 'upload'      — drag-drop / kies bestanden. Foto's worden
 *                          tijdens uploaden client-side gerresized
 *                          (canvas → webp ~300 KB) en direct naar de DB
 *                          gepost (zonder beschrijving). Pas wanneer
 *                          ≥1 upload klaar is, verschijnt 'Ga door →'
 *                          rechtsonder (sticky op mobiel).
 *   Stap 2 'beschrijven' — alle net-geüploade foto's klein, met per
 *                          stuk een textarea voor de beschrijving.
 *                          'Project publiceren →' patcht ze één voor
 *                          één en reset de wizard.
 *
 * State management: useState volstaat — alle state leeft binnen één
 * component-tree, geen route-overgangen, geen multi-tab use-case.
 * Foto's zelf staan al persistent in de DB zodra de upload klaar is,
 * dus mid-flow afhaken kost niks.
 */
export default function ShowcaseGalerij({ vakmanId }) {
  const [bestaande, setBestaande] = useState([]);
  const [nieuwe, setNieuwe] = useState([]); // foto's geüpload in deze sessie
  const [bezig, setBezig] = useState([]); // [{ tempId, naam }] tijdens upload
  const [fout, setFout] = useState(null);
  const [drag, setDrag] = useState(false);
  const [stap, setStap] = useState("upload"); // 'upload' | 'beschrijven'
  const [beschrijvingen, setBeschrijvingen] = useState({}); // { fotoId: tekst }
  const [publishing, setPublishing] = useState(false);
  const [paarOpen, setPaarOpen] = useState(false);
  const [voorFile, setVoorFile] = useState(null);
  const [naFile, setNaFile] = useState(null);
  const [paarBezig, setPaarBezig] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/profiel/showcase")
      .then((r) => r.json())
      .then(setBestaande)
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
    setBezig((p) => [...p, { tempId, naam: file.name }]);
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
      setNieuwe((p) => [...p, json]);
    } catch (err) {
      setFout(`${file.name}: ${err.message}`);
    } finally {
      setBezig((p) => p.filter((b) => b.tempId !== tempId));
    }
  }

  async function uploadPaar() {
    if (!voorFile || !naFile) return;
    setPaarBezig(true);
    setFout(null);
    try {
      if (!TOEGESTANE_TYPES.includes(voorFile.type)) {
        throw new Error("Voor-foto: alleen JPG, PNG of WEBP toegestaan.");
      }
      if (!TOEGESTANE_TYPES.includes(naFile.type)) {
        throw new Error("Na-foto: alleen JPG, PNG of WEBP toegestaan.");
      }
      const ruimte = MAX_FOTOS - bestaande.length - nieuwe.length - bezig.length;
      if (ruimte <= 0) {
        throw new Error(`Maximum bereikt: ${MAX_FOTOS} foto's per vakman.`);
      }

      const voorBlob = await resizeNaarBlob(voorFile);
      const naBlob = await resizeNaarBlob(naFile);

      const fd = new FormData();
      fd.append(
        "file",
        new File([voorBlob], voorFile.name.replace(/\.[^.]+$/, "") + ".webp", {
          type: "image/webp",
        })
      );
      fd.append(
        "fileNa",
        new File([naBlob], naFile.name.replace(/\.[^.]+$/, "") + ".webp", {
          type: "image/webp",
        })
      );
      const res = await fetch("/api/profiel/showcase", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload mislukt");

      setNieuwe((p) => [...p, json]);
      setVoorFile(null);
      setNaFile(null);
      setPaarOpen(false);
    } catch (err) {
      setFout(err.message);
    } finally {
      setPaarBezig(false);
    }
  }

  async function handleFiles(filesList) {
    const arr = Array.from(filesList);
    setFout(null);
    const ruimte = MAX_FOTOS - bestaande.length - nieuwe.length - bezig.length;
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
      uploadEen(file);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }

  async function verwijderBestaande(id) {
    if (!confirm("Foto verwijderen?")) return;
    const res = await fetch(`/api/profiel/showcase/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBestaande((p) => p.filter((f) => f.id !== id));
    } else {
      const j = await res.json().catch(() => ({}));
      setFout(j.error || "Verwijderen mislukt.");
    }
  }

  async function verwijderNieuwe(id) {
    const res = await fetch(`/api/profiel/showcase/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNieuwe((p) => p.filter((f) => f.id !== id));
      setBeschrijvingen((p) => {
        const c = { ...p };
        delete c[id];
        return c;
      });
    }
  }

  async function publiceer() {
    setPublishing(true);
    setFout(null);
    try {
      // PATCH per foto die een beschrijving heeft. Lege beschrijvingen
      // slaan we over — niet iedereen wil per se tekst toevoegen.
      for (const f of nieuwe) {
        const tekst = (beschrijvingen[f.id] || "").trim();
        if (!tekst) continue;
        await fetch(`/api/profiel/showcase/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ beschrijving: tekst }),
        });
      }
      // Refresh uit de DB zodat we de uiteindelijke state hebben
      const res = await fetch("/api/profiel/showcase");
      const verse = await res.json().catch(() => []);
      setBestaande(verse);
      setNieuwe([]);
      setBeschrijvingen({});
      setStap("upload");
    } finally {
      setPublishing(false);
    }
  }

  const aantalTotaal = bestaande.length + nieuwe.length + bezig.length;
  const portfolioVoltooid = bestaande.length + nieuwe.length >= 5;
  const kanGaDoor = nieuwe.length >= 1 && bezig.length === 0;

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
        .
      </p>

      {/* BESTAANDE FOTO'S */}
      {bestaande.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Op je profiel
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {bestaande.map((f) => (
              <FotoTegel
                key={f.id}
                foto={f}
                onVerwijder={() => verwijderBestaande(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* WIZARD - STAP 1: UPLOAD */}
      {stap === "upload" && (
        <>
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Nieuwe foto's toevoegen
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

          {/* VOOR/NA-PAAR — uitklapbaar paneel onder de drop-zone */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setPaarOpen((o) => !o)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${paarOpen ? "" : "-rotate-90"}`}
              />
              <ArrowLeftRight size={14} />
              Voor/Na-paar toevoegen
            </button>

            {paarOpen && (
              <div className="mt-2 border border-slate-200 rounded-md p-4 bg-slate-50">
                <p className="text-xs text-slate-600 mb-3">
                  Twee foto's van dezelfde klus — situatie vóór jij begon, en het eindresultaat. Ze worden samen getoond als één paar op je profiel.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <SlotKiezer label="Voor" file={voorFile} onPick={setVoorFile} />
                  <SlotKiezer label="Na" file={naFile} onPick={setNaFile} />
                </div>
                <button
                  type="button"
                  onClick={uploadPaar}
                  disabled={!voorFile || !naFile || paarBezig}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {paarBezig ? "Uploaden..." : "Voor/Na-paar uploaden"}
                </button>
              </div>
            )}
          </div>

          {fout && <p className="text-xs text-rose-600 mt-3">{fout}</p>}

          {(nieuwe.length > 0 || bezig.length > 0) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
              {nieuwe.map((f) => (
                <FotoTegel
                  key={f.id}
                  foto={f}
                  onVerwijder={() => verwijderNieuwe(f.id)}
                  hoek="nieuw"
                />
              ))}
              {bezig.map((b) => (
                <div
                  key={b.tempId}
                  className="aspect-square rounded border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-[11px] text-slate-500 animate-pulse"
                >
                  <ImagePlus size={20} className="mb-1 text-slate-400" />
                  Uploaden...
                </div>
              ))}
            </div>
          )}

          {/* Sticky 'Ga door'-knop op mobiel — vlak boven viewport-bottom */}
          <StickyActieBalk
            zichtbaar={nieuwe.length > 0 || bezig.length > 0}
            sub={
              bezig.length > 0
                ? `${bezig.length} foto${bezig.length === 1 ? "" : "'s"} aan het uploaden...`
                : `${nieuwe.length} foto${nieuwe.length === 1 ? "" : "'s"} klaar voor publicatie`
            }
          >
            <button
              type="button"
              onClick={() => setStap("beschrijven")}
              disabled={!kanGaDoor}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              Ga door
              <ChevronRight size={16} />
            </button>
          </StickyActieBalk>
        </>
      )}

      {/* WIZARD - STAP 2: BESCHRIJVEN */}
      {stap === "beschrijven" && (
        <>
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Beschrijf je foto's <span className="font-normal text-slate-500">(optioneel)</span>
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Een korte beschrijving (bijv. <em>Badkamer-renovatie Eindhoven</em>) helpt klanten zien wat voor werk je doet.
          </p>

          <div className="space-y-3 mb-4">
            {nieuwe.map((f) => (
              <div
                key={f.id}
                className="flex gap-3 bg-slate-50 border border-slate-200 rounded-md p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt=""
                  className="w-20 h-20 object-cover rounded shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <textarea
                    value={beschrijvingen[f.id] || ""}
                    onChange={(e) =>
                      setBeschrijvingen((p) => ({
                        ...p,
                        [f.id]: e.target.value.slice(0, 200),
                      }))
                    }
                    placeholder="Bijv: Badkamer-renovatie Eindhoven"
                    rows={2}
                    maxLength={200}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 text-right mt-0.5">
                    {(beschrijvingen[f.id] || "").length}/200
                  </p>
                </div>
              </div>
            ))}
          </div>

          {fout && <p className="text-xs text-rose-600 mb-3">{fout}</p>}

          <StickyActieBalk
            zichtbaar
            sub={`${nieuwe.length} foto${nieuwe.length === 1 ? "" : "'s"} worden gepubliceerd`}
          >
            <button
              type="button"
              onClick={() => setStap("upload")}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 px-4 py-2.5 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Terug
            </button>
            <button
              type="button"
              onClick={publiceer}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              {publishing ? (
                "Publiceren..."
              ) : (
                <>
                  Project publiceren
                  <Check size={16} />
                </>
              )}
            </button>
          </StickyActieBalk>
        </>
      )}
    </div>
  );
}

function FotoTegel({ foto, onVerwijder, hoek }) {
  return (
    <div className="relative aspect-square rounded overflow-hidden border border-slate-200 bg-slate-100 group">
      {foto.urlNa ? (
        <VoorNaTegel urlVoor={foto.url} urlNa={foto.urlNa} alt={foto.beschrijving} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto.url}
          alt={foto.beschrijving || "Showcase foto"}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      )}
      {hoek === "nieuw" && (
        <span className="absolute top-1 left-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white">
          Nieuw
        </span>
      )}
      <button
        type="button"
        onClick={onVerwijder}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-700 hover:bg-rose-600 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
        aria-label="Verwijder foto"
      >
        <X size={13} />
      </button>
    </div>
  );
}

/**
 * Op desktop is dit gewoon een rechts-uitgelijnde flex-balk in de
 * normale flow. Op mobiel (sm: en kleiner) plakt 'ie aan de bottom van
 * de viewport zodat de vakman 'm direct ziet zonder scrollen na het
 * selecteren van foto's.
 */
function StickyActieBalk({ zichtbaar, sub, children }) {
  if (!zichtbaar) return null;
  return (
    <div className="mt-5 sm:flex sm:items-center sm:justify-end sm:gap-3 sticky bottom-0 sm:static bg-white sm:bg-transparent border-t border-slate-200 sm:border-0 -mx-6 sm:mx-0 px-6 sm:px-0 py-3 sm:py-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:shadow-none">
      {sub && (
        <p className="text-xs text-slate-500 mb-2 sm:mb-0 sm:mr-auto">{sub}</p>
      )}
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
  );
}

/**
 * File-pick slot voor één foto van een Voor/Na-paar. Toont preview
 * (object-URL, opgeruimd op unmount) of een placeholder. Klikken opent
 * de file-picker; "Wissen" reset de selectie.
 */
function SlotKiezer({ label, file, onPick }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-md bg-white hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center overflow-hidden transition-colors"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={28} className="text-slate-400" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      {file && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="text-[11px] text-slate-500 hover:text-rose-600 mt-1 underline"
        >
          Wissen
        </button>
      )}
    </div>
  );
}

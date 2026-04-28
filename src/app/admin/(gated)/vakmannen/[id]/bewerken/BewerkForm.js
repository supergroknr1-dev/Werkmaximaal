"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  POSTCODE_REGEX,
  fetchAdres,
  searchPlaatsen,
} from "../../../../../../lib/pdok";

function AdresStatus({ status }) {
  const map = {
    leeg: { tekst: "Vul postcode + huisnummer in", kleur: "text-slate-400" },
    typen: { tekst: "Vul postcode + huisnummer in", kleur: "text-slate-400" },
    bezig: { tekst: "Adres ophalen…", kleur: "text-slate-500" },
    ok: { tekst: "✓ Adres gevonden", kleur: "text-emerald-700" },
    fout: {
      tekst: "Geen adres gevonden — check postcode en huisnummer",
      kleur: "text-rose-700",
    },
  };
  const { tekst, kleur } = map[status] || map.leeg;
  return <span className={`text-[11px] font-medium ${kleur}`}>{tekst}</span>;
}

function Veld({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full text-sm border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

export default function BewerkForm({ vakman }) {
  const router = useRouter();
  const [form, setForm] = useState({
    naam: vakman.naam || "",
    voornaam: vakman.voornaam || "",
    achternaam: vakman.achternaam || "",
    email: vakman.email || "",
    bedrijfsnaam: vakman.bedrijfsnaam || "",
    kvkNummer: vakman.kvkNummer || "",
    kvkUittrekselUrl: vakman.kvkUittrekselUrl || "",
    kvkUittrekselNaam: vakman.kvkUittrekselNaam || "",
    werkTelefoon: vakman.werkTelefoon || "",
    priveTelefoon: vakman.priveTelefoon || "",
    vakmanType: vakman.vakmanType || "",
    straatnaam: vakman.straatnaam || "",
    huisnummer: vakman.huisnummer || "",
    huisnummerToevoeging: vakman.huisnummerToevoeging || "",
    postcode: vakman.postcode || "",
    plaats: vakman.plaats || "",
    werkafstand: vakman.werkafstand ?? "",
    regioPostcode: vakman.regioPostcode || "",
    regioPlaats: vakman.regioPlaats || "",
    regioType: vakman.regioPlaats ? "plaats" : "postcode",
  });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [succes, setSucces] = useState(false);
  const [uploadBezig, setUploadBezig] = useState(false);
  const [uploadFout, setUploadFout] = useState(null);
  const [plaatsSuggesties, setPlaatsSuggesties] = useState([]);
  const [plaatsSuggestiesOpen, setPlaatsSuggestiesOpen] = useState(false);
  // Extra werkgebieden — alleen Vakman ziet deze. Tijdelijk client-side
  // ID (clientId) zodat we per rij een stabiele key hebben (de DB-id
  // ontbreekt bij net-toegevoegde rijen).
  const [werkgebiedenExtra, setWerkgebiedenExtra] = useState(() =>
    (vakman.werkgebiedenExtra || []).map((w) => ({
      clientId: `db-${w.id}`,
      type: w.type,
      waarde: w.waarde,
      werkafstand: String(w.werkafstand ?? ""),
    }))
  );

  // Wijzig-indicator: snapshot van de form-staat zoals laatst opgeslagen.
  // Velden die afwijken krijgen geel; net opgeslagen velden flashen groen.
  const initielePrimary = {
    naam: vakman.naam || "",
    voornaam: vakman.voornaam || "",
    achternaam: vakman.achternaam || "",
    email: vakman.email || "",
    bedrijfsnaam: vakman.bedrijfsnaam || "",
    kvkNummer: vakman.kvkNummer || "",
    kvkUittrekselUrl: vakman.kvkUittrekselUrl || "",
    kvkUittrekselNaam: vakman.kvkUittrekselNaam || "",
    werkTelefoon: vakman.werkTelefoon || "",
    priveTelefoon: vakman.priveTelefoon || "",
    vakmanType: vakman.vakmanType || "",
    straatnaam: vakman.straatnaam || "",
    huisnummer: vakman.huisnummer || "",
    huisnummerToevoeging: vakman.huisnummerToevoeging || "",
    postcode: vakman.postcode || "",
    plaats: vakman.plaats || "",
    werkafstand: String(vakman.werkafstand ?? ""),
    regioPostcode: vakman.regioPostcode || "",
    regioPlaats: vakman.regioPlaats || "",
  };
  const [origineel, setOrigineel] = useState(initielePrimary);
  const [netOpgeslagenVelden, setNetOpgeslagenVelden] = useState([]);

  function isVeranderd(key) {
    const huidig = String(form[key] ?? "");
    const oud = String(origineel[key] ?? "");
    return huidig !== oud;
  }
  function veldKlasse(key) {
    if (isVeranderd(key)) return "bg-amber-50 border-amber-300";
    if (netOpgeslagenVelden.includes(key))
      return "bg-emerald-50 border-emerald-300";
    return "";
  }
  // adresStatus: "leeg" | "typen" | "bezig" | "ok" | "fout"
  const [adresStatus, setAdresStatus] = useState(
    vakman.straatnaam && vakman.plaats ? "ok" : "leeg"
  );

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setSucces(false);
  }

  // PDOK auto-lookup zodra postcode (6 tekens) + huisnummer juist zijn.
  // Vult straatnaam en plaats automatisch in (admin kan daarna nog
  // handmatig overschrijven). Korte debounce zodat niet bij elke
  // toetsaanslag een request gaat.
  useEffect(() => {
    const schoonPc = (form.postcode || "").trim().toUpperCase();
    const schoonHnr = (form.huisnummer || "").trim();

    if (!schoonPc && !schoonHnr) {
      setAdresStatus("leeg");
      return;
    }
    if (schoonPc.length < 6 || !schoonHnr) {
      setAdresStatus("typen");
      return;
    }
    if (!POSTCODE_REGEX.test(schoonPc)) {
      setAdresStatus("fout");
      return;
    }

    setAdresStatus("bezig");
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const adres = await fetchAdres(schoonPc, schoonHnr);
      if (geannuleerd) return;
      if (adres) {
        setForm((prev) => ({
          ...prev,
          straatnaam: adres.straatnaam,
          plaats: adres.plaats,
          postcode: adres.postcode,
        }));
        setAdresStatus("ok");
      } else {
        setAdresStatus("fout");
      }
    }, 250);

    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [form.postcode, form.huisnummer]);

  // Suggesties voor regio-plaats. Alleen als type=plaats geselecteerd
  // is. Debounced zodat we niet bij elke toetsaanslag fetchen.
  useEffect(() => {
    if (form.regioType !== "plaats") {
      setPlaatsSuggesties([]);
      return;
    }
    const q = (form.regioPlaats || "").trim();
    if (q.length < 2) {
      setPlaatsSuggesties([]);
      return;
    }
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const namen = await searchPlaatsen(q);
      if (!geannuleerd) setPlaatsSuggesties(namen);
    }, 250);
    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [form.regioPlaats, form.regioType]);

  async function uploadKvk(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadFout(null);
    setUploadBezig(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/kvk-uittreksel", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload mislukt");
      setForm((prev) => ({
        ...prev,
        kvkUittrekselUrl: json.url,
        kvkUittrekselNaam: json.naam || file.name,
      }));
    } catch (err) {
      setUploadFout(err.message);
    } finally {
      setUploadBezig(false);
    }
  }

  function verwijderKvk() {
    setForm((prev) => ({ ...prev, kvkUittrekselUrl: "", kvkUittrekselNaam: "" }));
  }

  function voegWerkgebiedToe() {
    setWerkgebiedenExtra((prev) => [
      ...prev,
      {
        clientId: `nieuw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "postcode",
        waarde: "",
        werkafstand: "25",
      },
    ]);
  }
  function verwijderWerkgebied(clientId) {
    setWerkgebiedenExtra((prev) => prev.filter((w) => w.clientId !== clientId));
  }
  function wijzigWerkgebied(clientId, key, waarde) {
    setWerkgebiedenExtra((prev) =>
      prev.map((w) => (w.clientId === clientId ? { ...w, [key]: waarde } : w))
    );
  }

  async function submit(e) {
    e.preventDefault();
    setFout(null);
    setSucces(false);
    setBezig(true);
    try {
      const payload = {
        ...form,
        werkgebiedenExtra: werkgebiedenExtra.map((w) => ({
          type: w.type,
          waarde: w.waarde,
          werkafstand: parseInt(w.werkafstand, 10) || 0,
        })),
      };
      const res = await fetch(`/api/admin/vakmannen/${vakman.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Opslaan mislukt");

      // Wijzig-indicator: bepaal welke velden afwijken van origineel
      // (= net opgeslagen) en flash ze 3 seconden groen, daarna wit.
      const netGewijzigd = Object.keys(origineel).filter(
        (k) => String(form[k] ?? "") !== String(origineel[k] ?? "")
      );
      setNetOpgeslagenVelden(netGewijzigd);
      setOrigineel({ ...origineel, ...form });
      setTimeout(() => setNetOpgeslagenVelden([]), 3000);

      setSucces(true);
      router.refresh();
    } catch (err) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  }

  const isPro = form.vakmanType === "professional";
  const isHobbyist = form.vakmanType === "hobbyist";
  const naamLabel = isPro
    ? "Bedrijfsnaam (wat klanten zien)"
    : isHobbyist
    ? "Schermnaam (wat klanten zien)"
    : "Volledige naam (fallback)";
  const naamHint = isPro || isHobbyist
    ? "Naam zoals klanten u op de site zien."
    : "Wordt gebruikt als voor-/achternaam leeg zijn.";

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      {/* Account */}
      <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Type
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set("vakmanType", "professional")}
                className={`text-left border-2 rounded-md p-3 text-xs transition-colors ${
                  isPro
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-slate-900">
                    Vakman (Professional)
                  </p>
                  {isPro && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5">
                      ✓ Gekozen
                    </span>
                  )}
                </div>
                <ul className="space-y-1 text-slate-600 leading-relaxed">
                  <li>✓ KvK-geregistreerd bedrijf</li>
                  <li>✓ Bedrijfsverzekering + garantie op werk</li>
                  <li>✓ Gratis registratie (geen inschrijfgeld)</li>
                  <li>✓ Standaard lead-prijs</li>
                  <li>✓ Pipedrive-pipeline: Pro</li>
                </ul>
              </button>
              <button
                type="button"
                onClick={() => set("vakmanType", "hobbyist")}
                className={`text-left border-2 rounded-md p-3 text-xs transition-colors ${
                  isHobbyist
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-slate-900">
                    Buurtklusser (Hobbyist)
                  </p>
                  {isHobbyist && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5">
                      ✓ Gekozen
                    </span>
                  )}
                </div>
                <ul className="space-y-1 text-slate-600 leading-relaxed">
                  <li>○ Geen KvK-plicht</li>
                  <li>○ Geen bedrijfsverzekering via platform</li>
                  <li>○ € 25 eenmalig inschrijfgeld</li>
                  <li>○ Betaalt het dubbele per lead</li>
                  <li>○ Pipedrive-pipeline: Hobbyist</li>
                </ul>
              </button>
            </div>
            {form.vakmanType && (
              <button
                type="button"
                onClick={() => set("vakmanType", "")}
                className="text-[11px] text-slate-500 hover:text-slate-900 mt-2"
              >
                ↺ Selectie wissen
              </button>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Bepaalt lead-prijs en CRM-pipeline.
            </p>
          </div>
          <Veld label={naamLabel} hint={naamHint}>
            <input
              type="text"
              value={form.naam}
              onChange={(e) => set("naam", e.target.value)}
              className={`${inputCls} ${veldKlasse("naam")}`}
              required
            />
          </Veld>
          <Veld label="Voornaam">
            <input
              type="text"
              value={form.voornaam}
              onChange={(e) => set("voornaam", e.target.value)}
              className={`${inputCls} ${veldKlasse("voornaam")}`}
            />
          </Veld>
          <Veld label="Achternaam">
            <input
              type="text"
              value={form.achternaam}
              onChange={(e) => set("achternaam", e.target.value)}
              className={`${inputCls} ${veldKlasse("achternaam")}`}
            />
          </Veld>
          <Veld label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={`${inputCls} ${veldKlasse("email")}`}
              required
            />
          </Veld>
          <Veld
            label="Werk-telefoon"
            hint="Zakelijk nummer — zichtbaar voor klanten."
          >
            <input
              type="tel"
              value={form.werkTelefoon}
              onChange={(e) => set("werkTelefoon", e.target.value)}
              className={`${inputCls} ${veldKlasse("werkTelefoon")}`}
            />
          </Veld>
          <Veld
            label="Privé-telefoon"
            hint="Alleen zichtbaar voor admin — niet voor klanten."
          >
            <input
              type="tel"
              value={form.priveTelefoon}
              onChange={(e) => set("priveTelefoon", e.target.value)}
              className={`${inputCls} ${veldKlasse("priveTelefoon")}`}
            />
          </Veld>
        </div>
      </section>

      {/* Bedrijf — alleen zichtbaar bij type=Vakman */}
      {isPro && (
      <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Bedrijf
          <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            Verplicht voor Vakman
          </span>
        </h2>
        <div className="space-y-4">
          <Veld label={`Bedrijfsnaam${isPro ? " *" : ""}`}>
            <input
              type="text"
              value={form.bedrijfsnaam}
              onChange={(e) => set("bedrijfsnaam", e.target.value)}
              className={`${inputCls} ${veldKlasse("bedrijfsnaam")}`}
              required={isPro}
            />
          </Veld>
          <Veld label={`KvK-nummer${isPro ? " *" : ""}`}>
            <input
              type="text"
              value={form.kvkNummer}
              onChange={(e) => set("kvkNummer", e.target.value)}
              className={`${inputCls} ${veldKlasse("kvkNummer")}`}
              required={isPro}
            />
          </Veld>
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              KvK-uittreksel (PDF, JPG of PNG, max 5 MB)
            </span>
            {form.kvkUittrekselUrl ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                <a
                  href={form.kvkUittrekselUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-800 hover:underline truncate"
                >
                  ✓ {form.kvkUittrekselNaam || "Uittreksel bekijken"}
                </a>
                <button
                  type="button"
                  onClick={verwijderKvk}
                  className="text-[11px] text-rose-700 hover:text-rose-900 shrink-0"
                >
                  verwijder
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mb-1.5">
                Nog geen uittreksel geüpload.
              </p>
            )}
            <label
              className={`inline-flex items-center gap-2 mt-2 px-4 py-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                uploadBezig
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadBezig
                ? "Bezig met uploaden…"
                : form.kvkUittrekselUrl
                ? "Vervang bestand"
                : "Bestand kiezen"}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={uploadKvk}
                disabled={uploadBezig}
                className="sr-only"
              />
            </label>
            {uploadFout && (
              <p className="text-[11px] text-rose-700 mt-1">{uploadFout}</p>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Adres */}
      <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Adres gegevens
          </h2>
          <AdresStatus status={adresStatus} />
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Vul postcode en huisnummer in — straatnaam en plaats worden
          automatisch opgehaald via PDOK.
        </p>
        <div className="space-y-4">
          <Veld label="Postcode">
            <input
              type="text"
              value={form.postcode}
              onChange={(e) =>
                set("postcode", e.target.value.toUpperCase())
              }
              className={`${inputCls} ${veldKlasse("postcode")}`}
              placeholder="1234AB"
              maxLength={7}
            />
          </Veld>
          <Veld label="Huisnummer">
            <input
              type="text"
              value={form.huisnummer}
              onChange={(e) => set("huisnummer", e.target.value)}
              className={`${inputCls} ${veldKlasse("huisnummer")}`}
              placeholder="42"
            />
          </Veld>
          <Veld label="Toevoeging">
            <input
              type="text"
              value={form.huisnummerToevoeging}
              onChange={(e) => set("huisnummerToevoeging", e.target.value)}
              className={`${inputCls} ${veldKlasse("huisnummerToevoeging")}`}
              placeholder="A"
            />
          </Veld>
          <Veld label="Straatnaam (auto)">
            <input
              type="text"
              value={form.straatnaam}
              onChange={(e) => set("straatnaam", e.target.value)}
              className={`${inputCls} bg-slate-50 ${veldKlasse("straatnaam")}`}
              readOnly={adresStatus === "bezig"}
            />
          </Veld>
          <Veld label="Plaats (auto)">
            <input
              type="text"
              value={form.plaats}
              onChange={(e) => set("plaats", e.target.value)}
              className={`${inputCls} bg-slate-50 ${veldKlasse("plaats")}`}
              readOnly={adresStatus === "bezig"}
            />
          </Veld>
        </div>
      </section>

      {/* Werkgebied */}
      <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Werkgebied</h2>
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Werkgebied bepalen via
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("regioType", "postcode")}
                className={`text-xs px-3 py-2 rounded border transition-colors ${
                  form.regioType === "postcode"
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                Postcode (4 cijfers)
              </button>
              <button
                type="button"
                onClick={() => set("regioType", "plaats")}
                className={`text-xs px-3 py-2 rounded border transition-colors ${
                  form.regioType === "plaats"
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                Plaats
              </button>
            </div>
          </div>
          {form.regioType === "postcode" ? (
            <Veld
              label="Regio-postcode (4 cijfers)"
              hint="Centrum van het werkgebied, bv. 5611."
            >
              <input
                type="text"
                value={form.regioPostcode}
                onChange={(e) =>
                  set("regioPostcode", e.target.value.toUpperCase())
                }
                className={`${inputCls} ${veldKlasse("regioPostcode")}`}
                maxLength={4}
                placeholder="5611"
              />
            </Veld>
          ) : (
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Regio-plaats
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={form.regioPlaats}
                  onChange={(e) => {
                    set("regioPlaats", e.target.value);
                    setPlaatsSuggestiesOpen(true);
                  }}
                  onFocus={() => setPlaatsSuggestiesOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setPlaatsSuggestiesOpen(false), 150)
                  }
                  className={`${inputCls} ${veldKlasse("regioPlaats")}`}
                  placeholder="Begin te typen, bv. Eindhoven"
                  autoComplete="off"
                />
                {plaatsSuggestiesOpen && plaatsSuggesties.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-md max-h-60 overflow-y-auto">
                    {plaatsSuggesties.map((naam) => (
                      <li key={naam}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            set("regioPlaats", naam);
                            setPlaatsSuggesties([]);
                            setPlaatsSuggestiesOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          {naam}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Centrum van het werkgebied — typ minimaal 2 letters voor
                suggesties uit de Nederlandse plaatsnamen-database (PDOK).
              </p>
            </div>
          )}
          <Veld label="Werkafstand (km)">
            <input
              type="number"
              min={0}
              value={form.werkafstand}
              onChange={(e) => set("werkafstand", e.target.value)}
              className={`${inputCls} ${veldKlasse("werkafstand")}`}
            />
          </Veld>

          {/* Extra werkgebieden — alleen voor Vakman */}
          {isPro && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-medium text-slate-700">
                  Extra werkgebieden ({werkgebiedenExtra.length})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Voor Vakmannen die in meerdere regio's werken. Elk extra
                werkgebied heeft eigen postcode/plaats + werkafstand.
              </p>
              {werkgebiedenExtra.length > 0 && (
                <ul className="space-y-3 mb-3">
                  {werkgebiedenExtra.map((w) => (
                    <li
                      key={w.clientId}
                      className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            wijzigWerkgebied(w.clientId, "type", "postcode")
                          }
                          className={`text-[11px] px-2 py-1.5 rounded border transition-colors ${
                            w.type === "postcode"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          Postcode
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            wijzigWerkgebied(w.clientId, "type", "plaats")
                          }
                          className={`text-[11px] px-2 py-1.5 rounded border transition-colors ${
                            w.type === "plaats"
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          Plaats
                        </button>
                      </div>
                      <input
                        type="text"
                        value={w.waarde}
                        onChange={(e) =>
                          wijzigWerkgebied(
                            w.clientId,
                            "waarde",
                            w.type === "postcode"
                              ? e.target.value.toUpperCase()
                              : e.target.value
                          )
                        }
                        placeholder={w.type === "postcode" ? "5611" : "Eindhoven"}
                        maxLength={w.type === "postcode" ? 4 : 60}
                        className={inputCls}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={w.werkafstand}
                          onChange={(e) =>
                            wijzigWerkgebied(
                              w.clientId,
                              "werkafstand",
                              e.target.value
                            )
                          }
                          placeholder="25"
                          className={`${inputCls} flex-1`}
                        />
                        <span className="text-[11px] text-slate-500">km</span>
                        <button
                          type="button"
                          onClick={() => verwijderWerkgebied(w.clientId)}
                          className="text-[11px] text-rose-700 hover:text-rose-900 px-2 py-1 shrink-0"
                          aria-label="Verwijder werkgebied"
                        >
                          🗑 verwijder
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={voegWerkgebiedToe}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                + Werkgebied toevoegen
              </button>
            </div>
          )}
        </div>
      </section>

      {fout && (
        <div className="bg-rose-50 border border-rose-200 rounded-md px-4 py-3 text-sm text-rose-800">
          {fout}
        </div>
      )}
      {succes && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-sm text-emerald-800">
          ✓ Wijzigingen opgeslagen.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/vakmannen")}
          disabled={bezig}
          className="text-sm px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={bezig}
          className="text-sm px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {bezig ? "Opslaan..." : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}

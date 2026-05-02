"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hammer,
  Wrench,
  Ruler,
  Home as HomeIcon,
  Sun,
  Plus,
  Minus,
  Clock,
  Sparkles,
  Check,
  ArrowLeft,
} from "lucide-react";

const PENDING_KEY = "werkmaximaal_pending_klus";
const AUTO_PLAATSEN_KEY = "werkmaximaal_auto_plaatsen";
const HANDOFF_KEY = "werkmaximaal_aanvraag_handoff";

const FALLBACK_CATEGORIEEN = [
  "Schilder",
  "Loodgieter",
  "Klusjesman",
  "Tuinman",
  "Elektricien",
  "Timmerman",
  "Stratenmaker",
  "Anders",
];

const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

async function fetchAdres(postcode, huisnummer) {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${postcode}+huisnummer:${huisnummer}&fq=type:adres&fl=weergavenaam,straatnaam,huisnummer,woonplaatsnaam,postcode&rows=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    if (
      doc.postcode !== postcode ||
      String(doc.huisnummer) !== String(huisnummer)
    ) {
      return null;
    }
    return {
      weergavenaam: doc.weergavenaam,
      straatnaam: doc.straatnaam,
      huisnummer: String(doc.huisnummer),
      postcode: doc.postcode,
      plaats: doc.woonplaatsnaam,
    };
  } catch {
    return null;
  }
}

export default function AanvraagPage() {
  const router = useRouter();
  const [titel, setTitel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [categorie, setCategorie] = useState("");
  const [voorkeurVakmanType, setVoorkeurVakmanType] = useState("");
  const [bezig, setBezig] = useState(false);
  const [categorieAangeraakt, setCategorieAangeraakt] = useState(false);
  const [stap, setStap] = useState(1);
  const [postcodeStatus, setPostcodeStatus] = useState({ state: "leeg" });
  const [categorieen, setCategorieen] = useState(FALLBACK_CATEGORIEEN);
  const [huidigeUser, setHuidigeUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [hobbyistInschakeld, setHobbyistInschakeld] = useState(true);
  const [relatie, setRelatie] = useState(null);
  const [extraGekozen, setExtraGekozen] = useState(false);
  const [klusLijst, setKlusLijst] = useState([]);
  const [ontleedt, setOntleedt] = useState(false);
  // Vlag of de omschrijving al via smart-input op de homepage gegeven is.
  // Bepaalt of stap 1 de textarea toont of de read-only summary-card.
  const [vooringevuld, setVooringevuld] = useState(false);
  const [oppervlakte, setOppervlakte] = useState("");
  const [binnenBuiten, setBinnenBuiten] = useState("");
  const [aantal, setAantal] = useState(0);
  const [urgentie, setUrgentie] = useState("");

  useEffect(() => {
    fetch("/api/init")
      .then((r) => r.json())
      .then((d) => {
        setHuidigeUser(d.user || null);
        setUserLoaded(true);
        if (d.instellingen)
          setHobbyistInschakeld(d.instellingen.hobbyistInschakeld !== false);
        if (Array.isArray(d.categorieen) && d.categorieen.length > 0) {
          setCategorieen(d.categorieen.map((c) => c.naam));
        }
      })
      .catch(() => {
        setUserLoaded(true);
      });

    if (typeof window !== "undefined") {
      // Hand-off van de homepage smart-input of populaire-beroep tile.
      // Wordt na lezen direct verwijderd zodat een refresh van /aanvraag
      // de oude data niet opnieuw inlaadt.
      try {
        const handoffRaw = sessionStorage.getItem(HANDOFF_KEY);
        if (handoffRaw) {
          const d = JSON.parse(handoffRaw);
          if (d.titel) {
            setTitel(d.titel);
            setVooringevuld(true);
          }
          if (d.categorie) {
            setCategorie(d.categorie);
            setCategorieAangeraakt(true);
          }
          if (Array.isArray(d.klusLijst) && d.klusLijst.length > 0) {
            setKlusLijst(d.klusLijst);
          }
          sessionStorage.removeItem(HANDOFF_KEY);
        }
      } catch {}

      // Bestaande PENDING_KEY-flow: gebruiker is via /voltooien terug
      // gekomen en wil de eerder ingevulde klus afronden.
      try {
        const opgeslagen = sessionStorage.getItem(PENDING_KEY);
        if (opgeslagen) {
          const d = JSON.parse(opgeslagen);
          if (d.titel) {
            setTitel(d.titel);
            setVooringevuld(true);
          }
          if (d.postcode) setPostcode(d.postcode);
          if (d.huisnummer) setHuisnummer(d.huisnummer);
          if (d.categorie) {
            setCategorie(d.categorie);
            setCategorieAangeraakt(true);
          }
          if (d.voorkeurVakmanType) setVoorkeurVakmanType(d.voorkeurVakmanType);
          if (d.stap) setStap(d.stap);
        }
      } catch {}
    }
  }, []);

  // Auto-plaatsen na login/registratie: zelfde gedrag als voorheen op /,
  // maar nu hier op /aanvraag.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const autoFlag = sessionStorage.getItem(AUTO_PLAATSEN_KEY);
    if (!autoFlag) return;
    if (!userLoaded || !huidigeUser || huidigeUser.rol !== "consument") return;
    if (!titel.trim() || !postcode || !huisnummer) return;
    if (postcodeStatus.state !== "ok") return;
    sessionStorage.removeItem(AUTO_PLAATSEN_KEY);
    plaatsKlus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, huidigeUser, postcodeStatus.state, titel, postcode, huisnummer]);

  // Multi-klus ontleding tijdens typen in de textarea (alleen relevant
  // wanneer de gebruiker op /aanvraag direct begint zonder smart-input
  // pre-fill).
  useEffect(() => {
    if (categorieAangeraakt) return;
    if (!titel || titel.trim().length < 6) return;
    if (vooringevuld) return; // smart-input deed al de ontleding
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setOntleedt(true);
      try {
        const res = await fetch("/api/ontleed-klus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tekst: titel }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (
          Array.isArray(data.klussen) &&
          data.klussen.length > 0 &&
          !categorieAangeraakt
        ) {
          setKlusLijst(data.klussen);
          setCategorie(data.klussen[0].beroep);
        }
      } catch {
        // abort/netwerkfout
      } finally {
        setOntleedt(false);
      }
    }, 1500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [titel, categorieAangeraakt, vooringevuld]);

  useEffect(() => {
    if (!categorie) {
      setRelatie(null);
      setExtraGekozen(false);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/beroep-relaties?categorie=${encodeURIComponent(categorie)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setRelatie(d.relatie ?? null))
      .catch(() => setRelatie(null));
    return () => ctrl.abort();
  }, [categorie]);

  useEffect(() => {
    const schoonPc = postcode.trim().toUpperCase();
    const schoonHnr = huisnummer.trim();

    if (!schoonPc && !schoonHnr) {
      setPostcodeStatus({ state: "leeg" });
      return;
    }
    if (schoonPc.length < 6 || !schoonHnr) {
      setPostcodeStatus({ state: "typen" });
      return;
    }
    if (!POSTCODE_REGEX.test(schoonPc)) {
      setPostcodeStatus({ state: "fout" });
      return;
    }

    setPostcodeStatus({ state: "bezig" });
    let geannuleerd = false;
    const timer = setTimeout(async () => {
      const adres = await fetchAdres(schoonPc, schoonHnr);
      if (geannuleerd) return;
      setPostcodeStatus(adres ? { state: "ok", ...adres } : { state: "fout" });
    }, 250);

    return () => {
      geannuleerd = true;
      clearTimeout(timer);
    };
  }, [postcode, huisnummer]);

  // Vakmannen + admins horen niet hier — terug naar / waar ze hun
  // eigen interface zien.
  useEffect(() => {
    if (!userLoaded) return;
    if (huidigeUser?.isAdmin) {
      router.push("/admin");
    } else if (huidigeUser?.rol === "vakman") {
      router.push("/");
    }
  }, [userLoaded, huidigeUser, router]);

  async function plaatsKlus(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!huidigeUser) {
      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            titel,
            postcode,
            huisnummer,
            straatnaam: postcodeStatus.straatnaam || "",
            plaats: postcodeStatus.plaats || "",
            categorie,
            voorkeurVakmanType,
            stap,
          })
        );
      } catch {}
      router.push("/voltooien");
      return;
    }

    setBezig(true);

    const baseBody = {
      postcode,
      huisnummer,
      straatnaam: postcodeStatus.straatnaam,
      plaats: postcodeStatus.plaats,
      voorkeurVakmanType: voorkeurVakmanType || null,
      oppervlakte: oppervlakte ? parseInt(oppervlakte) : null,
      binnenBuiten: binnenBuiten || null,
      aantal: aantal > 0 ? aantal : null,
      urgentie: urgentie || null,
    };

    if (klusLijst.length > 1) {
      const primair = await fetch("/api/klussen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseBody,
          titel: klusLijst[0].omschrijving || titel,
          categorie: klusLijst[0].beroep,
        }),
      }).then((r) => (r.ok ? r.json() : null));

      if (primair?.id) {
        for (let i = 1; i < klusLijst.length; i++) {
          await fetch("/api/klussen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...baseBody,
              titel: klusLijst[i].omschrijving || titel,
              categorie: klusLijst[i].beroep,
              gerelateerdeAanId: primair.id,
            }),
          });
        }
      }
    } else {
      const primair = await fetch("/api/klussen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, titel, categorie }),
      }).then((r) => (r.ok ? r.json() : null));

      if (primair?.id && extraGekozen && relatie?.gerelateerdeNaam) {
        await fetch("/api/klussen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            titel: `${titel} — ${relatie.gerelateerdeNaam}`,
            categorie: relatie.gerelateerdeNaam,
            gerelateerdeAanId: primair.id,
          }),
        });
      }
    }

    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {}

    // Klus geplaatst — terug naar homepage waar de klussenlijst wordt
    // ververst en de gebruiker een succesbevestiging-stijl ervaring krijgt.
    router.push("/mijn-klussen");
  }

  const stap1Geldig = postcodeStatus.state === "ok" && titel.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top-bar: logo + terug-link */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              W
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                Werkmaximaal
              </p>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Vakmannen voor uw klus
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Terug naar home
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {/* Stap-indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stap >= 1
                  ? "bg-orange-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              1
            </span>
            <span
              className={`text-sm ${
                stap === 1 ? "font-medium text-slate-900" : "text-slate-500"
              }`}
            >
              Uw klus
            </span>
          </div>
          <div className="h-px w-10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stap >= 2
                  ? "bg-orange-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </span>
            <span
              className={`text-sm ${
                stap === 2 ? "font-medium text-slate-900" : "text-slate-500"
              }`}
            >
              Bevestigen
            </span>
          </div>
        </div>

        <form onSubmit={plaatsKlus}>
          {stap === 1 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Waar mogen we u mee helpen?
              </h2>
              <p className="text-sm text-slate-500 mb-8">
                {vooringevuld
                  ? "Vul uw postcode in en bevestig de gegevens. Wij zoeken een geschikte vakman in uw buurt."
                  : "Vul uw postcode in en omschrijf de klus. Wij zoeken een geschikte vakman in uw buurt."}
              </p>

              {/* Vooringevulde omschrijving (van smart-input) als read-only summary */}
              {vooringevuld && titel && (
                <div className="mb-6 bg-orange-50 border-2 border-orange-200 border-l-[6px] border-l-orange-500 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                      <Check size={18} className="text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold mb-1">
                        Uw beschrijving
                      </p>
                      <p className="text-sm text-slate-900 leading-snug">
                        {titel}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setVooringevuld(false);
                          setKlusLijst([]);
                        }}
                        className="mt-2 text-xs text-slate-600 hover:text-slate-900 underline"
                      >
                        Wijzigen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postcode &amp; huisnummer
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) =>
                      setPostcode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    maxLength={6}
                    placeholder="1234AB"
                    className={`w-32 px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors uppercase tracking-wider font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                    aria-invalid={postcodeStatus.state === "fout"}
                    aria-label="Postcode"
                  />
                  <input
                    type="text"
                    value={huisnummer}
                    onChange={(e) =>
                      setHuisnummer(
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 5)
                      )
                    }
                    inputMode="numeric"
                    placeholder="12"
                    className={`w-20 px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors font-mono text-sm ${
                      postcodeStatus.state === "fout"
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                    aria-label="Huisnummer"
                  />
                </div>
                <div
                  className={`mt-2 px-3 py-2.5 bg-slate-50 border rounded-md flex items-center gap-2 text-sm ${
                    postcodeStatus.state === "fout"
                      ? "border-rose-300"
                      : "border-slate-200"
                  }`}
                >
                  {postcodeStatus.state === "ok" && (
                    <>
                      <svg
                        className="w-4 h-4 text-orange-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-slate-700">
                        {postcodeStatus.weergavenaam}
                      </span>
                    </>
                  )}
                  {postcodeStatus.state === "bezig" && (
                    <span className="text-slate-400 text-xs animate-pulse">
                      Bezig met opzoeken...
                    </span>
                  )}
                  {postcodeStatus.state === "fout" && (
                    <span className="text-rose-600 text-xs">
                      Adres niet gevonden
                    </span>
                  )}
                  {(postcodeStatus.state === "leeg" ||
                    postcodeStatus.state === "typen") && (
                    <span className="text-slate-400 text-xs">
                      Het volledige adres verschijnt hier
                    </span>
                  )}
                </div>
              </div>

              {!vooringevuld && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Omschrijving van de klus
                  </label>
                  <textarea
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    rows={4}
                    placeholder="Bijvoorbeeld: Ik zoek een schilder voor mijn woonkamer en hal."
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors resize-none text-sm"
                  />
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Wrench size={14} className="text-orange-600" />
                    Welke vakmensen heeft u nodig?
                  </label>
                  {!vooringevuld && (
                    <button
                      type="button"
                      disabled={!titel.trim() || ontleedt}
                      onClick={async () => {
                        setOntleedt(true);
                        try {
                          const res = await fetch("/api/ontleed-klus", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tekst: titel }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setKlusLijst(data.klussen || []);
                            if (data.klussen?.[0])
                              setCategorie(data.klussen[0].beroep);
                          }
                        } catch {}
                        setOntleedt(false);
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 disabled:text-slate-400"
                    >
                      <Sparkles size={12} />
                      {ontleedt ? "Bezig..." : "Analyseer klus"}
                    </button>
                  )}
                </div>

                {klusLijst.length > 0 ? (
                  <div className="space-y-2">
                    {klusLijst.map((k, i) => (
                      <div
                        key={i}
                        className="bg-orange-50 border-2 border-orange-300 border-l-[6px] rounded-md px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <select
                            value={k.beroep}
                            onChange={(e) => {
                              const nieuw = [...klusLijst];
                              nieuw[i] = { ...k, beroep: e.target.value };
                              setKlusLijst(nieuw);
                              if (i === 0) setCategorie(e.target.value);
                              setCategorieAangeraakt(true);
                            }}
                            className="flex-1 px-2 py-1 bg-white border border-orange-300 rounded text-sm font-semibold text-slate-900 focus:outline-none focus:border-orange-600"
                          >
                            {categorieen.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const nieuw = klusLijst.filter(
                                (_, j) => j !== i
                              );
                              setKlusLijst(nieuw);
                              if (nieuw.length > 0)
                                setCategorie(nieuw[0].beroep);
                              else setCategorie("");
                            }}
                            className="text-slate-400 hover:text-rose-600 text-base leading-none px-1"
                            aria-label={`Verwijder klus ${i + 1}`}
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          value={k.omschrijving}
                          onChange={(e) => {
                            const nieuw = [...klusLijst];
                            nieuw[i] = {
                              ...k,
                              omschrijving: e.target.value,
                            };
                            setKlusLijst(nieuw);
                          }}
                          className="w-full ml-7 -mt-px px-2 py-1 bg-white/70 border border-transparent hover:border-orange-300 focus:border-orange-600 rounded text-xs text-slate-700 focus:outline-none transition-colors"
                          style={{ width: "calc(100% - 1.75rem)" }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setKlusLijst([
                          ...klusLijst,
                          {
                            omschrijving: "",
                            beroep: categorieen[0] || "",
                          },
                        ]);
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Voeg klus toe
                    </button>
                  </div>
                ) : (
                  <select
                    value={categorie}
                    onChange={(e) => {
                      setCategorie(e.target.value);
                      setCategorieAangeraakt(true);
                    }}
                    className={`w-full px-3 py-2.5 border-2 rounded-md text-sm focus:outline-none bg-white transition-colors ${
                      categorie && !categorieAangeraakt
                        ? "border-orange-500 focus:border-orange-600 bg-orange-50 ring-2 ring-orange-200"
                        : categorie
                        ? "border-orange-300 focus:border-orange-600"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                  >
                    <option value="">Kies een beroep...</option>
                    {categorieen.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStap(2)}
                disabled={!stap1Geldig}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-md transition-colors"
              >
                Volgende
              </button>
            </div>
          )}

          {stap === 2 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-8 mb-10">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-8">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">
                  Uw aanvraag
                </p>
                <p className="text-slate-900 mb-2">{titel}</p>
                <p className="text-sm text-slate-500">
                  {postcodeStatus.weergavenaam ||
                    `${postcode} ${huisnummer}, ${postcodeStatus.plaats}`}
                </p>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Bevestig en plaats
              </h2>
              <p className="text-sm text-slate-500 mb-8">
                Controleer de categorie en bevestig om uw klus te plaatsen.
              </p>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categorie{" "}
                  <span className="text-slate-400 font-normal text-xs">
                    {categorie && !categorieAangeraakt
                      ? "(automatisch herkend, mag aangepast worden)"
                      : !categorie
                      ? "(optioneel)"
                      : ""}
                  </span>
                </label>
                {categorie ? (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-md p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                      <Check size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">
                        Gekozen categorie
                      </p>
                      <p className="text-lg font-semibold text-slate-900 leading-tight">
                        {categorie}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategorie("");
                        setCategorieAangeraakt(true);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 underline shrink-0"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={categorie}
                    onChange={(e) => {
                      setCategorie(e.target.value);
                      setCategorieAangeraakt(true);
                    }}
                    list="categorieen-lijst"
                    placeholder="Bijvoorbeeld: Schilder"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors text-sm"
                  />
                )}
                <datalist id="categorieen-lijst">
                  {categorieen.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                {categorie && relatie && (
                  <div className="mt-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-orange-50 border-2 border-blue-300 border-l-[6px] border-l-blue-500 rounded-md shadow-sm">
                    <div className="flex items-start gap-3">
                      <Sparkles
                        size={20}
                        className="text-blue-600 shrink-0 mt-0.5"
                        strokeWidth={2.5}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-900 leading-tight">
                          Wist u dat? Bij {categorie} hebben klanten vaak ook
                          een{" "}
                          <span className="text-orange-700">
                            {relatie.gerelateerdeNaam}
                          </span>{" "}
                          nodig.
                        </p>
                        <p className="text-xs text-slate-700 mt-1 leading-snug">
                          {relatie.uitleg}
                        </p>
                        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={extraGekozen}
                            onChange={(e) =>
                              setExtraGekozen(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-2 focus:ring-orange-200"
                          />
                          <span className="text-sm font-medium text-slate-900">
                            Voeg {relatie.gerelateerdeNaam} toe aan mijn
                            aanvraag
                          </span>
                        </label>
                        {extraGekozen && (
                          <p className="text-xs text-emerald-700 mt-1.5 ml-6 font-medium">
                            ✓ U ontvangt straks 2 aparte aanvragen — één voor{" "}
                            {categorie} en één voor {relatie.gerelateerdeNaam}.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {categorie?.toLowerCase() === "schilder" && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-orange-600" />
                    Specificeer uw klus
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Ruler size={14} />
                        Oppervlakte
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={oppervlakte}
                          onChange={(e) => setOppervlakte(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-slate-900"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                          m²
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        Locatie
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: "binnen", label: "Binnen", Icon: HomeIcon },
                          { val: "buiten", label: "Buiten", Icon: Sun },
                          { val: "beide", label: "Beide", Icon: Hammer },
                        ].map(({ val, label, Icon }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setBinnenBuiten(binnenBuiten === val ? "" : val)
                            }
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md border text-[11px] font-medium transition-colors ${
                              binnenBuiten === val
                                ? "bg-orange-600 text-white border-orange-600"
                                : "bg-white text-slate-700 border-slate-300 hover:border-slate-900"
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                        Aantal deuren
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAantal(Math.max(0, aantal - 1))}
                          className="w-9 h-9 rounded-md border border-slate-300 bg-white text-orange-600 hover:border-orange-600 flex items-center justify-center transition-colors"
                          aria-label="Eén minder"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={aantal}
                          onChange={(e) =>
                            setAantal(Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="flex-1 text-center border border-slate-300 rounded-md py-1.5 text-sm font-semibold bg-white focus:outline-none focus:border-slate-900 tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setAantal(aantal + 1)}
                          className="w-9 h-9 rounded-md border border-slate-300 bg-white text-orange-600 hover:border-orange-600 flex items-center justify-center transition-colors"
                          aria-label="Eén meer"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Clock size={14} />
                        Urgentie
                      </label>
                      <select
                        value={urgentie}
                        onChange={(e) => setUrgentie(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-slate-900"
                      >
                        <option value="">Kies wanneer</option>
                        <option value="spoed">Spoed (binnen 24u)</option>
                        <option value="deze-week">Deze week</option>
                        <option value="deze-maand">Deze maand</option>
                        <option value="geen-haast">Geen haast</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {hobbyistInschakeld && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type vakman gewenst
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "", label: "Beide" },
                      { val: "professional", label: "Vakman" },
                      { val: "hobbyist", label: "Handige Harrie" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setVoorkeurVakmanType(opt.val)}
                        className={`px-3 py-2.5 text-sm font-medium rounded-md border transition-colors ${
                          voorkeurVakmanType === opt.val
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-900"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hobbyistInschakeld && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                    Vakman vs Handige Harrie
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="text-left font-normal py-1"></th>
                        <th className="text-center font-medium py-1 px-2">
                          Vakman
                        </th>
                        <th className="text-center font-medium py-1 px-2">
                          Handige Harrie
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-t border-slate-200">
                        <td className="py-1.5">KvK-geregistreerd</td>
                        <td className="text-center text-orange-600">✓</td>
                        <td className="text-center text-slate-300">—</td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="py-1.5">Bedrijfsverzekering</td>
                        <td className="text-center text-orange-600">✓</td>
                        <td className="text-center text-slate-300">—</td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="py-1.5">Garantie op werk</td>
                        <td className="text-center text-orange-600">✓</td>
                        <td className="text-center text-slate-300">—</td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="py-1.5">Indicatieve prijs</td>
                        <td className="text-center text-slate-500">Markt</td>
                        <td className="text-center text-orange-700">
                          Goedkoper
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStap(1)}
                  className="px-5 py-3 text-slate-700 hover:text-slate-900 text-sm font-medium transition-colors"
                >
                  Terug
                </button>
                <button
                  type="submit"
                  disabled={bezig}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-sm font-medium py-3 rounded-md transition-colors"
                >
                  {bezig ? "Bezig..." : "Plaats klus"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Match-logica voor smart-input op de homepage en de Test-modus op /beheer.
//
// Prioriteit van match (eerste hit wint):
//   1. Beroepsnaam in de tekst (bv. "ik zoek een elektricien")
//   2. Zoekterm-trefwoord (`type === "zoekterm"`, default — bv. "lekkage")
//   3. Merk/Materiaal-trefwoord (`type === "merk"` — bv. "hager", "grohe")
//
// Alle vergelijkingen zijn case-insensitive substring-matches.
//
// `categorieen` is optioneel — zonder argument valt 'ie terug op
// alleen-trefwoord-matching (backward compat met oudere callers).
export function detectCategorie(tekst, trefwoorden, categorieen = []) {
  if (!tekst) return null;
  const lager = tekst.toLowerCase();

  // 1. Directe beroepsnaam-match.
  for (const c of categorieen) {
    const naam = (c.naam ?? c).toString().toLowerCase();
    if (!naam) continue;
    if (lager.includes(naam)) {
      return c.naam ?? c;
    }
  }

  if (!trefwoorden || trefwoorden.length === 0) return null;

  // 2. Zoektermen.
  for (const t of trefwoorden) {
    const isMerk = t.type === "merk";
    if (isMerk) continue;
    if (lager.includes(t.woord)) {
      return t.categorie;
    }
  }

  // 3. Merken.
  for (const t of trefwoorden) {
    if (t.type !== "merk") continue;
    if (lager.includes(t.woord)) {
      return t.categorie;
    }
  }

  return null;
}

// Geeft het type match-bron mee, voor UI's die willen tonen waarom iets
// matcht ("Match via merk: Hager → Elektricien"). Returnt:
//   { categorie: string, bron: "beroep" | "zoekterm" | "merk", treffer: string }
// of null.
export function detectMetBron(tekst, trefwoorden, categorieen = []) {
  if (!tekst) return null;
  const lager = tekst.toLowerCase();

  for (const c of categorieen) {
    const naam = (c.naam ?? c).toString();
    if (!naam) continue;
    if (lager.includes(naam.toLowerCase())) {
      return { categorie: naam, bron: "beroep", treffer: naam };
    }
  }

  if (!trefwoorden || trefwoorden.length === 0) return null;

  for (const t of trefwoorden) {
    if (t.type === "merk") continue;
    if (lager.includes(t.woord)) {
      return { categorie: t.categorie, bron: "zoekterm", treffer: t.woord };
    }
  }

  for (const t of trefwoorden) {
    if (t.type !== "merk") continue;
    if (lager.includes(t.woord)) {
      return { categorie: t.categorie, bron: "merk", treffer: t.woord };
    }
  }

  return null;
}

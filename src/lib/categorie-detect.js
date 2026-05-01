// Geeft de eerste categorie terug waarvan een trefwoord (of zinsdeel)
// als substring in de tekst voorkomt. Trefwoorden zijn lowercase. Geen
// match? → null. Gebruikt door homepage-form, smart-input én admin
// test-modus, dus extraheren we 'm uit page.js.
export function detectCategorie(tekst, trefwoorden) {
  if (!tekst || !trefwoorden || trefwoorden.length === 0) return null;
  const lager = tekst.toLowerCase();
  for (const t of trefwoorden) {
    if (lager.includes(t.woord)) {
      return t.categorie;
    }
  }
  return null;
}

// Helpers voor automatische adres-lookup via PDOK Locatieserver.
// Gebruik in client-componenten via useEffect met postcode + huisnummer.

export const POSTCODE_REGEX = /^\d{4}[A-Z]{2}$/;

/**
 * Haalt straatnaam + plaats op via postcode + huisnummer. Geeft `null`
 * terug als het adres niet exact matcht of als het verzoek faalt.
 */
/**
 * Zoekt Nederlandse woonplaatsen op naam (autocomplete). Geeft een
 * array van unieke plaatsnamen terug, bijv. ["Eindhoven", "Eindhout"].
 * Lege query → lege array. Maximaal `limit` resultaten.
 */
export async function searchPlaatsen(query, limit = 7) {
  const q = (query ?? "").trim();
  if (q.length < 2) return [];
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(
    q
  )}&fq=type:woonplaats&rows=${limit * 3}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const docs = data?.response?.docs || [];
    const namen = [];
    const gezien = new Set();
    for (const d of docs) {
      // weergavenaam is bv. "Eindhoven, Eindhoven" of "Amsterdam,
      // Amsterdam" — we pakken het deel vóór de komma als plaatsnaam.
      const naam = (d.weergavenaam || "").split(",")[0].trim();
      if (naam && !gezien.has(naam)) {
        gezien.add(naam);
        namen.push(naam);
        if (namen.length >= limit) break;
      }
    }
    return namen;
  } catch {
    return [];
  }
}

export async function fetchAdres(postcode, huisnummer) {
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
      straatnaam: doc.straatnaam,
      huisnummer: String(doc.huisnummer),
      postcode: doc.postcode,
      plaats: doc.woonplaatsnaam,
    };
  } catch {
    return null;
  }
}

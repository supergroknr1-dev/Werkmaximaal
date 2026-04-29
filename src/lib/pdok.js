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

/**
 * Lookup plaatsnaam bij een 4-cijferige postcode-prefix.
 * Server-side bedoeld: gebruikt Next.js fetch-cache (24u) zodat we
 * dezelfde postcode niet steeds opnieuw aan PDOK vragen. Postcodes
 * verhuizen niet.
 *
 * Geeft de plaatsnaam terug, of null als PDOK 'm niet kent of als het
 * verzoek faalt. Wordt aangeroepen vanuit server-componenten zoals
 * /vakmannen/[id]/page.js.
 */
export async function postcodeNaarPlaats(postcode4) {
  const p = (postcode4 ?? "").toString().trim();
  if (!/^\d{4}$/.test(p)) return null;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${p}&fq=type:postcode&fl=woonplaatsnaam&rows=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.response?.docs?.[0]?.woonplaatsnaam || null;
  } catch {
    return null;
  }
}

/**
 * Bouw een gededupliceerde lijst van plaatsnamen uit het werkgebied
 * van een vakman. Combineert het primaire werkgebied (regioPostcode of
 * regioPlaats) met de extra-rijen (werkgebiedenExtra). Voor postcode-
 * entries wordt PDOK aangesproken via postcodeNaarPlaats. Plaatsen
 * worden case-insensitief gededupliceerd, returnvolgorde = volgorde
 * van eerste voorkomen.
 *
 * @param {object} vakman - { regioPostcode, regioPlaats, werkgebiedenExtra:[{type,waarde}] }
 * @returns {Promise<string[]>} bv. ["Eindhoven", "Veldhoven"]
 */
export async function werkgebiedPlaatsen(vakman) {
  const entries = [];
  if (vakman.regioPlaats) entries.push({ type: "plaats", waarde: vakman.regioPlaats });
  if (vakman.regioPostcode) entries.push({ type: "postcode", waarde: vakman.regioPostcode });
  for (const w of vakman.werkgebiedenExtra || []) {
    if (w.waarde) entries.push({ type: w.type, waarde: w.waarde });
  }

  const namen = await Promise.all(
    entries.map(async (e) =>
      e.type === "postcode"
        ? await postcodeNaarPlaats(e.waarde)
        : e.waarde.trim()
    )
  );

  const uniek = [];
  const gezien = new Set();
  for (const n of namen) {
    if (!n) continue;
    const sleutel = n.toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uniek.push(n);
  }
  return uniek;
}

/**
 * Lookup lat/lon (centroïde) bij een 6-tekens postcode (bv. "5612AB").
 * Server-side bedoeld; cached 7 dagen via Next.js fetch-cache. Geeft
 * `null` als PDOK 'm niet kent. Gebruikt voor de admin-kaart.
 */
export async function postcodeNaarCoords(postcode6) {
  const p = (postcode6 ?? "").toString().trim().toUpperCase();
  if (!POSTCODE_REGEX.test(p)) return null;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${p}&fq=type:postcode&fl=centroide_ll&rows=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 } }); // 7 dagen
    if (!res.ok) return null;
    const data = await res.json();
    const ll = data?.response?.docs?.[0]?.centroide_ll;
    if (!ll) return null;
    // Format: "POINT(5.4789 51.4419)" — eerst lon, dan lat
    const m = ll.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) return null;
    return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  } catch {
    return null;
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

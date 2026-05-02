// Match-logica voor smart-input op de homepage en de Test-modus op /beheer.
//
// Twee match-soorten:
//   1. Exact substring-match (oude gedrag, snel)
//   2. Fuzzy match via Levenshtein — typo-tolerant, gewogen sliding window
//
// Resultaat-prioriteit (eerste hit met hoogste score wint):
//   1. Beroepsnaam in tekst (bv. "ik zoek een elektricien")
//   2. Zoekterm-trefwoord (`type === "zoekterm"`)
//   3. Merk/Materiaal-trefwoord (`type === "merk"`)
// Bij gelijke score wint de hogere categorie-prioriteit.
//
// `categorieen` accepteert array of {naam} of strings — backward compat.

// ─── Fuzzy primitives ──────────────────────────────────────────────

function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const curr = [i];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[bl];
}

export function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

// Zoekt de beste fuzzy-score van `target` ergens in `input`. Probeert:
//   a) sliding-window van zelfde lengte als target
//   b) per los woord in input
function bestFuzzyScore(input, target) {
  if (!target || target.length === 0) return 0;
  if (input.length < target.length) {
    return similarity(input, target);
  }
  let best = 0;
  // Sliding window
  for (let i = 0; i <= input.length - target.length; i++) {
    const score = similarity(input.slice(i, i + target.length), target);
    if (score > best) best = score;
    if (best === 100) return 100;
  }
  // Per woord — vangt "ik wil een Haager schakelaar" → "Hager"
  for (const word of input.split(/\s+/)) {
    if (word.length === 0) continue;
    const score = similarity(word, target);
    if (score > best) best = score;
  }
  return best;
}

const TYPE_RANK = { beroep: 3, zoekterm: 2, merk: 1 };

// ─── Public API ────────────────────────────────────────────────────

/**
 * Geeft een gerangschikte lijst van match-suggesties terug. Gebruikt
 * exact-eerst, dan fuzzy. Items met score < `drempel` worden weggelaten.
 *
 * @returns Array<{type:'beroep'|'zoekterm'|'merk', treffer, categorie, score, exact}>
 */
export function getZoekSuggesties(tekst, trefwoorden, categorieen = [], opties = {}) {
  const { drempel = 65, max = 10 } = opties;
  if (!tekst || typeof tekst !== "string") return [];
  const lager = tekst.trim().toLowerCase();
  if (lager.length < 2) return [];

  const items = [];

  for (const c of categorieen) {
    const naam = (c.naam ?? c).toString();
    if (!naam) continue;
    const naamLow = naam.toLowerCase();
    const exact = lager.includes(naamLow);
    const score = exact ? 100 : bestFuzzyScore(lager, naamLow);
    if (score >= drempel) {
      items.push({
        type: "beroep",
        treffer: naam,
        categorie: naam,
        score,
        exact,
      });
    }
  }

  for (const t of trefwoorden ?? []) {
    const woord = t.woord.toLowerCase();
    const exact = lager.includes(woord);
    const score = exact ? 100 : bestFuzzyScore(lager, woord);
    if (score >= drempel) {
      items.push({
        type: t.type === "merk" ? "merk" : "zoekterm",
        treffer: t.woord,
        categorie: t.categorie,
        score,
        exact,
      });
    }
  }

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return TYPE_RANK[b.type] - TYPE_RANK[a.type];
  });

  // Dedup op (treffer, categorie) — voor het geval een woord in meerdere
  // beroepen voorkomt of als beroepsnaam ook als zoekterm bestaat.
  const seen = new Set();
  const dedupe = [];
  for (const it of items) {
    const key = `${it.type}:${it.treffer}:${it.categorie}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupe.push(it);
    if (dedupe.length >= max) break;
  }
  return dedupe;
}

export function detectMetBron(tekst, trefwoorden, categorieen = []) {
  const top = getZoekSuggesties(tekst, trefwoorden, categorieen, {
    drempel: 80,
    max: 1,
  })[0];
  if (!top) return null;
  return {
    categorie: top.categorie,
    bron: top.type, // "beroep" | "zoekterm" | "merk"
    treffer: top.treffer,
    score: top.score,
    exact: top.exact,
  };
}

export function detectCategorie(tekst, trefwoorden, categorieen = []) {
  return detectMetBron(tekst, trefwoorden, categorieen)?.categorie ?? null;
}

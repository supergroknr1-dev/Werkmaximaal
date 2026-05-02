import { prisma } from "../../../lib/prisma";
import { embedText, cosineSimilarity } from "../../../lib/embeddings";

// In-memory cache van trefwoord-embeddings. Eerste request hydrateert
// (één DB-query); volgende requests hergebruiken. Bij Fluid Compute
// blijft dit warm tussen invocations. Wordt na 5 min gerefresht zodat
// nieuwe trefwoorden ook meekomen.
let CACHE = null;
let CACHE_TIME = 0;
const TTL = 5 * 60 * 1000; // 5 min

async function getCache() {
  if (CACHE && Date.now() - CACHE_TIME < TTL) return CACHE;
  const rows = await prisma.trefwoord.findMany({
    where: { NOT: { embedding: { equals: [] } } },
    include: { categorieRef: true },
  });
  CACHE = rows.map((t) => ({
    id: t.id,
    woord: t.woord,
    type: t.type,
    categorie: t.categorieRef.naam,
    embedding: t.embedding,
  }));
  CACHE_TIME = Date.now();
  return CACHE;
}

export async function POST(request) {
  const { tekst } = await request.json();
  if (!tekst || typeof tekst !== "string" || tekst.trim().length < 3) {
    return Response.json({ match: null });
  }

  const trefwoorden = await getCache();
  if (trefwoorden.length === 0) {
    return Response.json({ match: null, error: "Geen embeddings beschikbaar." });
  }

  // Embed de query.
  let queryEmbedding;
  try {
    queryEmbedding = await embedText(tekst.trim());
  } catch (e) {
    console.error("[zoek-categorie] embed mislukt:", e);
    return Response.json({ match: null, error: "Embed mislukt." }, { status: 500 });
  }

  // Cosine similarity tegen alle trefwoorden.
  let beste = null;
  let besteScore = -1;
  const topMatches = [];
  for (const t of trefwoorden) {
    const score = cosineSimilarity(queryEmbedding, t.embedding);
    if (score > besteScore) {
      besteScore = score;
      beste = t;
    }
    topMatches.push({ ...t, score });
  }

  if (!beste) return Response.json({ match: null });

  // Top-5 voor "Andere suggesties" — beste eerst, dedup op categorie+woord.
  topMatches.sort((a, b) => b.score - a.score);
  const top5 = [];
  const gezien = new Set();
  for (const m of topMatches) {
    const k = `${m.categorie}|${m.woord}`;
    if (gezien.has(k)) continue;
    gezien.add(k);
    top5.push({
      categorie: m.categorie,
      type: m.type,
      treffer: m.woord,
      score: Math.round(m.score * 100),
    });
    if (top5.length >= 5) break;
  }

  return Response.json({
    match: {
      categorie: beste.categorie,
      bron: beste.type === "merk" ? "merk" : "zoekterm",
      treffer: beste.woord,
      score: Math.round(besteScore * 100),
      semantic: true,
    },
    suggesties: top5,
  });
}

// Vereist een POST i.v.m. body. Health-check via GET.
export async function GET() {
  const trefwoorden = await getCache();
  return Response.json({
    cache_size: trefwoorden.length,
    cache_age_seconds: Math.round((Date.now() - CACHE_TIME) / 1000),
  });
}

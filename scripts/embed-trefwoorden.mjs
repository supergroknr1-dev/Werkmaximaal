// Pre-compute embeddings voor alle trefwoorden + beroepen.
// Idempotent: trefwoorden met al-bestaande embedding worden overgeslagen.
// Kosten: ~2200 trefwoorden × 5 tokens × $0.02/1M = $0.0002 totaal.
//
// Gebruik: node --env-file=.env scripts/embed-trefwoorden.mjs

import { PrismaClient } from "@prisma/client";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

const prisma = new PrismaClient();
const MODEL = "text-embedding-3-small";
const BATCH = 100; // OpenAI accepteert max 2048 inputs per call; 100 is veilig en goedkoop.

async function main() {
  // Vind trefwoorden zonder embedding (lege array = niet ingevuld).
  const tewerken = await prisma.trefwoord.findMany({
    include: { categorieRef: true },
  });
  const teEmbedden = tewerken.filter(
    (t) => !t.embedding || t.embedding.length === 0
  );

  console.log(
    `📊 ${tewerken.length} totaal, ${teEmbedden.length} zonder embedding.`
  );
  if (teEmbedden.length === 0) {
    console.log("✓ Alles is al ge-embed.");
    await prisma.$disconnect();
    return;
  }

  // Embed in batches. Voor de match-context gebruiken we
  // "{beroep}: {trefwoord}" zodat de categorie meeweegt — bv.
  // "Loodgieter: kraan repareren" geeft een betere vector dan
  // alleen "kraan repareren" (kraan = ook bouwkraan!).
  let klaar = 0;
  for (let i = 0; i < teEmbedden.length; i += BATCH) {
    const slice = teEmbedden.slice(i, i + BATCH);
    const inputs = slice.map(
      (t) => `${t.categorieRef.naam}: ${t.woord}`
    );
    const t0 = Date.now();
    const { embeddings } = await embedMany({
      model: openai.embedding(MODEL),
      values: inputs,
    });
    // Bulk-update via individuele queries (Prisma heeft geen updateMany
    // met per-row data; voor 100 rows = 100 ms, ok).
    for (let j = 0; j < slice.length; j++) {
      await prisma.trefwoord.update({
        where: { id: slice[j].id },
        data: { embedding: embeddings[j] },
      });
    }
    klaar += slice.length;
    console.log(
      `   ${klaar}/${teEmbedden.length} (${Date.now() - t0} ms voor laatste batch)`
    );
  }

  console.log(`\n✅ Klaar — ${klaar} trefwoorden ge-embed.`);
}

main()
  .catch((e) => {
    console.error("❌ Embedden mislukt:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

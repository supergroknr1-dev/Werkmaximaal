import { prisma } from "../../../lib/prisma";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Splitst een vrije klusbeschrijving in 1 of meer losse klussen,
// elk met een passend beroep uit de Categorie-tabel. Gebruikt OpenAI
// gpt-4o-mini met structured output (zod-schema). Kosten: ~€0.0001 per
// ontleding bij MVP-volume.
export async function POST(request) {
  const { tekst } = await request.json();
  if (!tekst || typeof tekst !== "string" || tekst.trim().length < 5) {
    return Response.json({ klussen: [] });
  }

  const cats = await prisma.categorie.findMany({
    orderBy: { naam: "asc" },
  });
  const beroepen = cats.map((c) => c.naam);
  if (beroepen.length === 0) {
    return Response.json({ klussen: [] });
  }

  // z.enum vereist een tuple — runtime-conversie van array naar tuple.
  const beroepenEnum = z.enum([beroepen[0], ...beroepen.slice(1)]);

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        klussen: z.array(
          z.object({
            omschrijving: z
              .string()
              .describe(
                "Korte, duidelijke beschrijving van deze ene klus in NL — de gebruiker kan dit straks zien en aanpassen"
              ),
            beroep: beroepenEnum.describe(
              "Het meest passende beroep voor deze klus, exact uit de lijst"
            ),
          })
        ),
      }),
      system: `Je bent een assistent voor Werkmaximaal — een NL-marktplaats voor vakmensen.
Een klant typt vrij wat er gedaan moet worden. Splits die tekst in losse klussen
waar elk een ander beroep nodig heeft. Voor elke klus, kies HET MEEST PASSENDE
beroep uit de onderstaande lijst.

Beschikbare beroepen:
${beroepen.join(", ")}

Belangrijke regels:
- Bevat de tekst maar 1 klus, geef 1 item terug.
- Splits alleen wanneer er duidelijk MEERDERE verschillende soorten klussen zijn
  (bv. "lekkage" + "schilderwerk" = 2 klussen; "lekkende kraan in badkamer" = 1).
- Schrijf de omschrijving kort en concreet (max 60 tekens), in dezelfde taal als
  de input (NL).
- Kies het MEEST SPECIFIEKE beroep — Klusjesman alleen als geen ander past.
- Negeer groet, persoonlijke info en niet-klus-gerelateerde details.`,
      prompt: `Klant-tekst: "${tekst}"`,
    });

    return Response.json(object);
  } catch (e) {
    console.error("[ontleed-klus] mislukt:", e);
    return Response.json(
      { klussen: [], error: "Ontleding mislukt." },
      { status: 500 }
    );
  }
}

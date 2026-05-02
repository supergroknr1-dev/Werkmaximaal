import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

// JSON-export voor admin: alle beroepen + alle trefwoorden in één bestand.
// Bedoeld als handmatig backup-mechanisme via download-knop op /beheer.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const [categorieen, trefwoorden] = await Promise.all([
    prisma.categorie.findMany({
      orderBy: [{ volgorde: "asc" }, { naam: "asc" }],
    }),
    prisma.trefwoord.findMany({
      include: { categorieRef: true },
      orderBy: [{ categorieRef: { naam: "asc" } }, { woord: "asc" }],
    }),
  ]);

  const payload = {
    versie: 1,
    geexporteerdOp: new Date().toISOString(),
    aantal: {
      beroepen: categorieen.length,
      trefwoorden: trefwoorden.length,
    },
    beroepen: categorieen.map((c) => ({
      id: c.id,
      naam: c.naam,
      volgorde: c.volgorde,
    })),
    trefwoorden: trefwoorden.map((t) => ({
      id: t.id,
      categorieId: t.categorieId,
      categorie: t.categorieRef.naam,
      woord: t.woord,
      type: t.type,
    })),
  };

  const datum = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="werkmaximaal-beroepen-${datum}.json"`,
    },
  });
}

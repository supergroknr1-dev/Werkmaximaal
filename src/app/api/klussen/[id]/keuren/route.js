import { after } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import {
  logIntervention,
  InterventionError,
} from "../../../../../lib/intervention";
import { vindMatchendeVakmannen } from "../../../../../lib/match";
import { stuurVakmanLeadAlert } from "../../../../../lib/email";

export async function POST(request, { params }) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const { id } = await params;
  const klusId = parseInt(id);
  if (Number.isNaN(klusId)) {
    return Response.json({ error: "Ongeldig id." }, { status: 400 });
  }

  const data = await request.json().catch(() => ({}));
  const goedgekeurd =
    typeof data.goedgekeurd === "boolean" ? data.goedgekeurd : true;

  const klus = await prisma.klus.findUnique({
    where: { id: klusId },
    select: {
      id: true,
      titel: true,
      beschrijving: true,
      postcode: true,
      plaats: true,
      categorie: true,
      voorkeurVakmanType: true,
      goedgekeurd: true,
    },
  });
  if (!klus) {
    return Response.json({ error: "Klus niet gevonden." }, { status: 404 });
  }

  try {
    await logIntervention({
      request,
      admin,
      actie: goedgekeurd ? "klus.goedgekeurd" : "klus.afgekeurd",
      targetType: "klus",
      targetId: klusId,
      payload: {
        titel: klus.titel,
        plaats: klus.plaats,
        categorie: klus.categorie,
        van: klus.goedgekeurd,
        naar: goedgekeurd,
      },
    });
  } catch (err) {
    if (err instanceof InterventionError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const bijgewerkt = await prisma.klus.update({
    where: { id: klusId },
    data: { goedgekeurd },
    select: { id: true, goedgekeurd: true },
  });

  // Mail-trigger: alleen bij overgang false → true. Re-goedkeuringen
  // (was al goedgekeurd) verzenden niet opnieuw, en afkeuringen sturen
  // sowieso niets. Fire-and-forget via after() — admin krijgt geen
  // wacht-tijd op mail-versturen.
  if (!klus.goedgekeurd && goedgekeurd) {
    after(async () => {
      try {
        const vakmannen = await vindMatchendeVakmannen(klus);
        console.log(
          `[email] klus ${klus.id} goedgekeurd → ${vakmannen.length} matchende vakman(nen) gevonden`
        );
        let ok = 0;
        let mislukt = 0;
        for (const vakman of vakmannen) {
          const r = await stuurVakmanLeadAlert({ vakman, klus });
          if (r.ok) {
            ok += 1;
            console.log(`[email] ✓ verstuurd naar ${vakman.email} (id ${r.id || "?"})`);
          } else {
            mislukt += 1;
            console.log(
              `[email] ✗ NIET verstuurd naar ${vakman.email}: ${r.skipped || r.error || "onbekend"}`
            );
          }
        }
        console.log(
          `[email] batch klaar voor klus ${klus.id}: ${ok} ok, ${mislukt} mislukt`
        );
      } catch (err) {
        console.error("[email] alert-batch mislukt:", err);
      }
    });
  }

  return Response.json(bijgewerkt);
}

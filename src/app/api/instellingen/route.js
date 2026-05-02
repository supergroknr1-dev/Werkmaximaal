import { getCurrentUser } from "../../../lib/auth";
import { getInstellingen, setInstelling } from "../../../lib/instellingen";

export async function GET() {
  const instellingen = await getInstellingen();
  return Response.json(instellingen);
}

export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const data = await request.json();
  const updates = {};

  if (typeof data.hobbyistInschakeld === "boolean") {
    await setInstelling("hobbyistInschakeld", data.hobbyistInschakeld);
    updates.hobbyistInschakeld = data.hobbyistInschakeld;
  }

  if (data.leadPrijsCenten !== undefined) {
    const centen = parseInt(data.leadPrijsCenten, 10);
    if (!Number.isFinite(centen) || centen < 100 || centen > 100000) {
      return Response.json(
        { error: "Lead-prijs moet tussen € 1,00 en € 1.000,00 zijn." },
        { status: 400 }
      );
    }
    await setInstelling("leadPrijsCenten", centen);
    updates.leadPrijsCenten = centen;
  }

  if (typeof data.statsHandmatig === "boolean") {
    await setInstelling("statsHandmatig", data.statsHandmatig);
    updates.statsHandmatig = data.statsHandmatig;
  }

  if (data.statsVakmannenWaarde !== undefined) {
    const n = parseInt(data.statsVakmannenWaarde, 10);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      return Response.json(
        { error: "Vakmannen-waarde moet tussen 0 en 1.000.000 zijn." },
        { status: 400 }
      );
    }
    await setInstelling("statsVakmannenWaarde", n);
    updates.statsVakmannenWaarde = n;
  }

  if (data.statsKlussenWaarde !== undefined) {
    const n = parseInt(data.statsKlussenWaarde, 10);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      return Response.json(
        { error: "Klussen-waarde moet tussen 0 en 1.000.000 zijn." },
        { status: 400 }
      );
    }
    await setInstelling("statsKlussenWaarde", n);
    updates.statsKlussenWaarde = n;
  }

  return Response.json(updates);
}

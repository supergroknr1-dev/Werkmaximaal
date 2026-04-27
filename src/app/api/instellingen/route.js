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

  return Response.json(updates);
}

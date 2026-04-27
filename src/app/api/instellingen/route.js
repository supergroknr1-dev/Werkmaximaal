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

  return Response.json(updates);
}

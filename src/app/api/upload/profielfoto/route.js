import { put } from "@vercel/blob";
import { getSession } from "../../../../lib/session";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload-endpoint voor de profielfoto van een vakman. Geeft alleen
 * de URL terug — de aanroeper schrijft 'm via /api/profiel naar de DB.
 *
 * Auth: alleen ingelogde vakmannen (en admins, voor support-flows).
 */
export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Bestandsopslag is niet geconfigureerd." },
      { status: 503 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Ongeldige upload." }, { status: 400 });
  }
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Geen bestand ontvangen." }, { status: 400 });
  }
  if (!TOEGESTANE_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Alleen JPG, PNG of WEBP toegestaan." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Foto mag maximaal 2 MB zijn." },
      { status: 400 }
    );
  }

  const blob = await put(`vakman-fotos/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return Response.json({ url: blob.url });
}

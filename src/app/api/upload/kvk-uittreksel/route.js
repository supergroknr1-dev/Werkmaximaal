import { put } from "@vercel/blob";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TOEGESTANE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        error:
          "Bestandsopslag is nog niet geconfigureerd. Voeg een Vercel Blob-token toe als BLOB_READ_WRITE_TOKEN env-var.",
      },
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
      { error: "Alleen PDF, JPG of PNG toegestaan." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Bestand mag maximaal 5 MB zijn." },
      { status: 400 }
    );
  }

  const blob = await put(`kvk-uittreksels/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return Response.json({ url: blob.url, naam: file.name });
}

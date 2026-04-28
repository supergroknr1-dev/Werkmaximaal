import { put } from "@vercel/blob";
import { getSession } from "../../../../lib/session";
import { prisma } from "../../../../lib/prisma";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user || user.rol !== "consument") {
    return Response.json(
      { error: "Alleen consumenten kunnen reviewfoto's uploaden." },
      { status: 403 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Bestandsopslag is nog niet geconfigureerd." },
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
      { error: "Foto mag maximaal 5 MB zijn." },
      { status: 400 }
    );
  }

  const blob = await put(`review-fotos/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return Response.json({ url: blob.url, naam: file.name });
}

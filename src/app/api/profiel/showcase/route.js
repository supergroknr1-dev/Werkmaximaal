import { put } from "@vercel/blob";
import { prisma } from "../../../../lib/prisma";
import { getSession } from "../../../../lib/session";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (na client-resize is 't meestal <500 KB)
const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PER_VAKMAN = 20;

/**
 * Upload één foto naar de showcase-galerij van de ingelogde vakman.
 * De client resized de afbeelding (canvas → webp) vóór upload zodat
 * de lambda nooit grote files ontvangt. Hier alleen extra defense:
 * type-check, size-cap en een max van 20 foto's per vakman.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, rol: true },
  });
  if (!user || user.rol !== "vakman") {
    return Response.json(
      { error: "Alleen vakmannen kunnen showcase-foto's uploaden." },
      { status: 403 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Bestandsopslag is niet geconfigureerd." },
      { status: 503 }
    );
  }

  const aantal = await prisma.showcaseFoto.count({ where: { userId: user.id } });
  if (aantal >= MAX_PER_VAKMAN) {
    return Response.json(
      { error: `Maximaal ${MAX_PER_VAKMAN} foto's per vakman. Verwijder er eerst één.` },
      { status: 400 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Ongeldige upload." }, { status: 400 });
  }
  const file = formData.get("file");
  const beschrijving = formData.get("beschrijving");

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
      { error: "Foto mag (na resize) maximaal 5 MB zijn." },
      { status: 400 }
    );
  }

  const blob = await put(`showcase/${user.id}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  // Volgorde = max + 1 zodat nieuwe foto's onderaan komen, en
  // herordenen later kan zonder gaten in de nummering.
  const laatste = await prisma.showcaseFoto.findFirst({
    where: { userId: user.id },
    orderBy: { volgorde: "desc" },
    select: { volgorde: true },
  });
  const volgorde = (laatste?.volgorde ?? 0) + 1;

  const foto = await prisma.showcaseFoto.create({
    data: {
      userId: user.id,
      url: blob.url,
      beschrijving:
        typeof beschrijving === "string" && beschrijving.trim()
          ? beschrijving.trim().slice(0, 200)
          : null,
      volgorde,
    },
  });

  return Response.json(foto);
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Inloggen vereist." }, { status: 401 });
  }
  const fotos = await prisma.showcaseFoto.findMany({
    where: { userId: session.userId },
    orderBy: { volgorde: "asc" },
  });
  return Response.json(fotos);
}

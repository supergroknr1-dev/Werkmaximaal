import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const updated = await prisma.user.update({
  where: { email: "s.ozkara09@gmail.com" },
  data: {
    rol: "admin",
    isAdmin: true,
    // Vakman-velden voor de zekerheid leegmaken
    vakmanType: null,
    bedrijfsnaam: null,
    kvkNummer: null,
    kvkUittrekselUrl: null,
    kvkUittrekselNaam: null,
    werkTelefoon: null,
    priveTelefoon: null,
    werkafstand: null,
    regioPostcode: null,
    regioPlaats: null,
  },
  select: { id: true, email: true, naam: true, rol: true, isAdmin: true, totpEnabled: true },
});
console.log("Gepromoveerd:", updated);

await prisma.$disconnect();

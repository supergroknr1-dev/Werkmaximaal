// Maakt 1 test-vakman + 1 test-klus aan voor de email-flow E2E.
// De vakman gebruikt het Resend-default test-adres voor "to" — Resend
// gebruikt z'n eigen sandbox tijdens dev, dus mail-content komt in het
// Resend-dashboard maar niet bij een echte mailbox tenzij je een
// geverifieerd domein hebt en het naar je eigen mail stuurt.
//
// Gebruik:
//   node scripts/seed-email-test.mjs <jouw-email>
// Bv:
//   node scripts/seed-email-test.mjs s.ozkara09@gmail.com

import pkg from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.error("Geef een e-mailadres als argument mee.");
  console.error("  node scripts/seed-email-test.mjs jouw@email.nl");
  process.exit(1);
}

const PW = await bcrypt.hash("test-vakman-2026", 10);

// Bestaande test-vakman? Overschrijven (idempotent).
await prisma.user.deleteMany({
  where: { email: "test-vakman-eindhoven@test.local" },
});

const vakman = await prisma.user.create({
  data: {
    email: "test-vakman-eindhoven@test.local",
    wachtwoordHash: PW,
    naam: "Test Vakman",
    rol: "vakman",
    vakmanType: "professional",
    bedrijfsnaam: "TestKlus Eindhoven",
    kvkNummer: "99999999",
    werkTelefoon: "0612345678",
    werkafstand: 25,
    regioPostcode: "5612",
  },
});
console.log("✓ Vakman aangemaakt:", vakman.email, "in 5612");

// userId mag null — anonieme klussen zijn toegestaan in het schema
await prisma.klus.deleteMany({
  where: { titel: "Test mail-flow: voordeur vervangen" },
});

const klus = await prisma.klus.create({
  data: {
    titel: "Test mail-flow: voordeur vervangen",
    beschrijving:
      "Dit is een test-klus om de email-notificatie te valideren. Voordeur 200x80 cm, 25 jaar oud.",
    postcode: "5612CS",
    plaats: "Eindhoven",
    categorie: "Timmerwerk",
    voorkeurVakmanType: null,
    goedgekeurd: false, // ← admin moet 'm goedkeuren via UI
    gesloten: false,
  },
});

console.log("✓ Klus aangemaakt:", klus.id, "—", klus.titel);
console.log("\nNu in de browser:");
console.log("1. /admin/klussen → filter op 'Te keuren'");
console.log(`2. Klik 'Goedkeuren' op klus #${klus.id}`);
console.log(`3. Reden invullen → bevestigen → mail gaat naar ${vakman.email}`);
console.log(
  "4. Check de Resend-dashboard logs (https://resend.com/logs) — daar zie je of 'ie verstuurd is."
);
console.log(`\nAls je een mail naar ${email} wilt: pas vakman.email aan via:`);
console.log(
  `   prisma.user.update({where:{id:${vakman.id}}, data:{email:'${email}'}})`
);

// Voor het gemak: als de meegegeven email bestaat als geverifieerd
// in Resend, gebruiken we die direct
if (email && email.includes("@") && !email.endsWith("test.local")) {
  await prisma.user.update({
    where: { id: vakman.id },
    data: { email },
  });
  console.log(`✓ Vakman-email aangepast naar ${email}`);
}

await prisma.$disconnect();

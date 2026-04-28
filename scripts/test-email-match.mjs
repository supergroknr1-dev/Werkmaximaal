// Test of de match-logica de juiste vakmannen vindt voor een klus,
// en of stuurVakmanLeadAlert fail-soft gedraagt zonder API-key.
// Maakt 3 test-vakmannen + 1 test-klus en ruimt alles weer op.

import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import { vindMatchendeVakmannen } from "../src/lib/match.js";
import { stuurVakmanLeadAlert } from "../src/lib/email.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const PW = await bcrypt.hash("test", 10);

async function maakVakman(props) {
  return prisma.user.create({
    data: {
      email: `${props.naam.toLowerCase().replace(/\s/g, "-")}@test.local`,
      wachtwoordHash: PW,
      naam: props.naam,
      rol: "vakman",
      vakmanType: props.type,
      regioPostcode: props.regioPostcode,
      regioPlaats: props.regioPlaats,
      werkafstand: 25,
      bedrijfsnaam: props.bedrijfsnaam || null,
      kvkNummer: props.type === "professional" ? "12345678" : null,
    },
  });
}

const eindhovenPro = await maakVakman({
  naam: "Eindhoven Pro",
  type: "professional",
  bedrijfsnaam: "EindhovenKlus B.V.",
  regioPostcode: "5612",
});
const tilburgHobby = await maakVakman({
  naam: "Tilburg Hobby",
  type: "hobbyist",
  regioPlaats: "Tilburg",
});
const enschedePro = await maakVakman({
  naam: "Enschede Pro",
  type: "professional",
  bedrijfsnaam: "Twentse Klus",
  regioPostcode: "7511",
});

const cleanupIds = [eindhovenPro.id, tilburgHobby.id, enschedePro.id];

try {
  console.log("\n=== Test 1: klus in 5612 (Eindhoven), beide types ===");
  let matches = await vindMatchendeVakmannen({
    id: 999,
    postcode: "5612CS",
    plaats: "Eindhoven",
    voorkeurVakmanType: null,
  });
  console.log(
    "matches:",
    matches.map((v) => `${v.naam} (${v.vakmanType})`)
  );

  console.log("\n=== Test 2: klus in 5612, alleen Pro ===");
  matches = await vindMatchendeVakmannen({
    id: 999,
    postcode: "5612CS",
    plaats: "Eindhoven",
    voorkeurVakmanType: "professional",
  });
  console.log(
    "matches:",
    matches.map((v) => `${v.naam} (${v.vakmanType})`)
  );

  console.log("\n=== Test 3: klus in Tilburg (alleen plaats-match) ===");
  matches = await vindMatchendeVakmannen({
    id: 999,
    postcode: "5000AA",
    plaats: "Tilburg",
    voorkeurVakmanType: null,
  });
  console.log(
    "matches:",
    matches.map((v) => `${v.naam} (${v.vakmanType})`)
  );

  console.log("\n=== Test 4: klus in Maastricht (geen match verwacht) ===");
  matches = await vindMatchendeVakmannen({
    id: 999,
    postcode: "6211AA",
    plaats: "Maastricht",
    voorkeurVakmanType: null,
  });
  console.log("matches:", matches.length === 0 ? "✓ leeg" : matches);

  console.log("\n=== Test 5: stuurVakmanLeadAlert zonder API-key ===");
  const r = await stuurVakmanLeadAlert({
    vakman: eindhovenPro,
    klus: {
      id: 999,
      titel: "Voordeur vervangen",
      beschrijving: "Oude deur is rot, graag offerte",
      postcode: "5612CS",
      plaats: "Eindhoven",
      categorie: "Timmerwerk",
    },
  });
  console.log("resultaat:", r);
} finally {
  await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
  console.log("\n✓ test-vakmannen opgeruimd");
  await prisma.$disconnect();
}

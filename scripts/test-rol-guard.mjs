// Test of de admin-rol-guard extensie correct weigert.
// We gebruiken de extended client uit src/lib/prisma.js zodat we
// dezelfde guard testen die de routes gebruiken.
import { prisma } from "../src/lib/prisma.js";

const adminId = 5; // s.ozkara09@gmail.com

async function probeer(label, fn) {
  try {
    await fn();
    console.log(`❌ ${label}: GING DOOR (had geblokkeerd moeten worden)`);
  } catch (e) {
    console.log(`✓ ${label}: geblokkeerd — "${e.message.split(":")[1]?.trim() || e.message}"`);
  }
}

await probeer("update admin → rol=vakman", () =>
  prisma.user.update({ where: { id: adminId }, data: { rol: "vakman" } })
);

await probeer("update admin → rol=consument", () =>
  prisma.user.update({ where: { id: adminId }, data: { rol: "consument" } })
);

await probeer("update admin → isAdmin=false", () =>
  prisma.user.update({ where: { id: adminId }, data: { isAdmin: false } })
);

await probeer("create rol=admin", () =>
  prisma.user.create({
    data: {
      email: "neppertje@example.com",
      wachtwoordHash: "x",
      naam: "X",
      rol: "admin",
    },
  })
);

await probeer("update rol=onbekendewaarde", () =>
  prisma.user.update({ where: { id: adminId }, data: { rol: "fluffy" } })
);

await probeer("updateMany rol=vakman waar id=adminId", () =>
  prisma.user.updateMany({ where: { id: adminId }, data: { rol: "vakman" } })
);

// Een legitieme update op de admin moet WEL werken
console.log("\nLegitieme updates op admin (moeten doorgaan):");
const ok = await prisma.user.update({
  where: { id: adminId },
  data: { naam: "Suleyman Ozkara" },
});
console.log(`✓ admin naam-update: door (id=${ok.id})`);

// Een update op een non-admin (consument naar vakman) moet WEL werken
const consument = await prisma.user.findFirst({ where: { rol: "consument" } });
if (consument) {
  // We doen 'm niet echt — alleen zien of de guard 'm niet onterecht stopt
  await prisma.$disconnect();
  console.log("\n(consument-naar-vakman zou doorgaan, niet uitgevoerd om data niet te muteren)");
} else {
  await prisma.$disconnect();
}

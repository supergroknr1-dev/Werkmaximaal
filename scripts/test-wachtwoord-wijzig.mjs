import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { authenticator } = require("otplib");

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
authenticator.options = { window: 4, step: 30 };

const EMAIL = "s.ozkara09@gmail.com";
const HUIDIG = "TempE2E_2026!";
const NIEUW = "Veranderd2026Test#";
const SECRET = "JBSWY3DPEHPK3PXP";
const BASE = "http://localhost:3000";

await prisma.user.update({
  where: { email: EMAIL },
  data: {
    wachtwoordHash: await bcrypt.hash(HUIDIG, 10),
    totpSecret: SECRET,
    totpEnabled: true,
    recoveryCodesHash: [],
  },
});

let cookies = "";
async function vraag(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookies) headers.cookie = cookies;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    ...opts, headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookies = setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

await vraag("/api/management-login", { method: "POST", body: { email: EMAIL, wachtwoord: HUIDIG } });
await vraag("/api/management-login/2fa", { method: "POST", body: { code: authenticator.generate(SECRET) } });

// Test 1: zonder huidig
const r1 = await vraag("/api/admin/wachtwoord-wijzig", { method: "POST", body: { nieuw: NIEUW } });
console.log("Zonder huidig →", r1.status, r1.body?.error);

// Test 2: foutief huidig
const r2 = await vraag("/api/admin/wachtwoord-wijzig", { method: "POST", body: { huidig: "fout", nieuw: NIEUW } });
console.log("Foutief huidig →", r2.status, r2.body?.error);

// Test 3: te kort nieuw
const r3 = await vraag("/api/admin/wachtwoord-wijzig", { method: "POST", body: { huidig: HUIDIG, nieuw: "kort" } });
console.log("Te kort nieuw →", r3.status, r3.body?.error);

// Test 4: zelfde
const r4 = await vraag("/api/admin/wachtwoord-wijzig", { method: "POST", body: { huidig: HUIDIG, nieuw: HUIDIG } });
console.log("Zelfde wachtwoord →", r4.status, r4.body?.error);

// Test 5: succesvol
const r5 = await vraag("/api/admin/wachtwoord-wijzig", { method: "POST", body: { huidig: HUIDIG, nieuw: NIEUW } });
console.log("Succesvol →", r5.status, r5.body);

// Verifieer dat hash echt vernieuwd is
const u = await prisma.user.findUnique({ where: { email: EMAIL }, select: { wachtwoordHash: true } });
const oudKlopt = await bcrypt.compare(HUIDIG, u.wachtwoordHash);
const nieuwKlopt = await bcrypt.compare(NIEUW, u.wachtwoordHash);
console.log("Oude wachtwoord werkt nog?", oudKlopt ? "✗ JA (BUG)" : "✓ NEE");
console.log("Nieuwe wachtwoord werkt?", nieuwKlopt ? "✓ JA" : "✗ NEE (BUG)");

// Cleanup: terug naar TempE2E_2026! + MFA wissen
await prisma.user.update({
  where: { email: EMAIL },
  data: {
    wachtwoordHash: await bcrypt.hash(HUIDIG, 10),
    totpSecret: null,
    totpEnabled: false,
    recoveryCodesHash: [],
  },
});
console.log("✓ Schoongemaakt — wachtwoord weer TempE2E_2026!, MFA uit");
await prisma.$disconnect();

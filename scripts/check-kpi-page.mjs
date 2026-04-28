import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { authenticator } = require("otplib");

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
authenticator.options = { window: 4, step: 30 };

const TEMP_WW = "TempE2E_2026!";
const EMAIL = "s.ozkara09@gmail.com";
const BASE = "http://localhost:3000";

// Setup: fixed secret + MFA aan
const secret = "JBSWY3DPEHPK3PXP";
await prisma.user.update({
  where: { email: EMAIL },
  data: {
    wachtwoordHash: await bcrypt.hash(TEMP_WW, 10),
    totpSecret: secret,
    totpEnabled: true,
    recoveryCodesHash: [],
  },
});

// Login flow met cookie jar
let cookies = "";
async function vraag(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookies) headers.cookie = cookies;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    cookies = setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
  }
  return res;
}

await vraag("/api/admin-login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
await vraag("/api/admin-login/2fa", { method: "POST", body: { code: authenticator.generate(secret) } });

// /admin ophalen
const res = await vraag("/admin");
const html = await res.text();
console.log("Status:", res.status);
console.log("Heeft 'Vandaag'-sectie?", html.includes(">Vandaag<") ? "✓ JA" : "✗ NEE");
console.log("Heeft KPI-labels?",
  ["Klussen", "Registraties", "Leads", "Reviews"].every((l) => html.includes(l)) ? "✓ alle 4" : "✗ ontbreken");

// Cleanup: MFA weer wissen
await prisma.user.update({
  where: { email: EMAIL },
  data: { totpSecret: null, totpEnabled: false, recoveryCodesHash: [] },
});

await prisma.$disconnect();

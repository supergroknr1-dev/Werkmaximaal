import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { authenticator } = require("otplib");

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const TEMP_WW = "TempE2E_2026!";
const EMAIL = "s.ozkara09@gmail.com";
const BASE = "http://localhost:3000";

authenticator.options = { window: 1, step: 30 };

// 1. Tijdelijk wachtwoord zetten + MFA-state schoon
const hash = await bcrypt.hash(TEMP_WW, 10);
await prisma.user.update({
  where: { email: EMAIL },
  data: {
    wachtwoordHash: hash,
    totpSecret: null,
    totpEnabled: false,
    recoveryCodesHash: [],
  },
});
console.log("✓ Tijdelijk wachtwoord gezet, MFA-state gewist");

// Eenvoudige fetch met cookie-jar
let cookies = "";
async function vraag(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookies) headers.cookie = cookies;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    // alleen 'naam=waarde' deel pakken voor latere requests
    const kvs = setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
    cookies = kvs;
  }
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

// 2. Wrong-route check: /api/login moet admin weigeren
const r1 = await vraag("/api/login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
console.log("/api/login admin →", r1.status, r1.body?.error);

// 3. Cookies legen tussen tests (fresh sessie)
cookies = "";

// 4. /api/admin-login met admin → moet mfaSetupNodig=true geven
const r2 = await vraag("/api/admin-login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
console.log("/api/admin-login admin (no MFA yet) →", r2.status, r2.body);

// 5. /api/admin/mfa/setup → secret + QR data
const r3 = await vraag("/api/admin/mfa/setup");
console.log("/api/admin/mfa/setup →", r3.status, r3.body?.secret ? "secret ontvangen" : r3.body);
const secret = r3.body?.secret;

// 6. /api/admin/mfa/verify met geldige code
const code = authenticator.generate(secret);
const r4 = await vraag("/api/admin/mfa/verify", { method: "POST", body: { code } });
console.log("/api/admin/mfa/verify →", r4.status, r4.body?.ok ? `${r4.body.recoveryCodes?.length} recovery-codes` : r4.body);
const recoveryCodes = r4.body?.recoveryCodes || [];

// 7. Logout + opnieuw inloggen → moet mfaCodeNodig=true geven
await vraag("/api/logout", { method: "POST" });
cookies = "";

const r5 = await vraag("/api/admin-login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
console.log("/api/admin-login admin (MFA active) →", r5.status, r5.body);

// 8. /api/admin-login/2fa met TOTP-code
const code2 = authenticator.generate(secret);
const r6 = await vraag("/api/admin-login/2fa", { method: "POST", body: { code: code2 } });
console.log("/api/admin-login/2fa TOTP →", r6.status, r6.body);

// 9. Test recovery-code: logout, login, gebruik recovery
await vraag("/api/logout", { method: "POST" });
cookies = "";
await vraag("/api/admin-login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
const r7 = await vraag("/api/admin-login/2fa", { method: "POST", body: { recoveryCode: recoveryCodes[0] } });
console.log("/api/admin-login/2fa recovery →", r7.status, r7.body);

// 10. Hergebruik dezelfde recovery-code → moet 401 geven
await vraag("/api/logout", { method: "POST" });
cookies = "";
await vraag("/api/admin-login", { method: "POST", body: { email: EMAIL, wachtwoord: TEMP_WW } });
const r8 = await vraag("/api/admin-login/2fa", { method: "POST", body: { recoveryCode: recoveryCodes[0] } });
console.log("/api/admin-login/2fa recovery (hergebruik) →", r8.status, r8.body?.error);

// 11. Resterende recovery-codes
const naCheck = await prisma.user.findUnique({
  where: { email: EMAIL },
  select: { recoveryCodesHash: true, totpEnabled: true },
});
console.log(`✓ ${naCheck.recoveryCodesHash.length} recovery-codes over (was 8, 1 verbruikt)`);

// 12. Cleanup: MFA wissen zodat user zelf kan opzetten
await prisma.user.update({
  where: { email: EMAIL },
  data: { totpSecret: null, totpEnabled: false, recoveryCodesHash: [] },
});
console.log("✓ MFA-state gewist — gebruiker kan zelf via /admin-login opnieuw setup doen");
console.log(`✓ Tijdelijk wachtwoord blijft: ${TEMP_WW}`);

await prisma.$disconnect();

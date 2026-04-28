# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-04-28 (Sprint 1.2 + Super Admin + isolatie + UX-polijst)
**Laatste commit op main:** `515a8e4` — Recovery blueprint
**Live op:** https://werkmaximaal.vercel.app/

---

## 🟢 Wat er werkt — recent opgeleverd

In de laatste sessies (volgorde: oud → nieuw):

### Eerder afgerond (basis)
- **Mijn klussen** voor consumenten met sluit-knop + lijst van vakmannen die lead hebben gekocht
- **Admin Control Center** met sidebar-layout en lucide-iconen
- **Moderatie-flow**: nieuwe klussen wachten op admin-goedkeuring vóór ze zichtbaar worden voor vakmannen
- **Adres-privacy**: alleen eigenaar / admin / vakman-met-lead zien volledig adres
- **Profiel-pagina** voor consumenten + vakmannen met PDOK auto-lookup
- **Klant-database** in admin met categorieën van hun klussen
- **Backup + restore scripts** voor de Postgres-database
- **Pipedrive CRM-integratie** met fire-and-forget — Pro & Hobbyist pipelines
- **Vernieuwde homepage-header** in een witte kaart met emerald → slate accent
- **Multi-machine workflow**: SNAPSHOT.md + OPENING_PROMPT.md
- **Reviews + sterren-systeem** met fotoupload (Vercel Blob) en 10-dagen-wachttijd
- **Admin vakman bewerken-pagina** met live verschillen-tabel en KvK-upload
- **Werk- + Privé-telefoon** (`werkTelefoon` zichtbaar voor klanten, `priveTelefoon` admin-only)
- **Schermnaam wijzigen 1× per 30 dagen** voor zelf-service, admin omzeilt
- **Vakman/Buurtklusser-rebranding** in alle UI
- **Klus-plaatsen flow voor anonieme bezoekers** met `/voltooien` snel-registratie
- **Multi-werkgebied per Vakman** (admin-only, alleen Pro)
- **Wijzig-indicator** op admin bewerk-pagina (geel = ingetikt, groen = opgeslagen)
- **Donkere sidebar voor alle ingelogde gebruikers**
- **Sovereign Guardian — Sprint 1.1 Foundation**: hash-getekend audit-log + ActivityEvent-tabel als single source of truth voor business-events

### Sprint 1.2 + Super Admin (deze sessie)
- **ConfirmInterventionModal** + server-helper (`logIntervention`) + client-hook (`useInterventionConfirm`). Élke admin-mutatie eist nu een reden ≥30 tekens + categorie via een herbruikbare modal. Headers `X-Intervention-Reden` / `X-Intervention-Categorie` worden server-side gevalideerd en in het audit-log geschreven met SHA-256 hash-chain.
- **6 admin-routes gewikkeld** in de modal-flow:
  - DELETE vakman, PATCH vakman (bewerk-form), POST vakman wachtwoord-reset
  - DELETE consument (vervangt blokkerende native `confirm()` — INP-issue weg)
  - DELETE klus (alleen admin-deletes, eigenaar-deletes blijven zonder reden)
  - POST klus goed-/afkeuren
- **KPI-kaarten op `/admin`** — "Vandaag"-strip met klussen / registraties / leads / reviews afgeleid uit ActivityEvent (`groupBy({type})` sinds UTC-middernacht).
- **Super Admin-rol**: nieuwe `rol="admin"` op User. Suleyman omgezet (consument → admin). DB cleanup: alle vakmannen + klussen + relaties leeggemaakt.
- **Prisma admin-rol-guard** (`lib/prisma.js` extensie) — DB-laag weigert: admin → vakman/consument transities, isAdmin=false op admin, create rol=admin via API, ongeldige rol-waarden, en mass-updates die admin-accounts zouden raken. Bewezen met 6 negatieve tests.
- **Verplichte MFA** voor admin: TOTP via `otplib` v12 + QR-code via `qrcode`. Setup-pagina `/admin/mfa-setup` met scanbare QR + handmatig secret + 8 eenmalig-bruikbare recovery codes (bcrypt-hashes). Klok-tolerance ±2 minuten. Login-flow: stap 1 = email+ww, stap 2 = TOTP-code óf recovery-code. Volledig E2E getest.
- **Strict admin isolation** — 5 lagen verdediging:
  1. Aparte URL `/management-secure-login` (i.p.v. `/admin-login`); folder + constante in `lib/admin-paths.js`
  2. Edge `middleware.js` die oude `/admin-login*` paden hard 404'd en `/admin/*` zonder cookie naar de geheime URL redirect
  3. Email-allowlist in beide admin-layouts (`ADMIN_EMAIL` env-var, default `s.ozkara09@gmail.com`)
  4. Prisma admin-rol-guard (zie boven)
  5. Verplichte MFA-gate op `(gated)/`-pagina's; admin-zonder-MFA wordt gestuurd naar `/admin/mfa-setup`
- **Admin-routes herstructureerd** in `(gated)/` route group; `/admin/mfa-setup` zit BUITEN de gate zodat eerste-keer-setup mogelijk is.
- **Logout-knop** als icoon-knop rechtsboven naast "Admin Center" header. Vernietigt sessie via `/api/logout` en redirect naar `/management-secure-login` (niet naar publieke homepage).
- **Sidebar opgeschoond**: "Terug naar site" weg, "Wachtwoord wijzigen" link weg (zit nu in `/admin/instellingen` als sectie).
- **Eigen wachtwoord wijzigen** voor admin via `/admin/instellingen` (Account-sectie). API `/api/admin/wachtwoord-wijzig` verifieert huidig wachtwoord met `bcrypt.compare` voor 'ie de hash vervangt; lopende reset-tokens worden ongeldig.
- **WachtwoordVeld-component** (`src/components/`) met oog-toggle voor zichtbaarheid. In gebruik op **alle** wachtwoord-velden — admin én publiek. Geen `<input type="password">` meer rauw in de codebase.
- **BLUEPRINT.md** in project-root + GitHub: complete recovery-blauwdruk (tech-stack, env-vars, folder-structuur, schema, GitHub/Vercel-workflow, Sovereign Guardian-bouwstenen + isolatie-lagen). Kan op een nieuwe machine binnen ~60 min weer up-and-running krijgen.

## 🟡 Waar je was gebleven

Sprint 1.2 + Super Admin + admin-isolatie + UX-polijst opgeleverd en gepusht (`515a8e4`). Migrations live: `werk_prive_telefoon`, `naam_laatst_gewijzigd`, `regio_plaats`, `werkgebied_extra`, `guardian_foundation`, `super_admin_mfa`. Tijdelijk wachtwoord voor `s.ozkara09@gmail.com` is `TempE2E_2026!`; MFA-state is gewist zodat je zelf opnieuw QR kunt scannen op `/management-secure-login` → setup. **Volgende item in Sprint 1.2**: live SSE-feed op `/admin/activity-feed` (i.p.v. page-reload).

## 🔴 Volgende stappen — kies er één om mee te starten

Top-3 die het meest impact hebben:
1. **Live SSE-feed** op `/admin/activity-feed` — laatste sprint 1.2 item, ~2u, technisch leuk (Server-Sent Events) en geen extra deps nodig
2. **Email-notificaties** — vakmannen krijgen mail bij nieuwe klus in hun werkgebied (~1,5u, vereist SMTP-keuze: Resend / SendGrid / Mailgun)
3. **Vakman publieke profielpagina** met foto-upload + alle reviews zichtbaar — logische opvolger van het reviews-systeem (~2u, geen extra accounts/services nodig)

Andere openstaande items:
- ID-verificatie via iDIN/Mollie (door user uitgesteld, blijft op de lijst)
- Echte iDEAL-betaling via Mollie — vervangt mock-popup voor leads/inschrijfgeld (~3u)
- Chat tussen consument en vakman na lead-aankoop
- Headers van andere pagina's (Mijn klussen, Mijn leads, Profiel, Admin) ook in de nieuwe witte-kaart-stijl
- Privacy-pagina + voorwaarden + cookie-banner (juridisch verplicht in NL)
- Captcha / spam-bescherming op registratie
- Werkradius-filter voor vakman op de homepage

## 🔧 Stack & infrastructuur (referentie)

- **Code:** Next.js 16.2.4 (App Router, Turbopack, JS), React 19, Tailwind CSS v4, Prisma 6.16.2
- **Database:** Postgres op Railway (`shuttle.proxy.rlwy.net:15960`)
- **Hosting:** Vercel — auto-deploy bij elke push naar `main`
- **CRM:** Pipedrive met `after()` fire-and-forget bij `/api/registreren`
- **Auth:** iron-session via httpOnly cookie + TOTP-MFA voor admin (otplib v12)
- **File storage:** Vercel Blob (KvK-uittreksels + review-foto's)

> Volledige technische details staan in [BLUEPRINT.md](BLUEPRINT.md) — daar staat ook de complete recovery-flow voor een nieuwe machine.

## 🔑 Env-vars (lokaal in .env én in Vercel)

- `DATABASE_URL`, `SESSION_SECRET`
- `ADMIN_EMAIL` (default `s.ozkara09@gmail.com` — voor email-allowlist)
- `BLOB_READ_WRITE_TOKEN`
- 11 Pipedrive-vars (zie BLUEPRINT.md sectie 1)

Op andere machine eerste keer: `npx vercel env pull` om alle vars op te halen.

## ⚠️ Bekende quirks / valkuilen

- Prisma's `query_engine-windows.dll.node` lockt als de dev-server draait → eerst dev-server stoppen vóór `prisma migrate` of `next build`
- Working dir voor Bash-commands: `C:\Users\Buitenglas.nl\Calculator` (cwd na elk commando reset). Voor scripts in het project: altijd `cd /d/test-werkspot-website` voorop
- `<` in PowerShell is een redirect-operator — instructies zonder `<` of `>` om de waarde geven
- **otplib moet v12 blijven** — v13 is een complete API-rewrite zonder de `authenticator`-export. `lib/mfa.js` gebruikt v12-API (`authenticator.options`, `.generate`, `.check`, `.keyuri`)
- **Middleware-paden NIET in src-imports**: `middleware.js` aan project-root kan tsconfig-paths niet altijd resolven; vandaar dat `ADMIN_LOGIN_PATH` daar gedupliceerd is uit `lib/admin-paths.js`
- **Bij URL-rotatie van admin-login**: drie plekken aanpassen (constants in `lib/admin-paths.js`, mappen `src/app/management-secure-login/` + `src/app/api/management-login/`, en `middleware.js`)

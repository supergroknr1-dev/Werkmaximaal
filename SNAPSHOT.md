# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-04-29 (avond — Voor/Na-paren toegevoegd)
**Laatste commit op main:** Voor/Na-paren in showcase + Vercel Blob fix (zie `git log -1`)
**Live op:** https://werkmaximaal.vercel.app/

---

## 🟢 Wat er werkt — recent opgeleverd (chronologisch)

Sessie 2026-04-28 (vandaag/gisteren) — een marathon. Volgorde van oud naar nieuw:

### Sprint 1.2 + Super Admin
- **Sprint 1.2** afgerond: ConfirmInterventionModal voor élke admin-mutatie (vakman delete/PATCH/wachtwoord, klus delete/keuren, consument delete) + KPI-kaarten op /admin (vandaag-strip uit ActivityEvent) + Live SSE-feed op /admin/activity-feed (auto-pulled, groene flash voor nieuwe events).
- **Super Admin-rol** + **strict isolation**: Suleyman omgezet naar rol="admin", Prisma admin-rol-guard extensie blokkeert alle ongeldige rol-transities, geheime URL `/management-secure-login` met edge-middleware (404 op oude URL), email-allowlist via `ADMIN_EMAIL` env-var.
- **Verplichte MFA** voor admin (TOTP via otplib v12 + QR + recovery codes) — later **opt-in** gemaakt op verzoek. /admin/mfa-setup blijft beschikbaar voor wie 'm wel wil.

### UX-polijst + groei-features
- **Wachtwoord wijzigen** voor admin via /admin/instellingen (eigen-wachtwoord-route).
- **Oog-toggle** op alle 11 wachtwoord-velden (admin + publiek), via herbruikbare `<WachtwoordVeld>` component.
- **Sidebar refactor**: uitlog-knop rechtsboven naast Admin Center header; "Terug naar site" en "Wachtwoord wijzigen" weg uit sidebar.
- **Email-notificaties** via Resend bij klus-goedkeuring (matching op postcode-prefix / plaats / werkgebiedExtra). `RESEND_API_KEY` op Vercel.
- **iDEAL via Mollie** voor lead-aankoop. /api/klussen/[id]/lead start checkout, /leads/retour verifieert na redirect, /api/leads/mollie-webhook async backup. `MOLLIE_API_KEY` (`test_...`) + `APP_URL` op Vercel.
- **Postcode-privacy**: API strippt postcode volledig voor non-admin/non-eigenaar; alleen plaats blijft over.
- **Navigatie-fixes**: admin krijgt breadcrumb i.p.v. "Terug naar overzicht" op klus-detail; homepage redirect admins direct naar /admin; "Vakman-account"-bordje toont alleen voor echte vakmannen.
- **Vakman publieke profielpagina** (/vakmannen/[id]): avatar + KvK-badge + werkgebied + lid-sinds + 3 stats-kolommen (beoordeling/leads/werkgebied) + bio + reviews-blok. Naam clikbaar vanuit klus-detail-reacties.
- **Showcase-galerij** met **2-stappen wizard**: drag-drop multi-upload (client-side resize via canvas naar 1600px webp), "Ga door" sticky bottom-bar op mobiel, stap 2 = beschrijvingen toevoegen, "Project publiceren" finaliseert. + Lightbox op publieke pagina + admin moderation onder /admin/showcase + "Portfolio voltooid"-badge bij ≥5 foto's.
- **Admin-tabel acties uitgebreid**: Profiel-link (target=_blank) + "Bekijk als" (shadow-mode). Shadow-mode: session.shadowAdminId bewaart admin-id, session.userId wordt vakman; globale **AdminToolbar** (donker-banner of amber-shadow) bovenaan publieke pagina's met "Stop shadowen"-knop.

Sessie 2026-04-29 (vandaag, voortzetting):
- **Privacy + voorwaarden + cookie-banner + footer** — concept-teksten met jurist-waarschuwing, banner via localStorage, footer met © + links op alle publieke pagina's.
- **Werkradius-filter** op homepage (`Alleen klussen in mijn werkgebied`-toggle, default aan, server-side `inWerkgebied`-flag per klus).
- **Spam-bescherming** op alle 3 registratie-flows: honeypot + 2-sec tijd-check + IP-rate-limit (max 5/24u via ActivityEvent) + optionele Cloudflare Turnstile.
- **Inline profielfoto-upload** met overlay-balk op /vakmannen/[id]: half-zwart bij rust → 85% bij hover, klik opent file-picker, dimensie-check (≥400×400), preview-modal met cirkel-frame, center-crop naar 600×600 webp via canvas, hot-reload via router.refresh(). Werkt voor eigenaar én admin (admin-actie in ActivityEvent).
- **Werkgebied: postcode → plaatsnaam** via PDOK Locatieserver (gratis NL-overheid). Profielpagina toont nu "Eindhoven" i.p.v. "5612". Multi-postcode-werkgebied wordt gededupliceerd ("Amsterdam" 1× ondanks 4 postcodes). SEO-metadata bevat plaatsnaam: `vakman in Eindhoven`. Admin bewerk-form toont live `5612 = Eindhoven`-hint onder regio-postcode.
- **Profielfoto-upload-knop** (op /profiel) opgewaardeerd: native input vervangen door styled "Foto kiezen"-knop (donker, met upload-icoon). Pixel-specs duidelijker: "Aanbevolen: minimaal 400 × 400 pixels (vierkant / 1:1)".

Sessie 2026-04-29 (avond, Voor/Na-feature):
- **Voor/Na-paren in showcase** — `urlNa String?` toegevoegd aan ShowcaseFoto-model (1 rij = 1 paar, geen aparte tabel). Migratie `add_voor_na_paar`. API `/api/profiel/showcase` accepteert optioneel een tweede file `fileNa`; uploadt beide naar Vercel Blob als één DB-rij.
- **UI uitklap-paneel** "Voor/Na-paar toevoegen" onder de gewone drop-zone op `/profiel` (collapsible). Twee `SlotKiezer`-slots (Voor + Na) met preview en wis-knop. Knop disabled tot beide gekozen + niet-bezig.
- **Split-view tegel** (`src/components/VoorNaTegel.js`, gedeeld component): in elke aspect-square tegel 2 helften met `object-cover`, dunne witte scheidingslijn, kleine zwarte VOOR / NA labels. Gebruikt op `/profiel`, `/vakmannen/[id]` én `/admin/showcase`.
- **Lightbox-slider** in `Lightbox.js` voor publieke profiel: drag/klik horizontaal om Voor↔Na te vergelijken via `clipPath: inset(0 X% 0 0)` op de bovenliggende Voor-foto. Pointer Events (muis + touch). Aspect 4:3 container zodat beide foto's op exact dezelfde coördinaten liggen.
- **Admin moderation-tegel** krijgt naast de split-view aparte "Open Voor" / "Open Na" knoppen + `↔ Voor/Na-paar` badge zodat admin elke foto los kan beoordelen.
- **Bug-fix:** `urlNa` was niet geselecteerd in de DB-query op `/vakmannen/[id]/page.js` → eerst toonde de publieke pagina alleen Voor; na fix split-view zichtbaar.

**Vercel Blob: oude store gemigreerd** — bij testen lokaal kwam de fout "Cannot use public access on a private store". De originele `werkmaximaal-uploads`-store was als private aangemaakt (Vercel default sinds @vercel/blob v2). Geen foto's in store (Blob Count = 0), dus probleemloos verwijderd via `vercel blob delete-store` en opnieuw aangemaakt als public via `vercel blob create-store werkmaximaal-uploads --access public --region cdg1 --yes`. Nieuwe ID: `store_uMQMwxXf37csAdAO`. Token automatisch ververst op Vercel én lokaal.

## 🟡 Waar je was gebleven

Voor/Na-paren in showcase volledig live: vakman uploadt 2 foto's, beide opgeslagen in 1 DB-rij, getoond als split-view tegel + drag-slider in lightbox. Plus een belangrijke infra-fix: Blob-store omgezet van private naar public (was nooit gelukt om iets te uploaden, ook productie niet — nu wel). Niets halverwege.

## 🔴 Volgende stappen — top-3 voor morgen

Beste opties (vraag morgen welke):
1. **Chat tussen consument en vakman na lead-aankoop** (~3u) — grote feature, eigen DB-tabel + Realtime via SSE of polling. Productief gezien meest impactvol voor het marketplace-model.
2. **Watermerk op showcase-foto's** (~45 min) — losse helft van wat oorspronkelijk een combo-feature was. Klein logo rechtsonder, client-side via canvas vóór upload (bundle-vriendelijk).
3. **Headers van overige pagina's in nieuwe witte-kaart-stijl** (~1u) — Mijn klussen, Mijn leads, Profiel, Admin headers krijgen dezelfde witte-kaart-met-emerald-accent als de homepage. Visuele consistency.

Alternatieven:
- **Pre-flight live-mode op Mollie** (KvK-verificatie + Live API key + production-test). Niet bouwen, alleen config + testflight.
- **Cloudflare Turnstile config** (account aanmaken + 2 env-vars). Spam-helper is al klaar; dit is enkel wat insteek-werk.
- **Foto-ordering met drag** tussen showcase-foto's (volgorde-veld bestaat al in DB).

Andere openstaande items:
- ID-verificatie via iDIN/Mollie (door user uitgesteld)
- Privacy/voorwaarden door **echte jurist** laten reviewen vóór live live-mode
- Bedrijfsnaam + KvK-nummer + adres invullen op privacy-page placeholders
- Foto-ordering met drag tussen showcase-foto's (volgorde-veld bestaat)
- Inactieve-account-cleanup cron (genoemd in privacyverklaring; niet gebouwd)

## 🔧 Stack & infrastructuur (referentie)

- **Code:** Next.js 16.2.4 (App Router, Turbopack, JS), React 19, Tailwind v4, Prisma 6.16.2
- **Database:** Postgres op Railway (`shuttle.proxy.rlwy.net:15960`)
- **Hosting:** Vercel — auto-deploy bij elke push naar `main`
- **Email:** Resend (`onboarding@resend.dev` als test-from; verifieer eigen domein voor live-mode)
- **Betalingen:** Mollie iDEAL (test-mode actief; live-key vereist KvK-verificatie)
- **CRM:** Pipedrive met `after()` fire-and-forget bij /api/registreren
- **Auth:** iron-session via httpOnly cookie + TOTP-MFA voor admin (otplib v12) + email-allowlist
- **File storage:** Vercel Blob (KvK / review-foto / profielfoto / showcase-foto / vakman-fotos)
- **Geocoding:** PDOK Locatieserver (gratis NL-overheid; cache 24u via Next.js fetch-cache)

> Volledige technische details staan in [BLUEPRINT.md](BLUEPRINT.md) — daar staat ook de complete recovery-flow voor een nieuwe machine.

## 🔑 Env-vars (lokaal in .env én op Vercel)

Verplicht:
- `DATABASE_URL`, `SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `MOLLIE_API_KEY` (test_... in dev / live_... in prod)
- `APP_URL` (`https://werkmaximaal.vercel.app` op Vercel — nodig voor Mollie webhook)
- `RESEND_API_KEY` voor email-notificaties
- 11 Pipedrive-vars (bestonden al)

Optioneel:
- `ADMIN_EMAIL` (default `s.ozkara09@gmail.com`)
- `EMAIL_VAN`, `EMAIL_BASE_URL` (Resend-defaults werken ook)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` voor Cloudflare CAPTCHA op registratie

`vercel env pull` op nieuwe machine om alle vars op te halen.

## ⚠️ Bekende quirks / valkuilen

- Prisma's `query_engine-windows.dll.node` lockt als de dev-server draait → eerst dev-server stoppen vóór `prisma migrate` of `next build`
- Working dir voor Bash-commands: `C:\Users\Buitenglas.nl\Calculator` (cwd reset na elk commando). Voor scripts in het project: altijd `cd /d/test-werkspot-website` voorop
- **otplib MOET v12 blijven** — v13 heeft compleet andere API zonder `authenticator`-export
- **Mollie weigert webhookUrl als 'ie localhost is** — APP_URL alleen op Vercel nodig; lokaal werkt redirect-flow zonder webhook
- **Next.js 16 verbiedt cookie-mutatie in server-rendered pages** — gebruik Server Action of Route Handler. /leads/retour mocht daarom de pendingLeadPayment niet wissen op de server (idempotent design vangt dit op)
- **Resend test-mode** kan alleen mailen naar het account-email + Gmail-aliases (`+iets@gmail.com`)
- **Cross-origin redirects in Claude Code preview** worden geblokkeerd ("only localhost") — Mollie / externe URLs alleen testen in echte browser
- **Tijdelijk wachtwoord voor s.ozkara09@gmail.com:** `TempE2E_2026!` (gezet voor E2E-tests; vervang via /admin/instellingen of /wachtwoord-vergeten)
- **Nieuwe Vercel Blob-stores zijn default private** sinds @vercel/blob v2 — dit faalt hard bij `put({access:"public", ...})`. Maak nieuwe stores altijd met `vercel blob create-store NAAM --access public --region cdg1 --yes`.
- **`vercel env pull` schrijft ALTIJD ook naar `.env.local`** (los van het filename-argument), wat voorrang heeft op `.env` in Next.js. Verwijder/hernoem `.env.local` als je een gemerged `.env` gebruikt — anders worden je handmatige edits gemaskeerd.

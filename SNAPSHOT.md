# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-04-29 (late avond — chat + inbox + DB-wipe)
**Laatste commit op main:** Berichten-inbox + deeplink naar specifieke chat
**Live op:** https://werkmaximaal.vercel.app/

> **Database is leeg gewist op 2026-04-29.** Alleen admin-account (`s.ozkara09@gmail.com`)
> is bewaard. Trefwoorden-config staat nog. Site is dus klaar voor productie-launch.

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

Sessie 2026-04-29 (late avond, chat-feature):
- **Chat tussen vakman en consument** na lead-aankoop. Nieuwe `ChatBericht`-tabel (1 rij per bericht, gekoppeld aan `Lead`). Eén lead = één gesprek-thread tussen die specifieke vakman en de consument-eigenaar van de klus.
- **Auth-regels** in API: alleen `lead.vakmanId` of `klus.userId` mag GET/POST. **Eerste bericht moet van de vakman komen** (afgedwongen via DB-check).
- **GET-endpoint markeert wederpartij-berichten direct als gelezen**, dus openen van de chat reset de unread-counter voor de wederpartij.
- **Gedeelde `LeadChat`-component** in `src/components/`: uitklapbaar paneel met groen-rechts (eigen) / grijs-links (wederpartij) bubble-style berichten, datum-groepering, polling elke 5 sec, auto-scroll naar onder, max 2000 tekens per bericht.
- **Vakman-kant** op `/mijn-leads`: chat-paneel onder elke `LeadKaart` met "Chat met klant"-label.
- **Consument-kant** op `/mijn-klussen`: chat-paneel per gekochte vakman onder de lead-li met "Chat met {bedrijfsnaam}"-label.
- **Unread-counter** server-side: `_count` op `chatBerichten` met filter `vanUserId != mij AND gelezen = false`, getoond als groene badge naast de toggle-knop.
- **Email-notificatie via Resend** bij elk nieuw bericht: fire-and-forget via `after()` zodat de API niet wacht op SMTP. Onderwerp `Nieuw bericht van {afzender} over {klustitel}`, deeplink naar `/mijn-leads` of `/mijn-klussen` afhankelijk van rol.
- **Database-wipe** uitgevoerd: alle testdata weg (4 → 1 user, 8 → 0 klussen, 5 → 0 leads, 47 → 0 activityEvents). Alleen admin (`s.ozkara09@gmail.com`) bewaard. Trefwoorden-config blijft staan.
- **`/berichten` unified inbox**: placeholder-pagina vervangen door echte verzamel-inbox. Lijst alle leads met ≥1 chat-bericht, gesorteerd op meest recente activiteit, met avatar (foto of initialen-fallback), klustitel, laatste-bericht-preview ("Jij: ..." prefix bij eigen bericht), relatieve tijd ("5 min", "2 u", "3 d"), unread-badge. Klik → opent `/mijn-leads?chat=X` of `/mijn-klussen?chat=X` met die specifieke chat al uitgeklapt via nieuwe `initialOpen`-prop op LeadChat.

## 🟡 Waar je was gebleven

Chat-feature volledig live: vakman + consument kunnen op `/mijn-leads` resp. `/mijn-klussen` direct met elkaar chatten per gekochte lead, met polling, unread-badge en email-notificatie. DB is helemaal gewist — site staat klaar voor de echte launch met alleen admin-account erin.

## 🔴 Volgende stappen — top-3 voor morgen

Beste opties (vraag morgen welke):
1. **Pre-flight live-mode op Mollie** (~30 min config + testflight) — KvK-verificatie indienen, Live API key zetten op Vercel, één echte iDEAL-betaling testen om zeker te weten dat de productie-flow werkt. Logisch nu de DB leeg is.
2. **Watermerk op showcase-foto's** (~45 min) — klein logo rechtsonder, client-side via canvas vóór upload.
3. **Headers in nieuwe witte-kaart-stijl** (~1u) — Mijn klussen, Mijn leads, Profiel, Admin headers krijgen dezelfde witte-kaart-met-emerald-accent als de homepage.

Alternatieven:
- **Cloudflare Turnstile config** (account aanmaken + 2 env-vars). Spam-helper is al klaar; dit is enkel wat insteek-werk.
- **Foto-ordering met drag** tussen showcase-foto's (volgorde-veld bestaat al in DB).
- **Headers in nieuwe witte-kaart-stijl** (~1u) — visuele consistency over alle pagina's.

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

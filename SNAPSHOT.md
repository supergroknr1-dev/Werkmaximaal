# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-04-28 (sidebar-layout + Sovereign Guardian Sprint 1.1)
**Laatste commit op main:** `5ffb924` — Sovereign Guardian — Sprint 1.1 Foundation
**Live op:** https://werkmaximaal.vercel.app/

---

## 🟢 Wat er werkt — recent opgeleverd

In de laatste sessies (volgorde: oud → nieuw):
- **Mijn klussen** voor consumenten met sluit-knop + lijst van vakmannen die lead hebben gekocht
- **Admin Control Center** met sidebar-layout (Overzicht / Consumenten / Vakmannen / Klussen / Instellingen) en lucide-iconen
- **Moderatie-flow**: nieuwe klussen wachten op admin-goedkeuring vóór ze zichtbaar worden voor vakmannen
- **Adres-privacy**: alleen eigenaar / admin / vakman-met-lead zien volledig adres
- **Dashboard-isolatie**: klant A ziet niet klant B's klussen op de homepage
- **Profiel-pagina** voor consumenten + vakmannen met PDOK auto-lookup voor adressen
- **Klant-database** in admin met voornaam/achternaam/adres/postcode/plaats + categorieën van hun klussen
- **Backup + restore scripts** voor de Postgres-database (lokale JSON in `backups/`)
- **Pipedrive CRM-integratie** met fire-and-forget — Pro & Hobbyist pipelines, custom fields, deals
- **Mijn leads** voor vakmannen — overzicht gekochte leads met klant-contactgegevens
- **Vernieuwde homepage-header** in een witte kaart met emerald → slate accent, avatar-cirkel + rol-badge
- **Persoonlijk adres** ook beschikbaar voor Hobbyists op `/profiel`
- **Multi-machine workflow**: `SNAPSHOT.md` + `OPENING_PROMPT.md` in de project-root, plus een feedback-memory-regel die zorgt dat ik SNAPSHOT.md bij sessie-einde automatisch bijwerk
- **Reviews + sterren-systeem**: consument beoordeelt een vakman 10 dagen na lead-aankoop met score 1–5, optionele toelichting en max 5 foto's (Vercel Blob, pad `review-fotos/`). Gemiddelde score + aantal reviews zichtbaar op `/mijn-klussen` (per gekochte lead) en `/klussen/[id]` (per reactie). Modal met sterren-selectie, tekstvak (max 2000 tekens) en drag-en-drop upload (JPG/PNG/WEBP, max 5 MB per foto). Eigen API: `POST /api/reviews` (validatie: eigenaar-check, 10-dagen-wachttijd, 1 review per lead) en `POST /api/reviews/upload`
- **Admin vakman bewerken-pagina** (`/admin/vakmannen/[id]/bewerken`) — eigen sectie per blok (Account, Bedrijf, Adres gegevens, Werkgebied), Type als blok-keuze met live verschillen-tabel, Bedrijf-sectie alleen bij Vakman, conditional naam-label (Schermnaam/Bedrijfsnaam), KvK-uittreksel-upload (PDF/JPG/PNG, max 5 MB), wachtwoord-reset door admin (eigen route `/api/admin/vakmannen/[id]/wachtwoord`), PDOK-adres-autofill (postcode+huisnummer → straatnaam+plaats), werkgebied via postcode of plaats (autocomplete via PDOK)
- **Werk- + Privé-telefoon**: `werkTelefoon` (was `telefoon` via @map = backward-compat) zichtbaar voor klanten + nieuw `priveTelefoon` alleen zichtbaar voor admin
- **Schermnaam wijzigen 1× per 30 dagen** op `/profiel` voor de vakman/buurtklusser zelf — admin omzeilt regel via PATCH `/api/admin/vakmannen/[id]`. Velden voor- en achternaam zijn disabled tijdens wachttijd, gele waarschuwingsbalk toont datum waarop weer kan
- **Vakman/Buurtklusser-rebranding** in alle UI: "Professional/Pro" → "Vakman", "Hobbyist/Handige Harry" → "Buurtklusser". DB-waarden (`professional`/`hobbyist`) en Pipedrive CRM-labels onveranderd
- **Klus-plaatsen flow voor anonieme bezoekers**: homepage toont stap 1 + 2 ook zonder login. Klik op 'Plaats klus' bewaart formstate in `sessionStorage` en redirect naar nieuwe pagina `/voltooien` met dual-block lay-out (inloggen + consument-only snel-registratie, géén zakelijke optie). Na succesvol login/registratie wordt de klus automatisch geplaatst zodra gebruiker geladen is en PDOK-adres bevestigd. Migration `werkgebied_extra` voor toekomstige multi-werkgebied
- **Multi-werkgebied per Vakman** (admin-only, alleen Pro): primair blijft op `User`, nieuwe tabel `WerkgebiedExtra` voor extra rijen. UI in admin bewerk-pagina met **+ Werkgebied toevoegen** / **🗑 verwijderen** per rij, postcode/plaats-toggle. Buurtklussers krijgen geen extra werkgebieden — bij type-switch worden alle extras automatisch geleegd in transactie
- **Wijzig-indicator op admin bewerk-pagina**: geel (amber-50) = ingetikt-niet-opgeslagen, groen (emerald-50) = net opgeslagen (flash 3s, daarna wit). Werkt op alle hoofdvelden (naam, contact, adres, werkgebied)
- **Registreren als vakman uitgelijnd met admin-bewerk-stijl**: type-cards met 5-punten lijst + kleur-highlight, conditioneel naam-label, werkgebied postcode/plaats-toggle + PDOK-autocomplete, KvK-uittreksel als donkere upload-knop (oude `KvkUpload`-component verwijderd)
- **Donkere sidebar voor alle ingelogde gebruikers** — uniforme stijl als admin-sidebar, rol-aware nav (Consument/Vakman/Buurtklusser), mobiel hamburger, kleur-badge per rol. Pages verplaatst naar `(ingelogd)/` route-group: dashboard, mijn-klussen, mijn-leads, profiel, plus placeholder berichten + agenda. `GlobalShell` in root layout toont sidebar overal behalve `/admin/*` en auth-pagina's.
- **Sovereign Guardian — Sprint 1.1 Foundation**: hash-getekend audit-log + ActivityEvent-tabel als single source of truth voor alle business-events. Migration `guardian_foundation`. Helpers `src/lib/audit.js` (appendAudit + verifyAuditChain met SHA-256 hash-chain) en `src/lib/events.js` (emitActivity met `EVENT_TYPES`-constanten, async via `after()`). Bestaande POST-routes (klussen, lead, review, registreren) emitten nu events. Nieuwe admin-pagina's `/admin/activity-feed` (chronologische event-stream met filter per type) en `/admin/audit-log` (categorie-filter + hash-preview + 🔒 Verifieer-knop).

## 🟡 Waar je was gebleven

Sidebar-layout + Sovereign Guardian Sprint 1.1 (Foundation) opgeleverd en gepusht (`5ffb924`). Migrations live: `werk_prive_telefoon`, `naam_laatst_gewijzigd`, `regio_plaats`, `werkgebied_extra`, `guardian_foundation`. **Volgende sprint (1.2)**: ConfirmInterventionModal-component (reden ≥ 30 tk), `lib/intervention-api.js` wrapper rond elke admin-mutatie, KPI-kaarten op `/admin` (vandaag-stats uit ActivityEvent), live SSE-feed i.p.v. page-reload. **Geschat:** ~10-12u. Of switchen naar groei-features uit de top-3.

## 🔴 Volgende stappen — kies er één om mee te starten

Top-3 die het meest impact hebben:
1. **Email-notificaties** — vakmannen krijgen mail bij nieuwe klus in hun werkgebied (~1,5u werk, vereist SMTP-keuze)
2. **Echte iDEAL-betaling via Mollie** — vervangt de mock-popup zodat hobbyisten écht €25 inschrijfgeld betalen en vakmannen écht voor leads betalen (~3u werk)
3. **Vakman publieke profielpagina** met foto-upload + alle reviews zichtbaar — logische opvolger van vandaag, daar komen de reviews echt tot hun recht (~2u werk)

Andere openstaande items (zie ook `~/.claude/projects/.../memory/project_werkmaximaal.md`):
- ID-verificatie via iDIN/Mollie (door user uitgesteld, blijft op de lijst)
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
- **Auth:** iron-session via httpOnly cookie

## 🔑 Env-vars (lokaal in .env én in Vercel)

- `DATABASE_URL`, `SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob, voor KvK-uittreksel upload)
- `PIPEDRIVE_API_TOKEN` + alle 10 ID/key-vars (zie `scripts/pipedrive-list-ids.mjs`)

Op andere machine eerste keer: `vercel env pull` om alle env-vars op te halen.

## ⚠️ Bekende quirks / valkuilen

- Prisma's `query_engine-windows.dll.node` lockt als de dev-server draait → eerst dev-server stoppen vóór `prisma migrate` of `next build`
- Working dir voor Bash-commands: `C:\Users\Buitenglas.nl\Calculator` (cwd na elk commando reset). Voor scripts in het project: altijd `cd /d/test-werkspot-website` voorop
- `<` in PowerShell is een redirect-operator — instructies zonder `<` of `>` om de waarde geven

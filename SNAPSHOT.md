# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-04-27
**Laatste commit op main:** `26e0ce0` — Persoonlijk adres-blok ook voor Hobbyist op /profiel
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

## 🟡 Waar je was gebleven

Persoonlijk adres-blok (postcode + huisnummer + toevoeging met PDOK-lookup) toegevoegd voor Hobbyists op de profielpagina. Gepusht (`5be09fc..26e0ce0`) en live op Vercel.

## 🔴 Volgende stappen — kies er één om mee te starten

Top-3 die het meest impact hebben:
1. **Reviews + sterren-systeem** — consumenten beoordelen vakmannen na lead-aankoop, bouwt vertrouwen op het platform (~2u werk)
2. **Email-notificaties** — vakmannen krijgen mail bij nieuwe klus in hun werkgebied (~1,5u werk, vereist SMTP-keuze)
3. **Echte iDEAL-betaling via Mollie** — vervangt de mock-popup zodat hobbyisten écht €25 inschrijfgeld betalen en vakmannen écht voor leads betalen (~3u werk)

Andere openstaande items (zie ook `~/.claude/projects/.../memory/project_werkmaximaal.md`):
- ID-verificatie via iDIN/Mollie (door user uitgesteld, blijft op de lijst)
- Vakman publieke profielpagina + foto-upload
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

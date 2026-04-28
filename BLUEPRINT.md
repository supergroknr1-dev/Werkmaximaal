# Werkmaximaal — Recovery Blueprint

> **Doel van dit document:** als je computer crasht of je gaat naar een nieuwe machine, kun je met deze blauwdruk + de GitHub-repo + Vercel-deployment binnen ±60 minuten weer up-and-running zijn. Werkt zonder enige extra kennis behalve git, npm en een DB-URL.
>
> **Laatst bijgewerkt:** 2026-04-28 — branch `main`, laatste commit `a393f66`.

---

## ⚠️ Eerlijke realiteits-noten

Een paar dingen die in de oorspronkelijke "Sovereign Guardian"-prompt stonden, matchen niet met wat er werkelijk is gebouwd. Ik documenteer hieronder de **werkelijkheid**, niet de prompt-taal:

| In prompt | In werkelijkheid |
|---|---|
| "18 modules" | 11 Prisma-tabellen, ~10 admin-pagina's, 4 Sovereign Guardian-bouwstenen |
| "Supabase" | Postgres draait op **Railway**, niet Supabase |
| "Sovereign Guardian = volledig observability-platform" | 4 concrete bouwstenen: ActivityEvent + AuditLog + MFA + admin-isolatie |
| "Invisible Guardian / Shadowing" | Niet gebouwd. Bestaat niet in deze codebase. |

Geen sprake van scope-creep weg-praten — gewoon transparant zodat je niets zoekt dat er niet is.

---

## 1. Tech-stack & Environment

### Frameworks (`package.json`)

```json
{
  "next":            "16.2.4",        // App Router, Turbopack
  "react":           "19.2.4",
  "react-dom":       "19.2.4",
  "tailwindcss":     "^4",            // v4 met @tailwindcss/postcss
  "@prisma/client":  "^6.16.2",
  "prisma":          "^6.16.2",
  "iron-session":    "^8.0.4",        // httpOnly session-cookie
  "bcryptjs":        "^3.0.3",        // wachtwoord-hashing
  "otplib":          "^12.0.1",       // TOTP-MFA (LET OP: v12, niet v13)
  "qrcode":          "^1.5.4",        // server-side QR voor MFA-setup
  "@vercel/blob":    "^2.3.3",        // KvK-uittreksel + review-foto-uploads
  "lucide-react":    "^1.11.0"
}
```

**Hosting:**
- Code op **GitHub:** https://github.com/supergroknr1-dev/Werkmaximaal
- Auto-deploy op **Vercel** bij elke push naar `main` → https://werkmaximaal.vercel.app/
- Database: **Postgres op Railway** (`shuttle.proxy.rlwy.net:15960`)
- File storage: **Vercel Blob** (KvK-uittreksels onder `kvk-uittreksels/`, review-foto's onder `review-fotos/`)
- CRM: **Pipedrive** (alleen vakman-aanmeldingen worden gepusht)

### Environment variables

Deze moeten in **Vercel-env** én lokaal in `.env`. Bij eerste setup op een nieuwe machine: `vercel env pull` haalt ze allemaal in één keer op vanuit Vercel.

| Variable | Wat | Waar gebruikt |
|---|---|---|
| `DATABASE_URL` | Postgres connectie-string Railway | `prisma/schema.prisma`, alle DB-routes |
| `SESSION_SECRET` | Random ≥32 byte string voor iron-session encryptie | `src/lib/session.js` |
| `ADMIN_EMAIL` | Allowlist voor super-admin (default `s.ozkara09@gmail.com`) | `src/lib/admin-paths.js` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | KvK + review uploads |
| `PIPEDRIVE_API_TOKEN` | Pipedrive personal token | `src/lib/pipedrive.js` |
| `PIPEDRIVE_PIPELINE_PRO` | Pipedrive pipeline-id (Pro) | idem |
| `PIPEDRIVE_PIPELINE_HOBBYIST` | Pipedrive pipeline-id (Hobby) | idem |
| `PIPEDRIVE_STAGE_AANGEMELD_PRO` | Stage-id voor nieuw-Pro | idem |
| `PIPEDRIVE_STAGE_AANGEMELD_HOBBY` | Stage-id voor nieuw-Hobby | idem |
| `PIPEDRIVE_CF_BEDRIJFSNAAM` | Custom-field key (Pipedrive) | idem |
| `PIPEDRIVE_CF_KVK` | idem | idem |
| `PIPEDRIVE_CF_POSTCODE` | idem | idem |
| `PIPEDRIVE_CF_WERKAFSTAND` | idem | idem |
| `PIPEDRIVE_CF_VAKMAN_TYPE` | idem | idem |
| `PIPEDRIVE_CF_VAKMAN_TYPE_OPTION_PRO` | option-value voor Pro | idem |
| `PIPEDRIVE_CF_VAKMAN_TYPE_OPTION_HOBBY` | option-value voor Hobby | idem |

Pipedrive ids ophalen kan met `node scripts/pipedrive-list-ids.mjs` (in repo).

---

## 2. Folder Structure

```
test-werkspot-website/
├─ middleware.js                  # Edge-middleware: 404 oude /admin-login,
│                                 # redirect /admin/* zonder cookie naar
│                                 # de geheime URL
├─ prisma/
│  ├─ schema.prisma               # 11 modellen, single source of truth
│  └─ migrations/                 # 25 migrations (chronologisch)
├─ scripts/                       # eenmalige onderhouds-scripts:
│  ├─ check-users.mjs
│  ├─ check-kpi-page.mjs
│  ├─ cleanup-vakmannen-klussen.mjs
│  ├─ e2e-mfa-test.mjs            # E2E voor de MFA-flow
│  ├─ login-en-zet-cookie.mjs
│  ├─ promote-suleyman-to-admin.mjs
│  ├─ test-rol-guard.mjs          # E2E voor admin-rol-guard
│  └─ test-wachtwoord-wijzig.mjs
├─ src/
│  ├─ app/
│  │  ├─ (ingelogd)/              # route group voor ingelogde
│  │  │  ├─ dashboard/            #   gebruikers (consument/vakman) —
│  │  │  ├─ mijn-klussen/         #   donkere sidebar via GlobalShell
│  │  │  ├─ mijn-leads/
│  │  │  ├─ profiel/
│  │  │  ├─ agenda/               # placeholder
│  │  │  └─ berichten/            # placeholder
│  │  ├─ admin/
│  │  │  ├─ layout.js             # auth + isAdmin + email-allowlist check
│  │  │  ├─ (gated)/              # ALLE admin-pagina's behalve mfa-setup;
│  │  │  │  ├─ layout.js          #   eigen layout met sidebar + MFA-gate
│  │  │  │  ├─ Sidebar.js
│  │  │  │  ├─ page.js            # /admin (overzicht + KPI-kaarten)
│  │  │  │  ├─ activity-feed/
│  │  │  │  ├─ audit-log/         # met VerifyChainKnop
│  │  │  │  ├─ consumenten/
│  │  │  │  ├─ instellingen/      # Buurtklusser-toggle, lead-prijs,
│  │  │  │  │                      # WachtwoordForm (eigen ww wijzigen)
│  │  │  │  ├─ klussen/
│  │  │  │  └─ vakmannen/[id]/bewerken/
│  │  │  └─ mfa-setup/            # buiten (gated) zodat eerste-setup kan
│  │  ├─ management-secure-login/ # geheime admin-login URL
│  │  ├─ inloggen/                # publieke consument/vakman-login
│  │  ├─ registreren/{consument,vakman}/
│  │  ├─ klussen/[id]/
│  │  ├─ wachtwoord-vergeten/
│  │  ├─ wachtwoord-resetten/
│  │  ├─ voltooien/               # snel-login/register na klus-plaatsen
│  │  ├─ beheer/                  # trefwoord-categorisering admin
│  │  └─ api/
│  │     ├─ admin/                # admin-only mutaties (alle via
│  │     │  ├─ consumenten/[id]/   #   logIntervention + audit-log)
│  │     │  ├─ mfa/{setup,verify}/
│  │     │  ├─ vakmannen/[id]/{,wachtwoord/}
│  │     │  ├─ wachtwoord-wijzig/  # admin eigen ww wijzigen
│  │     │  └─ audit-log/verify/
│  │     ├─ management-login/{,2fa/}
│  │     ├─ login/                # consument/vakman, weigert admin
│  │     ├─ logout/
│  │     ├─ klussen/{,[id]/{,keuren/}}
│  │     ├─ profiel/, reviews/, registreren/, etc.
│  │     └─ wachtwoord-{vergeten,resetten}/
│  ├─ components/                 # gedeelde React-componenten:
│  │  ├─ ConfirmInterventionModal.js
│  │  ├─ GlobalShell.js
│  │  ├─ IngelogdSidebar.js
│  │  └─ WachtwoordVeld.js        # input met oog-toggle
│  └─ lib/                        # server-side helpers:
│     ├─ admin-paths.js           # ADMIN_LOGIN_PATH constants + email-check
│     ├─ audit.js                 # SHA-256 hash-chain audit-log
│     ├─ auth.js                  # getCurrentUser
│     ├─ events.js                # emitActivity (ActivityEvent fire-and-forget)
│     ├─ instellingen.js          # platform settings (toggle, lead-prijs)
│     ├─ intervention.js          # logIntervention server-helper
│     ├─ intervention-api.js      # useInterventionConfirm client-hook
│     ├─ lead-prijs.js
│     ├─ mfa.js                   # otplib-wrapper + recovery codes
│     ├─ pdok.js                  # NL postcode/adres lookup
│     ├─ pipedrive.js             # CRM-sync (fire-and-forget)
│     ├─ prisma.js                # PrismaClient + admin-rol-guard extensie
│     ├─ reviews.js
│     └─ session.js               # iron-session config
├─ next.config.mjs
├─ package.json
├─ SNAPSHOT.md                    # huidige sprint-stand (los document)
└─ BLUEPRINT.md                   # ← dit document
```

**Strikte scheiding admin ↔ publiek:** alle admin-code zit onder `src/app/admin/` (UI) en `src/app/api/admin/` (API). Geen import van admin-componenten op publieke pagina's. Bewezen door `(gated)/` route group + `middleware.js` + email-allowlist in beide layouts.

---

## 3. Database Schema

11 Prisma-modellen — exacte SQL wordt door Prisma gegenereerd. Volledige schema in `prisma/schema.prisma`. Hieronder een overzicht met relaties:

```
User ──┬── Klus (1-N, eigenaar)            User-velden (relevant):
       ├── Reactie (1-N, vakman)            id, email (uniek), wachtwoordHash,
       ├── Lead (1-N, vakman-koper)         naam, voornaam, achternaam,
       ├── Review (1-N, consument-schrijver)  rol ("consument"|"vakman"|"admin"),
       ├── WerkgebiedExtra (1-N)            isAdmin, totpSecret, totpEnabled,
       ├── WachtwoordResetToken (1-N)       recoveryCodesHash[],
       └── (geen direct → ActivityEvent     bedrijfsnaam, kvkNummer, ...
            of AuditLog: alleen actorId-FK)

Klus ──┬── Reactie (1-N, cascade)          Klus-velden:
       └── Lead (1-N, cascade)              id, titel, beschrijving, postcode,
                                            plaats, categorie, gesloten,
                                            goedgekeurd, userId (eigenaar)

Lead ──── Review (1-1, cascade, uniek)     Lead-velden:
                                            id, klusId, vakmanId, bedrag (centen),
                                            gekochtOp

Review ── (alleen via Lead → Klus)         Review-velden:
                                            id, leadId (uniek), consumentId,
                                            score (1-5), tekst, fotoUrls[]

ActivityEvent (single source of truth voor alle business-events; append-only)
   id (BigInt), type (dotted), tijdstip, actorId, actorRol, targetType,
   targetId, payload (Json), ipHash

AuditLog (onveranderbaar admin-actie-logboek; SHA-256 hash-chain)
   id (BigInt), tijdstip, adminId, adminNaam, actie, actieCategorie,
   targetType, targetId, payload, reden (≥30 tekens), ipAdres, userAgent,
   goedgekeurdDoor, vorigHash, rijHash

Setting (key-value voor platform-instellingen)
Trefwoord (categorie-detectie keywords)
WerkgebiedExtra (extra werkgebieden voor Pro-vakmannen)
```

Cascade-regels (relevante):
- `Lead.klus`/`Lead.vakman` → onDelete: Cascade
- `Review.lead` → onDelete: Cascade (geen Review zonder Lead)
- `Reactie.klus` → onDelete: Cascade
- `WerkgebiedExtra.user` → onDelete: Cascade
- `WachtwoordResetToken.user` → onDelete: Cascade

Migrations zitten in `prisma/migrations/` — 25 stuks, chronologisch genummerd. De laatste — `20260428154017_super_admin_mfa` — voegt totpSecret + totpEnabled + recoveryCodesHash toe.

---

## 4. GitHub Workflow & Commands

### Op een nieuwe machine vanaf nul:

```bash
# 1. Clone repo
git clone https://github.com/supergroknr1-dev/Werkmaximaal.git test-werkspot-website
cd test-werkspot-website

# 2. Install dependencies
npm install

# 3. Env-vars ophalen vanuit Vercel
npx vercel link               # koppel aan bestaande deployment
npx vercel env pull           # → genereert .env met alle vars

# 4. Prisma client genereren
npx prisma generate

# 5. (Optioneel) migrations toepassen — als DB nieuw is
npx prisma migrate deploy     # past openstaande migrations toe (productie)
# of
npx prisma migrate dev        # development (genereert ook nieuwe migrations)

# 6. Dev-server starten
npm run dev                   # http://localhost:3000

# 7. Productiebuild verifiëren
npm run build                 # prisma generate + next build
```

### Vercel-koppeling

```bash
# Eerste keer:
npx vercel link
# → Kies "Existing Project" → "Werkmaximaal"

# Daarna:
npx vercel               # preview-deploy
npx vercel --prod        # forceer productie-deploy (normaliter via git push)
```

Auto-deploy: elke `git push` naar `main` triggert automatisch een productie-deploy op Vercel. Bij branch-pushes krijg je een preview-URL.

### Belangrijke Windows-quirk

Prisma's `query_engine-windows.dll.node` wordt door de dev-server gelocked. **Stop eerst de dev-server** voor:
- `npx prisma migrate dev`
- `npm run build`
- `npm install` met Prisma updates

---

## 5. Logic & Architecture Summary

### Sovereign Guardian — 4 bouwstenen

| Bouwsteen | Sprint | Bestanden | Wat het doet |
|---|---|---|---|
| **ActivityEvent** | 1.1 | `lib/events.js`, model `ActivityEvent` | Single source of truth voor business-events (klus aangemaakt, lead gekocht, review geplaatst, gebruiker geregistreerd, etc.). Fire-and-forget via Next.js `after()`. |
| **AuditLog (hash-chain)** | 1.1 | `lib/audit.js`, model `AuditLog` | Onveranderbaar logboek van admin-mutaties met SHA-256 hash-chain. Verify-knop op `/admin/audit-log`. |
| **Intervention-flow** | 1.2 | `lib/intervention.js`, `lib/intervention-api.js`, `components/ConfirmInterventionModal.js` | Élke admin-mutatie eist een reden ≥30 tekens + categorie via een modal-bevestiging. Headers `X-Intervention-Reden` + `X-Intervention-Categorie` worden door de server gevalideerd en in de audit-log geschreven. |
| **KPI-kaarten** | 1.2 | `app/admin/(gated)/page.js` | Vandaag-strip met klussen / registraties / leads / reviews — afgeleid uit ActivityEvent via `groupBy({type})`. |

### Admin-isolatie — 5 lagen verdediging

1. **Aparte URL** — `/management-secure-login` (folder + constante in `lib/admin-paths.js`). Oude `/admin-login` geeft hard 404 via middleware.
2. **Edge middleware** (`middleware.js`) — redirect `/admin/*` zonder sessie-cookie naar de geheime URL; 404 op de oude paden.
3. **Email-allowlist** — `ADMIN_EMAIL` env-var (default `s.ozkara09@gmail.com`) wordt in beide admin-layouts gecheckt naast `rol === "admin"` + `isAdmin`. `lib/admin-paths.js` → `isToegestaneAdminEmail()`.
4. **Prisma admin-rol-guard** (`lib/prisma.js` extensie) — DB-laag weigert het automatisch wegnemen van de admin-rol of het creëren van een admin via de API. Mass-updates die admin-accounts zouden raken, falen.
5. **Verplichte MFA** — `User.totpEnabled` moet true zijn voor toegang tot `(gated)/`-pagina's; admins zonder ingestelde MFA worden naar `/admin/mfa-setup` gestuurd. Zelfs met geldige sessie-cookie. TOTP via `otplib` v12; ±2 minuten klok-tolerance; 8 eenmalig-bruikbare recovery codes (bcrypt-hashes in DB).

### Login-flow voor admin

```
[bezoeker]
   │
   ├─ /inloggen + admin-email → 403 + redirect-info naar geheime URL
   │
   └─ /management-secure-login
         │
         ├─ POST /api/management-login (email + ww)
         │     ├─ ww klopt + rol=admin + isToegestaneAdminEmail
         │     └─ totpEnabled=false → session.userId gezet, 200 + mfaSetupNodig
         │     └─ totpEnabled=true  → session.preMfaUserId, 200 + mfaCodeNodig
         │
         ├─ Bij mfaSetupNodig: redirect /admin/mfa-setup
         │     └─ scan QR → POST /api/admin/mfa/verify met 6-cijfer-code
         │           → recovery-codes éénmalig getoond
         │
         └─ Bij mfaCodeNodig: TOTP-input (of recovery-code-toggle)
                  └─ POST /api/management-login/2fa
                        → session.userId gezet, naar /admin
```

### Admin-mutatie-flow (modal-pattern)

```
[admin klikt 'Verwijder' op klus]
   │
   ├─ useInterventionConfirm().open({ titel, beschrijving, ... })
   │     → ConfirmInterventionModal opent
   │     → admin kiest categorie + typt reden ≥30 tk
   │
   ├─ onBevestig: fetch DELETE /api/klussen/[id] met
   │             X-Intervention-Reden + X-Intervention-Categorie headers
   │
   └─ Server (logIntervention):
         ├─ valideert headers (≥30 tk, geldige categorie)
         ├─ schrijft AuditLog-rij (hash-chained)
         └─ vóór de eigenlijke prisma.delete()
```

### Welke admin-routes door de modal gaan

- `DELETE /api/admin/vakmannen/[id]` — vakman verwijderen
- `PATCH  /api/admin/vakmannen/[id]` — vakman bewerken (account/bedrijf/adres/werkgebied)
- `POST   /api/admin/vakmannen/[id]/wachtwoord` — wachtwoord-reset door admin
- `DELETE /api/admin/consumenten/[id]` — consument verwijderen
- `DELETE /api/klussen/[id]` (alleen als admin) — klus verwijderen
- `POST   /api/klussen/[id]/keuren` — klus goed-/afkeuren

Niet via modal: `/api/admin/wachtwoord-wijzig` (admin wijzigt eigen wachtwoord — self-actie, geen mutatie op anderen).

### Toegestane audit-categorieën

Match met `TOEGESTANE_CATEGORIEEN` in `lib/audit.js`:
- `compliance` — KYC, klus-moderatie, account-pause
- `pricing` — Lead-prijs, surge, boost
- `ranking` — Match-algoritme, Trusted-Pro
- `support` — Wachtwoord-reset, bemiddeling, impersonatie
- `data` — PII-inzage, regulatory export
- `settings` — Admin-rollen, alert-routing, retentie

---

## 6. Recovery-checklist (printable)

```
[ ] git clone + cd
[ ] npm install
[ ] vercel link
[ ] vercel env pull
[ ] prisma generate
[ ] (DB nieuw?) prisma migrate deploy + node scripts/promote-suleyman-to-admin.mjs
[ ] npm run dev → http://localhost:3000 werkt
[ ] /management-secure-login + email + ww → 2FA-flow → /admin
[ ] git push test-commit → Vercel deployt automatisch
```

Als stap 7 faalt: check `vercel logs` of er env-vars ontbreken. Meest voorkomende oorzaak: `DATABASE_URL`, `SESSION_SECRET` of `BLOB_READ_WRITE_TOKEN` is leeg.

---

**Wat dit document NIET vervangt:**
- `SNAPSHOT.md` — actuele sprint-stand (wat is af, wat is volgende)
- Pipedrive-CRM credentials (zit in 1Password / je eigen wachtwoordmanager)
- Eventuele Vercel team-permissions (alleen jij kan admin-team-acties doen)

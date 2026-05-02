# Werkmaximaal — Project Snapshot

> Dit bestand bevat de huidige stand zodat je vlot kunt schakelen tussen
> kantoor en thuis. Wordt aan het eind van elke werksessie bijgewerkt
> en meegestuurd in de commit, dus: thuis `git pull` → dit bestand
> openen → direct verder.

**Laatst bijgewerkt:** 2026-05-02 (kantoor — multi-klus ontleding via LLM)
**Laatste commit op main:** Multi-klus ontleding: 1 tekst → N gelinkte klussen via OpenAI Chat
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
- **`/admin/mollie` diagnose-pagina**: pre-flight check vóór live-mode swap. Toont config-status (API key gezet?, mode test/live, APP_URL, webhook-URL), een live API-connectivity-check (lijst recente payments) en een 5-stappen-plan voor de overgang van test naar live (KvK-verificatie, live-key kopiëren, Vercel env-var bijwerken, productie-test, webhook-bevestiging). Sidebar-link "Mollie" toegevoegd.
- **Watermerk op showcase-foto's** (canvas-side, vóór upload): donker semi-transparant pill rechtsonder met "W"-badge en "Werkmaximaal"-tekst. Schaalt op `h * 0.045` (24-48 px). Geen bundle-impact (geen sharp / extra deps), werkt in alle moderne browsers via `ctx.roundRect()`. Toegepast in `resizeNaarBlob` dus geldt voor enkele foto's én Voor/Na-paren.
- **Uniforme topbalk met begroeting + uitlog-icoon** op alle ingelogde pagina's, **inclusief publieke pagina's** (homepage, /klussen, /vakmannen/[id]). Sticky donkere balk (slate-900) toont rechts "Hoi, [Voornaam]" + LogOut-icoon. Mobile: alleen icoon, geen naam (ruimte). Gemount in `GlobalShell` (één plek voor consument/vakman + publieke pagina's) plus `admin/(gated)/layout.js` (admin behoudt eigen redirect). Duplicate uitlog-knoppen uit beide zijbalken weggehaald. Admin gaat na uitloggen naar `/management-secure-login`, vakman/consument naar `/`. `getCurrentUser` selecteert nu ook `voornaam`.
- **Consument-registratie** vraagt nu **voornaam + achternaam** apart (waren één veld "Volledige naam"). Bestaande users zien hun volledige naam gesplitst op de eerste spatie als startwaarde op /profiel — zo blijven die velden niet leeg.
- **`/admin/live-monitor` interactieve kaart** voor admin-only monitoring. Server-side klusdata via Prisma + geocoding via PDOK (`postcodeNaarCoords`, cached 7 dagen). OpenStreetMap-tiles, vrije zoom/pan (geen NL-restricties — admin wilde de wereldkaart behouden). Drie statussen: 🔵 **Nieuw** (open + geen recente chat), 🟠 **Chat actief** (bericht in laatste 7 dagen), 🟢 **Afgehandeld** (gesloten + `bijgewerktOp` ≤ 3 dagen geleden — verdwijnt automatisch daarna). Migratie `klus_bijgewerkt_op` voegt `bijgewerktOp DateTime @updatedAt` toe aan Klus. Auto-refresh elke 60 sec via `AutoRefresh`-client-component die `router.refresh()` aanroept — kaart-state (zoom/pan) blijft bewaard. Kaart via `react-leaflet`, dynamic import met `ssr:false`. Gesplit `LiveKaart` (wrapper) + `LiveKaartInner` (leaflet-code) + `AutoRefresh` (polling). Sidebar krijgt "Live monitor"-link.
- **Mobile-friendly admin-omgeving**: (1) Admin-zijbalk heeft nu een hamburger-menu op mobile (`md:hidden`-knop linksboven binnen IngelogdTopBar's lege linkerkant) — opent een drawer-overlay met dezelfde nav-items + admin-naam-header. (2) Tabellen `vakmannen`, `klussen` en `consumenten` schakelen op mobile naar verticale **kaart-weergave** (één blok per item met info + 40px-min touch-knoppen) — desktop-tabel via `hidden md:block`. (3) Live-monitor markers vergroot van 18px naar **28px** (rond 44px touch-target) zodat ze met de duim te tikken zijn.

Sessie 2026-05-01 (kantoor):
- **Uniforme witte-kaart-stijl headers** op `/mijn-klussen`, `/mijn-leads`, `/profiel` en `/admin`. Bestaande eyebrow + h1 + subtitel zit nu in een witte kaart met `border border-slate-200 rounded-lg shadow-sm overflow-hidden` plus een `h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-slate-900`-strip bovenaan — dezelfde look als de homepage-header. Inhoud van de headers ongewijzigd, alleen wrapper.
- **Z-index-fix mobiel admin-menu** op `/admin/live-monitor`. Leaflet zet zijn panes vast op z-index 200–700 en controls op 1000; admin-Sidebar drawer stond op `z-50`, hamburger op `z-40` — beide vielen onder de kaart op mobiel. Beide opgehoogd naar `z-[1100]` zodat het menu altijd bovenop de kaart ligt.
- **Pro-Link-pilot op homepage** ("Pro-Link Interface" design-concept). Charcoal hero-sectie (slate-900 bg, witte kop "Vind de juiste vakman voor elke klus", oranje "Klus plaatsen"-CTA met `#klus-plaatsen`-anchor) toegevoegd boven de stappenbalk; stap-cirkels en de twee primary form-CTA's ("Volgende", "Plaats klus") van slate-900 → orange-600.
- **Pro-Link sitebreed doorgevoerd** na pilot-akkoord. Globale find-replace via sed: alle `emerald-*` → `orange-*` (130 occurrences over 39 files) en alle primary CTA's `bg-slate-900 hover:bg-slate-800` → `bg-orange-600 hover:bg-orange-700` (17 files). Headers, badges, vinkjes, send-knoppen, link-hovers, focus-ringen — allemaal meebewegend. Status-pills die niet emerald waren (amber/blue/rose/slate) blijven zoals ze waren. Niet aangepast: vakman-badge was emerald → nu oranje, buurtklusser-badge blijft amber → onderscheid is visueel zwakker geworden, mogelijk later buurtklusser naar blauw/paars.
- **Social-proof statkaarten** op homepage (Pro-Link "Duidelijke Tweedeling"-design). Twee kaarten naast elkaar (mobiel gestapeld) tussen hero en stappenbalk: Card 1 = oranje getal Vakmannen (+ Hammer-icoon, white body + subtle shadow); Card 2 = zwart getal Klussen in database (+ ClipboardCheck-icoon, white body + dunne oranje top-border). Live cijfers via nieuw publiek `/api/stats`-endpoint (`prisma.user.count(rol:vakman)` + `prisma.klus.count()` — geen filter, telt álle klussen). Op verzoek géén drempel: kaarten zijn altijd zichtbaar, ook bij 0/0 — bewuste keuze voor maximale eerlijkheid bij launch (geen aspirational/fake getallen).
- **Naam-rebrand teruggedraaid** (kort experiment): eerder waren rol-labels "Vakman" → "Specialist" en "Buurtklusser/Buurtheld" → "Handige Harrie". Specialist-tak teruggedraaid naar "Vakman/Vakmannen" via sed met `\b`-grenzen (geen impact op `vakmanType`/`isVakman`/`VakmannenTabel` identifiers). "Handige Harrie" / "Handige Harries" zijn behouden als rebrand voor de buurt-rol. UI is nu: Vakman + Handige Harrie.
- **Twee-paden-sectie** ("De Vakman" / "Handige Harrie") gebouwd op homepage onder de stat-cards: donker slate-900-blok met Shield-icoon links, wit blok met oranje MapPin-icoon rechts, beide linken naar `/registreren/vakman`. Achter feature-flag `TOON_TWEE_PADEN = false` bovenaan `src/app/page.js` — nu verborgen, klaar om aan te zetten.
- **Smart-input** op homepage (vervangt de oude charcoal hero). Eén witte kaart met donkere header "Wat is uw klus?": textarea voor probleembeschrijving + `<select>` met categorieën. Tijdens typen draait `detectCategorie()` op de zoek-tekst en vult automatisch de dropdown (oranje border + "automatisch herkend"-hint zolang de gebruiker niet zelf gekozen heeft). Handmatige override zet `zoekCategorieAangeraakt`-flag → auto-detect uit voor de sessie. "Volgende"-knop neemt zowel titel als categorie mee naar het stappenbalk-form (en zet daar `categorieAangeraakt` zodat de form-stap-2 niet overschrijft). Vervangt ook de eerdere dual-search met "OF"-divider.
- **Trefwoorden-DB uitgebreid** van 39 → 242 entries. Nieuw script `scripts/seed-trefwoorden.mjs` (idempotent via `@@unique([categorie, woord])`) zet 30+ trefwoorden per actieve categorie (Elektricien, Loodgieter, Schilder, Klusjesman, Tuinman, Timmerman, Stratenmaker). Voeding voor de smart-input: typt iemand "zonnepanelen aansluiten" → automatisch Elektricien. Detect-logica is `lager.includes(woord)` — verbuigingen ("verstopt" vs "verstopping") matchen niet, dat blijft een edge case.
- **Configurator-pilot** voor Schilder op stap 2 van de klus-form. Nieuwe Prisma-migratie `add_klus_specs` voegt `oppervlakte Int? · binnenBuiten String? · aantal Int? · urgentie String?` toe aan `Klus` (al toegepast op de Railway-DB). Toont alleen wanneer `categorie === "schilder"`. UI-blok "Specificeer uw klus" met Sparkles-icoon en 4 velden: Oppervlakte (m²-input + Ruler-icoon), Locatie (3 toggle-buttons Binnen/Buiten/Beide met Home/Sun/Hammer-iconen, oranje als actief), Aantal deuren (counter met +/-) en Urgentie (select Spoed / Deze week / Deze maand / Geen haast). `POST /api/klussen` accepteert + valideert deze velden; reset-flow op stap 1 zet ze terug. Andere categorieën zien (nog) geen configurator.
- **/beheer trefwoorden-paneel uitgebreid** met (1) multi-input — textarea splitst op komma's/newlines, toont preview-tags + aantal, doet één bulk-call; (2) live test-modus bovenaan — typ een klustekst en zie direct welke categorie matcht; (3) categorie-filter; (4) witte-kaart-header in Pro-Link-stijl. `POST /api/trefwoorden` accepteert nu `{categorie, woorden: []}`-array (idempotent: bestaande skipped, response telt toegevoegd vs bestaand). `detectCategorie()`-helper geëxtraheerd uit `src/app/page.js` naar `src/lib/categorie-detect.js` — gebruikt door homepage smart-input én admin test-modus.
- **Prominente categorie-tegel** op stap 2 van het klus-form. Wanneer de categorie ingevuld is (auto via smart-input of handmatig), wordt het kale tekst-input vervangen door een oranje tegel: ronde Check-icoon links, label "GEKOZEN CATEGORIE" in oranje, naam in `text-lg font-semibold`, en een "Wijzigen"-link rechts die het veld weer leegmaakt. Veel duidelijker dan de oude platte input.

Sessie 2026-05-02 (kantoor, beroepen beheerbaar):
- **WISSEN-bevestiging** vóór elke trefwoord-delete op `/beheer`. Klik op `×` opent een modal met "Typ WISSEN om te bevestigen" — knop disabled tot input klopt (case-insensitive). Enter bevestigt, Escape of klik buiten modal annuleert. Aanleiding: voorkomt per ongeluk wissen.
- **Beroepen beheerbaar via UI** — eerder hard-coded array van 8 beroepen op 2 plekken, nu een `Categorie`-tabel in Postgres (migratie `add_categorie_tabel`: `id, naam @unique, volgorde`). Seed-script `scripts/seed-categorieen.mjs` zet de bestaande 8 erin (idempotent via P2002-check). Publiek `GET /api/categorieen` voor de homepage; admin-only `POST` (toevoegen) en `DELETE /api/categorieen/[id]`.
- **Server-side delete-blokkade**: API weigert categorie te wissen als er nog klussen of trefwoorden aan gekoppeld zijn — geeft duidelijke melding terug ("Kan 'Loodgieter' niet verwijderen — er zijn nog 3 klussen en 34 trefwoorden aan gekoppeld."). Klant-side modal toont al een waarschuwing in rood vóór de POST om de actie heel zichtbaar te maken.
- **Nieuw paneel "Beroepen beheren"** bovenaan `/beheer`: input + "Toevoegen"-knop, lijst met oranje pills die de WISSEN-modal hergebruiken (één modal-component werkt voor zowel beroep- als trefwoord-delete via een `kind`-discriminator).
- **Homepage** (`src/app/page.js`) leest nu de beroepen via `/api/categorieen` (met fallback op de oude hard-coded array voor het allereerste paint vóór fetch klaar is). Beide selects (smart-input + form-stap-2 datalist) gebruiken dezelfde live lijst.
- **Sidebar-link "Beroepen"** (Briefcase-icoon) toegevoegd aan admin-sidebar onder "Instellingen". De oude "Snelkoppelingen"-tegel met "Trefwoorden voor categorie-detectie beheren"-link is weg uit `/admin/instellingen`. Note: `/beheer` zit nog steeds buiten de `(gated)`-layout, dus de admin-sidebar valt weg op die pagina — eventueel later verhuizen naar `/admin/(gated)/beroepen`.
- **Alle trefwoorden gewist** op verzoek (241 → 0). Backup eerst gemaakt: `backups/2026-05-02T00-31-50-165Z/`. Smart-input op homepage en Test-modus op /beheer geven nu altijd "geen match" tot er weer trefwoorden worden toegevoegd. Bewuste keuze: vers beginnen i.p.v. de oude lijst.
- **Bulk-add voor beroepen** op /beheer. Single-input vervangen door textarea met komma/newline-split, preview-pills met case-insensitive dedupe, en idempotente bulk-call (POST `/api/categorieen` accepteert nu `{namen: []}`-array naast single `{naam}`). Status-melding "X toegevoegd · Y bestonden al" — zelfde patroon als bij trefwoorden. WISSEN-bevestiging blijft onveranderd op individuele delete.
- **Merken & Materialen-laag** op trefwoorden. Migratie `add_trefwoord_type` voegt `type String @default("zoekterm")` toe (waarden: `"zoekterm"` of `"merk"`). POST `/api/trefwoorden` accepteert nu `type` (default zoekterm). Tweede paneel "Merken & Materialen toevoegen" op /beheer naast bestaande zoektermen-blok — blauwe styling i.p.v. oranje voor visueel onderscheid. De gegroepeerde lijst onder "Bestaande trefwoorden" toont nu 2 sub-secties per beroep: ZOEKTERMEN (grijs) en MERKEN & MATERIALEN (blauw).
- **Match-priority logica** in `detectCategorie()`. Drie passes in volgorde: (1) beroepsnaam in tekst, (2) zoekterm-substring, (3) merk-substring. Eerste hit wint. Nieuwe `detectMetBron()`-helper geeft ook de match-bron terug (`"beroep"|"zoekterm"|"merk"`) zodat de Test-modus op /beheer expliciet toont *waarom* iets matcht ("Match: Elektricien (via merk: 'hager')"). Homepage gebruikt nog steeds de oude `detectCategorie` maar geeft nu ook `categorieen` mee zodat beroepsnaam-match ook daar werkt.
- **Categorie-tabel werd leeggeresend** door `prisma migrate dev` (Prisma vond drift en deed silent reset). Opnieuw geseed via `node scripts/seed-categorieen.mjs` (8 beroepen). Bewust niet onderzocht; gebeurt vrijwel altijd 1× per nieuwe migratie als er manuele data-load is geweest. Backup van vóór de migratie staat nog op `backups/2026-05-02T00-31-50-165Z/`.
- **Multi-klus ontleding** via LLM op `/api/ontleed-klus`. OpenAI gpt-4o-mini + structured output (zod-schema) splitst 1 vrije klusbeschrijving in N losse klussen, elk met passend beroep uit de Categorie-lijst. Voorbeeld: *"voordeur kapot, lekkage in keuken, woonkamer schilderen"* → 3 klussen → Slotenmaker / Loodgieter / Schilder. UI op stap-1 form: knop "Analyseer klus" naast omschrijving — bij klik komt er een lijst van klus-cards met genummerde badge, dropdown (zelf corrigeerbaar), bewerkbare omschrijving en × wis-knop. + Voeg klus toe-knop voor handmatig erbij. Bij submit worden N klussen aangemaakt, allemaal gelinkt aan de eerste via bestaande `Klus.gerelateerdeAanId`. Single-klus modus blijft bestaan voor wie geen analyse triggert. Kosten: ~€0.0001 per ontleding (haiku/4o-mini), bij MVP-volume <€0,01/maand.
- **Cross-sell beroep-relaties** (Werkspot-style "Wist u dat ook X nodig is"). Nieuwe `BeroepRelatie`-tabel (primaire ↔ gerelateerde + uitleg-tekst), 18 relaties geseed via `scripts/seed-beroep-relaties.mjs` (Schilder↔Stukadoor, Loodgieter↔Tegelzetter, Hovenier↔Stratenmaker, etc.). Publiek `GET /api/beroep-relaties?categorie=X` geeft de eerste suggestie + uitleg. Op klus-form-stap-2 verschijnt na keuze van categorie een blauw-oranje "Wist u dat?"-blok met `<Sparkles>`-icoon en opt-in checkbox. Toggle aan → bij submit worden 2 klussen aangemaakt: primair + extra (gelinkt via nieuwe `Klus.gerelateerdeAanId` self-relation, server-side gevalideerd dat parent dezelfde user heeft).
- **Smart-input op klik i.p.v. tijdens typen**. De auto-detect-effecten zijn weggehaald; nu doet de "Volgende"-knop op de homepage smart-input de search eenmalig. Loading-state "Bezig met zoeken..." tijdens API-call. Voorkomt flikkering, halveert API-kosten en geeft de gebruiker controle over wanneer er gezocht wordt.
- **Semantic search** via OpenAI `text-embedding-3-small` (1536 dim) op `/api/zoek-categorie`. Migratie `add_trefwoord_embedding` voegt `embedding Float[]` toe aan Trefwoord. Pre-compute script `scripts/embed-trefwoorden.mjs` heeft alle 2208 trefwoorden ge-embed (eenmalige run, ~$0.0002 totaal). API doet cosine-similarity tegen alle embeddings via in-memory cache (5min TTL voor warm reuse op Fluid Compute). Endpoint accepteert `{tekst}` en geeft `{match, suggesties}` terug met categorie, match-bron en score 0-100. Homepage gebruikt nu een 2-laagse strategie: instant keyword-match + debounced (500ms) semantic-search die de match overschrijft als de cosine-score >= 60. Resultaat: *"mijn dakje druppelt na de regen"* → Dakdekker, *"slaapkamer een nieuwe kleur geven"* → Schilder, alles zonder handmatige synoniemen of stemmer. Kost ~$0,000001 per query — bij MVP-volume <€0,01/maand. **Vereist `OPENAI_API_KEY` env-var op Vercel én lokaal**.
- **168 consumer-trefwoorden** toegevoegd over 20 beroepen (lekkende kraan, muur verven, tegels los, etc.) als aanvulling op de 2040 SEO-queries uit de Excel-import. Plus synoniemen-tabel in `categorie-detect.js` (lekken/lekkende → lekkage, verven/geverfd → schilder, lampje → lamp, zetten/plaatsen ↔ monteren). Beide werken nog steeds als snelle keyword-fallback naast de embeddings.
- **Homepage auto-detect notice** vervangen door een opvallend gradient-blok met Sparkles-icoon, 6px linker accent-rand, ring-halo en onderstreepte CTA. Tekst: "Voor uw klus heeft u een {beroep} nodig. Klopt dit niet? Kies zelf de juiste vakman hierboven." Vervangt de oude kleine grijze tekst-suffix bij het BEROEPEN-label. "BESCHRIJF UW PROBLEEM"-label boven de textarea ook weggehaald (placeholder is genoeg).
- **Woord-overlap match** in `getZoekSuggesties()` als 3e laag naast exact-substring en fuzzy. Tokeniseert input (≥4 chars, geen NL-stopwoorden) en checkt per trefwoord-woord of er overlap is. Specificiteit-weging: 4-char-match = 1 pt (te zwak in eentje), 5-char = 2, 6-char = 3, 7+-char = 5. Score = 60 + 4 × totaalpunten. Effect: "ik wil in mijn huis damwand zetten" → matcht trefwoord "damwand plaatsen" via overlap op 7-char-woord "damwand" (5 pt → 80%) → Funderingsspecialist. Generiek woord "huis" alleen geeft 64% en valt onder drempel — voorkomt valse positives op generieke kortwoorden.
- **Excel-import voor zoektermen** via `scripts/import-excel.mjs` (xlsx als devDep). Leest "Long format"-tab (kolommen Beroep + Zoekterm), groepeert per beroep, maakt ontbrekende beroepen aan en bulk-importeert via createMany skipDuplicates. Eénmalige run: 2040 SEO-queries over 54 beroepen toegevoegd. DB ging van 9 naar 54 beroepen, van 0 naar 2040 zoektermen — homepage smart-input herkent nu praktisch alle Nederlandse vakmancategorieën uit één centrale lijst.
- **Bidirectionele match-logica** in `getZoekSuggesties()`. Nu zowel `input.includes(target)` (oude gedrag — input bevat heel trefwoord) als `target.includes(input)` (nieuw — input is prefix/woord van langere trefwoord, min 3 chars tegen ruis). Hierdoor matcht "uitbouw" → trefwoord "balkon opbouwen boven uitbouw" → Aannemer.
- **Bulk-wis-knop per type** ("Wis alle (N)") rechts naast de "ZOEKTERMEN (N)" en "MERKEN & MATERIALEN (N)" sub-headers in de bestaande-trefwoorden-lijst. Klik opent dezelfde WISSEN-modal met aangepaste tekst ("Alle 144 zoektermen voor Aannemer..."). Nieuwe API `POST /api/trefwoorden/bulk-wis` met `{categorieId, type}` — type filter ("zoekterm" of "merk") laat alleen die soort wegvegen, andere blijven staan. ActivityEvent `trefwoord.zoektermen_bulk_verwijderd` / `trefwoord.merken_bulk_verwijderd` voor audit-trail.
- **Fuzzy zoek + ranked suggesties** in `lib/categorie-detect.js`. Levenshtein-distance + similarity-percentage (0-100%). Nieuwe `getZoekSuggesties(tekst, trefwoorden, categorieen, {drempel, max})` returnt gerangschikte lijst van matches met `{type, treffer, categorie, score, exact}`. Score sortering met type-tiebreak (`beroep > zoekterm > merk`) en dedup op (type, treffer, categorie). `detectMetBron()` gebruikt nu drempel 80% (strenger — voor live UI), `getZoekSuggesties` op /beheer test-modus draait op drempel 65% (permissiever — toont meer alternatieven). Bestaande `detectCategorie()`-API ongewijzigd; intern roept 'ie nu de fuzzy-pipeline aan, dus homepage smart-input krijgt automatisch typo-tolerantie.
- **Test-modus opnieuw vormgegeven** als "Test je zoekopdracht": single-line input, "Live Resultaten"-paneel met (1) beste match in dikke oranje box met match-bron + exact/fuzzy-percentage, (2) lijst "Andere suggesties" met type-badges (paars=beroep, blauw=merk, grijs=zoekterm), naam → categorie en similarity-percentage. Voorbeeld: "Haager schakelaar" → Elektricien via merk "hager" 83%.
- **Bulk-POST performance-fix** voor `/api/trefwoorden` en `/api/categorieen`. Oude code deed N sequentiële `findUnique` + `create` calls — bij 144 trefwoorden = 144 round-trips naar Railway = 10s+ vastlopend op "Bezig...". Vervangen door `prisma.createMany({ skipDuplicates: true })` in één enkele DB-call. Meting: 50 nieuwe trefwoorden = 835ms (was ~10s+); idempotency-pad (50 dubbel + 1 nieuw) = 684ms. Voor categorieen-API doen we één extra query om net-aangemaakte rijen op te halen voor het ActivityEvent-payload, want createMany geeft geen IDs terug.
- **Architectuur-review uitgevoerd** met 3 quick wins ingebouwd (zie hieronder).
- **FK-refactor `Trefwoord`** — string-referentie `categorie` (legacy) vervangen door echte FK `categorieId Int @relation(... onDelete: Restrict, onUpdate: Cascade)`. Twee migraties: (1) `add_trefwoord_fk_nullable` (voegt nullable kolom + index toe), (2) `drop_trefwoord_legacy_string` (handmatig geschreven SQL — drop oude string-unique, set NOT NULL, drop kolom, voeg `[categorieId, woord]`-unique toe). Backfill-script tussendoor: 144 rijen krijgen hun ID toegewezen via naam-lookup, 0 orphans. `Klus.categorie` blijft voorlopig string (legacy data, grotere refactor). PATCH-rename hoeft trefwoorden niet meer mee te updaten — FK doet dat automatisch via id-link. `seed-trefwoorden.mjs` ook aangepast om met `categorieId_woord`-unique te werken.
- **JSON-backup-knop** rechtsboven op /beheer ("↓ Backup"). Triggert download van `/api/categorieen/export` — admin-only endpoint dat een gestructureerde JSON terug geeft met alle beroepen + trefwoorden + metadata (versie, timestamp, aantallen). Bestand-naam: `werkmaximaal-beroepen-YYYY-MM-DD.json`. Vervangt de noodzaak van shell-toegang voor de oude `backup-database.mjs` voor het beroepen-deel.
- **ActivityEvents** voor alle beroep- en trefwoord-mutaties via bestaande `emitActivity()`-helper (uit `lib/events.js`, schrijft async via `after()`). Nieuwe event-types: `beroep.toegevoegd`, `beroep.hernoemd`, `beroep.verwijderd`, `trefwoord.zoektermen_toegevoegd`, `trefwoord.merken_toegevoegd`, `trefwoord.zoekterm_verwijderd`, `trefwoord.merk_verwijderd`. Allemaal met actor (admin-id), targetType=`categorie`, targetId, en payload met de relevante info (naam, woorden-array, vorigeNaam→nieuweNaam). Zichtbaar op `/admin/activity-feed` en `/admin/audit-log`.
- **Beroep hernoemen** via ✎-knop op elke pill in "Beroepen beheren". Modal met pre-filled input + Opslaan-knop. `PATCH /api/categorieen/[id]` met `{naam}` doet de rename in een Prisma-transactie: update Categorie + alle Trefwoord-rijen waar `categorie` matcht (exact) + alle Klus-rijen waar `categorie` matcht (case-insensitive, voor historische data). Validatie: blokkeert duplicaten case-insensitive zodat "loodgieter" niet naast "Loodgieter" kan staan. Master-selector volgt automatisch als de hernoeming op het actieve beroep was.
- **Master-beroep dropdown** op /beheer. Eén dikke oranje "WERKEN AAN BEROEP"-selector tussen "Beroepen beheren" en "Test-modus" stuurt alle onderliggende vakken aan: zoektermen-toevoegen, merken-toevoegen, en bestaande trefwoorden-lijst (filtert tot 1 beroep). Per-form dropdowns weggehaald, h2-titels tonen nu "· {beroep}"-suffix, knop-labels "Toevoegen aan {beroep}". Filter-dropdown ("Alle categorieën") onderaan ook weg — master bestuurt nu alles. Ook helper-tekst onder Zoektermen-titel verduidelijkt dat hele zinsdelen werken (bv. "aanbouw bij hoekwoning"), in reactie op vraag van de eigenaar.

## 🟡 Waar je was gebleven

Headers van de 4 hoofd-ingelogd-pagina's (Mijn klussen, Mijn leads, Profiel, Admin) zijn visueel uniform met de homepage. Volgende cosmetische puntjes (foto-ordering, Turnstile) staan nog open. Mollie-KvK-verificatie blijft het belangrijkste niet-code-werk vóór live-mode.

## 🔴 Volgende stappen — top-3 voor morgen

Beste opties (vraag morgen welke):
1. **KvK-verificatie indienen bij Mollie** (handmatig, 5 min + 1-3 werkdagen wachten) — zie `/admin/mollie` voor het stappenplan. Kan altijd, los van een werksessie.
2. **Foto-ordering met drag** tussen showcase-foto's (volgorde-veld bestaat al in DB). ~45 min.
3. **Cloudflare Turnstile config** (account aanmaken + 2 env-vars). Spam-helper is al klaar; dit is enkel wat insteek-werk.

Alternatieven:
- Privacy/voorwaarden door **echte jurist** laten reviewen vóór live live-mode.
- Inactieve-account-cleanup cron (genoemd in privacyverklaring; niet gebouwd).

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

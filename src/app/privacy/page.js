import Link from "next/link";

export const metadata = {
  title: "Privacyverklaring — Werkmaximaal",
};

const LAATST_BIJGEWERKT = "28 april 2026";
const CONTACT_EMAIL = "privacy@werkmaximaal.nl"; // Pas aan naar je echte mailadres

/**
 * Privacyverklaring — concept-tekst.
 *
 * BELANGRIJK: Dit is een eerste opzet die de werkelijke datapraktijk
 * van de site beschrijft, maar laat 'm vóór live altijd door een
 * privacy-jurist toetsen. AVG-overtredingen zijn duur (boetes tot 4%
 * van de omzet of €20M).
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <article className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-10 prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base">
          <p className="text-xs text-slate-500 mb-2 font-medium">
            Laatst bijgewerkt: {LAATST_BIJGEWERKT}
          </p>
          <h1>Privacyverklaring</h1>
          <p className="text-sm text-slate-500 mt-0">
            Werkmaximaal verbindt consumenten met vakmannen voor klussen.
            Hieronder leggen we uit welke gegevens we verwerken, waarom,
            en welke rechten je hebt.
          </p>

          <div className="not-prose bg-amber-50 border border-amber-200 rounded p-3 my-6 text-xs text-amber-900">
            <strong>Concept-tekst.</strong> Deze verklaring beschrijft de
            werkelijke datapraktijk van het platform, maar is niet
            juridisch getoetst. Laat 'm controleren door een privacy-
            jurist voordat je live gaat.
          </div>

          <h2>1. Welke gegevens verwerken we?</h2>
          <h3>Bij elke bezoeker</h3>
          <ul>
            <li>
              <strong>Sessie-cookie</strong> (versleuteld) — om je login te
              onthouden. Strikt-noodzakelijk; vereist geen toestemming.
            </li>
            <li>
              <strong>IP-adres</strong> — alleen in de vorm van een
              SHA-256-hash, opgeslagen in onze activity-log voor
              fraude-detectie en audit-doeleinden.
            </li>
          </ul>
          <h3>Bij registratie als consument</h3>
          <ul>
            <li>E-mailadres, naam, voor- en achternaam</li>
            <li>Wachtwoord (versleuteld via bcrypt)</li>
            <li>Adres (postcode, huisnummer, straatnaam, plaats)</li>
            <li>Telefoonnummer (optioneel)</li>
          </ul>
          <h3>Bij registratie als vakman</h3>
          <ul>
            <li>Bovenstaande, plus:</li>
            <li>Bedrijfsnaam, KvK-nummer (Pro)</li>
            <li>KvK-uittreksel (PDF/JPG/PNG)</li>
            <li>Werk-telefoon, privé-telefoon (alleen admin ziet privé)</li>
            <li>Werkgebied (postcode of plaats) en werkafstand</li>
            <li>Profielfoto, bio, showcase-foto's (vrijwillig)</li>
          </ul>
          <h3>Bij gebruik van het platform</h3>
          <ul>
            <li>Klussen die je plaatst (titel, beschrijving, locatie)</li>
            <li>Reacties en aangekochte leads</li>
            <li>Reviews die je schrijft of ontvangt (incl. foto's)</li>
            <li>Betaaltransacties (afgehandeld door Mollie — wij slaan zelf
              géén creditcard- of bankgegevens op)</li>
          </ul>

          <h2>2. Waarom verwerken we deze gegevens?</h2>
          <ul>
            <li>
              <strong>Uitvoering van de overeenkomst</strong> — om
              consumenten en vakmannen aan elkaar te koppelen en
              betalingen af te handelen. (Wettelijke grondslag: art. 6
              lid 1 sub b AVG.)
            </li>
            <li>
              <strong>Wettelijke verplichting</strong> — fiscale bewaarplicht
              voor transacties (7 jaar). (Sub c.)
            </li>
            <li>
              <strong>Gerechtvaardigd belang</strong> — fraude-detectie,
              moderatie van klussen en reviews, anonieme analytics over
              platformgebruik. (Sub f.)
            </li>
            <li>
              <strong>Toestemming</strong> — alleen voor optionele zaken
              zoals e-mailmarketing (nu niet actief). (Sub a.)
            </li>
          </ul>

          <h2>3. Met wie delen we gegevens?</h2>
          <ul>
            <li>
              <strong>Mollie B.V.</strong> — voor iDEAL-betalingen.
              Verwerkersovereenkomst (verwerker).
            </li>
            <li>
              <strong>Vercel Inc. (VS)</strong> — hosting + bestandsopslag
              (Vercel Blob). Ondersteunt EU-data-residency; passende
              waarborgen via Standard Contractual Clauses.
            </li>
            <li>
              <strong>Railway</strong> — onze Postgres-database
              (data-residency afhankelijk van regio-keuze).
            </li>
            <li>
              <strong>Resend</strong> — voor het versturen van transactionele
              e-mails (lead-notificaties).
            </li>
            <li>
              <strong>Pipedrive</strong> — voor CRM-functionaliteit; wij
              sturen vakman-aanmeldingen door om opvolging te beheren.
            </li>
            <li>
              <strong>PDOK</strong> — Nederlandse overheid; we gebruiken
              hun open API om postcode → adres op te zoeken. Geen
              persoonsgegevens worden naar PDOK gestuurd.
            </li>
            <li>
              <strong>Vakmannen die een lead kopen</strong> — krijgen jouw
              naam, telefoonnummer en exacte adres voor de specifieke klus.
              Bij andere vakmannen blijft alleen je plaats zichtbaar.
            </li>
          </ul>
          <p>
            Wij verkopen geen persoonsgegevens en gebruiken ze niet voor
            advertentieprofielen.
          </p>

          <h2>4. Hoe lang bewaren we?</h2>
          <ul>
            <li>Account-gegevens: zolang je account actief is + 30 dagen na verwijdering</li>
            <li>Klussen + leads + reviews: 7 jaar (fiscale bewaarplicht)</li>
            <li>Audit-log + activity-events: 5 jaar</li>
            <li>Inactieve accounts (12 maanden niet ingelogd): we sturen een
              herinnering, en verwijderen na 18 maanden inactiviteit</li>
          </ul>

          <h2>5. Jouw rechten</h2>
          <p>Op basis van de AVG heb je recht op:</p>
          <ul>
            <li>
              <strong>Inzage</strong> — vraag ons welke gegevens we van je
              hebben.
            </li>
            <li>
              <strong>Rectificatie</strong> — laat fouten herstellen
              (meeste velden direct via je profiel).
            </li>
            <li>
              <strong>Verwijdering</strong> — verzoek om je data te wissen
              (m.u.v. gegevens die we wettelijk moeten bewaren).
            </li>
            <li>
              <strong>Beperking</strong> — vraag om verwerking tijdelijk
              te stoppen.
            </li>
            <li>
              <strong>Dataportabiliteit</strong> — ontvang je data in een
              gangbaar formaat (JSON-export op aanvraag).
            </li>
            <li>
              <strong>Bezwaar</strong> — tegen verwerking op basis van
              gerechtvaardigd belang.
            </li>
            <li>
              <strong>Klacht</strong> — indienen bij de Autoriteit
              Persoonsgegevens (AP) via{" "}
              <a href="https://autoriteitpersoonsgegevens.nl">
                autoriteitpersoonsgegevens.nl
              </a>
              .
            </li>
          </ul>
          <p>
            Een verzoek doen? Stuur een e-mail naar{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Wij
            reageren binnen 4 weken.
          </p>

          <h2>6. Beveiliging</h2>
          <ul>
            <li>Wachtwoorden opgeslagen als bcrypt-hash (nooit plain)</li>
            <li>Sessies via httpOnly + SameSite-cookies, encrypted door iron-session</li>
            <li>Admin-account vereist 2FA (TOTP) optioneel + dedicated geheime login-URL</li>
            <li>Alle admin-acties op gebruikersdata staan in een hash-getekend audit-log</li>
            <li>Data in transit: TLS 1.2+ (Vercel)</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            Wij plaatsen alleen één strikt-noodzakelijke cookie
            (<code>werkmaximaal_session</code>) om je login te onthouden.
            Geen tracking, geen advertenties, geen externe analytics-cookies.
          </p>

          <h2>8. Wijzigingen</h2>
          <p>
            Bij belangrijke wijzigingen melden we dat per e-mail aan
            geregistreerde gebruikers en passen we de datum bovenaan deze
            pagina aan.
          </p>

          <h2>9. Verwerkingsverantwoordelijke</h2>
          <p>
            Werkmaximaal — [bedrijfsnaam invullen]
            <br />
            [Adres invullen]
            <br />
            KvK: [nummer invullen]
            <br />
            E-mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </article>
      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Algemene voorwaarden — Werkmaximaal",
};

const LAATST_BIJGEWERKT = "28 april 2026";
const CONTACT_EMAIL = "support@werkmaximaal.nl";

/**
 * Algemene voorwaarden — concept-tekst.
 *
 * BELANGRIJK: Laat 'm vóór je live gaat door een advocaat (consumenten-
 * recht + platformverplichtingen) toetsen. Specifiek riskant voor een
 * lead-marketplace zijn:
 * - Bedenktijd voor consumenten (Wet kopen op afstand)
 * - Garantie- + aansprakelijkheidsregels
 * - DSA-verplichtingen voor digitale tussenpersonen
 */
export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6 transition-colors"
        >
          ← Terug naar overzicht
        </Link>

        <article className="bg-white border border-slate-200 rounded-md shadow-sm p-6 md:p-10 prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg">
          <p className="text-xs text-slate-500 mb-2 font-medium">
            Laatst bijgewerkt: {LAATST_BIJGEWERKT}
          </p>
          <h1>Algemene voorwaarden</h1>

          <div className="not-prose bg-amber-50 border border-amber-200 rounded p-3 my-6 text-xs text-amber-900">
            <strong>Concept-tekst.</strong> Laat 'm controleren door een
            advocaat voordat je live gaat. Voor een lead-marketplace zijn
            consumentenrecht (bedenktijd, garanties) en
            DSA-tussenpersoon-verplichtingen extra belangrijk.
          </div>

          <h2>1. Wie zijn wij?</h2>
          <p>
            Werkmaximaal (hierna "het platform") is een online marktplaats
            die consumenten met klusvragen verbindt aan vakmannen die
            klussen kunnen uitvoeren. Wij zijn niet zelf de uitvoerder
            van de klus — die overeenkomst sluit je rechtstreeks met de
            vakman.
          </p>

          <h2>2. Wanneer gelden deze voorwaarden?</h2>
          <p>
            Bij elk gebruik van het platform: het bezoeken van pagina's,
            het plaatsen van een klus, het reageren op een klus, het
            aankopen van een lead, en het schrijven of ontvangen van een
            review.
          </p>

          <h2>3. Account aanmaken</h2>
          <ul>
            <li>Je geeft correcte en actuele gegevens op.</li>
            <li>
              Je beheert je wachtwoord zelf en houdt 't geheim. Bij
              vermoeden van misbruik wijzig je 'm direct.
            </li>
            <li>
              Eén account per persoon of bedrijf. Dubbele accounts kunnen
              we verwijderen.
            </li>
            <li>
              Voor vakman-Pro accounts geldt: je verifieert je KvK door
              een uittreksel te uploaden. Misleiding leidt tot directe
              schorsing.
            </li>
          </ul>

          <h2>4. Klussen plaatsen (consument)</h2>
          <ul>
            <li>
              Klussen worden gemodereerd door onze administratie vóór ze
              zichtbaar worden voor vakmannen.
            </li>
            <li>
              Het is verboden klussen te plaatsen die illegaal, misleidend
              of gewelddadig zijn.
            </li>
            <li>
              Je adres en telefoonnummer worden uitsluitend gedeeld met
              vakmannen die voor jouw klus een lead hebben aangeschaft.
            </li>
            <li>
              Klussen plaatsen is gratis. Aan het platform betaal je
              niets. De prijs voor het uitvoeren van de klus spreek je
              direct met de vakman af.
            </li>
          </ul>

          <h2>5. Leads kopen (vakman)</h2>
          <ul>
            <li>
              Per klus kan een vakman één lead kopen. De prijs (€10 voor
              Pro, €20 voor Handige Harrie, of zoals door admin ingesteld)
              is vooraf zichtbaar.
            </li>
            <li>
              Betaling verloopt via iDEAL (Mollie). Direct na bevestiging
              ontvang je de contactgegevens van de consument.
            </li>
            <li>
              <strong>Geen restitutie.</strong> Een lead is een
              informatie-product dat direct geleverd wordt. Hierdoor geldt
              <em> géén</em> wettelijke bedenktijd op grond van art. 6:230p
              BW.
            </li>
            <li>
              Heb je vermoeden dat een klus nep is of de consument niet
              reageert? Meld 't binnen 7 dagen aan{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              Onderzoek door admin → bij gegrond vermoeden refunden we de
              lead-prijs.
            </li>
          </ul>

          <h2>6. Reviews</h2>
          <ul>
            <li>
              Een consument kan een vakman beoordelen 10 dagen na
              lead-aankoop, met sterren (1–5), tekst en max 5 foto's.
            </li>
            <li>
              Reviews moeten waarheidsgetrouw zijn. Smaad, valse claims of
              offensief taalgebruik wordt verwijderd.
            </li>
            <li>
              Een vakman mag niet reviews uitkopen of uitwisselen tegen
              kortingen.
            </li>
          </ul>

          <h2>7. Aansprakelijkheid</h2>
          <ul>
            <li>
              Het platform brengt partijen samen, maar is niet zelf partij
              bij de klus-overeenkomst. Geschillen tussen consument en
              vakman lossen partijen onderling op.
            </li>
            <li>
              Wij zijn niet aansprakelijk voor schade door onbeschikbaarheid
              van het platform, fouten in klus-info, of de uitvoering van
              de klus zelf.
            </li>
            <li>
              Wel besteden we redelijke zorg aan moderatie + verificatie
              (KvK-check, MFA voor admins, audit-log).
            </li>
          </ul>

          <h2>8. Beëindiging</h2>
          <ul>
            <li>
              Je kunt je account altijd zelf verwijderen via je profiel.
            </li>
            <li>
              Wij kunnen accounts schorsen of verwijderen bij overtreding
              van deze voorwaarden, fraude, of bij klachten van andere
              gebruikers. Audit-log staat altijd op tafel.
            </li>
          </ul>

          <h2>9. Wijzigingen</h2>
          <p>
            Wij kunnen deze voorwaarden wijzigen. Bij ingrijpende wijzigingen
            informeren we geregistreerde gebruikers per e-mail.
          </p>

          <h2>10. Toepasselijk recht</h2>
          <p>
            Op deze voorwaarden is Nederlands recht van toepassing.
            Geschillen worden voorgelegd aan de bevoegde rechter in het
            arrondissement waar Werkmaximaal is gevestigd.
          </p>

          <h2>11. Contact</h2>
          <p>
            Vragen? Stuur een e-mail naar{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Voor
            privacy-zaken: zie de{" "}
            <Link href="/privacy">privacyverklaring</Link>.
          </p>
        </article>
      </div>
    </div>
  );
}

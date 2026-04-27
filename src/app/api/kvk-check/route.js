// Mock KvK-database — een paar gefingeerde records om de match-check te demonstreren.
// In productie wordt dit vervangen door een echte API-call naar kvk.nl.
const KVK_MOCK = {
  "12345678": "Test Klusbedrijf B.V.",
  "87654321": "Schilderwerken Jansen B.V.",
  "11122233": "Loodgieters Pieters",
  "10000001": "Tuinman Groen V.O.F.",
  "10000002": "Elektricien Plus B.V.",
  "33333333": "Buitenglas Webdiensten B.V.",
  "44444444": "Klussenbureau Amsterdam",
  "55555555": "Werkspot N.V.",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kvkNummer = (searchParams.get("kvk") ?? "").trim();

  if (!/^\d{8}$/.test(kvkNummer)) {
    return Response.json({ error: "KvK-nummer moet 8 cijfers zijn." }, { status: 400 });
  }

  const officieleNaam = KVK_MOCK[kvkNummer];
  if (!officieleNaam) {
    return Response.json({ found: false });
  }

  return Response.json({ found: true, bedrijfsnaam: officieleNaam });
}

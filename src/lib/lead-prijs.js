import { getInstellingen } from "./instellingen";

export const STANDAARD_PRO_BEDRAG_CENTEN = 1000;

// Hobbyist betaalt altijd het dubbele van de basis-prijs.
export function hobbyistVan(basisCenten) {
  return basisCenten * 2;
}

// Async: leest de actuele basis-prijs uit Setting (key: leadPrijsCenten).
// Hobbyist krijgt 2x. Fallback op standaardwaarde als de instelling
// niet bestaat of ongeldig is.
export async function getLeadPrijs() {
  const instellingen = await getInstellingen();
  const raw = instellingen.leadPrijsCenten;
  const parsed = typeof raw === "number" ? raw : parseInt(raw, 10);
  const basis = Number.isFinite(parsed) && parsed > 0 ? parsed : STANDAARD_PRO_BEDRAG_CENTEN;
  return { pro: basis, hobbyist: hobbyistVan(basis) };
}

export async function bedragVoorVakman(vakmanType) {
  const { pro, hobbyist } = await getLeadPrijs();
  return vakmanType === "hobbyist" ? hobbyist : pro;
}

export function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

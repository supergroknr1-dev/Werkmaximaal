// Lead-prijzen per vakman-type. Hobbyisten betalen het dubbele
// omdat ze geen bedrijfsverzekering en KvK-vereisten hebben.
export const PRO_BEDRAG_CENTEN = 1000;
export const HOBBYIST_BEDRAG_CENTEN = 2000;

export function bedragVoorVakman(vakmanType) {
  return vakmanType === "hobbyist" ? HOBBYIST_BEDRAG_CENTEN : PRO_BEDRAG_CENTEN;
}

export function formatBedrag(centen) {
  return `€ ${(centen / 100).toFixed(2).replace(".", ",")}`;
}

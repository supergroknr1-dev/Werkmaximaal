import { prisma } from "./prisma";

const DEFAULTS = {
  hobbyistInschakeld: true,
  leadPrijsCenten: 1000,
  // Stat-kaarten op homepage. Default = live tellen uit DB.
  // Bij `statsHandmatig=true` toont homepage de ingestelde waarden i.p.v.
  // de echte counts — handig in early stage om de site niet kaal te
  // laten lijken (of demonstratie-doeleinden).
  statsHandmatig: false,
  statsVakmannenWaarde: 0,
  statsKlussenWaarde: 0,
};

function parseValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}

export async function getInstellingen() {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, parseValue(r.value)]));
  return { ...DEFAULTS, ...map };
}

export async function setInstelling(key, value) {
  const stringWaarde =
    typeof value === "boolean" ? String(value) : String(value);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: stringWaarde },
    update: { value: stringWaarde },
  });
}

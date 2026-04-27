// Pipedrive integratie. Alle env-vars zijn optioneel: als
// PIPEDRIVE_API_TOKEN ontbreekt doet syncVakmanNaarPipedrive niets,
// zodat de registratie-flow blijft werken op machines/omgevingen
// zonder Pipedrive-koppeling.

const API = "https://api.pipedrive.com/v1";

function isGeconfigureerd() {
  return !!process.env.PIPEDRIVE_API_TOKEN;
}

async function pdFetch(path, body) {
  const url = `${API}${path}?api_token=${process.env.PIPEDRIVE_API_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(
      `Pipedrive ${path} ${res.status}: ${data.error || "onbekende fout"}`
    );
  }
  return data;
}

export async function syncVakmanNaarPipedrive(vakman) {
  if (!isGeconfigureerd()) {
    console.info("[pipedrive] niet geconfigureerd, sync overgeslagen");
    return;
  }

  const isPro = vakman.vakmanType === "professional";
  const pipelineId = isPro
    ? process.env.PIPEDRIVE_PIPELINE_PRO
    : process.env.PIPEDRIVE_PIPELINE_HOBBYIST;
  const stageId = isPro
    ? process.env.PIPEDRIVE_STAGE_AANGEMELD_PRO
    : process.env.PIPEDRIVE_STAGE_AANGEMELD_HOBBY;

  // Custom-field-keys (afkomstig uit Pipedrive zelf, bv. "abc123def...")
  const customFieldsPerson = {};
  if (process.env.PIPEDRIVE_CF_VAKMAN_TYPE) {
    // Vakman type is een enum-veld; Pipedrive verwacht de option-id
    // (een geheel getal), niet de label-string.
    const optieId = isPro
      ? process.env.PIPEDRIVE_CF_VAKMAN_TYPE_OPTION_PRO
      : process.env.PIPEDRIVE_CF_VAKMAN_TYPE_OPTION_HOBBY;
    if (optieId) {
      customFieldsPerson[process.env.PIPEDRIVE_CF_VAKMAN_TYPE] = parseInt(
        optieId,
        10
      );
    }
  }
  if (process.env.PIPEDRIVE_CF_POSTCODE && vakman.regioPostcode) {
    customFieldsPerson[process.env.PIPEDRIVE_CF_POSTCODE] = vakman.regioPostcode;
  }
  if (process.env.PIPEDRIVE_CF_KVK && vakman.kvkNummer) {
    customFieldsPerson[process.env.PIPEDRIVE_CF_KVK] = vakman.kvkNummer;
  }
  if (process.env.PIPEDRIVE_CF_WERKAFSTAND && vakman.werkafstand) {
    customFieldsPerson[process.env.PIPEDRIVE_CF_WERKAFSTAND] = vakman.werkafstand;
  }
  if (process.env.PIPEDRIVE_CF_BEDRIJFSNAAM && vakman.bedrijfsnaam) {
    customFieldsPerson[process.env.PIPEDRIVE_CF_BEDRIJFSNAAM] = vakman.bedrijfsnaam;
  }

  // 1. Persoon aanmaken
  const personRes = await pdFetch("/persons", {
    name: vakman.naam,
    email: [{ value: vakman.email, primary: true }],
    phone: vakman.telefoon
      ? [{ value: vakman.telefoon, primary: true }]
      : undefined,
    label: isPro ? "Pro" : "Hobbyist",
    ...customFieldsPerson,
  });
  const personId = personRes.data?.id;
  if (!personId) {
    throw new Error("Pipedrive gaf geen person-id terug");
  }

  // 2. Deal aanmaken
  await pdFetch("/deals", {
    title: `Aanmelding ${vakman.naam}${
      vakman.bedrijfsnaam ? ` — ${vakman.bedrijfsnaam}` : ""
    }`,
    person_id: personId,
    pipeline_id: pipelineId ? parseInt(pipelineId) : undefined,
    stage_id: stageId ? parseInt(stageId) : undefined,
    // Hobbyist betaalt €25 inschrijfgeld; Pro betaalt later per lead.
    // Pipedrive verwacht het bedrag in euro's (niet centen).
    value: isPro ? 0 : 25,
    currency: "EUR",
  });
}

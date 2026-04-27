// Haal alle pipeline-IDs, stage-IDs en custom-field-keys uit jouw
// Pipedrive-account zodat je weet wat je in .env moet zetten.
//
// Gebruik:
//   1. Vul PIPEDRIVE_API_TOKEN in je .env (Settings → Personal preferences → API in Pipedrive)
//   2. cd D:\test-werkspot-website
//   3. node --env-file=.env scripts/pipedrive-list-ids.mjs

const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
if (!TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN ontbreekt in .env");
  process.exit(1);
}

const API = "https://api.pipedrive.com/v1";

async function get(path) {
  const res = await fetch(`${API}${path}?api_token=${TOKEN}&limit=200`);
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

function rij(id, label) {
  return `  ${String(id).padEnd(8)} ${label}`;
}

async function main() {
  const [pipelines, stages, personFields] = await Promise.all([
    get("/pipelines"),
    get("/stages"),
    get("/personFields"),
  ]);

  console.log("\n=== Pipelines ===");
  pipelines.forEach((p) => console.log(rij(p.id, p.name)));

  console.log("\n=== Stages (per pipeline) ===");
  pipelines.forEach((p) => {
    console.log(`\n  Pipeline: ${p.name} (id ${p.id})`);
    stages
      .filter((s) => s.pipeline_id === p.id)
      .sort((a, b) => a.order_nr - b.order_nr)
      .forEach((s) => console.log(rij(s.id, s.name)));
  });

  console.log("\n=== Person custom fields (key → naam) ===");
  personFields
    .filter((f) => f.edit_flag) // verberg ingebouwde velden zoals 'name'
    .forEach((f) => {
      const opties =
        f.options && f.options.length
          ? ` [${f.options.map((o) => `${o.id}:${o.label}`).join(", ")}]`
          : "";
      console.log(`  ${f.key}  ${f.name}  (${f.field_type})${opties}`);
    });

  console.log("\n=== Suggestie voor .env / Vercel env-vars ===\n");
  const proPipeline = pipelines.find((p) =>
    /pro|professional/i.test(p.name)
  );
  const hobbyPipeline = pipelines.find((p) => /hobby|harry/i.test(p.name));
  const stageFor = (pipelineId) => {
    if (!pipelineId) return undefined;
    const eerste = stages
      .filter((s) => s.pipeline_id === pipelineId)
      .sort((a, b) => a.order_nr - b.order_nr)[0];
    return eerste?.id;
  };
  const suggesties = [
    ["PIPEDRIVE_API_TOKEN", "<jouw token>"],
    ["PIPEDRIVE_PIPELINE_PRO", proPipeline?.id ?? "?"],
    ["PIPEDRIVE_PIPELINE_HOBBYIST", hobbyPipeline?.id ?? "?"],
    ["PIPEDRIVE_STAGE_AANGEMELD_PRO", stageFor(proPipeline?.id) ?? "?"],
    ["PIPEDRIVE_STAGE_AANGEMELD_HOBBY", stageFor(hobbyPipeline?.id) ?? "?"],
    [
      "PIPEDRIVE_CF_VAKMAN_TYPE",
      personFields.find((f) => /vakman.?type/i.test(f.name))?.key ?? "?",
    ],
    [
      "PIPEDRIVE_CF_POSTCODE",
      personFields.find((f) => /postcode|werkgebied/i.test(f.name))?.key ?? "?",
    ],
    [
      "PIPEDRIVE_CF_KVK",
      personFields.find((f) => /kvk/i.test(f.name))?.key ?? "?",
    ],
    [
      "PIPEDRIVE_CF_WERKAFSTAND",
      personFields.find((f) => /werkafstand|afstand/i.test(f.name))?.key ?? "?",
    ],
    [
      "PIPEDRIVE_CF_BEDRIJFSNAAM",
      personFields.find((f) => /bedrijf/i.test(f.name))?.key ?? "?",
    ],
  ];
  suggesties.forEach(([k, v]) => console.log(`${k}=${v}`));
  console.log(
    "\nVraagtekens betekenen: niet automatisch herkend — kopieer handmatig de juiste id/key uit de lijsten hierboven.\n"
  );
}

main().catch((e) => {
  console.error("Fout:", e.message);
  process.exit(1);
});

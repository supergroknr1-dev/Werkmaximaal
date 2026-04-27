# Opening prompt voor de andere laptop

Wanneer je thuis (of op kantoor) een **nieuwe Claude Code sessie** opent
in deze project-map, plak deze tekst als eerste bericht:

---

```
Ik werk weer aan Werkmaximaal. Lees eerst deze twee bestanden:

1. SNAPSHOT.md (in de project-root) — voor de actuele stand:
   wat werkt, waar ik gebleven was, en de top-3 next-up opties.
2. ~/.claude/projects/C--Users-Buitenglas-nl-Calculator/memory/MEMORY.md
   — voor mijn werkstijl en projectkennis.

Geef daarna een korte samenvatting (max 5 regels) van:
- de laatste commit op main
- waar we waren gebleven
- de top-3 mogelijkheden voor vandaag

Vraag me dan welke kant we op gaan.

Belangrijke randvoorwaarden:
- Spreek Nederlands.
- Vraag toestemming voordat je risicovolle commando's draait
  (migraties, git push, deletes, env-wijzigingen).
- Bouw één feature per keer — geen voorzichtige bulk-veranderingen.
- Voor schemawijzigingen: stop eerst de dev-server, dan migrate,
  daarna restart.
```

---

## Eerste keer op een NIEUWE laptop?

Doe dit één keer voordat je de prompt hierboven plakt:

```
1. git clone https://github.com/supergroknr1-dev/Werkmaximaal.git
2. cd Werkmaximaal
3. npm install -g vercel
4. vercel link        (kies project Werkmaximaal)
5. vercel env pull    (downloadt alle env-vars naar .env)
6. npm install        (dependencies)
```

Daarna kun je de opening-prompt hierboven gebruiken.

## Eind-van-de-dag workflow

```
1. git status                    → wat heb ik nog open?
2. git add . && git commit       → alles vastleggen
3. git push origin main          → naar GitHub
4. (Claude werkt SNAPSHOT.md bij) → stand vastleggen
5. git push                      → snapshot meenemen
```

Tip: zeg aan het eind van de sessie tegen Claude **"snapshot bijwerken
en pushen"** — dan onderhoud ik SNAPSHOT.md automatisch met de actuele
stand voordat je afsluit.

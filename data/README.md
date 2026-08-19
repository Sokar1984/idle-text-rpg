# Data

| File | Purpose |
|------|--------|
| `config.json` | Tick rate, XP curve (~24h to level 10) |
| `classes.json` | Classes, starting stats (includes charisma), growth |
| `races.json` | Races, stat bonuses, advantages/disadvantages, gendered name lists |
| `locations.json` | Places |
| `monsters.json` | Encounters |
| `events.json` | What can happen |

## Character creation inputs

- **Race** — human, orc, high-elf, dark-elf, demon, dwarf
- **Gender** — male / female (drives name list + avatar)
- **Avatar style** — neutral / beautiful / ugly
- **Name** — auto-suggested from race+gender list, editable, rerollable
- **Class** — warrior, ranger, mage, rogue

Final stats = class starting stats + race bonuses (floored at 1).

Portrait files live in `/avatars` as `{race}-{gender}-{style}.webp`.

# Data

This folder contains the actual game content and configuration.

## Files

| File | Purpose |
|------|--------|
| `config.json` | Core timing, XP curve, and balance settings (tuned for ~24h to level 10) |
| `classes.json` | Playable classes, starting stats, and growth rates |
| `locations.json` | Location templates (levels 1–10) |
| `monsters.json` | Monster / encounter templates (levels 1–10) |
| `events.json` | Event templates (levels 1–10) |

All content templates follow the schemas defined in `/schemas`.

AIs generating new content should add it here while respecting the existing structure and level ranges.

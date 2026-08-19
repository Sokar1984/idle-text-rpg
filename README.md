# Idle Text RPG

A text-based idle RPG. You create a character. The character lives on its own. You check in, read the log, spend skill points, and leave again.

Play it here: **https://sokar1984.github.io/**

Or open `index.html` locally. Progress is stored in `localStorage`.

## Playable loop

1. Create a character (name + class).
2. The first stretch of road is generated immediately.
3. Time continues in real time (~1 beat per minute) even while you are away.
4. Returning catches up offline progress (capped at 24 hours).
5. **Walk on** advances a few beats now. Skill points and pack loot wait for you.

## Content

World content is JSON templates, not hard-coded story:

| File | Purpose |
|------|--------|
| `data/config.json` | Tick rate, XP curve (~24h to level 10) |
| `data/classes.json` | Classes and starting stats |
| `data/locations.json` | Places |
| `data/monsters.json` | Encounters |
| `data/events.json` | What can happen |
| `schemas/` | Shape of those templates |

Add more world by dropping templates that match the schemas.

## Engine

| File | Role |
|------|------|
| `js/character.js` | Create / save / XP / skills |
| `js/engine.js` | Idle ticks, combat, events, travel, offline catch-up |
| `js/ui.js` | Creation screen and journal |
| `js/main.js` | Boot, live ticker, reset |

## For AIs

1. `CONCEPT.md` — vision
2. `AI_INSTRUCTIONS.md` — how to work here
3. `schemas/` — data contracts
4. Then `data/` and `js/`

Keep content in JSON. Keep the caretaker loop: auto-progress → log → player adjustment → continue.

## Repository

https://github.com/Sokar1984/idle-text-rpg

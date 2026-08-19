# AI Instructions – Idle Text RPG

This document is written specifically for AIs that will work on this repository.

## Project Intent

This is a proof-of-concept text-based idle RPG. The player creates a character that auto-progresses through a generated world. The player checks in occasionally to read the log, adjust equipment, and assign skill points.

The world content (locations, monsters, events) is template-driven so that new content can be generated in bulk by an AI without hand-writing every entry.

## How to orient yourself

Read these files in order:

1. `README.md`
2. `CONCEPT.md`
3. This file (`AI_INSTRUCTIONS.md`)
4. Anything inside `schemas/`

## Design Constraints (do not violate casually)

- Text-based only. No requirement for graphics or sprites.
- Prefer clarity and simplicity over clever architecture in the early stages.
- Content must remain data-driven (JSON templates). Avoid hard-coding large amounts of story text in the engine.
- The game should remain understandable by both humans and other AIs.

## Preferred way to add content

When asked to expand the world:

1. Look at the existing schemas in `/schemas`.
2. Generate new templates that follow the same structure.
3. Place them in the appropriate data files or folders.
4. Keep level ranges and tags consistent so the game can filter them correctly.

## Preferred way to extend systems

- Keep the core loop intact: auto-progress → log → player adjustment → continue.
- New systems (combat resolution, loot, skills, etc.) should read from and write to clear data structures.
- Document any new data fields you introduce.

## Communication style when working on this repo

- Be direct and concrete.
- When you make significant changes, briefly note what you changed and why.
- If you generate a large batch of templates, summarize the ranges and themes you covered.

## Current stage

Playable proof-of-concept. Character creation, idle ticks (including offline catch-up), a readable log, skill points, and a pack are in place. Content covers levels 1–10.

Most valuable contributions now:

- More location / monster / event templates
- Equipment you can actually wear (inventory is collected, not equipped)
- Occasional pending choices for the player
- Tuning combat and the 24-hour-to-10 XP curve

Keep the loop: auto-progress → log → player adjustment → continue.

Future AIs should treat this repository as a living project that is intentionally easy to continue.

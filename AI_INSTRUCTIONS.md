# AI Instructions – Idle Text RPG

This document is written specifically for AIs that will work on this repository.

## Project Intent

This is a proof-of-concept text-based idle RPG. The player creates a character that auto-progresses through a generated world. The player checks in occasionally to read the log, adjust equipment, and assign skill points.

The world content (locations, monsters, events) is template-driven so that new content can be generated in bulk by an AI without hand-writing every entry.

## How to orient yourself

Read these files in order:

1. `CHANGELOG.md` — **what changed recently (required)**
2. `README.md`
3. `CONCEPT.md`
4. This file (`AI_INSTRUCTIONS.md`)
5. Anything inside `schemas/`

When you finish a meaningful change, **append a dated entry to `CHANGELOG.md`** so the next AI (or session) is not flying blind.

## Design Constraints (do not violate casually)

- Text-based only. No requirement for graphics or sprites.
- Prefer clarity and simplicity over clever architecture in the early stages.
- Content must remain data-driven (JSON templates). Avoid hard-coding large amounts of story text in the engine.
- The game should remain understandable by both humans and other AIs.
- Character progress lives under a **profile** (`js/profile.js`), not a lone character key. Multi-character is first-class.

## Preferred way to add content

When asked to expand the world:

1. Look at the existing schemas in `/schemas`.
2. Generate new templates that follow the same structure.
3. Place them in the appropriate data files or folders.
4. Keep level ranges and tags consistent so the game can filter them correctly.

## Preferred way to extend systems

- Keep the core loop intact: auto-progress → log → player adjustment → continue.
- New systems should read from and write to clear data structures.
- Document any new data fields you introduce in `CHANGELOG.md`.
- Navigation must never trap the player (shell: Game · Profile · Graveyard).

## Communication style when working on this repo

- Be direct and concrete.
- When you make significant changes, briefly note what you changed and why **in the changelog**.
- If you generate a large batch of templates, summarize the ranges and themes you covered.

## Current stage (see CHANGELOG for detail)

- Playable idle loop, races/classes, zones, board events, training skills, gear slot placeholders
- **Profile + up to 3 character slots**, active/inactive wilderness flag, graveyard UI
- Parallel multi-character idle simulation and relationship encounters are planned, not fully wired

Most valuable contributions next:

- Parallel `catchUp` for all `wildernessActive` characters
- Same-account automated wilderness meetings / relationship scores
- Equipment that can actually be equipped
- Death → `buryCharacter` wired from combat failure
- More templates and quest scaffolding

Keep the loop: auto-progress → log → player adjustment → continue.

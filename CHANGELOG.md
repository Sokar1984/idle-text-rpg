# Changelog – Idle Text RPG

Living log for humans and AIs. Newest first. Read this before extending systems.

## 2026-08-20 — Profile, multi-character, slots=3

- **Profile layer** (`js/profile.js`, `js/profile-ui.js`, `css/profile.css`)
  - Local “signed-in” profile in `localStorage` (`idle-text-rpg-profile`)
  - Migrates legacy single-character key automatically
  - Character list sorted **active (wilderness)** then **inactive**
  - Add / play / delete character; **graveyard** for deaths (`buryCharacter`)
  - Shell nav always available: Game · Profile · Graveyard (no dead-end screens)
- **Slots:** preview allows **3** living characters (`FREE_CHARACTER_SLOTS = 3`); existing profiles are bumped on load
- Character meta: `id`, `wildernessActive`, `status`
- Saves route through profile (`getCharacter` / `saveCharacter`)

## 2026-08-19 — Training, gear slots, class halls

- Class halls in village (Iron Hall, Greenwatch, Lantern Archive, Quiet Ledger); only matching class enterable
- Gear slots + two satchel (custom) slots — empty placeholders
- Training skills 0–100%: Unarmed, class-named Armed, Fieldcraft, Toolwright, Apothecary
- 1 training point per level; % gain scaled by stats (~1.5–6.5% per point)

## 2026-08-19 — Board events

- Timed board events (max 5), click to travel/complete for bonus XP, auto-resume wilderness
- Quests tab scaffolded (empty)
- Data: `data/board-events.json`

## 2026-08-19 — Zones, calendar, economy

- Age 13 / year 0; fictional game hours/days/years
- Zones: wilderness, village (vendor), home (bedroom/kitchen/storage)
- HP + rest-at-home healing; inventory capacity; copper/silver/gold via item values

## 2026-08-19 — Races, gender, names, avatars

- Races with bonuses; gender; auto names; avatar style placeholders (images not fully in repo)

## Earlier — Core POC

- Single-page idle loop, classes, locations/monsters/events JSON, XP to level 10, offline log, offline catch-up

---

### For AIs continuing this repo

1. Read `CHANGELOG.md` (this file) → `AI_INSTRUCTIONS.md` → `CONCEPT.md`
2. Do not assume single-character saves; use the profile API
3. Parallel idle for multiple `wildernessActive` characters and relationship encounters are **designed but not fully simulated yet**
4. When you ship a meaningful change, **append a dated section here**

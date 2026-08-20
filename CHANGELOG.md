# Changelog – Idle Text RPG

Living log for humans and AIs. Newest first. Read this before extending systems.

## 2026-08-21 — Class quest accept UI + auto-journey polish

**Level-5 class quest → main city (end-to-end)**
- Quests tab now shows full description for the class journey and a **Take the road** button
- Accept grants shitty class weapon + chest (no stats), advances time on the road, sets home to Crossroads, unlocks the open world
- Journey log names the place left behind and the arrival at the city gates
- Quests tab gains a subtle action cue while a class journey is waiting; auto-surfaces once when offered

**Auto-journey when full HP at home**
- Already present in engine; confirmed and tightened
- After accepting the class quest and arriving fully healed, character does not sit idle — leaves for the wilds on the same beat
- Rest-at-home path also triggers auto-leave when condition is Steady

**Fix:** `js/engine.js` and `js/ui.js` were accidentally replaced with empty `file://` stubs on push. Restored from last good blobs and wired the accept UI so the loop actually runs.

## 2026-08-20 — Hidden stats (lived experience UI)

**Design:** Attributes, skill %, training points, gear, and pack are **still simulated** but **not shown** on the player UI. Progress is felt through the adventure log, events, and quests — not a character sheet.

- Removed from game screen: attributes panel, attribute spend UI, training panel, gear panel, pack panel
- Layout focuses on: identity/place, condition, travel, **Events / Quests**, **Adventure log**
- Condition meter uses qualitative labels (Steady / Worn / Hurt / Barely standing) instead of raw HP numbers in the label
- Level-up still grants hidden attribute + training points; log line is qualitative only
- Event cards no longer show “+XP” rewards
- Race creation detail shows advantages/disadvantages without numeric stat modifiers
- Backend unchanged: `stats`, `skills`, `unspentSkillPoints`, `trainingPoints`, `equipment`, `inventory` remain on the character save for future event/quest resolution

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

- Single-page idle loop, classes, locations/monsters/events JSON, XP to level 10, adventure log, offline catch-up

---

### For AIs continuing this repo

1. Read `CHANGELOG.md` (this file) → `AI_INSTRUCTIONS.md` → `CONCEPT.md`
2. Do not assume single-character saves; use the profile API
3. **Do not re-expose** attribute/skill/gear/pack panels unless the design explicitly asks — hidden-by-default is intentional
4. Parallel idle for multiple `wildernessActive` characters and relationship encounters are **designed but not fully simulated yet**
5. When you ship a meaningful change, **append a dated section here**

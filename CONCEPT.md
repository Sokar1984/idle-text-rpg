# Game Concept – Idle Text RPG

## Core Fantasy

You create a character. The character receives RPG attributes and begins living its own life in a generated world. You check in from time to time, read what happened, make a few decisions (equipment, skills, occasional choices), and then let it continue.

This is an idle / incremental RPG with a strong narrative log. The player is more of a caretaker and strategist than a direct controller.

## Key Pillars

1. **Text-based only**  
   Clean, readable interface. No graphics or sprites required. The pleasure comes from reading the log of the character’s journey.

2. **True idle progression**  
   The character continues to act and progress in real time (or simulated real time) even when the player is offline.

3. **Endlessly expandable world**  
   Locations, monsters, and events are driven by templates. These templates are designed so that AIs can generate large batches of new content easily.

4. **AI-friendly architecture**  
   The project is intentionally structured so that other AIs (or the same AI in a new conversation) can quickly understand the vision and continue development without starting from zero.

## Player Loop

1. Create character (name, starting attributes, perhaps a simple background).
2. Character begins auto-playing.
3. Player returns later → reads the adventure log.
4. Player may:
   - Assign unspent skill points
   - Change equipment
   - Make a rare meaningful choice if one is pending
5. Player leaves again. Character continues.

## Content Philosophy

We do not hand-write hundreds of unique events.  
Instead we maintain clean, well-structured templates for:

- Locations
- Monsters / Encounters
- Events

These templates are filtered by character level, tags, and current context. An AI can generate dozens or hundreds of new templates on request.

## Technical Direction (POC)

- Prefer simple, readable code over heavy frameworks.
- Client-side first is acceptable for the initial proof-of-concept (localStorage).
- Later versions can add a lightweight backend if persistent multi-device progress is desired.
- All content data should live in clear JSON (or similar) files so both humans and AIs can inspect and extend it easily.

## Success Criteria for the First Playable Version

- Player can create a character.
- Character automatically generates a readable log of actions over time.
- Player can return, see progress, allocate skill points, and change basic equipment.
- New locations/monsters/events can be added simply by dropping new JSON templates into the project.

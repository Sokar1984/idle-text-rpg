import { addXp } from './character.js';

function pick(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function matchesLevel(item, level) {
  const [min, max] = item.level_range;
  return level >= min && level <= max;
}

function getCurrentLocation(char, locations) {
  return locations.find(l => l.id === char.locationId) || locations[0];
}

function chooseEvent(char, data) {
  const loc = getCurrentLocation(char, data.locations);
  const candidates = data.events.filter(e => matchesLevel(e, char.level));

  // Prefer events that match the location's possible_events if available
  const preferred = candidates.filter(e =>
    (loc.possible_events || []).some(tag => e.tags.includes(tag) || e.id.includes(tag))
  );

  const pool = preferred.length > 0 ? preferred : candidates;
  return pick(pool);
}

function chooseMonster(char, data, tags = []) {
  const candidates = data.monsters.filter(m => matchesLevel(m, char.level));
  if (tags.length) {
    const tagged = candidates.filter(m => tags.some(t => m.tags.includes(t)));
    if (tagged.length) return pick(tagged);
  }
  return pick(candidates);
}

function resolveCombat(char, monster) {
  // Very simple resolution for POC
  const playerPower = char.stats.strength * 1.5 + char.stats.agility + char.level * 2;
  const monsterPower = monster.stats.attack + monster.stats.hp / 4;

  const successChance = Math.min(0.92, Math.max(0.25, playerPower / (playerPower + monsterPower)));
  const won = Math.random() < successChance;

  let text = '';
  let xpGain = 0;

  if (won) {
    xpGain = Math.round(6 + monster.stats.hp * 0.35 + char.level * 1.2);
    text = `You defeated the ${monster.name}.`;
    if (monster.loot_table?.length && Math.random() < 0.45) {
      const loot = pick(monster.loot_table);
      text += ` Found: ${loot.replace(/_/g, ' ')}.`;
      char.inventory.push(loot);
    }
  } else {
    const damage = Math.max(1, Math.round(monster.stats.attack * 0.6 - char.stats.vitality * 0.3));
    char.hp = Math.max(1, char.hp - damage);
    text = `You were wounded by the ${monster.name} (-${damage} HP) and retreated.`;
    xpGain = Math.round(2 + char.level * 0.5);
  }

  return { text, xpGain, type: 'combat' };
}

function resolveEvent(char, event, data) {
  const outcome = pick(event.possible_outcomes || [{ type: 'xp', effect: 'small_xp' }]);
  let text = event.description;
  let xpGain = 0;
  let type = event.tags.includes('combat') ? 'combat' : 'discovery';

  switch (outcome?.type) {
    case 'combat':
    case 'standard_combat':
    case 'low_danger_combat':
    case 'elite_combat':
    case 'strange_combat': {
      const monster = chooseMonster(char, data);
      if (monster) {
        const result = resolveCombat(char, monster);
        text = `${event.description} ${result.text}`;
        xpGain = result.xpGain;
        type = 'combat';
      }
      break;
    }
    case 'xp':
    case 'small_xp':
      xpGain = Math.round(3 + char.level * 0.8);
      text += ' You gain a little experience.';
      break;
    case 'medium_xp':
      xpGain = Math.round(8 + char.level * 1.4);
      text += ' You gain meaningful experience.';
      break;
    case 'loot':
    case 'minor_loot':
      xpGain = Math.round(4 + char.level);
      text += ' You find something useful.';
      break;
    case 'heal':
    case 'recover_health':
      char.hp = Math.min(char.maxHp, char.hp + Math.round(char.maxHp * 0.25));
      text += ' You recover some strength.';
      break;
    case 'damage':
    case 'minor_damage':
      char.hp = Math.max(1, char.hp - 3);
      text += ' You take minor harm.';
      break;
    default:
      xpGain = Math.round(2 + char.level * 0.5);
  }

  return { text, xpGain, type };
}

function maybeChangeLocation(char, data) {
  if (Math.random() > 0.18) return;

  const candidates = data.locations.filter(l => matchesLevel(l, char.level));
  const next = pick(candidates);
  if (next && next.id !== char.locationId) {
    char.locationId = next.id;
    char.log.unshift({
      time: Date.now(),
      type: 'travel',
      text: `You arrive at ${next.name}. ${next.description}`
    });
  }
}

/**
 * Advance the character by a number of logical ticks.
 * Returns the updated character.
 */
export function advanceTime(char, data, ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    char.totalTicks += 1;

    // Small baseline XP every tick
    let xp = data.config.base_xp_per_tick;

    // Chance to trigger a real event
    if (Math.random() < 0.55) {
      const event = chooseEvent(char, data);
      if (event) {
        const result = resolveEvent(char, event, data);
        xp += result.xpGain;

        char.log.unshift({
          time: Date.now(),
          type: result.type,
          text: result.text
        });
      }
    }

    addXp(char, xp, data.config);
    maybeChangeLocation(char, data);

    // Keep log from growing forever
    if (char.log.length > 80) char.log.length = 80;
  }

  char.lastTick = Date.now();
  return char;
}

export function getLog(char) {
  return char.log || [];
}

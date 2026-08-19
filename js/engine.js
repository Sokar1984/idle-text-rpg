import { addXp } from './character.js';

function pick(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function pickWeighted(outcomes) {
  if (!outcomes || outcomes.length === 0) return null;
  const total = outcomes.reduce((sum, o) => sum + (o.chance ?? 1), 0);
  let roll = Math.random() * total;
  for (const outcome of outcomes) {
    roll -= outcome.chance ?? 1;
    if (roll <= 0) return outcome;
  }
  return outcomes[outcomes.length - 1];
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

function pushLog(char, type, text) {
  char.log.unshift({ time: Date.now(), type, text });
  if (char.log.length > 80) char.log.length = 80;
}

function resolveCombat(char, monster) {
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
      if (loot) {
        text += ` Found: ${loot.replace(/_/g, ' ')}.`;
        char.inventory.push(loot);
      }
    }
  } else {
    const damage = Math.max(1, Math.round(monster.stats.attack * 0.6 - char.stats.vitality * 0.3));
    char.hp = Math.max(1, char.hp - damage);
    text = `You were wounded by the ${monster.name} (−${damage} HP) and retreated.`;
    xpGain = Math.round(2 + char.level * 0.5);
  }

  return { text, xpGain, type: 'combat' };
}

function addLoot(char, loc) {
  const fromPlace = pick(loc.resources);
  const fallback = pick(['scraps', 'herbs', 'coins', 'worn_cloth']);
  const item = fromPlace || fallback;
  if (item) char.inventory.push(item);
  return item;
}

function resolveEvent(char, event, data) {
  const loc = getCurrentLocation(char, data.locations);
  const outcome = pickWeighted(event.possible_outcomes) || { type: 'xp', effect: 'small_xp' };

  let text = event.description;
  let xpGain = 0;
  let type = event.tags.includes('combat') ? 'combat' : 'discovery';
  const key = `${outcome.type}:${outcome.effect || ''}`;

  if (
    /combat/.test(key) ||
    outcome.type === 'combat' ||
    outcome.type === 'standard_combat' ||
    outcome.type === 'low_danger_combat' ||
    outcome.type === 'elite_combat' ||
    outcome.type === 'strange_combat'
  ) {
    const monster = chooseMonster(char, data);
    if (monster) {
      const result = resolveCombat(char, monster);
      text = `${event.description} ${result.text}`;
      xpGain = result.xpGain;
      type = 'combat';
    }
  } else if (outcome.type === 'loot' || outcome.effect === 'minor_loot') {
    const item = addLoot(char, loc);
    xpGain = Math.round(4 + char.level);
    text += item ? ` You find ${item.replace(/_/g, ' ')}.` : ' You find something useful.';
    type = 'loot';
  } else if (
    outcome.type === 'heal' ||
    outcome.effect === 'recover_health' ||
    outcome.type === 'blessing' ||
    outcome.effect === 'temporary_buff'
  ) {
    char.hp = Math.min(char.maxHp, char.hp + Math.round(char.maxHp * 0.25));
    xpGain = Math.round(3 + char.level * 0.6);
    text += ' A quiet warmth lingers. You recover some strength.';
  } else if (
    outcome.type === 'damage' ||
    outcome.type === 'trap' ||
    outcome.effect === 'minor_damage'
  ) {
    char.hp = Math.max(1, char.hp - 3);
    text += ' You take minor harm.';
    type = 'combat';
  } else if (
    outcome.type === 'lore' ||
    outcome.effect === 'gain_knowledge' ||
    outcome.effect === 'medium_xp'
  ) {
    xpGain = Math.round(8 + char.level * 1.4);
    text += ' A fragment of the old world settles in your mind.';
    type = 'lore';
  } else if (outcome.type === 'shop' || outcome.effect === 'open_shop') {
    xpGain = Math.round(2 + char.level * 0.4);
    text += ' You trade a few words. Nothing of worth changes hands.';
  } else if (outcome.type === 'nothing' || outcome.effect === 'merchant_leaves') {
    text += ' They move on before you can speak.';
  } else if (outcome.type === 'xp' || outcome.effect === 'small_xp') {
    xpGain = Math.round(3 + char.level * 0.8);
    text += ' You gain a little experience.';
  } else {
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
    pushLog(char, 'travel', `You arrive at ${next.name}. ${next.description}`);
  }
}

/**
 * Advance the character by a number of logical ticks.
 * Returns the updated character.
 */
export function advanceTime(char, data, ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    char.totalTicks += 1;
    let xp = data.config.base_xp_per_tick;

    if (Math.random() < 0.55) {
      const event = chooseEvent(char, data);
      if (event) {
        const result = resolveEvent(char, event, data);
        xp += result.xpGain;
        pushLog(char, result.type, result.text);
      }
    }

    addXp(char, xp, data.config);
    maybeChangeLocation(char, data);
  }

  char.lastTick = Date.now();
  return char;
}

const MAX_OFFLINE_TICKS = 1440;

export function catchUp(char, data) {
  const intervalMs = (data.config.tick_interval_seconds || 60) * 1000;
  const elapsed = Date.now() - char.lastTick;
  const ticks = Math.min(Math.floor(elapsed / intervalMs), MAX_OFFLINE_TICKS);
  if (ticks <= 0) return { character: char, ticks: 0 };

  advanceTime(char, data, ticks);

  if (ticks >= 10) {
    const minutes = Math.round((ticks * (data.config.tick_interval_seconds || 60)) / 60);
    const when = minutes >= 60
      ? `roughly ${Math.round(minutes / 60)} hour${Math.round(minutes / 60) === 1 ? '' : 's'}`
      : `about ${minutes} minutes`;
    pushLog(
      char,
      'system',
      `You return. ${when.charAt(0).toUpperCase()}${when.slice(1)} of the road have passed.`
    );
  }

  return { character: char, ticks };
}

export function msUntilNextTick(char, data) {
  const intervalMs = (data.config.tick_interval_seconds || 60) * 1000;
  const elapsed = Date.now() - char.lastTick;
  return intervalMs - (elapsed % intervalMs);
}

export function getLog(char) {
  return char.log || [];
}

import {
  addXp,
  canCarry
} from './character.js';

const MAX_BOARD_EVENTS = 5;

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

function itemValue(id, itemsData) {
  return itemsData?.items?.[id]?.value ?? 3;
}

function pushLog(char, type, text) {
  char.log.unshift({ time: Date.now(), type, text });
  if (char.log.length > 100) char.log.length = 100;
}

function advanceGameHours(char, hours) {
  char.gameHours = (char.gameHours || 0) + hours;
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

function chooseMonster(char, data) {
  const candidates = data.monsters.filter(m => matchesLevel(m, char.level));
  return pick(candidates);
}

function tryAddLoot(char, itemId, data, flavor) {
  if (!itemId) return flavor || '';
  if (!canCarry(char, data.config, 1)) {
    return ` ${flavor || 'You find something'} but your pack is full.`;
  }
  char.inventory.push(itemId);
  return ` ${flavor || 'Found'}: ${itemId.replace(/_/g, ' ')}.`;
}

function resolveCombat(char, monster, data) {
  const playerPower = char.stats.strength * 1.5 + char.stats.agility + char.level * 2;
  const monsterPower = monster.stats.attack + monster.stats.hp / 4;
  const successChance = Math.min(0.9, Math.max(0.22, playerPower / (playerPower + monsterPower)));
  const won = Math.random() < successChance;

  let text = '';
  let xpGain = 0;

  if (won) {
    xpGain = Math.round(6 + monster.stats.hp * 0.35 + char.level * 1.2);
    text = `You defeated the ${monster.name}.`;
    if (monster.loot_table?.length && Math.random() < 0.5) {
      const loot = pick(monster.loot_table);
      text += tryAddLoot(char, loot, data, 'Found');
    }
  } else {
    const damage = Math.max(
      2,
      Math.round(monster.stats.attack * 0.7 - char.stats.vitality * 0.25)
    );
    char.hp = Math.max(0, char.hp - damage);
    text = `You were wounded by the ${monster.name} (−${damage} HP).`;
    xpGain = Math.round(2 + char.level * 0.4);
    if (char.hp <= 0) {
      char.hp = 1;
      text += ' Barely conscious, you must get home to recover.';
    }
  }

  return { text, xpGain, type: 'combat' };
}

function resolveEvent(char, event, data) {
  const loc = getCurrentLocation(char, data.locations);
  const outcome = pickWeighted(event.possible_outcomes) || { type: 'xp', effect: 'small_xp' };

  let text = event.description;
  let xpGain = 0;
  let type = event.tags.includes('combat') ? 'combat' : 'discovery';
  const key = `${outcome.type}:${outcome.effect || ''}`;

  if (/combat/.test(key) || ['combat', 'standard_combat', 'low_danger_combat', 'elite_combat', 'strange_combat'].includes(outcome.type)) {
    const monster = chooseMonster(char, data);
    if (monster) {
      const result = resolveCombat(char, monster, data);
      text = `${event.description} ${result.text}`;
      xpGain = result.xpGain;
      type = 'combat';
    }
  } else if (outcome.type === 'loot' || outcome.effect === 'minor_loot') {
    const fromPlace = pick(loc.resources);
    const item = fromPlace || pick(['scraps', 'herbs', 'worn_cloth']);
    text += tryAddLoot(char, item, data, 'You find');
    xpGain = Math.round(4 + char.level);
    type = 'loot';
  } else if (outcome.type === 'damage' || outcome.type === 'trap' || outcome.effect === 'minor_damage') {
    const dmg = 2 + Math.floor(char.level / 3);
    char.hp = Math.max(1, char.hp - dmg);
    text += ` You take harm (−${dmg} HP).`;
    type = 'combat';
  } else if (outcome.type === 'lore' || outcome.effect === 'gain_knowledge' || outcome.effect === 'medium_xp') {
    xpGain = Math.round(8 + char.level * 1.4);
    text += ' A fragment of the old world settles in your mind.';
    type = 'lore';
  } else if (outcome.type === 'xp' || outcome.effect === 'small_xp') {
    xpGain = Math.round(3 + char.level * 0.8);
    text += ' You gain a little experience.';
  } else {
    xpGain = Math.round(2 + char.level * 0.5);
  }

  return { text, xpGain, type };
}

function maybeChangeWildernessLocation(char, data) {
  if (Math.random() > 0.15) return;
  const candidates = data.locations.filter(l => matchesLevel(l, char.level));
  const next = pick(candidates);
  if (next && next.id !== char.locationId) {
    char.locationId = next.id;
    pushLog(char, 'travel', `You reach ${next.name}. ${next.description}`);
  }
}

function expireBoardEvents(char) {
  if (!char.activeEvents?.length) return;
  const nowH = char.gameHours || 0;
  const before = char.activeEvents.length;
  char.activeEvents = char.activeEvents.filter(e => e.expiresAtHour > nowH);
  const lost = before - char.activeEvents.length;
  if (lost > 0) {
    pushLog(char, 'system', `${lost} event${lost === 1 ? '' : 's'} expired.`);
  }
}

function maybeSpawnBoardEvent(char, data) {
  if (!data.boardEvents?.length) return;
  if (!char.activeEvents) char.activeEvents = [];
  if (char.activeEvents.length >= MAX_BOARD_EVENTS) return;
  // ~12% chance per tick to offer something new
  if (Math.random() > 0.12) return;

  const activeIds = new Set(char.activeEvents.map(e => e.templateId));
  const candidates = data.boardEvents.filter(
    e => matchesLevel(e, char.level) && !activeIds.has(e.id)
  );
  const template = pick(candidates);
  if (!template) return;

  const duration = template.duration_hours || 16;
  const instance = {
    instanceId: `${template.id}_${Math.floor(char.gameHours)}_${Math.random().toString(36).slice(2, 7)}`,
    templateId: template.id,
    name: template.name,
    description: template.description,
    zone: template.zone || 'wilderness',
    locationHint: template.location_hint || null,
    xpReward: template.xp_reward || 20,
    risk: template.risk || 'medium',
    tags: template.tags || [],
    offeredAtHour: char.gameHours || 0,
    expiresAtHour: (char.gameHours || 0) + duration
  };
  char.activeEvents.push(instance);
  pushLog(char, 'system', `New event available: ${instance.name}.`);
}

function wildernessTick(char, data) {
  if (char.hp <= 1 && Math.random() < 0.4) {
    pushLog(char, 'system', 'You are too hurt to risk the wilds. Head home to recover.');
    return 0;
  }

  let xp = data.config.base_xp_per_tick;

  if (Math.random() < 0.55) {
    const event = chooseEvent(char, data);
    if (event) {
      const result = resolveEvent(char, event, data);
      xp += result.xpGain;
      pushLog(char, result.type, result.text);
    }
  }

  maybeChangeWildernessLocation(char, data);
  return xp;
}

function homeTick(char, data) {
  if (char.sublocation === 'bedroom' && char.hp < char.maxHp) {
    const heal = Math.max(1, Math.round(char.maxHp * 0.08));
    char.hp = Math.min(char.maxHp, char.hp + heal);
  }
  return data.config.base_xp_per_tick * 0.15;
}

function villageTick(char, data) {
  return data.config.base_xp_per_tick * 0.1;
}

/** Advance logical ticks (zone-aware). */
export function advanceTime(char, data, ticks = 1) {
  const hoursPerTick = data.config.game_hours_per_tick ?? 2;

  for (let i = 0; i < ticks; i++) {
    char.totalTicks += 1;
    advanceGameHours(char, hoursPerTick);
    expireBoardEvents(char);
    maybeSpawnBoardEvent(char, data);

    let xp = 0;
    if (char.zone === 'wilderness') xp = wildernessTick(char, data);
    else if (char.zone === 'home') xp = homeTick(char, data);
    else if (char.zone === 'village') xp = villageTick(char, data);

    if (xp > 0) addXp(char, xp, data.config);
  }

  char.lastTick = Date.now();
  return char;
}

/** Click an active board event: travel, complete, bonus XP, resume idle zone. */
export function completeBoardEvent(char, data, instanceId) {
  const idx = (char.activeEvents || []).findIndex(e => e.instanceId === instanceId);
  if (idx < 0) {
    pushLog(char, 'system', 'That event is no longer available.');
    return char;
  }

  const evt = char.activeEvents[idx];
  if ((char.gameHours || 0) >= evt.expiresAtHour) {
    char.activeEvents.splice(idx, 1);
    pushLog(char, 'system', `${evt.name} has already expired.`);
    return char;
  }

  // Travel to relevant zone / location
  const zone = evt.zone || 'wilderness';
  const hours = data.config.travel_hours?.[zone] ?? 2;
  advanceGameHours(char, hours);
  char.zone = zone;
  char.sublocation = zone === 'village' ? 'vendor' : zone === 'home' ? 'bedroom' : null;
  if (evt.locationHint) char.locationId = evt.locationHint;

  // Resolve a light challenge based on risk
  let bonus = evt.xpReward || 20;
  let note = `You handle: ${evt.name}.`;
  if (evt.risk === 'high' && Math.random() < 0.35) {
    const dmg = 3 + Math.floor(char.level / 2);
    char.hp = Math.max(1, char.hp - dmg);
    note += ` It costs you (−${dmg} HP).`;
    bonus = Math.round(bonus * 0.75);
  } else if (evt.risk === 'low') {
    bonus = Math.round(bonus * 1.05);
  }

  char.activeEvents.splice(idx, 1);
  addXp(char, bonus, data.config);
  pushLog(char, 'discovery', `${note} (+${bonus} XP).`);

  // Auto-resume idle in wilderness after event
  if (char.zone !== 'wilderness') {
    const back = data.config.travel_hours?.wilderness ?? 3;
    advanceGameHours(char, back);
    char.zone = 'wilderness';
    char.sublocation = null;
    pushLog(char, 'travel', 'You return to the wilderness and resume your road.');
  }

  char.lastTick = Date.now();
  return char;
}

export function travelTo(char, data, zone, sublocation = null) {
  if (char.zone === zone && char.sublocation === sublocation) return char;

  const hours = data.config.travel_hours?.[zone] ?? 2;
  advanceGameHours(char, hours);

  char.zone = zone;
  char.sublocation = sublocation;

  const labels = {
    wilderness: 'the wilderness',
    village: 'the village',
    home: 'home'
  };

  let detail = labels[zone] || zone;
  if (zone === 'village' && sublocation === 'vendor') detail = 'the village vendor';
  if (zone === 'village' && sublocation === 'school') detail = 'the village school';
  if (zone === 'home' && sublocation === 'bedroom') detail = 'your bedroom';
  if (zone === 'home' && sublocation === 'kitchen') detail = 'your kitchen';
  if (zone === 'home' && sublocation === 'storage') detail = 'your storage';

  pushLog(char, 'travel', `You travel to ${detail} (${hours} hours on the road).`);
  expireBoardEvents(char);
  char.lastTick = Date.now();
  return char;
}

export function restAtHome(char, data) {
  if (char.zone !== 'home') {
    pushLog(char, 'system', 'You can only properly rest at home.');
    return char;
  }
  char.sublocation = 'bedroom';
  const hours = data.config.rest_hours ?? 8;
  advanceGameHours(char, hours);
  expireBoardEvents(char);
  const pct = data.config.rest_heal_percent ?? 0.35;
  const heal = Math.max(3, Math.round(char.maxHp * pct));
  const before = char.hp;
  char.hp = Math.min(char.maxHp, char.hp + heal);
  pushLog(
    char,
    'system',
    `You rest in your bedroom for ${hours} hours and recover ${char.hp - before} HP.`
  );
  char.lastTick = Date.now();
  return char;
}

export function sellAllAtVendor(char, data) {
  if (char.zone !== 'village' || char.sublocation !== 'vendor') {
    pushLog(char, 'system', 'You need to be at the village vendor to sell.');
    return char;
  }

  const items = data.items;
  if (!char.inventory.length) {
    pushLog(char, 'system', 'Your pack is empty.');
    return char;
  }

  let total = 0;
  const count = char.inventory.length;
  for (const id of char.inventory) {
    total += itemValue(id, items);
  }
  char.inventory = [];
  char.copper = (char.copper || 0) + total;

  const bonus = Math.floor(total * Math.min(0.15, (char.stats.charisma || 0) * 0.01));
  if (bonus > 0) {
    char.copper += bonus;
    total += bonus;
  }

  pushLog(
    char,
    'loot',
    `You sell ${count} item${count === 1 ? '' : 's'} for ${total} copper.`
  );
  char.lastTick = Date.now();
  return char;
}

export function moveToStorage(char, data) {
  if (char.zone !== 'home' || char.sublocation !== 'storage') {
    pushLog(char, 'system', 'You need to be in home storage.');
    return char;
  }
  if (!char.inventory.length) {
    pushLog(char, 'system', 'Nothing to store.');
    return char;
  }
  char.storage.push(...char.inventory);
  const n = char.inventory.length;
  char.inventory = [];
  pushLog(char, 'system', `You store ${n} item${n === 1 ? '' : 's'} at home.`);
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
    const gameHours = ticks * (data.config.game_hours_per_tick ?? 2);
    const where = char.zone === 'wilderness' ? 'wild' : char.zone;
    pushLog(
      char,
      'system',
      `You return to yourself. About ${gameHours} hours of ${where} time have passed.`
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

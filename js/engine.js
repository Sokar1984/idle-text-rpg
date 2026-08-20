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

/** Early game: stick to racial wilds until settled in the main city. */
function wildernessPool(char, data) {
  const all = data.locations || [];
  if (char.settledInMainCity) {
    return all.filter(l => matchesLevel(l, char.level) && !l.race_home);
  }
  const racial = all.filter(
    l => l.race_home === char.raceId && matchesLevel(l, char.level)
  );
  if (racial.length) return racial;
  return all.filter(l => matchesLevel(l, char.level));
}

function monsterPool(char, data) {
  const all = data.monsters || [];
  const leveled = all.filter(m => matchesLevel(m, char.level));
  if (char.settledInMainCity) {
    const open = leveled.filter(m => !m.race_home);
    return open.length ? open : leveled;
  }
  const racial = leveled.filter(m => m.race_home === char.raceId);
  if (racial.length) return racial;
  return leveled.filter(m => !m.race_home);
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
  return pick(monsterPool(char, data));
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
    text = `You were wounded by the ${monster.name}.`;
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
    char.hp = Math.max(1, char.hp - (2 + Math.floor(char.level / 3)));
    text += ' You take harm.';
    type = 'combat';
  } else if (outcome.type === 'lore' || outcome.effect === 'gain_knowledge' || outcome.effect === 'medium_xp') {
    xpGain = Math.round(8 + char.level * 1.4);
    text += ' A fragment of the old world settles in your mind.';
    type = 'lore';
  } else if (outcome.type === 'xp' || outcome.effect === 'small_xp') {
    xpGain = Math.round(3 + char.level * 0.8);
    text += ' You learn a little from the road.';
  } else {
    xpGain = Math.round(2 + char.level * 0.5);
  }

  return { text, xpGain, type };
}

function maybeChangeWildernessLocation(char, data) {
  if (Math.random() > 0.12) return;
  const candidates = wildernessPool(char, data);
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

function maybeOfferClassQuest(char, data) {
  if (char.level < 5) return;
  if (char.settledInMainCity) return;
  if (char.classQuestState === 'available' || char.classQuestState === 'done') return;
  if ((char.activeQuests || []).some(q => q.type === 'class_journey')) return;

  const questDef = data.classQuests?.[char.classId];
  if (!questDef) return;

  char.classQuestState = 'available';
  char.activeQuests = char.activeQuests || [];
  char.activeQuests.push({
    id: questDef.id,
    type: 'class_journey',
    name: questDef.name,
    description: questDef.description,
    classId: char.classId
  });
  pushLog(
    char,
    'system',
    `A longer road opens: ${questDef.name}. Check your quests when you are ready to leave the place you were born.`
  );
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

function ensureRacialWilderness(char, data) {
  const pool = wildernessPool(char, data);
  if (!pool.length) return;
  if (!pool.some(l => l.id === char.locationId)) {
    char.locationId = pool[0].id;
  }
}

/** Full health at home → auto back to the wild so the character does not idle indoors. */
function maybeAutoLeaveHome(char, data) {
  if (char.zone !== 'home') return false;
  if (char.hp < char.maxHp) return false;

  ensureRacialWilderness(char, data);
  const hours = data.config.travel_hours?.wilderness ?? 3;
  advanceGameHours(char, hours);
  char.zone = 'wilderness';
  char.sublocation = null;
  char.wildernessActive = true;
  const loc = getCurrentLocation(char, data.locations);
  pushLog(
    char,
    'travel',
    `Rested and whole, you leave ${char.homeLabel || 'home'} for the wild${loc ? ` — ${loc.name}` : ''}.`
  );
  return true;
}

function homeTick(char, data) {
  if (char.sublocation === 'bedroom' && char.hp < char.maxHp) {
    const heal = Math.max(1, Math.round(char.maxHp * 0.08));
    char.hp = Math.min(char.maxHp, char.hp + heal);
  }
  if (maybeAutoLeaveHome(char, data)) return 0;
  return data.config.base_xp_per_tick * 0.15;
}

function villageTick(char, data) {
  // Racial village is only a place to sleep — treat like home rest if not in main city
  if (!char.settledInMainCity) {
    return homeTick(char, data);
  }
  return data.config.base_xp_per_tick * 0.1;
}

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
    maybeOfferClassQuest(char, data);
  }

  char.lastTick = Date.now();
  return char;
}

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

  const zone = evt.zone || 'wilderness';
  const hours = data.config.travel_hours?.[zone] ?? 2;
  advanceGameHours(char, hours);
  char.zone = zone;
  char.sublocation = zone === 'village' ? (char.settledInMainCity ? 'vendor' : 'bedroom') : zone === 'home' ? 'bedroom' : null;
  if (evt.locationHint) char.locationId = evt.locationHint;

  let bonus = evt.xpReward || 20;
  let note = `You handle: ${evt.name}.`;
  if (evt.risk === 'high' && Math.random() < 0.35) {
    const dmg = 3 + Math.floor(char.level / 2);
    char.hp = Math.max(1, char.hp - dmg);
    note += ' It costs you.';
    bonus = Math.round(bonus * 0.75);
  }

  char.activeEvents.splice(idx, 1);
  addXp(char, bonus, data.config);
  pushLog(char, 'discovery', note);

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

/** Accept the level-5 class journey: gear + move home to Crossroads. */
export function acceptClassQuest(char, data, questId) {
  const q = (char.activeQuests || []).find(x => x.id === questId && x.type === 'class_journey');
  if (!q) {
    pushLog(char, 'system', 'That quest is not available.');
    return char;
  }
  if (char.settledInMainCity) {
    pushLog(char, 'system', 'You already made Crossroads your home.');
    return char;
  }

  const gear = data.starterGear?.[char.classId];
  if (gear?.main_hand) char.equipment.main_hand = { ...gear.main_hand };
  if (gear?.chest) char.equipment.chest = { ...gear.chest };

  const weaponName = gear?.main_hand?.name || 'a poor weapon';
  const chestName = gear?.chest?.name || 'poor clothes';
  pushLog(
    char,
    'system',
    `You take up ${weaponName} and pull on ${chestName}. Neither is proud gear — only enough to be counted as ${char.className}.`
  );

  const travelHours = 48;
  advanceGameHours(char, travelHours);

  char.settledInMainCity = true;
  char.classQuestState = 'done';
  char.homeLabel = data.mainCity?.home_label || 'your new quarters in Crossroads';
  char.zone = 'home';
  char.sublocation = 'bedroom';
  char.wildernessActive = false;
  // Open the wider world near the city roads
  char.locationId = 'loc_old_road_01';

  char.activeQuests = (char.activeQuests || []).filter(x => x.id !== questId);

  const cityName = data.mainCity?.name || 'Crossroads';
  const left = char.racialVillageName || 'the place you were born';
  pushLog(
    char,
    'travel',
    `You leave ${left} behind. After a long road, the gates of ${cityName} rise ahead. This is the main city — markets, halls, and strangers. You claim a place to sleep. ${cityName} is your new home.`
  );

  char.lastTick = Date.now();
  maybeAutoLeaveHome(char, data);
  return char;
}

export function travelTo(char, data, zone, sublocation = null) {
  if (char.zone === zone && char.sublocation === sublocation) return char;

  // Before main city, "village" is only the racial home
  if (zone === 'village' && !char.settledInMainCity) {
    zone = 'home';
    sublocation = sublocation || 'bedroom';
  }

  const hours = data.config.travel_hours?.[zone] ?? 2;
  advanceGameHours(char, hours);

  char.zone = zone;
  char.sublocation = sublocation;

  if (zone === 'wilderness') {
    ensureRacialWilderness(char, data);
    char.wildernessActive = true;
  }

  const labels = {
    wilderness: 'the wilderness',
    village: char.settledInMainCity ? (data.mainCity?.name || 'the city') : (char.racialVillageName || 'the village'),
    home: char.homeLabel || 'home'
  };

  let detail = labels[zone] || zone;
  if (zone === 'village' && sublocation === 'vendor') detail = 'the vendor stalls';
  if (zone === 'village' && sublocation === 'school') detail = 'the halls';
  if (zone === 'home' && sublocation === 'bedroom') detail = char.homeLabel || 'your bedroom';
  if (zone === 'home' && sublocation === 'kitchen') detail = 'your kitchen';
  if (zone === 'home' && sublocation === 'storage') detail = 'your storage';

  pushLog(char, 'travel', `You travel to ${detail}.`);
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
    `You rest and recover${char.hp > before ? '' : ' — still worn'}.`
  );

  // If fully healed, do not sit idle at home
  maybeAutoLeaveHome(char, data);

  char.lastTick = Date.now();
  return char;
}

export function sellAllAtVendor(char, data) {
  if (!char.settledInMainCity) {
    pushLog(char, 'system', 'There is no market here — only home.');
    return char;
  }
  if (char.zone !== 'village' || char.sublocation !== 'vendor') {
    pushLog(char, 'system', 'You need to be at the vendor to sell.');
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

  pushLog(char, 'loot', `You sell what you carried. The purse feels heavier.`);
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
  pushLog(char, 'system', `You store what you carried.`);
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

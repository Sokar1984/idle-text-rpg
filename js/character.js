import {
  loadProfile,
  getActiveCharacter,
  upsertActiveCharacter,
  deleteCharacter as profileDeleteCharacter
} from './profile.js';

const SAVE_VERSION = 6;

const DEFAULT_EQUIPMENT = {
  head: null,
  chest: null,
  hands: null,
  legs: null,
  feet: null,
  main_hand: null,
  off_hand: null,
  accessory: null,
  custom_1: null,
  custom_2: null
};

const DEFAULT_SKILLS = {
  unarmed: 0,
  armed: 0,
  survival: 0,
  crafting: 0,
  apothecary: 0
};

export function inventoryCapacity(char, config) {
  const base = config.inventory_base_slots ?? 8;
  const str = char.stats.strength || 0;
  const vit = char.stats.vitality || 0;
  return Math.max(
    4,
    Math.floor(
      base +
        str * (config.inventory_strength_factor ?? 1) +
        vit * (config.inventory_vitality_factor ?? 0.5)
    )
  );
}

export function inventoryUsed(char) {
  return (char.inventory || []).length;
}

export function canCarry(char, config, extra = 1) {
  return inventoryUsed(char) + extra <= inventoryCapacity(char, config);
}

export function formatCoins(copper, currency) {
  const cps = currency?.copper_per_silver ?? 100;
  const spg = currency?.silver_per_gold ?? 100;
  const gold = Math.floor(copper / (cps * spg));
  const rem = copper % (cps * spg);
  const silver = Math.floor(rem / cps);
  const c = rem % cps;
  const parts = [];
  if (gold) parts.push(`${gold}g`);
  if (silver) parts.push(`${silver}s`);
  if (c || !parts.length) parts.push(`${c}c`);
  return parts.join(' ');
}

export function gameAgeYears(char, config) {
  const start = config.starting_age_years ?? 13;
  const hpy = (config.hours_per_day ?? 24) * (config.days_per_year ?? 365);
  return start + (char.gameHours || 0) / hpy;
}

export function formatGameTime(char, config) {
  const hours = Math.floor(char.gameHours || 0);
  const hpd = config.hours_per_day ?? 24;
  const dpy = config.days_per_year ?? 365;
  const totalDays = Math.floor(hours / hpd);
  const year = Math.floor(totalDays / dpy);
  const dayOfYear = (totalDays % dpy) + 1;
  const hourOfDay = hours % hpd;
  const age = gameAgeYears(char, config);
  return {
    year,
    dayOfYear,
    hourOfDay,
    ageYears: age,
    ageLabel: age.toFixed(1)
  };
}

export function trainingGainFor(skillId, char, skillsData) {
  const def = (skillsData || []).find(s => s.id === skillId);
  const stats = char.stats || {};
  const keys = def?.primary_stats || ['strength'];
  const avg = keys.reduce((sum, k) => sum + (stats[k] || 1), 0) / keys.length;
  const gain = 1.8 + avg / 8;
  return Math.max(1.5, Math.min(6.5, Math.round(gain * 10) / 10));
}

export function skillDisplayName(skillId, classId, skillsData) {
  const def = (skillsData || []).find(s => s.id === skillId);
  if (!def) return skillId;
  if (skillId === 'armed' && def.class_names?.[classId]) {
    return def.class_names[classId];
  }
  return def.name;
}

/** @param raceStarts optional map from data/race-starts.json */
export function createCharacter({ name, classId, raceId, gender, avatarStyle }, classes, races, raceStarts = null) {
  const cls = classes.find(c => c.id === classId);
  const race = races.find(r => r.id === raceId);
  if (!cls) throw new Error('Unknown class');
  if (!race) throw new Error('Unknown race');

  const now = Date.now();
  const trimmed = (name || '').trim() || 'Wanderer';
  const start = raceStarts?.[race.id] || null;
  const locationId = start?.wilderness_id || 'loc_meadow_01';
  const homeLabel = start?.home_label || 'home';
  const villageName = start?.village_name || 'the village';

  const stats = {
    strength: cls.starting_stats.strength + (race.bonuses.strength || 0),
    agility: cls.starting_stats.agility + (race.bonuses.agility || 0),
    intelligence: cls.starting_stats.intelligence + (race.bonuses.intelligence || 0),
    vitality: cls.starting_stats.vitality + (race.bonuses.vitality || 0),
    charisma: (cls.starting_stats.charisma || 4) + (race.bonuses.charisma || 0)
  };
  Object.keys(stats).forEach(k => { stats[k] = Math.max(1, stats[k]); });

  const maxHp = 20 + stats.vitality * 4;

  return {
    version: SAVE_VERSION,
    id: `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    classId: cls.id,
    className: cls.name,
    raceId: race.id,
    raceName: race.name,
    gender: gender || 'male',
    avatarStyle: avatarStyle || 'neutral',
    level: 1,
    xp: 0,
    xpToNext: 40,
    unspentSkillPoints: 0,
    trainingPoints: 0,
    stats,
    growth: { ...cls.stat_growth, charisma: cls.stat_growth.charisma ?? 1.0 },
    skills: { ...DEFAULT_SKILLS },
    equipment: { ...DEFAULT_EQUIPMENT },
    hp: maxHp,
    maxHp,
    zone: 'home',
    sublocation: 'bedroom',
    wildernessActive: false,
    status: 'alive',
    locationId,
    settledInMainCity: false,
    racialVillageName: villageName,
    homeLabel,
    classQuestState: null,
    inventory: [],
    copper: 0,
    storage: [],
    gameHours: 0,
    activeEvents: [],
    activeQuests: [],
    log: [{
      time: now,
      type: 'system',
      text: `${trimmed} the ${race.name} ${cls.name} awakens in ${homeLabel}, age 13, in the year 0. Beyond lies ${start?.wilderness_name || 'the wild'}.`
    }],
    createdAt: now,
    lastTick: now,
    totalTicks: 0
  };
}

function migrate(raw) {
  if (!raw) return null;
  const next = { ...raw };
  if (!Array.isArray(next.inventory)) next.inventory = [];
  if (!Array.isArray(next.storage)) next.storage = [];
  if (!Array.isArray(next.log)) next.log = [];
  if (!Array.isArray(next.activeEvents)) next.activeEvents = [];
  if (!Array.isArray(next.activeQuests)) next.activeQuests = [];
  if (!next.stats) {
    next.stats = { strength: 5, agility: 5, intelligence: 5, vitality: 5, charisma: 5 };
  }
  if (next.stats.charisma == null) next.stats.charisma = 5;
  if (!next.raceId) next.raceId = 'human';
  if (!next.raceName) next.raceName = 'Human';
  if (!next.gender) next.gender = 'male';
  if (!next.avatarStyle) next.avatarStyle = 'neutral';
  if (!next.zone) next.zone = 'wilderness';
  if (next.sublocation === undefined) next.sublocation = null;
  if (next.copper == null) next.copper = 0;
  if (next.gameHours == null) next.gameHours = 0;
  if (!next.skills) next.skills = { ...DEFAULT_SKILLS };
  for (const k of Object.keys(DEFAULT_SKILLS)) {
    if (next.skills[k] == null) next.skills[k] = 0;
  }
  if (!next.equipment) next.equipment = { ...DEFAULT_EQUIPMENT };
  for (const k of Object.keys(DEFAULT_EQUIPMENT)) {
    if (next.equipment[k] === undefined) next.equipment[k] = null;
  }
  if (next.trainingPoints == null) next.trainingPoints = 0;
  if (next.wildernessActive == null) next.wildernessActive = next.zone === 'wilderness';
  if (!next.status) next.status = 'alive';
  if (!next.id) next.id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (next.settledInMainCity == null) next.settledInMainCity = false;
  if (next.classQuestState === undefined) next.classQuestState = null;
  if (!next.homeLabel) next.homeLabel = 'home';
  if (!next.racialVillageName) next.racialVillageName = 'the village';
  next.version = SAVE_VERSION;
  return next;
}

export function getCharacter() {
  const char = getActiveCharacter(loadProfile());
  return migrate(char);
}

export function saveCharacter(char) {
  if (!char) return;
  upsertActiveCharacter(migrate(char));
}

export function resetCharacter() {
  const profile = loadProfile();
  if (profile.activeCharacterId) {
    profileDeleteCharacter(profile.activeCharacterId, profile);
  }
}

export function addXp(char, amount, config) {
  char.xp += amount;

  while (char.level < 10) {
    const needed = config.xp_table[String(char.level + 1)];
    if (needed == null || char.xp < needed) break;

    char.level += 1;
    char.unspentSkillPoints += 2;
    char.trainingPoints = (char.trainingPoints || 0) + 1;
    char.maxHp += 6 + Math.floor(char.stats.vitality * 0.5);
    char.hp = Math.min(char.maxHp, char.hp + Math.round(char.maxHp * 0.2));

    char.log.unshift({
      time: Date.now(),
      type: 'level',
      text: `Something in you settles differently. The road feels a measure less foreign.`
    });
  }

  if (char.level >= 10) {
    char.xpToNext = 0;
  } else {
    const next = config.xp_table[String(char.level + 1)] ?? char.xp;
    char.xpToNext = Math.max(0, next - char.xp);
  }

  return char;
}

export function allocateSkill(char, stat) {
  if (char.unspentSkillPoints <= 0) return char;
  if (char.stats[stat] == null) return char;
  char.stats[stat] += 1;
  char.unspentSkillPoints -= 1;
  if (stat === 'vitality') {
    char.maxHp += 4;
    char.hp += 4;
  }
  return char;
}

export function allocateTraining(char, skillId, skillsData) {
  if ((char.trainingPoints || 0) <= 0) return char;
  if (!char.skills) char.skills = { ...DEFAULT_SKILLS };
  if (char.skills[skillId] == null) return char;
  if (char.skills[skillId] >= 100) return char;
  const gain = trainingGainFor(skillId, char, skillsData);
  char.skills[skillId] = Math.min(100, Math.round((char.skills[skillId] + gain) * 10) / 10);
  char.trainingPoints -= 1;
  return char;
}

export function randomName(race, gender) {
  const list = race?.names?.[gender];
  if (!list || !list.length) return 'Wanderer';
  return list[Math.floor(Math.random() * list.length)];
}

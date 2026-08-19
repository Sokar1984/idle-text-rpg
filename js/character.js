const STORAGE_KEY = 'idle-text-rpg-character';
const SAVE_VERSION = 1;

export function createCharacter(name, classId, classes) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) throw new Error('Unknown class');

  const now = Date.now();
  const trimmed = name.trim() || 'Wanderer';
  const maxHp = 20 + cls.starting_stats.vitality * 3;

  return {
    version: SAVE_VERSION,
    name: trimmed,
    classId: cls.id,
    className: cls.name,
    level: 1,
    xp: 0,
    xpToNext: 40,
    unspentSkillPoints: 0,
    stats: { ...cls.starting_stats },
    growth: { ...cls.stat_growth },
    hp: maxHp,
    maxHp,
    locationId: 'loc_meadow_01',
    inventory: [],
    log: [{
      time: now,
      type: 'system',
      text: `${trimmed} the ${cls.name} steps into the world.`
    }],
    createdAt: now,
    lastTick: now,
    totalTicks: 0
  };
}

function migrate(raw) {
  const next = { ...raw };
  if (!next.version) next.version = SAVE_VERSION;
  if (!Array.isArray(next.inventory)) next.inventory = [];
  if (!Array.isArray(next.log)) next.log = [];
  if (!next.stats) {
    next.stats = { strength: 5, agility: 5, intelligence: 5, vitality: 5 };
  }
  return next;
}

export function getCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCharacter(char) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(char));
  } catch {
    // private mode / quota — keep playing in memory
  }
}

export function resetCharacter() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function addXp(char, amount, config) {
  char.xp += amount;

  while (char.level < 10) {
    const needed = config.xp_table[String(char.level + 1)];
    if (needed == null || char.xp < needed) break;

    char.level += 1;
    char.unspentSkillPoints += 2;
    char.maxHp += 6 + Math.floor(char.stats.vitality * 0.5);
    char.hp = char.maxHp;

    char.log.unshift({
      time: Date.now(),
      type: 'level',
      text: `You reached level ${char.level}. +2 skill points.`
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
  if (!char.stats[stat] && char.stats[stat] !== 0) return char;

  char.stats[stat] += 1;
  char.unspentSkillPoints -= 1;

  if (stat === 'vitality') {
    char.maxHp += 3;
    char.hp += 3;
  }

  return char;
}

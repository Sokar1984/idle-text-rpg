const STORAGE_KEY = 'idle-text-rpg-character';

export function createCharacter(name, classId, classes) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) throw new Error('Unknown class');

  const now = Date.now();

  return {
    name: name.trim() || 'Wanderer',
    classId: cls.id,
    className: cls.name,
    level: 1,
    xp: 0,
    xpToNext: 40,
    unspentSkillPoints: 0,
    stats: { ...cls.starting_stats },
    growth: { ...cls.stat_growth },
    hp: 20 + cls.starting_stats.vitality * 3,
    maxHp: 20 + cls.starting_stats.vitality * 3,
    locationId: 'loc_meadow_01',
    inventory: [],
    log: [{
      time: now,
      type: 'system',
      text: `${name.trim() || 'Wanderer'} the ${cls.name} steps into the world.`
    }],
    createdAt: now,
    lastTick: now,
    totalTicks: 0
  };
}

export function getCharacter() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCharacter(char) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(char));
}

export function resetCharacter() {
  localStorage.removeItem(STORAGE_KEY);
}

export function addXp(char, amount, config) {
  char.xp += amount;

  while (char.level < 10) {
    const needed = config.xp_table[String(char.level + 1)];
    if (char.xp < needed) break;

    char.level += 1;
    char.unspentSkillPoints += 2;
    char.maxHp += 6 + Math.floor(char.stats.vitality * 0.5);
    char.hp = char.maxHp;

    char.log.unshift({
      time: Date.now(),
      type: 'level',
      text: `You reached level ${char.level}! +2 skill points.`
    });
  }

  // Keep xpToNext updated for UI
  if (char.level >= 10) {
    char.xpToNext = 0;
  } else {
    const next = config.xp_table[String(char.level + 1)];
    char.xpToNext = next - char.xp;
  }

  return char;
}

export function allocateSkill(char, stat) {
  if (char.unspentSkillPoints <= 0) return char;
  if (!char.stats[stat]) return char;

  char.stats[stat] += 1;
  char.unspentSkillPoints -= 1;

  if (stat === 'vitality') {
    char.maxHp += 3;
    char.hp += 3;
  }

  return char;
}

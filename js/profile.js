/**
 * Local profile layer (signed-in stand-in until real auth).
 * Migrates the old single-character key automatically.
 */

const PROFILE_KEY = 'idle-text-rpg-profile';
const LEGACY_CHAR_KEY = 'idle-text-rpg-character';
const PROFILE_VERSION = 1;

/** Preview tier: up to three living characters. Monetization later. */
export const FREE_CHARACTER_SLOTS = 3;

function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyProfile() {
  return {
    version: PROFILE_VERSION,
    signedIn: true,
    displayName: 'Wanderer',
    createdAt: Date.now(),
    maxSlots: FREE_CHARACTER_SLOTS,
    activeCharacterId: null,
    characters: [],
    graveyard: []
  };
}

function ensureCharacterMeta(char) {
  if (!char.id) char.id = uid();
  if (char.wildernessActive == null) {
    char.wildernessActive = char.zone === 'wilderness';
  }
  if (!char.status) char.status = 'alive';
  return char;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!Array.isArray(p.characters)) p.characters = [];
      if (!Array.isArray(p.graveyard)) p.graveyard = [];
      // Keep existing profiles in line with current preview slot count
      if (p.maxSlots == null || p.maxSlots < FREE_CHARACTER_SLOTS) {
        p.maxSlots = FREE_CHARACTER_SLOTS;
      }
      if (p.signedIn == null) p.signedIn = true;
      p.characters = p.characters.map(ensureCharacterMeta);
      return p;
    }
  } catch {
    /* fall through */
  }

  try {
    const legacy = localStorage.getItem(LEGACY_CHAR_KEY);
    if (legacy) {
      const char = ensureCharacterMeta(JSON.parse(legacy));
      const profile = emptyProfile();
      profile.characters = [char];
      profile.activeCharacterId = char.id;
      saveProfile(profile);
      return profile;
    }
  } catch {
    /* ignore */
  }

  return emptyProfile();
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    const active = getActiveCharacter(profile);
    if (active) {
      localStorage.setItem(LEGACY_CHAR_KEY, JSON.stringify(active));
    }
  } catch {
    /* ignore */
  }
}

export function getActiveCharacter(profile = loadProfile()) {
  if (!profile.activeCharacterId) return null;
  return profile.characters.find(c => c.id === profile.activeCharacterId) || null;
}

export function setActiveCharacter(profile, characterId) {
  const found = profile.characters.find(c => c.id === characterId);
  if (!found) return profile;
  profile.activeCharacterId = characterId;
  saveProfile(profile);
  return profile;
}

export function upsertActiveCharacter(char, profile = loadProfile()) {
  if (!char) return profile;
  ensureCharacterMeta(char);
  const idx = profile.characters.findIndex(c => c.id === char.id);
  if (idx >= 0) profile.characters[idx] = char;
  else {
    profile.characters.push(char);
    profile.activeCharacterId = char.id;
  }
  saveProfile(profile);
  return profile;
}

export function canAddCharacter(profile = loadProfile()) {
  return profile.characters.length < (profile.maxSlots || FREE_CHARACTER_SLOTS);
}

export function addCharacterToProfile(char, profile = loadProfile()) {
  if (!canAddCharacter(profile)) {
    return { profile, error: 'Character limit reached for this profile.' };
  }
  ensureCharacterMeta(char);
  char.wildernessActive = false;
  char.zone = 'home';
  char.sublocation = 'bedroom';
  profile.characters.push(char);
  profile.activeCharacterId = char.id;
  saveProfile(profile);
  return { profile, error: null };
}

export function deleteCharacter(characterId, profile = loadProfile()) {
  const idx = profile.characters.findIndex(c => c.id === characterId);
  if (idx < 0) return profile;
  profile.characters.splice(idx, 1);
  if (profile.activeCharacterId === characterId) {
    profile.activeCharacterId = profile.characters[0]?.id || null;
  }
  saveProfile(profile);
  return profile;
}

export function buryCharacter(characterId, cause = 'Unknown fate', profile = loadProfile()) {
  const idx = profile.characters.findIndex(c => c.id === characterId);
  if (idx < 0) return profile;
  const char = profile.characters[idx];
  profile.characters.splice(idx, 1);
  profile.graveyard.unshift({
    id: char.id,
    name: char.name,
    raceName: char.raceName,
    className: char.className,
    level: char.level,
    gender: char.gender,
    diedAt: Date.now(),
    gameHours: char.gameHours || 0,
    cause
  });
  if (profile.graveyard.length > 50) profile.graveyard.length = 50;
  if (profile.activeCharacterId === characterId) {
    profile.activeCharacterId = profile.characters[0]?.id || null;
  }
  saveProfile(profile);
  return profile;
}

export function setWildernessActive(characterId, active, profile = loadProfile()) {
  const char = profile.characters.find(c => c.id === characterId);
  if (!char) return profile;
  char.wildernessActive = !!active;
  saveProfile(profile);
  return profile;
}

export function listCharactersSorted(profile = loadProfile()) {
  const list = [...profile.characters];
  list.sort((a, b) => {
    const aa = a.wildernessActive ? 0 : 1;
    const bb = b.wildernessActive ? 0 : 1;
    if (aa !== bb) return aa - bb;
    return (b.level || 0) - (a.level || 0);
  });
  return list;
}

export function signInLocal(displayName) {
  const profile = loadProfile();
  profile.signedIn = true;
  if (displayName && displayName.trim()) profile.displayName = displayName.trim();
  saveProfile(profile);
  return profile;
}

export function updateDisplayName(name, profile = loadProfile()) {
  profile.displayName = (name || 'Wanderer').trim() || 'Wanderer';
  saveProfile(profile);
  return profile;
}

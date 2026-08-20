import { loadData } from './data.js';
import {
  createCharacter,
  getCharacter,
  saveCharacter,
  allocateTraining
} from './character.js';
import {
  loadProfile,
  addCharacterToProfile,
  setActiveCharacter,
  canAddCharacter,
  signInLocal
} from './profile.js';
import {
  advanceTime,
  catchUp,
  travelTo,
  restAtHome,
  sellAllAtVendor,
  moveToStorage,
  completeBoardEvent,
  acceptClassQuest
} from './engine.js';
import { renderCreation, renderGame, refreshMeters } from './ui.js';
import {
  renderShellNav,
  renderProfileScreen,
  renderGraveyardScreen
} from './profile-ui.js';

let data = null;
let screen = 'game';

function profileHandlers() {
  return {
    onNavigate: (target) => navigate(target),
    onAddCharacter: () => {
      if (!canAddCharacter()) return;
      navigate('creation');
    },
    onPlayCharacter: (id) => {
      setActiveCharacter(loadProfile(), id);
      const char = getCharacter();
      if (!char) return;
      const { character } = catchUp(char, data);
      saveCharacter(character);
      navigate('game');
      redraw(character);
    },
    onCharacterDeleted: () => {
      const char = getCharacter();
      if (!char) {
        navigate(canAddCharacter() ? 'creation' : 'profile');
        return;
      }
      paintShell();
    },
    onProfileChanged: () => paintShell()
  };
}

function handlers() {
  return {
    onTravel: (zone) => {
      const char = getCharacter();
      if (!char) return;
      let sub = null;
      if (zone === 'home') sub = 'bedroom';
      else if (zone === 'village') {
        sub = char.settledInMainCity ? 'vendor' : 'bedroom';
      }
      if (zone === 'wilderness') char.wildernessActive = true;
      const updated = travelTo(char, data, zone, sub);
      saveCharacter(updated);
      redraw(updated);
    },
    onSublocation: (zone, sub) => {
      const char = getCharacter();
      if (!char) return;
      const updated = travelTo(char, data, zone, sub);
      saveCharacter(updated);
      redraw(updated);
    },
    onRest: () => {
      const char = getCharacter();
      if (!char) return;
      const updated = restAtHome(char, data);
      saveCharacter(updated);
      redraw(updated);
    },
    onSell: () => {
      const char = getCharacter();
      if (!char) return;
      const updated = sellAllAtVendor(char, data);
      saveCharacter(updated);
      redraw(updated);
    },
    onStore: () => {
      const char = getCharacter();
      if (!char) return;
      const updated = moveToStorage(char, data);
      saveCharacter(updated);
      redraw(updated);
    },
    onCompleteEvent: (instanceId) => {
      const char = getCharacter();
      if (!char) return;
      const updated = completeBoardEvent(char, data, instanceId);
      saveCharacter(updated);
      redraw(updated);
    },
    onAcceptQuest: (questId) => {
      const char = getCharacter();
      if (!char) return;
      const updated = acceptClassQuest(char, data, questId);
      saveCharacter(updated);
      redraw(updated);
    },
    onTrain: (skillId) => {
      const char = getCharacter();
      if (!char) return;
      const updated = allocateTraining(char, skillId, data.skills);
      saveCharacter(updated);
      redraw(updated);
    }
  };
}

function redraw(char) {
  if (screen !== 'game' || !char) return;
  renderGame(char, data, handlers());
}

function paintShell() {
  renderShellNav({ screen }, profileHandlers());
}

function hideAllMain() {
  ['creation', 'game', 'profile', 'graveyard'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
}

function navigate(target) {
  const profile = loadProfile();

  if (target === 'game' && !profile.activeCharacterId) {
    target = profile.characters.length ? 'profile' : 'creation';
  }

  if (target === 'creation' && !canAddCharacter() && profile.characters.length > 0) {
    target = 'profile';
  }

  screen = target;
  hideAllMain();
  paintShell();

  if (target === 'game') {
    document.getElementById('game').classList.remove('hidden');
    const char = getCharacter();
    if (char) redraw(char);
  } else if (target === 'profile') {
    document.getElementById('profile').classList.remove('hidden');
    renderProfileScreen(profileHandlers());
  } else if (target === 'graveyard') {
    document.getElementById('graveyard').classList.remove('hidden');
    renderGraveyardScreen(profileHandlers());
  } else if (target === 'creation') {
    document.getElementById('creation').classList.remove('hidden');
    renderCreation(data, onCreate);
  }
}

async function init() {
  data = await loadData();
  window.gameData = data;

  signInLocal('Wanderer');

  const profile = loadProfile();
  const char = getCharacter();

  if (char) {
    const { character } = catchUp(char, data);
    saveCharacter(character);
    navigate('game');
    redraw(character);
  } else if (profile.characters.length) {
    navigate('profile');
  } else {
    navigate('creation');
  }

  document.getElementById('btn-tick')?.addEventListener('click', onTick);
  document.getElementById('btn-profile')?.addEventListener('click', () => navigate('profile'));
  document.getElementById('btn-cancel-create')?.addEventListener('click', () => {
    navigate(getCharacter() ? 'game' : 'profile');
  });

  setInterval(applyDueTicks, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyDueTicks();
  });
}

function onCreate(opts) {
  const char = createCharacter(opts, data.classes, data.races, data.raceStarts);
  const { profile, error } = addCharacterToProfile(char);
  if (error) {
    alert(error);
    navigate('profile');
    return;
  }
  setActiveCharacter(profile, char.id);
  navigate('game');
  redraw(getCharacter());
}

function applyDueTicks() {
  if (screen !== 'game') return;
  const char = getCharacter();
  if (!char) return;
  const { character, ticks } = catchUp(char, data);
  if (ticks <= 0) {
    if (typeof refreshMeters === 'function') refreshMeters(char, data);
    return;
  }
  saveCharacter(character);
  redraw(character);
}

function onTick() {
  const char = getCharacter();
  if (!char) return;
  const updated = advanceTime(char, data, 5);
  saveCharacter(updated);
  redraw(updated);
}

if (!window.__idleRpgStarted) {
  window.__idleRpgStarted = true;
  init();
}

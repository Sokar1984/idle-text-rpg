import { loadData } from './data.js';
import {
  createCharacter,
  getCharacter,
  saveCharacter,
  resetCharacter,
  allocateTraining
} from './character.js';
import {
  advanceTime,
  catchUp,
  travelTo,
  restAtHome,
  sellAllAtVendor,
  moveToStorage,
  completeBoardEvent
} from './engine.js';
import { renderCreation, renderGame, refreshMeters } from './ui.js';

let data = null;

function handlers() {
  return {
    onTravel: (zone) => {
      const char = getCharacter();
      if (!char) return;
      const sub = zone === 'home' ? 'bedroom' : zone === 'village' ? 'vendor' : null;
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
  renderGame(char, data, handlers());
}

async function init() {
  data = await loadData();
  window.gameData = data;

  const char = getCharacter();

  if (char) {
    const { character } = catchUp(char, data);
    saveCharacter(character);
    showGame();
    redraw(character);
  } else {
    showCreation();
    renderCreation(data, onCreate);
  }

  document.getElementById('btn-tick')?.addEventListener('click', onTick);
  document.getElementById('btn-reset')?.addEventListener('click', onReset);

  setInterval(applyDueTicks, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyDueTicks();
  });
}

function showCreation() {
  document.getElementById('creation').classList.remove('hidden');
  document.getElementById('game').classList.add('hidden');
}

function showGame() {
  document.getElementById('creation').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
}

function onCreate(opts) {
  const char = createCharacter(opts, data.classes, data.races);
  saveCharacter(char);
  showGame();
  redraw(char);
}

function applyDueTicks() {
  const char = getCharacter();
  if (!char) return;
  const { character, ticks } = catchUp(char, data);
  if (ticks <= 0) {
    refreshMeters(char, data);
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

function onReset() {
  const btn = document.getElementById('btn-reset');
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.textContent = 'Confirm reset';
    setTimeout(() => {
      if (btn.dataset.confirm === '1') {
        btn.dataset.confirm = '';
        btn.textContent = 'Reset';
      }
    }, 4000);
    return;
  }
  resetCharacter();
  location.reload();
}

if (!window.__idleRpgStarted) {
  window.__idleRpgStarted = true;
  init();
}

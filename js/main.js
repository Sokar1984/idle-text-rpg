import { loadData } from './data.js';
import { createCharacter, getCharacter, saveCharacter, resetCharacter } from './character.js';
import { advanceTime, catchUp } from './engine.js';
import { renderCreation, renderGame } from './ui.js';

let data = null;

async function init() {
  data = await loadData();
  window.gameData = data;

  const char = getCharacter();

  if (char) {
    const { character } = catchUp(char, data);
    saveCharacter(character);
    showGame();
    renderGame(character, data);
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
  advanceTime(char, data, 3);
  saveCharacter(char);
  showGame();
  renderGame(char, data);
}

function applyDueTicks() {
  const char = getCharacter();
  if (!char) return;
  const { character, ticks } = catchUp(char, data);
  if (ticks <= 0) {
    renderGame(char, data);
    return;
  }
  saveCharacter(character);
  renderGame(character, data);
}

function onTick() {
  const char = getCharacter();
  if (!char) return;
  const updated = advanceTime(char, data, 5);
  saveCharacter(updated);
  renderGame(updated, data);
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

init();

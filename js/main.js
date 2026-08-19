import { loadData } from './data.js';
import { createCharacter, getCharacter, saveCharacter, resetCharacter } from './character.js';
import { advanceTime, getLog } from './engine.js';
import { renderCreation, renderGame } from './ui.js';

let data = null;

async function init() {
  data = await loadData();
  window.gameData = data; // available for debugging

  const char = getCharacter();

  if (char) {
    showGame();
    renderGame(char, data);
  } else {
    showCreation();
    renderCreation(data.classes, onCreate);
  }

  document.getElementById('btn-tick')?.addEventListener('click', onTick);
  document.getElementById('btn-reset')?.addEventListener('click', onReset);
}

function showCreation() {
  document.getElementById('creation').classList.remove('hidden');
  document.getElementById('game').classList.add('hidden');
}

function showGame() {
  document.getElementById('creation').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
}

function onCreate(name, classId) {
  const char = createCharacter(name, classId, data.classes);
  saveCharacter(char);
  showGame();
  renderGame(char, data);
}

function onTick() {
  const char = getCharacter();
  if (!char) return;

  const updated = advanceTime(char, data, 5); // advance ~5 ticks
  saveCharacter(updated);
  renderGame(updated, data);
}

function onReset() {
  if (confirm('Reset character and start over?')) {
    resetCharacter();
    location.reload();
  }
}

init();

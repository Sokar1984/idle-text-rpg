import {
  skillDisplayName,
  trainingGainFor
} from './character.js';

export function renderVillageActions(char, data, handlers) {
  const schools = data.schools || [];
  const schoolButtons = schools.map(s => {
    const open = s.classId === char.classId;
    return `<button
      type="button"
      class="option-chip ${char.sublocation === s.id ? 'selected' : ''} ${open ? '' : 'locked'}"
      data-sub="${s.id}"
      ${open ? '' : 'disabled'}
      title="${open ? s.description : 'Unavailable for your class (for now)'}"
    >${s.name}${open ? '' : ' · locked'}</button>`;
  }).join('');

  return `
    <div class="zone-row">
      <span class="zone-label">Village</span>
      <button data-sub="vendor" class="option-chip ${char.sublocation === 'vendor' ? 'selected' : ''}">Vendor</button>
      ${char.sublocation === 'vendor' ? '<button id="btn-sell" class="secondary compact">Sell all loot</button>' : ''}
    </div>
    <div class="zone-row" style="margin-top:0.55rem">
      <span class="zone-label">Halls</span>
      ${schoolButtons}
    </div>
    ${char.sublocation && schools.some(s => s.id === char.sublocation)
      ? `<p class="hint" style="margin-top:0.5rem">${(schools.find(s => s.id === char.sublocation) || {}).description || ''}</p>`
      : '<p class="hint" style="margin-top:0.5rem">Only your class hall can be entered for now.</p>'}
  `;
}

export function renderTrainingPanel(char, data, handlers) {
  const el = document.getElementById('training-panel');
  if (!el) return;

  const points = char.trainingPoints || 0;
  const skills = data.skills || [];

  let html = `<h3>Training</h3>`;
  html += points > 0
    ? `<p class="hint accent">${points} training point${points === 1 ? '' : 's'} available</p>`
    : `<p class="hint">No training points (gain 1 per level).</p>`;

  html += `<div class="skill-points">`;
  for (const def of skills) {
    const id = def.id;
    const value = char.skills?.[id] ?? 0;
    const label = skillDisplayName(id, char.classId, skills);
    const gain = trainingGainFor(id, char, skills);
    const full = value >= 100;
    html += `
      <div class="train-row">
        <div class="train-meta">
          <span>${label}</span>
          <span>${value.toFixed(1)}%</span>
        </div>
        <div class="meter-track thin"><div class="meter-fill beat" style="width:${Math.min(100, value)}%"></div></div>
        <button data-train="${id}" ${points <= 0 || full ? 'disabled' : ''}>
          ${full ? 'Max' : `+${gain}%`}
        </button>
      </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;

  el.querySelectorAll('[data-train]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onTrain?.(btn.dataset.train));
  });
}

export function renderGearPanel(char, data) {
  const el = document.getElementById('gear-panel');
  if (!el) return;

  const slots = data.gearSlots || [];
  const eq = char.equipment || {};

  let html = `<h3>Gear</h3><ul class="pack-list">`;
  for (const slot of slots) {
    const item = eq[slot.id];
    const label = item ? (item.name || item.id || item) : '— empty —';
    const tag = slot.type === 'custom' ? 'satchel' : 'gear';
    html += `<li><span>${slot.name} <em class="hint">(${tag})</em></span><span>${label}</span></li>`;
  }
  html += `</ul><p class="hint">Equipment and satchel items will plug in later.</p>`;
  el.innerHTML = html;
}

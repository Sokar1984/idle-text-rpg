import { allocateSkill, saveCharacter, getCharacter } from './character.js';
import { msUntilNextTick } from './engine.js';

const STATS = ['strength', 'agility', 'intelligence', 'vitality'];

function formatItem(id) {
  return id.replace(/_/g, ' ');
}

function stackedInventory(items) {
  const counts = new Map();
  for (const item of items || []) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function renderCreation(classes, onCreate) {
  const container = document.getElementById('class-options');
  container.innerHTML = '';

  let selected = classes[0]?.id;

  classes.forEach(cls => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'class-card' + (cls.id === selected ? ' selected' : '');
    card.innerHTML = `<h4>${cls.name}</h4><p>${cls.description}</p>`;
    card.addEventListener('click', () => {
      selected = cls.id;
      container.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
    container.appendChild(card);
  });

  document.getElementById('btn-create').onclick = () => {
    const name = document.getElementById('char-name').value;
    onCreate(name, selected);
  };
}

export function renderGame(char, data) {
  const loc = data.locations.find(l => l.id === char.locationId);
  const xpLine = char.level < 10
    ? `${Math.floor(char.xp)} XP (${Math.ceil(char.xpToNext)} to next)`
    : 'Max';

  document.getElementById('char-summary').innerHTML = `
    <p class="who"><strong>${char.name}</strong> the ${char.className}</p>
    <p>Level ${char.level} · ${xpLine}</p>
    <p class="place">${loc ? loc.name : 'Unknown location'}</p>
    <p class="place-desc">${loc ? loc.description : ''}</p>
  `;

  const hpPct = Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100));
  const remainMs = msUntilNextTick(char, data);
  const seconds = Math.max(1, Math.ceil(remainMs / 1000));
  const intervalMs = (data.config.tick_interval_seconds || 60) * 1000;
  const beatPct = Math.max(0, Math.min(100, (1 - remainMs / intervalMs) * 100));

  document.getElementById('meters').innerHTML = `
    <div class="meter">
      <div class="meter-label"><span>Health</span><span>${char.hp} / ${char.maxHp}</span></div>
      <div class="meter-track"><div class="meter-fill hp" style="width:${hpPct}%"></div></div>
    </div>
    <div class="meter">
      <div class="meter-label"><span>Next beat</span><span>${seconds}s</span></div>
      <div class="meter-track thin"><div class="meter-fill beat" style="width:${beatPct}%"></div></div>
    </div>
  `;

  const statsEl = document.getElementById('stats-panel');
  statsEl.innerHTML = `
    <h3>Stats</h3>
    ${STATS.map(stat => `
      <div class="stat-row">
        <span>${stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
        <span>${char.stats[stat]}</span>
      </div>
    `).join('')}
  `;

  const skillsEl = document.getElementById('skills-panel');
  let skillsHtml = `<h3>Skills</h3>`;
  if (char.unspentSkillPoints > 0) {
    skillsHtml += `<p class="hint accent">${char.unspentSkillPoints} point${char.unspentSkillPoints > 1 ? 's' : ''} waiting</p>`;
    skillsHtml += `<div class="skill-points">`;
    STATS.forEach(stat => {
      skillsHtml += `<button data-stat="${stat}"><span>${stat.charAt(0).toUpperCase() + stat.slice(1)}</span><span>+1</span></button>`;
    });
    skillsHtml += `</div>`;
  } else {
    skillsHtml += `<p class="hint">No unspent points.</p>`;
  }
  skillsEl.innerHTML = skillsHtml;

  skillsEl.querySelectorAll('button[data-stat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = allocateSkill(getCharacter(), btn.dataset.stat);
      saveCharacter(updated);
      renderGame(updated, data);
    });
  });

  const packEl = document.getElementById('pack-panel');
  const stacked = stackedInventory(char.inventory);
  packEl.innerHTML = `
    <h3>Pack</h3>
    ${stacked.length === 0
      ? `<p class="hint">Nothing carried yet.</p>`
      : `<ul class="pack-list">${stacked.map(([item, count]) =>
          `<li><span>${formatItem(item)}</span><span>×${count}</span></li>`
        ).join('')}</ul>`}
  `;

  const logEl = document.getElementById('log');
  logEl.innerHTML = char.log.map(entry => {
    const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <article class="log-entry ${entry.type || ''}">
        <div class="meta">${time}</div>
        <div>${entry.text}</div>
      </article>
    `;
  }).join('');
}

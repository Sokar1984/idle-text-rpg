import { allocateSkill, saveCharacter, getCharacter } from './character.js';

export function renderCreation(classes, onCreate) {
  const container = document.getElementById('class-options');
  container.innerHTML = '';

  let selected = classes[0]?.id;

  classes.forEach(cls => {
    const card = document.createElement('div');
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
  // Summary
  const loc = data.locations.find(l => l.id === char.locationId);
  document.getElementById('char-summary').innerHTML = `
    <strong>${char.name}</strong> the ${char.className}<br/>
    Level ${char.level} · ${Math.floor(char.xp)} XP
    ${char.level < 10 ? `(${char.xpToNext} to next)` : '(Max)'}<br/>
    <span style="color:var(--text-dim)">${loc ? loc.name : 'Unknown location'}</span>
  `;

  // Stats
  const statsEl = document.getElementById('stats-panel');
  statsEl.innerHTML = `
    <h3>Stats</h3>
    <div class="stat-row"><span>HP</span><span>${char.hp} / ${char.maxHp}</span></div>
    <div class="stat-row"><span>Strength</span><span>${char.stats.strength}</span></div>
    <div class="stat-row"><span>Agility</span><span>${char.stats.agility}</span></div>
    <div class="stat-row"><span>Intelligence</span><span>${char.stats.intelligence}</span></div>
    <div class="stat-row"><span>Vitality</span><span>${char.stats.vitality}</span></div>
  `;

  // Skills
  const skillsEl = document.getElementById('skills-panel');
  let skillsHtml = `<h3>Skills</h3>`;
  if (char.unspentSkillPoints > 0) {
    skillsHtml += `<p style="font-size:0.85rem;color:var(--accent)">${char.unspentSkillPoints} point${char.unspentSkillPoints > 1 ? 's' : ''} available</p>`;
    skillsHtml += `<div class="skill-points">`;
    ['strength', 'agility', 'intelligence', 'vitality'].forEach(stat => {
      skillsHtml += `<button data-stat="${stat}">+1 ${stat}</button>`;
    });
    skillsHtml += `</div>`;
  } else {
    skillsHtml += `<p style="font-size:0.85rem;color:var(--text-dim)">No unspent points</p>`;
  }
  skillsEl.innerHTML = skillsHtml;

  skillsEl.querySelectorAll('button[data-stat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = allocateSkill(getCharacter(), btn.dataset.stat);
      saveCharacter(updated);
      renderGame(updated, data);
    });
  });

  // Log
  const logEl = document.getElementById('log');
  logEl.innerHTML = char.log.map(entry => {
    const time = new Date(entry.time).toLocaleTimeString();
    return `
      <div class="log-entry ${entry.type || ''}">
        <div class="meta">${time}</div>
        <div>${entry.text}</div>
      </div>
    `;
  }).join('');
}

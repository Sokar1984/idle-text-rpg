import { allocateSkill, saveCharacter, getCharacter, randomName } from './character.js';
import { msUntilNextTick } from './engine.js';

const STATS = ['strength', 'agility', 'intelligence', 'vitality', 'charisma'];
const AVATAR_STYLES = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'beautiful', label: 'Beautiful' },
  { id: 'ugly', label: 'Ugly' }
];

const RACE_COLORS = {
  human: '#c4a574',
  orc: '#5a8f5a',
  'high-elf': '#a8d4e6',
  'dark-elf': '#6b5b95',
  demon: '#b33a3a',
  dwarf: '#c49a6c'
};

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

function avatarPath(raceId, gender, style) {
  return `avatars/${raceId}-${gender}-${style}.webp`;
}

function renderAvatarPreview(raceId, gender, style) {
  const color = RACE_COLORS[raceId] || '#888';
  const initial = (raceId || '?')[0].toUpperCase();
  // Prefer image if present; fall back to colored glyph
  return `
    <div class="avatar-face" style="--race:${color}" data-src="${avatarPath(raceId, gender, style)}">
      <span class="avatar-fallback">${initial}</span>
      <img alt="" loading="lazy" onerror="this.style.display='none'" src="${avatarPath(raceId, gender, style)}" />
    </div>
  `;
}

export function renderCreation(data, onCreate) {
  const races = data.races;
  const classes = data.classes;

  let selectedRace = races[0]?.id || 'human';
  let selectedGender = 'male';
  let selectedClass = classes[0]?.id;
  let selectedAvatar = 'neutral';

  const raceBox = document.getElementById('race-options');
  const genderBox = document.getElementById('gender-options');
  const avatarBox = document.getElementById('avatar-options');
  const classBox = document.getElementById('class-options');
  const nameInput = document.getElementById('char-name');
  const raceDetail = document.getElementById('race-detail');

  function currentRace() {
    return races.find(r => r.id === selectedRace);
  }

  function suggestName() {
    nameInput.value = randomName(currentRace(), selectedGender);
  }

  function refreshRaceDetail() {
    const race = currentRace();
    if (!race) return;
    const bonusText = Object.entries(race.bonuses)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`)
      .join(', ');
    raceDetail.innerHTML = `
      <strong>${race.name}</strong> — ${race.description}<br/>
      <span class="muted">${bonusText || 'No stat modifiers'}</span><br/>
      <span class="muted">▲ ${race.advantages.join(' · ')}</span><br/>
      <span class="muted">▼ ${race.disadvantages.join(' · ')}</span>
    `;
  }

  function refreshAvatars() {
    avatarBox.innerHTML = '';
    AVATAR_STYLES.forEach(style => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'avatar-card' + (style.id === selectedAvatar ? ' selected' : '');
      btn.innerHTML = `${renderAvatarPreview(selectedRace, selectedGender, style.id)}<span>${style.label}</span>`;
      btn.addEventListener('click', () => {
        selectedAvatar = style.id;
        refreshAvatars();
      });
      avatarBox.appendChild(btn);
    });
  }

  // Races
  raceBox.innerHTML = '';
  races.forEach(race => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-chip' + (race.id === selectedRace ? ' selected' : '');
    btn.textContent = race.name;
    btn.addEventListener('click', () => {
      selectedRace = race.id;
      raceBox.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      refreshRaceDetail();
      refreshAvatars();
      suggestName();
    });
    raceBox.appendChild(btn);
  });

  // Gender
  genderBox.innerHTML = '';
  ['male', 'female'].forEach(g => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-chip' + (g === selectedGender ? ' selected' : '');
    btn.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    btn.addEventListener('click', () => {
      selectedGender = g;
      genderBox.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      refreshAvatars();
      suggestName();
    });
    genderBox.appendChild(btn);
  });

  // Classes
  classBox.innerHTML = '';
  classes.forEach(cls => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'class-card' + (cls.id === selectedClass ? ' selected' : '');
    card.innerHTML = `<h4>${cls.name}</h4><p>${cls.description}</p>`;
    card.addEventListener('click', () => {
      selectedClass = cls.id;
      classBox.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
    classBox.appendChild(card);
  });

  document.getElementById('btn-reroll-name').onclick = suggestName;

  document.getElementById('btn-create').onclick = () => {
    onCreate({
      name: nameInput.value,
      classId: selectedClass,
      raceId: selectedRace,
      gender: selectedGender,
      avatarStyle: selectedAvatar
    });
  };

  refreshRaceDetail();
  refreshAvatars();
  suggestName();
}

export function renderGame(char, data) {
  const loc = data.locations.find(l => l.id === char.locationId);
  const xpLine = char.level < 10
    ? `${Math.floor(char.xp)} XP (${Math.ceil(char.xpToNext)} to next)`
    : 'Max';

  const raceLabel = char.raceName || 'Unknown';
  const genderLabel = char.gender ? char.gender.charAt(0).toUpperCase() + char.gender.slice(1) : '';

  document.getElementById('char-summary').innerHTML = `
    <div class="summary-with-avatar">
      ${renderAvatarPreview(char.raceId || 'human', char.gender || 'male', char.avatarStyle || 'neutral')}
      <div>
        <p class="who"><strong>${char.name}</strong></p>
        <p>${raceLabel} ${char.className}${genderLabel ? ' · ' + genderLabel : ''}</p>
        <p>Level ${char.level} · ${xpLine}</p>
        <p class="place">${loc ? loc.name : 'Unknown location'}</p>
        <p class="place-desc">${loc ? loc.description : ''}</p>
      </div>
    </div>
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
        <span>${char.stats[stat] ?? '—'}</span>
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

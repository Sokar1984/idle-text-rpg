import { randomName, formatGameTime } from './character.js';
import { msUntilNextTick } from './engine.js';
import { renderVillageActions } from './panels.js';

const surfacedQuestChars = new Set();

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

function avatarPath(raceId, gender, style) {
  return `avatars/${raceId}-${gender}-${style}.webp`;
}

function renderAvatarPreview(raceId, gender, style) {
  const color = RACE_COLORS[raceId] || '#888';
  const initial = (raceId || '?')[0].toUpperCase();
  return `
    <div class="avatar-face" style="--race:${color}" data-src="${avatarPath(raceId, gender, style)}">
      <span class="avatar-fallback">${initial}</span>
      <img alt="" loading="lazy" onerror="this.style.display='none'" src="${avatarPath(raceId, gender, style)}" />
    </div>
  `;
}

function hoursLeft(evt, char) {
  return Math.max(0, Math.ceil((evt.expiresAtHour || 0) - (char.gameHours || 0)));
}

/** Health is bodily — visible. Attribute/skill numbers are not. */
export function refreshMeters(char, data) {
  const el = document.getElementById('meters');
  if (!el) return;
  const hpPct = Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100));
  const remainMs = msUntilNextTick(char, data);
  const seconds = Math.max(1, Math.ceil(remainMs / 1000));
  const intervalMs = (data.config.tick_interval_seconds || 60) * 1000;
  const beatPct = Math.max(0, Math.min(100, (1 - remainMs / intervalMs) * 100));

  const wound =
    hpPct > 75 ? 'Steady' :
    hpPct > 40 ? 'Worn' :
    hpPct > 15 ? 'Hurt' : 'Barely standing';

  el.innerHTML = `
    <div class="meter">
      <div class="meter-label"><span>Condition</span><span>${wound}</span></div>
      <div class="meter-track"><div class="meter-fill hp" style="width:${hpPct}%"></div></div>
    </div>
    <div class="meter">
      <div class="meter-label"><span>Next beat</span><span>${seconds}s</span></div>
      <div class="meter-track thin"><div class="meter-fill beat" style="width:${beatPct}%"></div></div>
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
    // Qualitative only — no +stat numbers on the sheet the player sees
    raceDetail.innerHTML = `
      <strong>${race.name}</strong> — ${race.description}<br/>
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

export function renderGame(char, data, handlers = {}) {
  const loc = data.locations.find(l => l.id === char.locationId);
  const t = formatGameTime(char, data.config);

  const raceLabel = char.raceName || 'Unknown';
  const genderLabel = char.gender ? char.gender.charAt(0).toUpperCase() + char.gender.slice(1) : '';

  // Identity + place — not a character sheet
  document.getElementById('char-summary').innerHTML = `
    <div class="summary-with-avatar">
      ${renderAvatarPreview(char.raceId || 'human', char.gender || 'male', char.avatarStyle || 'neutral')}
      <div>
        <p class="who"><strong>${char.name}</strong></p>
        <p>${raceLabel} ${char.className}${genderLabel ? ' · ' + genderLabel : ''}</p>
        <p class="place">Zone: <strong>${char.zone}</strong>${char.sublocation ? ' / ' + char.sublocation : ''}</p>
        ${char.zone === 'wilderness' && loc ? `<p class="place-desc">${loc.name} — ${loc.description}</p>` : ''}
      </div>
    </div>
  `;

  document.getElementById('calendar').innerHTML = `
    Year ${t.year}, day ${t.dayOfYear}, hour ${t.hourOfDay}
    · Age ${t.ageLabel}
  `;

  refreshMeters(char, data);

  const zoneNav = document.getElementById('zone-nav');
  zoneNav.innerHTML = `
    <div class="zone-row">
      <span class="zone-label">Travel</span>
      <button data-zone="wilderness" class="option-chip ${char.zone === 'wilderness' ? 'selected' : ''}">Wilderness</button>
      <button data-zone="village" class="option-chip ${char.zone === 'village' ? 'selected' : ''}">Village</button>
      <button data-zone="home" class="option-chip ${char.zone === 'home' ? 'selected' : ''}">Home</button>
    </div>
  `;
  zoneNav.querySelectorAll('[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onTravel?.(btn.dataset.zone));
  });

  const actions = document.getElementById('zone-actions');
  let actionHtml = '';
  if (char.zone === 'home') {
    actionHtml = `
      <div class="zone-row">
        <span class="zone-label">Home</span>
        <button data-sub="bedroom" class="option-chip ${char.sublocation === 'bedroom' ? 'selected' : ''}">Bedroom</button>
        <button data-sub="kitchen" class="option-chip ${char.sublocation === 'kitchen' ? 'selected' : ''}">Kitchen</button>
        <button data-sub="storage" class="option-chip ${char.sublocation === 'storage' ? 'selected' : ''}">Storage</button>
        <button id="btn-rest" class="secondary compact">Rest</button>
        ${char.sublocation === 'storage' ? '<button id="btn-store" class="secondary compact">Stow what you carry</button>' : ''}
      </div>`;
  } else if (char.zone === 'village') {
    actionHtml = renderVillageActions(char, data, handlers);
  } else {
    actionHtml = `<div class="zone-row"><span class="zone-label">Wilderness</span><span class="hint">The road keeps moving. Events appear when the world offers them.</span></div>`;
  }
  actions.innerHTML = actionHtml;
  actions.querySelectorAll('[data-sub]:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => handlers.onSublocation?.(char.zone, btn.dataset.sub));
  });
  document.getElementById('btn-rest')?.addEventListener('click', () => handlers.onRest?.());
  document.getElementById('btn-sell')?.addEventListener('click', () => handlers.onSell?.());
  document.getElementById('btn-store')?.addEventListener('click', () => handlers.onStore?.());

  // Events / Quests — primary agency
  const eventsEl = document.getElementById('board-events');
  const questsEl = document.getElementById('board-quests');
  const list = char.activeEvents || [];

  if (!list.length) {
    eventsEl.innerHTML = `<p class="hint">No active events. Keep living — offers appear over time (max 5).</p>`;
  } else {
    eventsEl.innerHTML = list.map(evt => {
      const left = hoursLeft(evt, char);
      return `
        <button type="button" class="board-card" data-event-id="${evt.instanceId}">
          <div class="board-card-title">${evt.name}</div>
          <div class="board-card-desc">${evt.description}</div>
          <div class="board-card-meta">
            <span>${evt.risk || 'medium'} risk</span>
            <span>${left}h left</span>
          </div>
        </button>
      `;
    }).join('');
    eventsEl.querySelectorAll('[data-event-id]').forEach(btn => {
      btn.addEventListener('click', () => handlers.onCompleteEvent?.(btn.dataset.eventId));
    });
  }

  const classJourney = (char.activeQuests || []).find(q => q.type === 'class_journey');
  const otherQuests = (char.activeQuests || []).filter(q => q.type !== 'class_journey');

  if (!classJourney && !otherQuests.length) {
    questsEl.innerHTML = `<p class="hint">No quests yet. The road may open longer threads later.</p>`;
  } else {
    let html = '';
    if (classJourney) {
      html += `
        <div class="board-card quest-card">
          <div class="board-card-title">${classJourney.name}</div>
          <div class="board-card-desc">${classJourney.description}</div>
          <button type="button" class="secondary quest-accept" data-accept-quest="${classJourney.id}">Take the road</button>
        </div>`;
    }
    html += otherQuests.map(q => `
        <div class="board-card quest-card">
          <div class="board-card-title">${q.name || 'Quest'}</div>
          ${q.description ? `<div class="board-card-desc">${q.description}</div>` : ''}
        </div>`).join('');
    questsEl.innerHTML = html;
    questsEl.querySelectorAll('[data-accept-quest]').forEach(btn => {
      btn.addEventListener('click', () => handlers.onAcceptQuest?.(btn.dataset.acceptQuest));
    });
  }

  const questsTab = document.querySelector('.board-tab[data-tab="quests"]');
  if (questsTab) questsTab.classList.toggle('has-action', Boolean(classJourney));

  if (classJourney && char.id && !surfacedQuestChars.has(char.id)) {
    surfacedQuestChars.add(char.id);
    document.querySelectorAll('.board-tab').forEach(t => t.classList.remove('selected'));
    questsTab?.classList.add('selected');
    eventsEl.classList.add('hidden');
    questsEl.classList.remove('hidden');
  }

  document.querySelectorAll('.board-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.board-tab').forEach(t => t.classList.remove('selected'));
      tab.classList.add('selected');
      const which = tab.dataset.tab;
      eventsEl.classList.toggle('hidden', which !== 'events');
      questsEl.classList.toggle('hidden', which !== 'quests');
    };
  });

  // Adventure log — main narrative surface
  const logEl = document.getElementById('log');
  logEl.innerHTML = (char.log || []).map(entry => {
    const time = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <article class="log-entry ${entry.type || ''}">
        <div class="meta">${time}</div>
        <div>${entry.text}</div>
      </article>
    `;
  }).join('');
}

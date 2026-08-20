import {
  loadProfile,
  listCharactersSorted,
  setActiveCharacter,
  deleteCharacter,
  canAddCharacter,
  setWildernessActive,
  FREE_CHARACTER_SLOTS
} from './profile.js';

/**
 * Screen model:
 *  - game / creation stay as they are
 *  - profile & graveyard are peer screens
 *  - shell nav is always visible so you can return to the game
 */

export function renderShellNav(state, handlers) {
  const el = document.getElementById('shell-nav');
  if (!el) return;

  const profile = loadProfile();
  const hasActive = !!profile.activeCharacterId;
  const max = profile.maxSlots || FREE_CHARACTER_SLOTS;

  el.innerHTML = `
    <div class="shell-row">
      <div class="shell-brand">
        <span class="shell-user">${escapeHtml(profile.displayName || 'Wanderer')}</span>
        <span class="hint">${profile.characters.length}/${max} slots</span>
      </div>
      <div class="shell-actions">
        <button type="button" class="secondary compact ${state.screen === 'game' ? 'selected' : ''}" data-nav="game" ${hasActive ? '' : 'disabled'}>
          Game
        </button>
        <button type="button" class="secondary compact ${state.screen === 'profile' ? 'selected' : ''}" data-nav="profile">
          Profile
        </button>
        <button type="button" class="ghost compact ${state.screen === 'graveyard' ? 'selected' : ''}" data-nav="graveyard">
          Graveyard
        </button>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onNavigate?.(btn.dataset.nav));
  });
}

export function renderProfileScreen(handlers) {
  const root = document.getElementById('profile');
  if (!root) return;

  const profile = loadProfile();
  const list = listCharactersSorted(profile);
  const active = list.filter(c => c.wildernessActive);
  const inactive = list.filter(c => !c.wildernessActive);
  const canAdd = canAddCharacter(profile);
  const max = profile.maxSlots || FREE_CHARACTER_SLOTS;

  root.innerHTML = `
    <div class="panel">
      <div class="profile-header">
        <div>
          <h2>Profile</h2>
          <p class="lede" style="margin-bottom:0">Signed in locally as <strong>${escapeHtml(profile.displayName)}</strong>. Real accounts can replace this later.</p>
        </div>
        <button type="button" class="secondary compact" data-act="back-game" ${profile.activeCharacterId ? '' : 'disabled'}>
          Back to game
        </button>
      </div>

      <div class="profile-block">
        <div class="profile-block-head">
          <h3>Characters</h3>
          <button type="button" class="primary compact" data-act="add-character" ${canAdd ? '' : 'disabled'}>
            ${canAdd ? 'Add character' : `Slot full (${max} max)`}
          </button>
        </div>
        <p class="hint">Sorted active first. Active = allowed to idle-farm in the wilderness.</p>

        ${renderCharGroup('Active in wilderness', active, profile.activeCharacterId, true)}
        ${renderCharGroup('Inactive', inactive, profile.activeCharacterId, false)}

        ${list.length === 0 ? '<p class="hint">No living characters. Create one to begin.</p>' : ''}
      </div>

      <div class="profile-block">
        <button type="button" class="secondary" data-act="open-graveyard">View graveyard (${profile.graveyard?.length || 0})</button>
      </div>
    </div>
  `;

  root.querySelector('[data-act="back-game"]')?.addEventListener('click', () => handlers.onNavigate?.('game'));
  root.querySelector('[data-act="add-character"]')?.addEventListener('click', () => handlers.onAddCharacter?.());
  root.querySelector('[data-act="open-graveyard"]')?.addEventListener('click', () => handlers.onNavigate?.('graveyard'));

  root.querySelectorAll('[data-play]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onPlayCharacter?.(btn.dataset.play));
  });
  root.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const char = profile.characters.find(c => c.id === id);
      if (!char) return;
      setWildernessActive(id, !char.wildernessActive);
      renderProfileScreen(handlers);
      handlers.onProfileChanged?.();
    });
  });
  root.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delete;
      if (btn.dataset.confirm !== '1') {
        btn.dataset.confirm = '1';
        btn.textContent = 'Confirm delete';
        setTimeout(() => {
          if (btn.dataset.confirm === '1') {
            btn.dataset.confirm = '';
            btn.textContent = 'Delete';
          }
        }, 4000);
        return;
      }
      deleteCharacter(id);
      handlers.onCharacterDeleted?.();
      renderProfileScreen(handlers);
    });
  });
}

function renderCharGroup(title, chars, activeId, isActiveGroup) {
  if (!chars.length) {
    return `<div class="char-group"><h4>${title}</h4><p class="hint">None</p></div>`;
  }
  return `
    <div class="char-group">
      <h4>${title}</h4>
      <div class="char-list">
        ${chars.map(c => `
          <article class="char-card ${c.id === activeId ? 'is-playing' : ''}">
            <div class="char-card-main">
              <strong>${escapeHtml(c.name)}</strong>
              <span class="hint">Lv ${c.level} ${escapeHtml(c.raceName || '')} ${escapeHtml(c.className || '')}</span>
              <span class="hint">Zone: ${escapeHtml(c.zone || '—')} · HP ${c.hp}/${c.maxHp}</span>
              ${c.id === activeId ? '<span class="playing-tag">Playing now</span>' : ''}
            </div>
            <div class="char-card-actions">
              <button type="button" class="secondary compact" data-play="${c.id}">${c.id === activeId ? 'Continue' : 'Play'}</button>
              <button type="button" class="ghost compact" data-toggle="${c.id}">${isActiveGroup ? 'Set inactive' : 'Set active'}</button>
              <button type="button" class="ghost compact danger-text" data-delete="${c.id}">Delete</button>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderGraveyardScreen(handlers) {
  const root = document.getElementById('graveyard');
  if (!root) return;

  const profile = loadProfile();
  const graves = profile.graveyard || [];

  root.innerHTML = `
    <div class="panel">
      <div class="profile-header">
        <div>
          <h2>Graveyard</h2>
          <p class="lede" style="margin-bottom:0">Characters who died stay here. Deletion from the living list is permanent and does not use the graveyard.</p>
        </div>
        <div class="shell-actions">
          <button type="button" class="secondary compact" data-act="to-profile">Profile</button>
          <button type="button" class="secondary compact" data-act="back-game" ${profile.activeCharacterId ? '' : 'disabled'}>Back to game</button>
        </div>
      </div>

      ${graves.length === 0
        ? '<p class="hint">The ground is still empty.</p>'
        : `<div class="char-list">${graves.map(g => `
            <article class="char-card grave">
              <div class="char-card-main">
                <strong>${escapeHtml(g.name)}</strong>
                <span class="hint">Lv ${g.level} ${escapeHtml(g.raceName || '')} ${escapeHtml(g.className || '')}</span>
                <span class="hint">${escapeHtml(g.cause || 'Unknown fate')}</span>
                <span class="hint">Laid to rest ${new Date(g.diedAt).toLocaleDateString()}</span>
              </div>
            </article>
          `).join('')}</div>`}
    </div>
  `;

  root.querySelector('[data-act="to-profile"]')?.addEventListener('click', () => handlers.onNavigate?.('profile'));
  root.querySelector('[data-act="back-game"]')?.addEventListener('click', () => handlers.onNavigate?.('game'));
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

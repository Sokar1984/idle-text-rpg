export function renderVillageActions(char, data, handlers) {
  // Pre-city: racial settlement is only a place to sleep
  if (!char.settledInMainCity) {
    const name = char.racialVillageName || 'the settlement';
    return `
      <div class="zone-row">
        <span class="zone-label">${name}</span>
        <span class="hint">Only a place to sleep. No market, no halls — not yet.</span>
      </div>
      <div class="zone-row" style="margin-top:0.55rem">
        <button data-sub="bedroom" class="option-chip ${char.sublocation === 'bedroom' ? 'selected' : ''}">Rest</button>
        <button id="btn-rest" class="secondary compact">Rest</button>
      </div>
    `;
  }

  const schools = data.schools || [];
  const cityName = data.mainCity?.name || 'City';
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
      <span class="zone-label">${cityName}</span>
      <button data-sub="vendor" class="option-chip ${char.sublocation === 'vendor' ? 'selected' : ''}">Vendor</button>
      ${char.sublocation === 'vendor' ? '<button id="btn-sell" class="secondary compact">Sell what you carry</button>' : ''}
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

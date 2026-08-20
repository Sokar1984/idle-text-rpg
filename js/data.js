export async function loadData() {
  const [
    config, classes, races, locations, monsters, events, items,
    boardEvents, schools, skills, gearSlots, raceStarts, classQuests
  ] = await Promise.all([
    fetch('data/config.json').then(r => r.json()),
    fetch('data/classes.json').then(r => r.json()),
    fetch('data/races.json').then(r => r.json()),
    fetch('data/locations.json').then(r => r.json()),
    fetch('data/monsters.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()),
    fetch('data/items.json').then(r => r.json()),
    fetch('data/board-events.json').then(r => r.json()),
    fetch('data/schools.json').then(r => r.json()),
    fetch('data/skills.json').then(r => r.json()),
    fetch('data/gear-slots.json').then(r => r.json()),
    fetch('data/race-starts.json').then(r => r.json()),
    fetch('data/class-quests.json').then(r => r.json())
  ]);

  return {
    config,
    classes: classes.classes,
    races: races.races,
    locations: locations.locations,
    monsters: monsters.monsters,
    events: events.events,
    items,
    boardEvents: boardEvents.events,
    schools: schools.schools,
    skills: skills.skills,
    gearSlots: gearSlots.slots,
    classWeaponBias: gearSlots.class_weapon_bias,
    raceStarts: raceStarts.starts,
    mainCity: raceStarts.main_city,
    classQuests: classQuests.quests,
    starterGear: classQuests.starter_gear
  };
}

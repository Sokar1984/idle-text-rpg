export async function loadData() {
  const [config, classes, locations, monsters, events] = await Promise.all([
    fetch('data/config.json').then(r => r.json()),
    fetch('data/classes.json').then(r => r.json()),
    fetch('data/locations.json').then(r => r.json()),
    fetch('data/monsters.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json())
  ]);

  return {
    config,
    classes: classes.classes,
    locations: locations.locations,
    monsters: monsters.monsters,
    events: events.events
  };
}

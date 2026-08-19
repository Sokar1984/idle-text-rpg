export async function loadData() {
  const [config, classes, races, locations, monsters, events, items] = await Promise.all([
    fetch('data/config.json').then(r => r.json()),
    fetch('data/classes.json').then(r => r.json()),
    fetch('data/races.json').then(r => r.json()),
    fetch('data/locations.json').then(r => r.json()),
    fetch('data/monsters.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()),
    fetch('data/items.json').then(r => r.json())
  ]);

  return {
    config,
    classes: classes.classes,
    races: races.races,
    locations: locations.locations,
    monsters: monsters.monsters,
    events: events.events,
    items
  };
}

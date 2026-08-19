# Avatars

Portrait files use this naming pattern:

```
{raceId}-{gender}-{style}.webp
```

Examples:
- `human-male-neutral.webp`
- `orc-female-beautiful.webp`
- `dark-elf-male-ugly.webp`

## Races
`human`, `orc`, `high-elf`, `dark-elf`, `demon`, `dwarf`

## Genders
`male`, `female`

## Styles
`neutral`, `beautiful`, `ugly`

Total expected files: **36**

The UI loads these paths and falls back to a colored initial if a file is missing.

# Image slots (phase 2)

Everything on screen is requested by a **key**. Until a key is listed in `manifest.json`, the game draws a
procedural placeholder. To replace one: put the PNG in this folder and add `"<key>": "<file.png>"` to
`manifest.json`. No code change needed. Transparent PNGs are fine everywhere except backgrounds.

| key | used for | recommended size |
|---|---|---|
| `bg_title`, `bg_hub`, `bg_hollow`, `bg_mile`, `bg_gate` | full-screen backgrounds (dialogue, hub, title) | 720×1338 (2× of 360×669) |
| `portrait_<who>` — `ash odessa dov pip calloway hesk tollkeeper narrator radio crowd` | dialogue speaker | 192×192 |
| `part_<partId>` e.g. `part_wp_mg`, `part_lg_jackal` (ids in `src/data/parts.ts`) | garage / shop icons | 96×96 |
| `mech_<chassisId>_<player\|ally\|enemy>` — chassis `rat hound bulwark` | battle sprite (replaces the composed placeholder; facing RIGHT) | 144×144 |
| `unit_cart` | the water cart "Bessie" | 144×144 |
| `tile_<ground\|wall\|cover\|rad\|drift\|exit>` | battle terrain | 80×80 |
| `crate_<bullets\|explosives\|cells\|scrap>` | map pickups | 80×80 |

Example `manifest.json`:

```json
{ "portrait_odessa": "odessa.png", "bg_hub": "hub.png", "tile_wall": "wall.png" }
```
